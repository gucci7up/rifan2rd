import "server-only";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Bloquea la rifa dentro de la transacción para evitar sobreventa y números duplicados. */
async function lockRaffle(tx: Tx, raffleId: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${raffleId}::bigint)`;
}

export async function raffleStats(raffleId: number, tx: Tx = db) {
  const [sold, pending] = await Promise.all([
    tx.ticket.count({ where: { raffleId } }),
    tx.order.aggregate({ where: { raffleId, status: "PENDING" }, _sum: { quantity: true } }),
  ]);
  return { sold, pending: pending._sum.quantity ?? 0 };
}

/** Estadísticas de varias rifas en dos consultas. */
export async function rafflesStats(ids: number[]) {
  const [sold, pending] = await Promise.all([
    db.ticket.groupBy({ by: ["raffleId"], where: { raffleId: { in: ids } }, _count: true }),
    db.order.groupBy({
      by: ["raffleId"],
      where: { raffleId: { in: ids }, status: "PENDING" },
      _sum: { quantity: true },
    }),
  ]);
  const map = new Map<number, { sold: number; pending: number }>();
  for (const id of ids) map.set(id, { sold: 0, pending: 0 });
  for (const s of sold) map.get(s.raffleId)!.sold = s._count;
  for (const p of pending) map.get(p.raffleId)!.pending = p._sum.quantity ?? 0;
  return map;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function orderCode() {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export class OrderError extends Error {}

export async function createOrder(input: {
  raffleId: number;
  name: string;
  phone: string;
  email: string | null;
  quantity: number;
  total: Prisma.Decimal;
  bankAccountId: number | null;
  receiptPath: string | null;
  ip: string;
}) {
  return db.$transaction(
    async (tx) => {
      await lockRaffle(tx, input.raffleId);
      const raffle = await tx.raffle.findUniqueOrThrow({ where: { id: input.raffleId } });
      if (raffle.status !== "ACTIVE") throw new OrderError("Esta rifa no está recibiendo compras.");

      const { sold, pending } = await raffleStats(raffle.id, tx);
      const available = raffle.totalTickets - sold - pending;
      if (input.quantity > available)
        throw new OrderError(
          available > 0 ? `Solo quedan ${available} boletos disponibles.` : "Boletos agotados.",
        );

      const mine = await tx.order.aggregate({
        where: { raffleId: raffle.id, phone: input.phone, status: { in: ["PENDING", "APPROVED"] } },
        _sum: { quantity: true },
      });
      const already = mine._sum.quantity ?? 0;
      if (already + input.quantity > raffle.maxPerPhone)
        throw new OrderError(
          `El máximo por persona es ${raffle.maxPerPhone} boletos (ya tienes ${already}).`,
        );

      return tx.order.create({ data: { ...input, code: orderCode() } });
    },
    { timeout: 15_000 },
  );
}

/** Elige `qty` números libres al azar en [1, total]. */
function pickNumbers(total: number, taken: Set<number>, qty: number): number[] {
  const free = total - taken.size;
  if (qty > free) throw new OrderError("No hay suficientes números libres.");
  const out = new Set<number>();
  if (qty * 4 < free) {
    while (out.size < qty) {
      const n = randomInt(1, total + 1);
      if (!taken.has(n)) out.add(n);
    }
    return [...out];
  }
  // Quedan pocos: barajar la lista de libres (Fisher–Yates parcial).
  const pool: number[] = [];
  for (let n = 1; n <= total; n++) if (!taken.has(n)) pool.push(n);
  for (let i = 0; i < qty; i++) {
    const j = randomInt(i, pool.length);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, qty);
}

/** Aprueba un pedido: asigna números al azar y registra ganadores instantáneos. */
export async function approveOrder(orderId: number) {
  return db.$transaction(
    async (tx) => {
      const pre = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      await lockRaffle(tx, pre.raffleId);
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { raffle: true } });
      if (order.status !== "PENDING") throw new OrderError("El pedido ya fue procesado.");

      const taken = new Set(
        (await tx.ticket.findMany({ where: { raffleId: order.raffleId }, select: { number: true } })).map(
          (t) => t.number,
        ),
      );
      const numbers = pickNumbers(order.raffle.totalTickets, taken, order.quantity);
      await tx.ticket.createMany({
        data: numbers.map((number) => ({ raffleId: order.raffleId, orderId: order.id, number })),
      });

      const prizes = await tx.prizeNumber.findMany({
        where: { raffleId: order.raffleId, number: { in: numbers }, ticketId: null },
      });
      if (prizes.length) {
        const tickets = await tx.ticket.findMany({
          where: { orderId: order.id, number: { in: prizes.map((p) => p.number) } },
        });
        for (const p of prizes) {
          const t = tickets.find((t) => t.number === p.number)!;
          await tx.prizeNumber.update({ where: { id: p.id }, data: { ticketId: t.id } });
          await tx.winner.create({
            data: {
              raffleId: order.raffleId,
              name: order.name,
              prize: p.prize,
              ticketNumber: p.number,
              type: "INSTANT",
            },
          });
        }
      }

      await tx.order.update({ where: { id: order.id }, data: { status: "APPROVED", reviewedAt: new Date() } });
      if (taken.size + numbers.length >= order.raffle.totalTickets)
        await tx.raffle.update({ where: { id: order.raffleId }, data: { status: "SOLD_OUT" } });

      return { numbers: numbers.sort((a, b) => a - b), instantPrizes: prizes };
    },
    { timeout: 30_000 },
  );
}

// ---------- Sorteo verificable (commit-reveal) ----------
//
// 1. Al activar la rifa se genera una semilla secreta y se publica su SHA-256.
// 2. En el sorteo se revela la semilla. El índice ganador es
//    HMAC-SHA256(semilla, "<id>:<cantidad>") mod cantidad, sobre los números vendidos en orden ascendente.
// Cualquiera puede comprobar que la semilla coincide con el hash publicado y repetir el cálculo.

export function newSeed() {
  const seed = randomBytes(32).toString("hex");
  return { seed, seedHash: sha256(seed) };
}

export function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export function winningIndex(seed: string, raffleId: number, count: number) {
  const h = createHmac("sha256", seed).update(`${raffleId}:${count}`).digest("hex");
  return Number(BigInt("0x" + h) % BigInt(count));
}

export async function runDraw(raffleId: number, manualNumber?: number) {
  return db.$transaction(
    async (tx) => {
      await lockRaffle(tx, raffleId);
      const raffle = await tx.raffle.findUniqueOrThrow({ where: { id: raffleId } });
      if (raffle.status === "DRAWN") throw new OrderError("Esta rifa ya fue sorteada.");
      const pending = await tx.order.count({ where: { raffleId, status: "PENDING" } });
      if (pending) throw new OrderError(`Hay ${pending} pedidos pendientes. Apruébalos o recházalos primero.`);

      const tickets = await tx.ticket.findMany({
        where: { raffleId },
        orderBy: { number: "asc" },
        include: { order: true },
      });
      if (!tickets.length) throw new OrderError("No hay boletos vendidos.");

      let winner;
      if (manualNumber !== undefined) {
        winner = tickets.find((t) => t.number === manualNumber);
        if (!winner) throw new OrderError("Ese número no fue vendido.");
      } else {
        if (!raffle.seed) throw new OrderError("La rifa no tiene semilla publicada.");
        winner = tickets[winningIndex(raffle.seed, raffle.id, tickets.length)];
      }

      await tx.raffle.update({
        where: { id: raffleId },
        data: { status: "DRAWN", winningNumber: winner.number, drawnAt: new Date() },
      });
      await tx.winner.create({
        data: {
          raffleId,
          name: winner.order.name,
          prize: raffle.mainPrize,
          ticketNumber: winner.number,
          type: "MAIN",
        },
      });
      return winner;
    },
    { timeout: 30_000 },
  );
}

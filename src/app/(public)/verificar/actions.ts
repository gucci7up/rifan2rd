"use server";

import { db } from "@/lib/db";
import { maskName, normalizePhone } from "@/lib/format";
import { clientIp, rateLimit } from "@/lib/security";

export type VerifyResult = {
  error?: string;
  totalTickets?: number;
  orders?: {
    code: string;
    name: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    quantity: number;
    numbers: number[];
    prizes: [number, string][];
  }[];
};

export async function verifyTickets(_prev: VerifyResult, form: FormData): Promise<VerifyResult> {
  const ip = await clientIp();
  if (!rateLimit(`verify:${ip}`, 20, 5 * 60_000)) return { error: "Demasiadas consultas. Espera unos minutos." };

  const raffleId = Number(form.get("raffleId"));
  const q = String(form.get("q") ?? "").trim();
  const raffle = Number.isInteger(raffleId) ? await db.raffle.findUnique({ where: { id: raffleId } }) : null;
  if (!raffle) return { error: "Selecciona una rifa." };
  if (!q) return { error: "Escribe tu teléfono o un número de boleto." };

  const phone = normalizePhone(q);
  const ticketNumber = !phone && /^\d{1,7}$/.test(q) ? Number(q) : null;
  if (!phone && ticketNumber === null) return { error: "Escribe un teléfono de 10 dígitos o un número de boleto." };

  const orders = await db.order.findMany({
    where: phone
      ? { raffleId, phone }
      : { raffleId, tickets: { some: { number: ticketNumber! } }, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { tickets: { orderBy: { number: "asc" }, include: { prize: true } } },
  });
  if (!orders.length)
    return {
      error: phone
        ? "No encontramos boletos con ese teléfono en esta rifa."
        : "Ese número no ha sido asignado (aún) en esta rifa.",
    };

  return {
    totalTickets: raffle.totalTickets,
    orders: orders.map((o) => ({
      code: phone ? o.code : "",
      name: maskName(o.name),
      status: o.status,
      quantity: o.quantity,
      // Al buscar por boleto solo mostramos ese número, no todo el pedido de otra persona.
      numbers: phone ? o.tickets.map((t) => t.number) : [ticketNumber!],
      prizes: o.tickets
        .filter((t) => t.prize && (phone || t.number === ticketNumber))
        .map((t) => [t.number, t.prize!.prize] as [number, string]),
    })),
  };
}

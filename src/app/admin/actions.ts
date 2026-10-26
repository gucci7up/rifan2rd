"use server";

import { Prisma, type RaffleStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { approveOrder, newSeed, OrderError, runDraw } from "@/lib/raffles";
import { saveUpload } from "@/lib/upload";

function back(path: string, msg: { ok?: string; e?: string }): never {
  const q = new URLSearchParams(msg as Record<string, string>).toString();
  revalidatePath("/", "layout");
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const n = Number(str(f, k));
  return Number.isInteger(n) ? n : NaN;
};
const errMsg = (e: unknown) => (e instanceof OrderError || e instanceof Error ? e.message : "Error inesperado");

// ---------- Pedidos ----------

export async function approveOrderAction(form: FormData) {
  await requireAdmin();
  const id = int(form, "id");
  const ret = str(form, "return") || `/admin/pedidos/${id}`;
  try {
    const { numbers, instantPrizes } = await approveOrder(id);
    back(ret, {
      ok: `Aprobado. ${numbers.length} números asignados${instantPrizes.length ? ` · ⚡ ${instantPrizes.length} premio(s) instantáneo(s)` : ""}.`,
    });
  } catch (e) {
    if (e instanceof OrderError) back(ret, { e: e.message });
    throw e;
  }
}

export async function rejectOrderAction(form: FormData) {
  await requireAdmin();
  const id = int(form, "id");
  const res = await db.order.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", rejectReason: str(form, "reason") || null, reviewedAt: new Date() },
  });
  back(str(form, "return") || `/admin/pedidos/${id}`, res.count ? { ok: "Pedido rechazado." } : { e: "El pedido ya fue procesado." });
}

// ---------- Rifas ----------

export async function saveRaffle(form: FormData) {
  await requireAdmin();
  const id = int(form, "id");
  const isNew = Number.isNaN(id);
  const path = isNew ? "/admin/rifas/nueva" : `/admin/rifas/${id}`;

  const title = str(form, "title");
  const totalTickets = int(form, "totalTickets");
  const ticketPrice = Number(str(form, "ticketPrice"));
  if (!title || !str(form, "mainPrize")) back(path, { e: "Título y premio mayor son obligatorios." });
  if (!(totalTickets >= 10 && totalTickets <= 999_999)) back(path, { e: "La cantidad de boletos debe estar entre 10 y 999,999." });
  if (!(ticketPrice > 0)) back(path, { e: "El precio del boleto debe ser mayor que 0." });

  const existing = isNew ? null : await db.raffle.findUnique({ where: { id }, include: { _count: { select: { tickets: true } } } });
  if (existing && existing._count.tickets > totalTickets)
    back(path, { e: "No puedes poner menos boletos de los ya vendidos." });

  const status = (str(form, "status") || "DRAFT") as RaffleStatus;
  const drawAtRaw = str(form, "drawAt");
  const data: Prisma.RaffleUncheckedCreateInput = {
    title,
    slug: slugify(str(form, "slug") || title),
    mainPrize: str(form, "mainPrize"),
    description: str(form, "description"),
    categoryId: int(form, "categoryId") || null,
    ticketPrice: new Prisma.Decimal(ticketPrice),
    totalTickets,
    minPerOrder: Math.max(1, int(form, "minPerOrder") || 1),
    maxPerPhone: Math.max(1, int(form, "maxPerPhone") || 1000),
    drawThresholdPct: Math.min(100, Math.max(1, int(form, "drawThresholdPct") || 80)),
    // datetime-local llega sin zona horaria: se interpreta como hora de RD (UTC-4).
    drawAt: drawAtRaw ? new Date(`${drawAtRaw}:00-04:00`) : null,
    status,
  };

  // La semilla se fija una sola vez, al activar por primera vez.
  if (status !== "DRAFT" && !existing?.seedHash) Object.assign(data, newSeed());

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    try {
      data.imageUrl = "/media/" + (await saveUpload(image, "public", ["jpg", "png", "webp"])).replace(/^public\//, "");
    } catch (e) {
      back(path, { e: errMsg(e) });
    }
  }

  let saved;
  try {
    saved = existing
      ? await db.raffle.update({ where: { id }, data })
      : await db.raffle.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      back(path, { e: "Ya existe una rifa con esa URL (slug). Cambia el título o el slug." });
    throw e;
  }
  back(`/admin/rifas/${saved.id}`, { ok: isNew ? "Rifa creada. Ahora agrega paquetes y números premiados." : "Cambios guardados." });
}

/** Formato por línea: "10 = 250" (cantidad = precio). Un "*" al final la marca como popular. */
export async function savePackages(form: FormData) {
  await requireAdmin();
  const raffleId = int(form, "raffleId");
  const path = `/admin/rifas/${raffleId}`;
  const rows: { quantity: number; price: Prisma.Decimal; highlight: boolean; sortOrder: number }[] = [];
  for (const [i, line] of str(form, "packages").split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const m = line.replace(/,/g, "").match(/^\s*(\d+)\s*=\s*(?:RD\$)?\s*(\d+(?:\.\d+)?)\s*(\*)?\s*$/i);
    if (!m) back(path, { e: `Línea ${i + 1} no válida: "${line}". Usa "10 = 250".` });
    rows.push({ quantity: Number(m[1]), price: new Prisma.Decimal(m[2]), highlight: !!m[3], sortOrder: rows.length });
  }
  await db.$transaction([
    db.package.deleteMany({ where: { raffleId } }),
    db.package.createMany({ data: rows.map((r) => ({ ...r, raffleId })) }),
  ]);
  back(path, { ok: `${rows.length} paquetes guardados.` });
}

/** Formato por línea: "11111 = RD$7,500". Los que ya salieron no se tocan. */
export async function savePrizeNumbers(form: FormData) {
  await requireAdmin();
  const raffleId = int(form, "raffleId");
  const path = `/admin/rifas/${raffleId}`;
  const raffle = await db.raffle.findUniqueOrThrow({ where: { id: raffleId } });

  const wanted = new Map<number, string>();
  for (const [i, line] of str(form, "prizes").split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const m = line.match(/^\s*(\d+)\s*=\s*(.+?)\s*$/);
    if (!m) back(path, { e: `Línea ${i + 1} no válida: "${line}". Usa "11111 = RD$7,500".` });
    const n = Number(m[1]);
    if (n < 1 || n > raffle.totalTickets) back(path, { e: `El número ${m[1]} está fuera del rango 1–${raffle.totalTickets}.` });
    wanted.set(n, m[2]);
  }

  const won = await db.prizeNumber.findMany({ where: { raffleId, ticketId: { not: null } } });
  for (const w of won) wanted.delete(w.number);
  const sold = await db.ticket.findMany({ where: { raffleId, number: { in: [...wanted.keys()] } }, select: { number: true } });
  if (sold.length)
    back(path, { e: `Estos números ya están vendidos y no pueden ser premiados: ${sold.map((s) => s.number).join(", ")}.` });

  await db.$transaction([
    db.prizeNumber.deleteMany({ where: { raffleId, ticketId: null } }),
    db.prizeNumber.createMany({ data: [...wanted].map(([number, prize]) => ({ raffleId, number, prize })) }),
  ]);
  back(path, { ok: `${wanted.size} números premiados guardados${won.length ? ` (${won.length} ya salieron y se conservaron)` : ""}.` });
}

export async function drawAction(form: FormData) {
  await requireAdmin();
  const raffleId = int(form, "raffleId");
  const manual = str(form, "manualNumber");
  const path = `/admin/rifas/${raffleId}`;
  if (str(form, "confirm") !== "SORTEAR") back(path, { e: 'Escribe "SORTEAR" para confirmar.' });
  try {
    const w = await runDraw(raffleId, manual ? Number(manual) : undefined);
    back(path, { ok: `¡Sorteo realizado! Ganador: boleto ${w.number} (${w.order.name}, ${w.order.phone}).` });
  } catch (e) {
    if (e instanceof OrderError) back(path, { e: e.message });
    throw e;
  }
}

// ---------- Bancos y categorías ----------

export async function saveBank(form: FormData) {
  await requireAdmin();
  const data = {
    bank: str(form, "bank"),
    holder: str(form, "holder"),
    accountNumber: str(form, "accountNumber"),
    accountType: str(form, "accountType") || "Ahorros",
    documentId: str(form, "documentId") || null,
  };
  if (!data.bank || !data.holder || !data.accountNumber) back("/admin/bancos", { e: "Banco, titular y cuenta son obligatorios." });
  await db.bankAccount.create({ data });
  back("/admin/bancos", { ok: "Cuenta agregada." });
}

export async function toggleBank(form: FormData) {
  await requireAdmin();
  const b = await db.bankAccount.findUniqueOrThrow({ where: { id: int(form, "id") } });
  await db.bankAccount.update({ where: { id: b.id }, data: { active: !b.active } });
  back("/admin/bancos", { ok: b.active ? "Cuenta ocultada." : "Cuenta activada." });
}

export async function saveCategory(form: FormData) {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) back("/admin/bancos", { e: "Escribe el nombre de la categoría." });
  await db.category.upsert({ where: { slug: slugify(name) }, update: { name }, create: { name, slug: slugify(name) } });
  back("/admin/bancos", { ok: "Categoría guardada." });
}

export async function deleteCategory(form: FormData) {
  await requireAdmin();
  await db.category.delete({ where: { id: int(form, "id") } });
  back("/admin/bancos", { ok: "Categoría eliminada." });
}

// ---------- Ganadores ----------

export async function saveWinner(form: FormData) {
  await requireAdmin();
  const name = str(form, "name");
  const prize = str(form, "prize");
  if (!name || !prize) back("/admin/ganadores", { e: "Nombre y premio son obligatorios." });
  let photoUrl: string | null = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = "/media/" + (await saveUpload(photo, "public", ["jpg", "png", "webp"])).replace(/^public\//, "");
    } catch (e) {
      back("/admin/ganadores", { e: errMsg(e) });
    }
  }
  await db.winner.create({
    data: {
      name,
      prize,
      photoUrl,
      raffleId: int(form, "raffleId") || null,
      ticketNumber: int(form, "ticketNumber") || null,
      wonAt: str(form, "wonAt") ? new Date(`${str(form, "wonAt")}T12:00:00-04:00`) : new Date(),
    },
  });
  back("/admin/ganadores", { ok: "Ganador agregado." });
}

export async function updateWinner(form: FormData) {
  await requireAdmin();
  const id = int(form, "id");
  const op = str(form, "op");
  if (op === "delete") await db.winner.delete({ where: { id } });
  else {
    const w = await db.winner.findUniqueOrThrow({ where: { id } });
    const data: Prisma.WinnerUpdateInput = { published: !w.published };
    const photo = form.get("photo");
    if (op === "photo" && photo instanceof File && photo.size > 0) {
      data.published = w.published;
      data.photoUrl = "/media/" + (await saveUpload(photo, "public", ["jpg", "png", "webp"])).replace(/^public\//, "");
    }
    await db.winner.update({ where: { id }, data });
  }
  back("/admin/ganadores", { ok: "Actualizado." });
}

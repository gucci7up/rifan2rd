"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { createOrder, OrderError } from "@/lib/raffles";
import { clientIp, rateLimit, verifyTurnstile } from "@/lib/security";
import { saveUpload } from "@/lib/upload";

export type OrderState = { error?: string; fields?: Record<string, string> };

const schema = z.object({
  raffleId: z.coerce.number().int().positive(),
  packageId: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(3, "Escribe tu nombre completo.").max(80),
  phone: z.string().trim(),
  email: z.union([z.literal(""), z.string().trim().email("Correo no válido.")]).optional(),
  bankAccountId: z.coerce.number().int().positive({ message: "Elige el banco al que transferiste." }),
  terms: z.literal("on", { errorMap: () => ({ message: "Debes aceptar los términos." }) }),
});

export async function submitOrder(_prev: OrderState, form: FormData): Promise<OrderState> {
  const fields = Object.fromEntries(
    ["name", "phone", "email"].map((k) => [k, String(form.get(k) ?? "")]),
  );
  const fail = (error: string): OrderState => ({ error, fields });

  // Honeypot anti-bots
  if (form.get("website")) return fail("No se pudo procesar la solicitud.");

  const ip = await clientIp();
  if (!rateLimit(`order:${ip}`, 6, 10 * 60_000))
    return fail("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
  if (!(await verifyTurnstile(form.get("cf-turnstile-response") as string | null, ip)))
    return fail("No pudimos verificar que eres humano. Recarga la página e inténtalo de nuevo.");

  const parsed = schema.safeParse({
    raffleId: form.get("raffleId"),
    packageId: form.get("packageId") || undefined,
    quantity: form.get("quantity") || undefined,
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email") ?? "",
    bankAccountId: form.get("bankAccountId"),
    terms: form.get("terms"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  const phone = normalizePhone(d.phone);
  if (!phone) return fail("Escribe un teléfono dominicano válido de 10 dígitos (809, 829 o 849).");

  const raffle = await db.raffle.findUnique({ where: { id: d.raffleId }, include: { packages: true } });
  if (!raffle) return fail("La rifa no existe.");

  let quantity: number;
  let total: Prisma.Decimal;
  if (d.packageId) {
    const pkg = raffle.packages.find((p) => p.id === d.packageId);
    if (!pkg) return fail("El paquete seleccionado no existe.");
    quantity = pkg.quantity;
    total = pkg.price;
  } else {
    if (!d.quantity) return fail("Elige cuántos boletos quieres.");
    quantity = d.quantity;
    total = raffle.ticketPrice.mul(quantity);
  }
  if (quantity < raffle.minPerOrder) return fail(`El mínimo por compra es ${raffle.minPerOrder} boletos.`);

  const bank = await db.bankAccount.findFirst({ where: { id: d.bankAccountId, active: true } });
  if (!bank) return fail("Elige el banco al que transferiste.");

  const receipt = form.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0) return fail("Sube el comprobante de tu transferencia.");

  let code: string;
  try {
    const receiptPath = await saveUpload(receipt, "receipts", ["jpg", "png", "webp", "pdf"]);
    const order = await createOrder({
      raffleId: raffle.id,
      name: d.name,
      phone,
      email: d.email || null,
      quantity,
      total,
      bankAccountId: bank.id,
      receiptPath,
      ip,
    });
    code = order.code;
  } catch (e) {
    if (e instanceof OrderError || (e instanceof Error && /archivo|formato/i.test(e.message)))
      return fail(e.message);
    console.error("submitOrder", e);
    return fail("Ocurrió un error al registrar tu compra. Inténtalo de nuevo.");
  }
  redirect(`/pedido/${code}`);
}

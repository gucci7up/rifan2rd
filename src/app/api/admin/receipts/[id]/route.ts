import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { readUpload } from "@/lib/upload";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // El middleware ya protege /api/admin, pero lo verificamos otra vez por ser datos privados.
  if (!(await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)))
    return new Response("No autorizado", { status: 401 });
  const order = await db.order.findUnique({ where: { id: Number((await params).id) || 0 } });
  if (!order?.receiptPath) return new Response("No encontrado", { status: 404 });
  const { data, mime } = await readUpload(order.receiptPath);
  return new Response(new Uint8Array(data), {
    headers: { "content-type": mime, "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}

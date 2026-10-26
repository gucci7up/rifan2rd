import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketList } from "@/components/TicketList";
import { site } from "@/lib/config";
import { db } from "@/lib/db";
import { formatDate, maskName, maskPhone, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const order = await db.order.findUnique({
    where: { code },
    include: {
      raffle: { select: { title: true, slug: true, totalTickets: true } },
      tickets: { orderBy: { number: "asc" }, include: { prize: true } },
    },
  });
  if (!order) notFound();

  const prizes = new Map(order.tickets.filter((t) => t.prize).map((t) => [t.number, t.prize!.prize]));
  const waText = encodeURIComponent(`Hola, hice el pedido ${order.code} para "${order.raffle.title}".`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="card space-y-6 p-6 sm:p-8">
        {order.status === "PENDING" && (
          <div className="text-center">
            <p className="text-5xl">⏳</p>
            <h1 className="mt-3 font-display text-2xl font-extrabold">¡Recibimos tu pedido!</h1>
            <p className="mt-2 text-sm text-muted">
              Estamos validando tu pago. Cuando lo aprobemos te asignaremos tus números al azar. Guarda este código:
            </p>
          </div>
        )}
        {order.status === "APPROVED" && (
          <div className="text-center">
            <p className="text-5xl">🎉</p>
            <h1 className="mt-3 font-display text-2xl font-extrabold">¡Pago aprobado!</h1>
            <p className="mt-2 text-sm text-muted">Estos son tus números. ¡Mucha suerte!</p>
          </div>
        )}
        {order.status === "REJECTED" && (
          <div className="text-center">
            <p className="text-5xl">⚠️</p>
            <h1 className="mt-3 font-display text-2xl font-extrabold">Pago no aprobado</h1>
            <p className="mt-2 text-sm text-muted">{order.rejectReason || "No pudimos validar tu comprobante."}</p>
          </div>
        )}

        <p className="rounded-xl border border-gold/40 bg-gold/5 p-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-gold">
          {order.code}
        </p>

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Rifa</dt>
          <dd className="text-right">
            <Link href={`/rifas/${order.raffle.slug}`} className="hover:underline">{order.raffle.title}</Link>
          </dd>
          <dt className="text-muted">Nombre</dt><dd className="text-right">{maskName(order.name)}</dd>
          <dt className="text-muted">Teléfono</dt><dd className="text-right">{maskPhone(order.phone)}</dd>
          <dt className="text-muted">Boletos</dt><dd className="text-right">{order.quantity}</dd>
          <dt className="text-muted">Total</dt><dd className="text-right font-semibold text-gold">{money(order.total)}</dd>
          <dt className="text-muted">Fecha</dt><dd className="text-right">{formatDate(order.createdAt)}</dd>
        </dl>

        {order.tickets.length > 0 && (
          <div>
            <p className="label">Tus números</p>
            <TicketList numbers={order.tickets.map((t) => t.number)} total={order.raffle.totalTickets} prizes={prizes} />
            {prizes.size > 0 && (
              <p className="mt-4 rounded-xl border border-gold bg-gold/10 p-4 text-center font-semibold text-gold">
                ⚡ ¡Ganaste un premio instantáneo! {[...prizes.values()].join(", ")}. Te contactaremos por WhatsApp.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/verificar" className="btn-ghost flex-1">Ir al verificador</Link>
          {site.whatsapp && (
            <a href={`https://wa.me/${site.whatsapp}?text=${waText}`} target="_blank" rel="noopener" className="btn-gold flex-1">
              Escribir por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

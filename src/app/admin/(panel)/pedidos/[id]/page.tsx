import Link from "next/link";
import { notFound } from "next/navigation";
import { approveOrderAction, rejectOrderAction } from "@/app/admin/actions";
import { Flash, PageTitle, statusCls, statusLabel, type Search } from "@/components/admin/Flash";
import { TicketList } from "@/components/TicketList";
import { db } from "@/lib/db";
import { formatDate, money } from "@/lib/format";

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const o = Number.isInteger(id)
    ? await db.order.findUnique({
        where: { id },
        include: { raffle: true, bankAccount: true, tickets: { orderBy: { number: "asc" }, include: { prize: true } } },
      })
    : null;
  if (!o) notFound();

  const previous = await db.order.count({ where: { phone: o.phone, id: { not: o.id } } });
  const isPdf = o.receiptPath?.endsWith(".pdf");
  const receiptUrl = `/api/admin/receipts/${o.id}`;
  const prizes = new Map(o.tickets.filter((t) => t.prize).map((t) => [t.number, t.prize!.prize]));
  const wa = `https://wa.me/1${o.phone}?text=${encodeURIComponent(
    o.status === "APPROVED"
      ? `¡Hola ${o.name.split(" ")[0]}! Tu pago para "${o.raffle.title}" fue aprobado. Tus números: ${o.tickets.map((t) => t.number).join(", ")}`
      : `Hola ${o.name.split(" ")[0]}, te escribimos sobre tu pedido ${o.code} de "${o.raffle.title}".`,
  )}`;

  return (
    <>
      <Link href="/admin/pedidos" className="text-sm text-muted hover:text-white">← Pedidos</Link>
      <PageTitle>
        Pedido <span className="font-mono">{o.code}</span>{" "}
        <span className={`chip align-middle ${statusCls[o.status]}`}>{statusLabel[o.status]}</span>
      </PageTitle>
      <Flash ok={sp.ok} e={sp.e} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <dl className="card grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-6 text-sm">
            <dt className="text-muted">Cliente</dt><dd className="font-semibold">{o.name}</dd>
            <dt className="text-muted">Teléfono</dt>
            <dd><a href={wa} target="_blank" rel="noopener" className="text-emerald hover:underline">{o.phone} (WhatsApp)</a>
              {previous > 0 && <span className="ml-2 text-xs text-muted">{previous} pedidos anteriores</span>}</dd>
            <dt className="text-muted">Correo</dt><dd>{o.email ?? "—"}</dd>
            <dt className="text-muted">Rifa</dt><dd><Link href={`/admin/rifas/${o.raffleId}`} className="hover:text-gold">{o.raffle.title}</Link></dd>
            <dt className="text-muted">Boletos</dt><dd>{o.quantity}</dd>
            <dt className="text-muted">Monto a recibir</dt><dd className="text-lg font-bold text-gold">{money(o.total)}</dd>
            <dt className="text-muted">Banco</dt><dd>{o.bankAccount ? `${o.bankAccount.bank} · ${o.bankAccount.accountNumber}` : "—"}</dd>
            <dt className="text-muted">Creado</dt><dd>{formatDate(o.createdAt)}</dd>
            {o.reviewedAt && (<><dt className="text-muted">Revisado</dt><dd>{formatDate(o.reviewedAt)}</dd></>)}
            {o.rejectReason && (<><dt className="text-muted">Motivo</dt><dd className="text-danger">{o.rejectReason}</dd></>)}
            <dt className="text-muted">IP</dt><dd className="text-xs text-muted">{o.ip ?? "—"}</dd>
          </dl>

          {o.status === "PENDING" && (
            <div className="card space-y-4 p-6">
              <p className="text-sm text-muted">Confirma en tu banco que llegó una transferencia por <b className="text-white">{money(o.total)}</b> antes de aprobar.</p>
              <form action={approveOrderAction}>
                <input type="hidden" name="id" value={o.id} />
                <button className="btn-gold w-full">✓ Aprobar y asignar {o.quantity} números</button>
              </form>
              <form action={rejectOrderAction} className="flex gap-2">
                <input type="hidden" name="id" value={o.id} />
                <input name="reason" className="input" placeholder="Motivo del rechazo (lo verá el cliente)" />
                <button className="btn-danger shrink-0">Rechazar</button>
              </form>
            </div>
          )}

          {o.tickets.length > 0 && (
            <div className="card p-6">
              <p className="label">Números asignados</p>
              <TicketList numbers={o.tickets.map((t) => t.number)} total={o.raffle.totalTickets} prizes={prizes} />
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-4 text-sm">
            <span className="font-semibold">Comprobante</span>
            {o.receiptPath && <a href={receiptUrl} target="_blank" className="text-gold hover:underline">Abrir ↗</a>}
          </div>
          {!o.receiptPath ? (
            <p className="p-6 text-muted">Sin comprobante.</p>
          ) : isPdf ? (
            <iframe src={receiptUrl} className="h-[70vh] w-full bg-white" title="Comprobante" />
          ) : (
            <img src={receiptUrl} alt="Comprobante de pago" className="w-full" />
          )}
        </div>
      </div>
    </>
  );
}

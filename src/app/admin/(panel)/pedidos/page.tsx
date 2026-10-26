import type { OrderStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { approveOrderAction } from "@/app/admin/actions";
import { Flash, PageTitle, statusCls, statusLabel, type Search } from "@/components/admin/Flash";
import { db } from "@/lib/db";
import { formatDate, money } from "@/lib/format";

const tabs: [OrderStatus | "ALL", string][] = [
  ["PENDING", "Por revisar"],
  ["APPROVED", "Aprobados"],
  ["REJECTED", "Rechazados"],
  ["ALL", "Todos"],
];

export default async function OrdersPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const status = (sp.status ?? "PENDING") as OrderStatus | "ALL";
  const raffleId = Number(sp.rifa) || undefined;
  const q = sp.q?.trim();
  const page = Math.max(1, Number(sp.p) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(status !== "ALL" && { status }),
    ...(raffleId && { raffleId }),
    ...(q && {
      OR: [
        { code: { contains: q.toUpperCase() } },
        { phone: { contains: q.replace(/\D/g, "") || q } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    }),
  };
  const [orders, count, raffles] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      take: 50,
      skip: (page - 1) * 50,
      include: { raffle: { select: { title: true } }, bankAccount: { select: { bank: true } } },
    }),
    db.order.count({ where }),
    db.raffle.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const qs = (o: Record<string, string | number | undefined>) =>
    "?" + new URLSearchParams(Object.entries({ status, rifa: raffleId, q, ...o }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString();

  return (
    <>
      <PageTitle>Pedidos</PageTitle>
      <Flash ok={sp.ok} e={sp.e} />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([s, l]) => (
          <Link key={s} href={qs({ status: s, p: undefined })} className={`rounded-full border px-4 py-1.5 text-sm ${status === s ? "border-gold bg-gold text-ink" : "border-line text-muted"}`}>
            {l}
          </Link>
        ))}
      </div>
      <form className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="status" value={status} />
        <select name="rifa" defaultValue={raffleId ?? ""} className="input !w-auto">
          <option value="">Todas las rifas</option>
          {raffles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="Código, teléfono o nombre" className="input !w-auto flex-1" />
        <button className="btn-ghost">Filtrar</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-muted uppercase">
            <tr className="border-b border-line">
              <th className="p-3">Código</th><th className="p-3">Cliente</th><th className="p-3">Rifa</th>
              <th className="p-3">Boletos</th><th className="p-3">Total</th><th className="p-3">Banco</th>
              <th className="p-3">Fecha</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line/60 last:border-0">
                <td className="p-3">
                  <Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold hover:text-gold">{o.code}</Link>
                  <span className={`chip ml-2 ${statusCls[o.status]}`}>{statusLabel[o.status]}</span>
                </td>
                <td className="p-3">{o.name}<br /><span className="text-xs text-muted">{o.phone}</span></td>
                <td className="p-3 text-muted">{o.raffle.title}</td>
                <td className="p-3">{o.quantity}</td>
                <td className="p-3 font-semibold text-gold">{money(o.total)}</td>
                <td className="p-3 text-muted">{o.bankAccount?.bank ?? "—"}</td>
                <td className="p-3 text-xs text-muted">{formatDate(o.createdAt)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Link href={`/admin/pedidos/${o.id}`} className="btn-ghost !px-3 !py-1.5">Ver</Link>
                  {o.status === "PENDING" && (
                    <form action={approveOrderAction} className="ml-1 inline">
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="return" value={`/admin/pedidos${qs({})}`} />
                      <button className="btn-gold !px-3 !py-1.5">Aprobar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={8} className="p-8 text-center text-muted">No hay pedidos.</td></tr>}
          </tbody>
        </table>
      </div>
      {count > 50 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>{count} pedidos</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn-ghost !py-1.5" href={qs({ p: page - 1 })}>← Anterior</Link>}
            {page * 50 < count && <Link className="btn-ghost !py-1.5" href={qs({ p: page + 1 })}>Siguiente →</Link>}
          </div>
        </div>
      )}
    </>
  );
}

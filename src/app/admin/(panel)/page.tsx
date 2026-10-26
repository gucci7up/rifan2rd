import Link from "next/link";
import { PageTitle } from "@/components/admin/Flash";
import { StatusBadge } from "@/components/RaffleBits";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { rafflesStats } from "@/lib/raffles";

export default async function Dashboard() {
  const raffles = await db.raffle.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const stats = await rafflesStats(raffles.map((r) => r.id));
  const revenue = await db.order.groupBy({ by: ["raffleId"], where: { status: "APPROVED" }, _sum: { total: true } });
  const revMap = new Map(revenue.map((r) => [r.raffleId, Number(r._sum.total ?? 0)]));
  const [pendingCount, pendingSum] = await Promise.all([
    db.order.count({ where: { status: "PENDING" } }),
    db.order.aggregate({ where: { status: "PENDING" }, _sum: { total: true } }),
  ]);
  const totalRevenue = [...revMap.values()].reduce((a, b) => a + b, 0);

  const kpis = [
    ["Pedidos por revisar", pendingCount.toString(), "/admin/pedidos?status=PENDING"],
    ["Monto por validar", money(pendingSum._sum.total ?? 0), "/admin/pedidos?status=PENDING"],
    ["Ventas aprobadas", money(totalRevenue), "/admin/pedidos?status=APPROVED"],
    ["Rifas activas", raffles.filter((r) => r.status === "ACTIVE").length.toString(), "/admin/rifas"],
  ];

  return (
    <>
      <PageTitle action={<Link href="/admin/rifas/nueva" className="btn-gold">+ Nueva rifa</Link>}>Resumen</PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([label, value, href]) => (
          <Link key={label} href={href} className="card p-5 hover:border-gold/50">
            <p className="text-xs text-muted uppercase">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 mb-4 font-semibold">Rifas</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted uppercase">
            <tr className="border-b border-line">
              <th className="p-3">Rifa</th><th className="p-3">Estado</th><th className="p-3">Vendidos</th>
              <th className="p-3">En validación</th><th className="p-3">Recaudado</th>
            </tr>
          </thead>
          <tbody>
            {raffles.map((r) => {
              const s = stats.get(r.id)!;
              return (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="p-3"><Link href={`/admin/rifas/${r.id}`} className="font-semibold hover:text-gold">{r.title}</Link></td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3">{s.sold.toLocaleString("es-DO")} / {r.totalTickets.toLocaleString("es-DO")} ({Math.floor((s.sold / r.totalTickets) * 100)}%)</td>
                  <td className="p-3">{s.pending.toLocaleString("es-DO")}</td>
                  <td className="p-3 font-semibold text-gold">{money(revMap.get(r.id) ?? 0)}</td>
                </tr>
              );
            })}
            {!raffles.length && <tr><td colSpan={5} className="p-6 text-center text-muted">Aún no hay rifas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

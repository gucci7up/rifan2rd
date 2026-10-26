import Link from "next/link";
import { PageTitle } from "@/components/admin/Flash";
import { StatusBadge } from "@/components/RaffleBits";
import { db } from "@/lib/db";
import { formatDate, money } from "@/lib/format";

export default async function RafflesAdmin() {
  const raffles = await db.raffle.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, _count: { select: { tickets: true } } },
  });
  return (
    <>
      <PageTitle action={<Link href="/admin/rifas/nueva" className="btn-gold">+ Nueva rifa</Link>}>Rifas</PageTitle>
      <div className="grid gap-3">
        {raffles.map((r) => (
          <Link key={r.id} href={`/admin/rifas/${r.id}`} className="card flex items-center gap-4 p-4 hover:border-gold/50">
            {r.imageUrl ? (
              <img src={r.imageUrl} alt="" className="size-16 rounded-lg object-cover" />
            ) : (
              <span className="grid size-16 place-items-center rounded-lg bg-panel-2">🎟️</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.title}</p>
              <p className="text-xs text-muted">
                {money(r.ticketPrice)} · {r._count.tickets.toLocaleString("es-DO")}/{r.totalTickets.toLocaleString("es-DO")} vendidos
                {r.category && ` · ${r.category.name}`} · creada {formatDate(r.createdAt, false)}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </Link>
        ))}
        {!raffles.length && <p className="card p-8 text-center text-muted">Crea tu primera rifa.</p>}
      </div>
    </>
  );
}

import Link from "next/link";
import type { PublicRaffle } from "@/lib/queries";
import { money } from "@/lib/format";
import { DrawDate, Progress, StatusBadge } from "./RaffleBits";

export function RaffleCard({ r }: { r: PublicRaffle }) {
  const instantLeft = r.prizeNumbers.filter((p) => !p.ticketId).length;
  return (
    <Link
      href={`/rifas/${r.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-gold/50"
    >
      <div className="relative aspect-[4/3] bg-panel-2">
        {r.imageUrl ? (
          <img src={r.imageUrl} alt={r.title} className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center font-display text-4xl text-gold/40">🎟️</div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <StatusBadge status={r.status} />
          {r.category && <span className="chip border-white/20 bg-ink/70 text-white">{r.category.name}</span>}
        </div>
        {instantLeft > 0 && r.status === "ACTIVE" && (
          <span className="chip absolute bottom-3 left-3 border-gold/40 bg-ink/80 text-gold">
            ⚡ {instantLeft} premios instantáneos
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-display text-lg leading-tight font-bold group-hover:text-gold-2">{r.title}</h3>
          <p className="mt-1 text-xs text-muted">
            <DrawDate drawAt={r.drawAt} threshold={r.drawThresholdPct} status={r.status} />
          </p>
        </div>
        <Progress sold={r.sold} pending={r.pending} total={r.totalTickets} />
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-wide text-muted uppercase">Boleto</p>
            <p className="font-display text-2xl font-extrabold text-gold-gradient">{money(r.ticketPrice)}</p>
            {r.minPerOrder > 1 && <p className="text-[11px] text-muted">Mínimo {r.minPerOrder} boletos</p>}
          </div>
          <span className={r.status === "ACTIVE" ? "btn-gold" : "btn-ghost"}>
            {r.status === "ACTIVE" ? "Participar" : "Ver detalles"}
          </span>
        </div>
      </div>
    </Link>
  );
}

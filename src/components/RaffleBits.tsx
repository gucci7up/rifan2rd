import type { RaffleStatus } from "@prisma/client";
import { formatDate } from "@/lib/format";

const statusStyle: Record<RaffleStatus, [string, string]> = {
  ACTIVE: ["En venta", "border-emerald/40 bg-emerald/10 text-emerald"],
  PAUSED: ["Pausada", "border-muted/40 bg-muted/10 text-muted"],
  SOLD_OUT: ["Agotada · por sortear", "border-gold/40 bg-gold/10 text-gold"],
  DRAWN: ["Sorteada", "border-line bg-panel-2 text-muted"],
  DRAFT: ["Borrador", "border-line bg-panel-2 text-muted"],
  CANCELLED: ["Cancelada", "border-danger/40 bg-danger/10 text-danger"],
};

export function StatusBadge({ status }: { status: RaffleStatus }) {
  const [label, cls] = statusStyle[status];
  return <span className={`chip ${cls}`}>{label}</span>;
}

export function Progress({ sold, pending, total }: { sold: number; pending: number; total: number }) {
  const soldPct = (sold / total) * 100;
  const pendingPct = (pending / total) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-white">{Math.floor(soldPct)}% vendido</span>
        <span className="text-muted">
          {sold.toLocaleString("es-DO")} / {total.toLocaleString("es-DO")}
        </span>
      </div>
      <div
        className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-panel-2"
        role="progressbar"
        aria-valuenow={Math.floor(soldPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="bg-gradient-to-r from-gold to-gold-2" style={{ width: `${soldPct}%` }} />
        <div className="bg-gold/30" style={{ width: `${pendingPct}%` }} />
      </div>
      {pending > 0 && (
        <p className="mt-1 text-[11px] text-muted">
          + {pending.toLocaleString("es-DO")} boletos en validación de pago
        </p>
      )}
    </div>
  );
}

export function DrawDate({
  drawAt,
  threshold,
  status,
}: {
  drawAt: Date | null;
  threshold: number;
  status: RaffleStatus;
}) {
  if (status === "DRAWN") return <span className="text-muted">Sorteo realizado</span>;
  if (drawAt) return <span>Sorteo: <b className="text-white">{formatDate(drawAt)}</b></span>;
  return <span className="text-muted">La fecha se anuncia al llegar al {threshold}% vendido</span>;
}

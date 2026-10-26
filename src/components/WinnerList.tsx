import Link from "next/link";
import { formatDate, maskName, padTicket } from "@/lib/format";
import type { getWinners } from "@/lib/queries";

type W = Awaited<ReturnType<typeof getWinners>>[number];

export function WinnerList({ winners }: { winners: W[] }) {
  if (!winners.length) return <p className="card p-8 text-center text-muted">Pronto verás aquí a nuestros ganadores.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {winners.map((w) => (
        <li key={w.id} className="card flex items-center gap-4 p-4">
          {w.photoUrl ? (
            <img src={w.photoUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" loading="lazy" />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-gold/10 text-2xl">
              {w.type === "MAIN" ? "🏆" : "⚡"}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{maskName(w.name)}</p>
            <p className="truncate text-sm text-gold">{w.prize}</p>
            <p className="text-xs text-muted">
              {w.ticketNumber != null && w.raffle && <>Boleto #{padTicket(w.ticketNumber, w.raffle.totalTickets)} · </>}
              {formatDate(w.wonAt, false)}
            </p>
            {w.raffle && (
              <Link href={`/rifas/${w.raffle.slug}`} className="text-xs text-muted underline-offset-2 hover:underline">
                {w.raffle.title}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

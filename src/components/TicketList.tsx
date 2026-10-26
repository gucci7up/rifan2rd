import { padTicket } from "@/lib/format";

export function TicketList({
  numbers,
  total,
  prizes,
}: {
  numbers: number[];
  total: number;
  prizes?: Map<number, string>;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {numbers.map((n) => {
        const prize = prizes?.get(n);
        return (
          <li
            key={n}
            title={prize}
            className={`rounded-md border px-2 py-1 font-mono text-sm font-semibold ${
              prize ? "border-gold bg-gold text-ink" : "border-line bg-panel-2"
            }`}
          >
            {padTicket(n, total)}
            {prize && " ⚡"}
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { useActionState } from "react";
import { verifyTickets, type VerifyResult } from "@/app/(public)/verificar/actions";
import { padTicket } from "@/lib/format";

const statusLabel = {
  PENDING: ["En validación", "border-gold/40 bg-gold/10 text-gold"],
  APPROVED: ["Aprobado", "border-emerald/40 bg-emerald/10 text-emerald"],
  REJECTED: ["Rechazado", "border-danger/40 bg-danger/10 text-danger"],
} as const;

export function VerifyForm({ raffles, defaultRaffle }: { raffles: { id: number; title: string }[]; defaultRaffle?: number }) {
  const [state, action, pending] = useActionState<VerifyResult, FormData>(verifyTickets, {});

  return (
    <div className="space-y-6">
      <form action={action} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="raffleId">Rifa</label>
          <select id="raffleId" name="raffleId" className="input" defaultValue={defaultRaffle ?? raffles[0]?.id} required>
            {raffles.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="q">Teléfono o número de boleto</label>
          <input id="q" name="q" className="input" inputMode="numeric" placeholder="8095551234 o 01234" required />
        </div>
        <button className="btn-gold w-full" disabled={pending}>{pending ? "Buscando…" : "Buscar"}</button>
      </form>

      {state.error && <p role="alert" className="card p-5 text-center text-sm text-muted">{state.error}</p>}

      {state.orders?.map((o, i) => {
        const [label, cls] = statusLabel[o.status];
        const prizes = new Map(o.prizes);
        return (
          <div key={o.code || i} className="card space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{o.name}</p>
                {o.code && <p className="font-mono text-xs text-muted">Pedido {o.code} · {o.quantity} boletos</p>}
              </div>
              <span className={`chip ${cls}`}>{label}</span>
            </div>
            {o.numbers.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {o.numbers.map((n) => (
                  <li key={n} className={`rounded-md border px-2 py-1 font-mono text-sm font-semibold ${prizes.has(n) ? "border-gold bg-gold text-ink" : "border-line bg-panel-2"}`}>
                    {padTicket(n, state.totalTickets!)}{prizes.has(n) && " ⚡"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Los números se asignan al aprobar el pago.</p>
            )}
            {prizes.size > 0 && (
              <p className="text-sm font-semibold text-gold">⚡ Premio instantáneo: {[...prizes.values()].join(", ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

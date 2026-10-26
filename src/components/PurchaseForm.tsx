"use client";

import Script from "next/script";
import { useActionState, useEffect, useMemo, useState } from "react";
import { submitOrder, type OrderState } from "@/app/(public)/rifas/[slug]/actions";
import { money } from "@/lib/format";

type Pkg = { id: number; quantity: number; price: number; highlight: boolean };
type Bank = { id: number; bank: string; holder: string; accountNumber: string; accountType: string; documentId: string | null };

export function PurchaseForm({
  raffle,
  packages,
  banks,
  turnstileSiteKey,
}: {
  raffle: { id: number; ticketPrice: number; minPerOrder: number; maxPerPhone: number; available: number };
  packages: Pkg[];
  banks: Bank[];
  turnstileSiteKey: string;
}) {
  const [state, action, pending] = useActionState<OrderState, FormData>(submitOrder, {});
  const usable = packages.filter((p) => p.quantity <= raffle.available && p.quantity >= raffle.minPerOrder);
  const [mode, setMode] = useState<"pkg" | "free">(usable.length ? "pkg" : "free");
  const [pkgId, setPkgId] = useState<number | null>(usable.find((p) => p.highlight)?.id ?? usable[0]?.id ?? null);
  const maxQty = Math.min(raffle.maxPerPhone, raffle.available);
  const [qty, setQty] = useState(Math.min(raffle.minPerOrder, maxQty));
  const [bankId, setBankId] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");

  const selected = usable.find((p) => p.id === pkgId);
  const { quantity, total } = useMemo(
    () =>
      mode === "pkg" && selected
        ? { quantity: selected.quantity, total: selected.price }
        : { quantity: qty, total: qty * raffle.ticketPrice },
    [mode, selected, qty, raffle.ticketPrice],
  );
  const bank = banks.find((b) => b.id === bankId);

  // React vacía el input de archivo al terminar la acción; sincronizamos la etiqueta.
  useEffect(() => setFileName(""), [state]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="raffleId" value={raffle.id} />
      <input type="hidden" name={mode === "pkg" ? "packageId" : "quantity"} value={mode === "pkg" ? (pkgId ?? "") : qty} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <fieldset>
        <legend className="label">1 · ¿Cuántos boletos?</legend>
        {usable.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1 text-sm font-semibold">
            {(["pkg", "free"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 ${mode === m ? "bg-gold text-ink" : "text-muted"}`}
              >
                {m === "pkg" ? "Paquetes" : "Cantidad libre"}
              </button>
            ))}
          </div>
        )}
        {mode === "pkg" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {usable.map((p) => {
              const regular = p.quantity * raffle.ticketPrice;
              const save = regular - p.price;
              return (
                <label
                  key={p.id}
                  className={`relative cursor-pointer rounded-xl border p-3 text-center transition ${
                    pkgId === p.id ? "border-gold bg-gold/10" : "border-line bg-panel-2 hover:border-gold/50"
                  }`}
                >
                  <input type="radio" className="sr-only" checked={pkgId === p.id} onChange={() => setPkgId(p.id)} />
                  {p.highlight && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 text-[10px] font-bold text-ink">
                      POPULAR
                    </span>
                  )}
                  <span className="block font-display text-2xl font-extrabold">{p.quantity}</span>
                  <span className="block text-[11px] text-muted uppercase">boletos</span>
                  <span className="mt-1 block text-sm font-semibold text-gold">{money(p.price)}</span>
                  {save > 0.009 && <span className="block text-[11px] text-emerald">Ahorras {money(save)}</span>}
                </label>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost !px-4" onClick={() => setQty((q) => Math.max(raffle.minPerOrder, q - 1))}>−</button>
            <input
              type="number"
              inputMode="numeric"
              className="input text-center font-display text-xl font-bold"
              min={raffle.minPerOrder}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(Math.max(0, Math.min(maxQty, Number(e.target.value) || 0)))}
              aria-label="Cantidad de boletos"
            />
            <button type="button" className="btn-ghost !px-4" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Mínimo {raffle.minPerOrder} · máximo {raffle.maxPerPhone.toLocaleString("es-DO")} por persona. Los números se
          asignan al azar al validar tu pago.
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="label">2 · Tus datos</legend>
        <input name="name" className="input" placeholder="Nombre y apellido" required autoComplete="name" defaultValue={state.fields?.name} />
        <input name="phone" className="input" placeholder="WhatsApp (809, 829 o 849)" required inputMode="tel" autoComplete="tel-national" defaultValue={state.fields?.phone} />
        <input name="email" type="email" className="input" placeholder="Correo (opcional)" autoComplete="email" defaultValue={state.fields?.email} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="label">3 · Transfiere y sube el comprobante</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {banks.map((b) => (
            <label
              key={b.id}
              className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
                bankId === b.id ? "border-gold bg-gold/10" : "border-line bg-panel-2 hover:border-gold/50"
              }`}
            >
              <input type="radio" name="bankAccountId" value={b.id} className="sr-only" checked={bankId === b.id} onChange={() => setBankId(b.id)} required />
              <span className="font-semibold">{b.bank}</span>
            </label>
          ))}
        </div>
        {bank && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
            <dt className="text-muted">Banco</dt><dd className="font-semibold">{bank.bank}</dd>
            <dt className="text-muted">Titular</dt><dd className="font-semibold">{bank.holder}</dd>
            <dt className="text-muted">Cuenta</dt>
            <dd className="flex items-center gap-2 font-mono font-semibold">
              {bank.accountNumber}
              <button type="button" className="text-xs text-gold hover:underline" onClick={() => navigator.clipboard?.writeText(bank.accountNumber)}>
                Copiar
              </button>
            </dd>
            <dt className="text-muted">Tipo</dt><dd>{bank.accountType}</dd>
            {bank.documentId && (<><dt className="text-muted">Cédula/RNC</dt><dd>{bank.documentId}</dd></>)}
            <dt className="text-muted">Monto</dt><dd className="font-semibold text-gold">{money(total)}</dd>
          </dl>
        )}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-panel-2 p-6 text-center text-sm hover:border-gold/60">
          <span className="text-2xl">📎</span>
          <span className="font-semibold">{fileName || "Toca para subir el comprobante"}</span>
          <span className="text-xs text-muted">JPG, PNG, WEBP o PDF · máximo 10 MB</span>
          <input
            type="file"
            name="receipt"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
      </fieldset>

      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="dark" />
        </>
      )}

      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-[#f4c542]" />
        <span>
          Soy mayor de 18 años, mis datos son correctos y acepto los{" "}
          <a href="/terminos" target="_blank" className="text-gold underline">términos y condiciones</a>.
        </span>
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-4 rounded-2xl border border-line bg-ink/95 p-4 backdrop-blur">
        <div>
          <p className="text-xs text-muted">{quantity} boletos</p>
          <p className="font-display text-2xl font-extrabold text-gold-gradient">{money(total)}</p>
        </div>
        <button className="btn-gold" disabled={pending || quantity < raffle.minPerOrder || quantity > maxQty}>
          {pending ? "Enviando…" : "Confirmar compra"}
        </button>
      </div>
    </form>
  );
}

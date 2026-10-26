import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseForm } from "@/components/PurchaseForm";
import { DrawDate, Progress, StatusBadge } from "@/components/RaffleBits";
import { site } from "@/lib/config";
import { formatDate, money, padTicket } from "@/lib/format";
import { getBankAccounts, getRaffleBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getRaffleBySlug((await params).slug);
  if (!r) return {};
  const description = `${r.mainPrize} · Boleto ${money(r.ticketPrice)}. ${r.description.slice(0, 120)}`;
  return {
    title: r.title,
    description,
    alternates: { canonical: `/rifas/${r.slug}` },
    openGraph: { title: r.title, description, images: r.imageUrl ? [r.imageUrl] : undefined },
  };
}

export default async function RafflePage({ params }: Props) {
  const r = await getRaffleBySlug((await params).slug);
  if (!r) notFound();
  const banks = r.status === "ACTIVE" ? await getBankAccounts() : [];
  const canBuy = r.status === "ACTIVE" && r.available >= r.minPerOrder && banks.length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: r.title,
    description: r.description,
    image: r.imageUrl ? [new URL(r.imageUrl, site.url).toString()] : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "DOP",
      price: r.ticketPrice,
      availability: canBuy ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: `${site.url}/rifas/${r.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-5 text-sm text-muted">
        <Link href="/" className="hover:text-white">Inicio</Link> / <Link href="/#rifas" className="hover:text-white">Rifas</Link> /{" "}
        <span className="text-white">{r.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.title} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/3] place-items-center text-6xl">🎟️</div>
            )}
          </div>

          <div className="card space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.status} />
              {r.category && <span className="chip border-line text-muted">{r.category.name}</span>}
            </div>
            <h1 className="font-display text-3xl leading-tight font-extrabold">{r.title}</h1>
            <p className="text-sm">
              Premio mayor: <b className="text-gold">{r.mainPrize}</b>
            </p>
            <p className="text-sm text-muted">
              <DrawDate drawAt={r.drawAt} threshold={r.drawThresholdPct} status={r.status} />
            </p>
            <Progress sold={r.sold} pending={r.pending} total={r.totalTickets} />
            <p className="text-sm whitespace-pre-line text-muted">{r.description}</p>
          </div>

          {r.prizeNumbers.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold">⚡ Premios instantáneos</h2>
              <p className="mt-1 text-sm text-muted">Si al validar tu pago te toca uno de estos números, ganas al momento.</p>
              <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {r.prizeNumbers.map((p) => (
                  <li
                    key={p.number}
                    title={p.prize}
                    className={`rounded-lg border px-2 py-2 text-center ${
                      p.ticketId ? "border-line bg-panel-2 text-muted line-through" : "border-gold/40 bg-gold/5"
                    }`}
                  >
                    <span className="block font-mono text-sm font-bold">{padTicket(p.number, r.totalTickets)}</span>
                    <span className="block truncate text-[10px] text-muted no-underline">{p.ticketId ? "Ya salió" : p.prize}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card space-y-3 p-6 text-sm">
            <h2 className="font-display text-xl font-bold">🔒 Sorteo verificable</h2>
            {r.seedHash ? (
              <>
                <p className="text-muted">
                  Esta es la huella (SHA-256) de la semilla secreta del sorteo, publicada antes de vender. Al sortear
                  revelamos la semilla para que puedas comprobar que no cambió.
                </p>
                <code className="block rounded-lg bg-panel-2 p-3 font-mono text-xs break-all text-gold-2">{r.seedHash}</code>
                {r.status === "DRAWN" && r.seed && (
                  <>
                    <p className="text-muted">Semilla revelada:</p>
                    <code className="block rounded-lg bg-panel-2 p-3 font-mono text-xs break-all">{r.seed}</code>
                  </>
                )}
                <Link href={`/rifas/${r.slug}/sorteo`} className="inline-block text-gold hover:underline">
                  Cómo verificar el sorteo →
                </Link>
              </>
            ) : (
              <p className="text-muted">La huella del sorteo se publica al activar la rifa.</p>
            )}
            {r.status === "DRAWN" && r.winningNumber != null && (
              <p className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-center">
                Número ganador:{" "}
                <b className="font-mono text-2xl text-gold">{padTicket(r.winningNumber, r.totalTickets)}</b>
                {r.drawnAt && <span className="block text-xs text-muted">{formatDate(r.drawnAt)}</span>}
              </p>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted uppercase">Precio por boleto</p>
                <p className="font-display text-3xl font-extrabold text-gold-gradient">{money(r.ticketPrice)}</p>
              </div>
              <p className="text-right text-xs text-muted">
                Quedan<br />
                <b className="text-base text-white">{r.available.toLocaleString("es-DO")}</b>
              </p>
            </div>
            {canBuy ? (
              <PurchaseForm
                raffle={{ id: r.id, ticketPrice: r.ticketPrice, minPerOrder: r.minPerOrder, maxPerPhone: r.maxPerPhone, available: r.available }}
                packages={r.packages}
                banks={banks}
                turnstileSiteKey={site.turnstileSiteKey}
              />
            ) : (
              <p className="rounded-xl bg-panel-2 p-5 text-center text-sm text-muted">
                {r.status === "ACTIVE"
                  ? r.available < r.minPerOrder
                    ? "Todos los boletos están vendidos o en validación."
                    : "Las compras abrirán en breve."
                  : r.status === "DRAWN"
                    ? "Esta rifa ya fue sorteada."
                    : r.status === "SOLD_OUT"
                      ? "¡Boletos agotados! Pronto el sorteo."
                      : "Las ventas están pausadas temporalmente."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

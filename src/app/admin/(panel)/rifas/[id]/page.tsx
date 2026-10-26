import Link from "next/link";
import { notFound } from "next/navigation";
import { drawAction, savePackages, savePrizeNumbers } from "@/app/admin/actions";
import { Flash, PageTitle, type Search } from "@/components/admin/Flash";
import { RaffleForm } from "@/components/admin/RaffleForm";
import { Progress, StatusBadge } from "@/components/RaffleBits";
import { db } from "@/lib/db";
import { formatDate, money, padTicket } from "@/lib/format";
import { raffleStats } from "@/lib/raffles";

export default async function EditRaffle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const raffle = Number.isInteger(id)
    ? await db.raffle.findUnique({
        where: { id },
        include: {
          packages: { orderBy: [{ sortOrder: "asc" }, { quantity: "asc" }] },
          prizeNumbers: { orderBy: { number: "asc" }, include: { ticket: { include: { order: true } } } },
        },
      })
    : null;
  if (!raffle) notFound();
  const [categories, stats, pendingOrders] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    raffleStats(raffle.id),
    db.order.count({ where: { raffleId: raffle.id, status: "PENDING" } }),
  ]);
  const price = Number(raffle.ticketPrice);

  const packagesText = raffle.packages.map((p) => `${p.quantity} = ${Number(p.price)}${p.highlight ? " *" : ""}`).join("\n");
  const prizesText = raffle.prizeNumbers.filter((p) => !p.ticketId).map((p) => `${p.number} = ${p.prize}`).join("\n");
  const won = raffle.prizeNumbers.filter((p) => p.ticket);

  return (
    <>
      <Link href="/admin/rifas" className="text-sm text-muted hover:text-white">← Rifas</Link>
      <PageTitle
        action={
          raffle.status !== "DRAFT" && (
            <Link href={`/rifas/${raffle.slug}`} target="_blank" className="btn-ghost">Ver pública ↗</Link>
          )
        }
      >
        {raffle.title} <StatusBadge status={raffle.status} />
      </PageTitle>
      <Flash ok={sp.ok} e={sp.e} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-5 sm:col-span-2"><Progress sold={stats.sold} pending={stats.pending} total={raffle.totalTickets} /></div>
        <Link href={`/admin/pedidos?rifa=${raffle.id}&status=PENDING`} className="card p-5 hover:border-gold/50">
          <p className="text-xs text-muted uppercase">Pedidos por revisar</p>
          <p className="mt-1 font-display text-2xl font-bold">{pendingOrders}</p>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <RaffleForm raffle={raffle} categories={categories} />

        <div className="space-y-6">
          <form action={savePackages} className="card space-y-3 p-6">
            <input type="hidden" name="raffleId" value={raffle.id} />
            <h2 className="font-semibold">Paquetes</h2>
            <p className="text-xs text-muted">
              Una línea por paquete: <code>cantidad = precio</code>. Agrega <code>*</code> para marcarlo como popular.
              Precio normal: {money(price)} por boleto. Ej. <code>{`10 = ${price * 10 * 0.9}`}</code> (10% de descuento).
            </p>
            <textarea name="packages" rows={7} className="input font-mono" defaultValue={packagesText} placeholder={`5 = ${price * 5}\n10 = ${price * 9} *\n25 = ${price * 22}`} />
            <button className="btn-ghost">Guardar paquetes</button>
          </form>

          <form action={savePrizeNumbers} className="card space-y-3 p-6">
            <input type="hidden" name="raffleId" value={raffle.id} />
            <h2 className="font-semibold">⚡ Números premiados</h2>
            <p className="text-xs text-muted">
              Una línea por número: <code>número = premio</code>. Rango 1–{raffle.totalTickets.toLocaleString("es-DO")}.
              Quien reciba uno gana al aprobar su pago.
            </p>
            <textarea name="prizes" rows={8} className="input font-mono" defaultValue={prizesText} placeholder={"11111 = RD$7,500\n22222 = RD$7,500"} />
            <button className="btn-ghost">Guardar números premiados</button>
            {won.length > 0 && (
              <div className="border-t border-line pt-3">
                <p className="label">Ya salieron</p>
                <ul className="space-y-1 text-sm">
                  {won.map((p) => (
                    <li key={p.id}>
                      <span className="font-mono text-gold">{padTicket(p.number, raffle.totalTickets)}</span> · {p.prize} ·{" "}
                      <Link href={`/admin/pedidos/${p.ticket!.orderId}`} className="hover:underline">{p.ticket!.order.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>

          <div className="card space-y-3 p-6">
            <h2 className="font-semibold">🔒 Sorteo</h2>
            {raffle.status === "DRAWN" ? (
              <p className="text-sm">
                Ganador: <b className="font-mono text-gold">{padTicket(raffle.winningNumber!, raffle.totalTickets)}</b>
                {raffle.drawnAt && <span className="text-muted"> · {formatDate(raffle.drawnAt)}</span>}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted">
                  Hash publicado: <code className="break-all">{raffle.seedHash ?? "se genera al activar la rifa"}</code>
                </p>
                <form action={drawAction} className="space-y-3">
                  <input type="hidden" name="raffleId" value={raffle.id} />
                  <input name="manualNumber" type="number" className="input" placeholder="Número ganador manual (opcional, ej. de la lotería)" />
                  <input name="confirm" className="input" placeholder='Escribe SORTEAR para confirmar' autoComplete="off" />
                  <button className="btn-gold w-full" disabled={!stats.sold}>Realizar sorteo</button>
                  <p className="text-xs text-muted">
                    Sin número manual se usa el sorteo verificable con la semilla. Todos los pedidos deben estar revisados.
                    Esta acción no se puede deshacer.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

import { saveWinner, updateWinner } from "@/app/admin/actions";
import { Flash, PageTitle, type Search } from "@/components/admin/Flash";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function WinnersAdmin({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const [winners, raffles] = await Promise.all([
    db.winner.findMany({ orderBy: { wonAt: "desc" }, take: 200, include: { raffle: { select: { title: true } } } }),
    db.raffle.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageTitle>Ganadores</PageTitle>
      <Flash ok={sp.ok} e={sp.e} />
      <p className="mb-6 text-sm text-muted">
        Los ganadores del sorteo y de los premios instantáneos se agregan solos. Aquí puedes subir la foto de la
        entrega, ocultarlos o agregar ganadores de rifas anteriores.
      </p>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ul className="card divide-y divide-line">
          {winners.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              {w.photoUrl ? <img src={w.photoUrl} alt="" className="size-12 rounded-lg object-cover" /> : <span className="grid size-12 place-items-center rounded-lg bg-panel-2">{w.type === "MAIN" ? "🏆" : "⚡"}</span>}
              <div className={`min-w-0 flex-1 ${w.published ? "" : "opacity-50"}`}>
                <p className="font-semibold">{w.name} · <span className="text-gold">{w.prize}</span></p>
                <p className="text-xs text-muted">{w.raffle?.title ?? "—"} {w.ticketNumber != null && `· #${w.ticketNumber}`} · {formatDate(w.wonAt, false)}</p>
              </div>
              <form action={updateWinner} className="flex items-center gap-1">
                <input type="hidden" name="id" value={w.id} />
                <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="w-36 text-xs text-muted file:mr-2 file:rounded-md file:border-0 file:bg-panel-2 file:px-2 file:py-1 file:text-white" />
                <button name="op" value="photo" className="btn-ghost !px-2 !py-1 text-xs">Subir foto</button>
                <button name="op" value="toggle" className="btn-ghost !px-2 !py-1 text-xs">{w.published ? "Ocultar" : "Publicar"}</button>
                <button name="op" value="delete" className="btn-danger !px-2 !py-1 text-xs">Borrar</button>
              </form>
            </li>
          ))}
          {!winners.length && <li className="p-8 text-center text-muted">Aún no hay ganadores.</li>}
        </ul>

        <form action={saveWinner} className="card h-fit space-y-3 p-6">
          <h2 className="font-semibold">Agregar ganador</h2>
          <input name="name" className="input" placeholder="Nombre" required />
          <input name="prize" className="input" placeholder="Premio" required />
          <select name="raffleId" className="input" defaultValue="">
            <option value="">Sin rifa asociada</option>
            {raffles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
          <input name="ticketNumber" type="number" className="input" placeholder="Número de boleto (opcional)" />
          <input name="wonAt" type="date" className="input" />
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
          <button className="btn-gold w-full">Agregar</button>
        </form>
      </div>
    </>
  );
}

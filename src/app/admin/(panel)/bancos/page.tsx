import { deleteCategory, saveBank, saveCategory, toggleBank } from "@/app/admin/actions";
import { Flash, PageTitle, type Search } from "@/components/admin/Flash";
import { db } from "@/lib/db";

export default async function BanksPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const [banks, categories] = await Promise.all([
    db.bankAccount.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { raffles: true } } } }),
  ]);
  return (
    <>
      <PageTitle>Bancos y categorías</PageTitle>
      <Flash ok={sp.ok} e={sp.e} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold">Cuentas para transferencias</h2>
          <ul className="divide-y divide-line">
            {banks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className={b.active ? "" : "opacity-50"}>
                  <p className="font-semibold">{b.bank}</p>
                  <p className="text-muted">{b.holder} · {b.accountType} · <span className="font-mono">{b.accountNumber}</span></p>
                </div>
                <form action={toggleBank}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="btn-ghost !px-3 !py-1.5">{b.active ? "Ocultar" : "Activar"}</button>
                </form>
              </li>
            ))}
            {!banks.length && <li className="py-3 text-sm text-muted">Agrega al menos una cuenta para poder vender.</li>}
          </ul>
          <form action={saveBank} className="grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
            <input name="bank" className="input" placeholder="Banco (ej. Banreservas)" required />
            <input name="holder" className="input" placeholder="Titular" required />
            <input name="accountNumber" className="input" placeholder="Número de cuenta" required />
            <select name="accountType" className="input">
              <option>Ahorros</option><option>Corriente</option>
            </select>
            <input name="documentId" className="input sm:col-span-2" placeholder="Cédula o RNC (opcional)" />
            <button className="btn-gold sm:col-span-2">Agregar cuenta</button>
          </form>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="font-semibold">Categorías</h2>
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-full border border-line py-1 pr-1 pl-3 text-sm">
                {c.name} <span className="text-xs text-muted">({c._count.raffles})</span>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="grid size-6 place-items-center rounded-full text-muted hover:bg-danger/20 hover:text-danger" aria-label={`Eliminar ${c.name}`}>×</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={saveCategory} className="flex gap-2">
            <input name="name" className="input" placeholder="Nueva categoría (ej. Vehículos)" required />
            <button className="btn-ghost shrink-0">Agregar</button>
          </form>
        </section>
      </div>
    </>
  );
}

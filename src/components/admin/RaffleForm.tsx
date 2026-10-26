import type { Category, Raffle } from "@prisma/client";
import { saveRaffle } from "@/app/admin/actions";

const statuses = [
  ["DRAFT", "Borrador (no visible)"],
  ["ACTIVE", "Activa (en venta)"],
  ["PAUSED", "Pausada (visible, sin ventas)"],
  ["SOLD_OUT", "Agotada"],
  ["CANCELLED", "Cancelada (oculta)"],
] as const;

/** Fecha UTC → valor de <input type="datetime-local"> en hora de RD (UTC-4, sin horario de verano). */
function toLocalInput(d: Date | null) {
  return d ? new Date(d.getTime() - 4 * 3600_000).toISOString().slice(0, 16) : "";
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function RaffleForm({ raffle, categories }: { raffle?: Raffle; categories: Category[] }) {
  return (
    <form action={saveRaffle} className="card grid gap-4 p-6 sm:grid-cols-2">
      {raffle && <input type="hidden" name="id" value={raffle.id} />}
      <div className="sm:col-span-2">
        <Field label="Título">
          <input name="title" className="input" required defaultValue={raffle?.title} placeholder="Honda Civic 2024 + 25 premios de RD$7,500" />
        </Field>
      </div>
      <Field label="Premio mayor">
        <input name="mainPrize" className="input" required defaultValue={raffle?.mainPrize} placeholder="Honda Civic 2024" />
      </Field>
      <Field label="URL (slug)" hint="Se genera del título si lo dejas vacío.">
        <input name="slug" className="input" defaultValue={raffle?.slug} placeholder="honda-civic-2024" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Descripción">
          <textarea name="description" rows={5} className="input" defaultValue={raffle?.description} />
        </Field>
      </div>
      <Field label="Precio por boleto (RD$)">
        <input name="ticketPrice" type="number" step="0.01" min="1" className="input" required defaultValue={raffle ? Number(raffle.ticketPrice) : 25} />
      </Field>
      <Field label="Total de boletos" hint="Ej. 99999 para números de 5 cifras.">
        <input name="totalTickets" type="number" min="10" max="999999" className="input" required defaultValue={raffle?.totalTickets ?? 99999} />
      </Field>
      <Field label="Mínimo por compra">
        <input name="minPerOrder" type="number" min="1" className="input" defaultValue={raffle?.minPerOrder ?? 1} />
      </Field>
      <Field label="Máximo por teléfono">
        <input name="maxPerPhone" type="number" min="1" className="input" defaultValue={raffle?.maxPerPhone ?? 1000} />
      </Field>
      <Field label="Fecha del sorteo (hora RD)" hint="Déjala vacía para anunciarla al llegar al % indicado.">
        <input name="drawAt" type="datetime-local" className="input" defaultValue={toLocalInput(raffle?.drawAt ?? null)} />
      </Field>
      <Field label="Anunciar fecha al llegar al (%)">
        <input name="drawThresholdPct" type="number" min="1" max="100" className="input" defaultValue={raffle?.drawThresholdPct ?? 80} />
      </Field>
      <Field label="Categoría">
        <select name="categoryId" className="input" defaultValue={raffle?.categoryId ?? ""}>
          <option value="">Sin categoría</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Estado">
        <select name="status" className="input" defaultValue={raffle?.status === "DRAWN" ? "SOLD_OUT" : (raffle?.status ?? "DRAFT")} disabled={raffle?.status === "DRAWN"}>
          {statuses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {raffle?.status === "DRAWN" && <input type="hidden" name="status" value="DRAWN" />}
      </Field>
      <div className="sm:col-span-2">
        <Field label="Imagen (JPG, PNG o WEBP)" hint="Recomendado: 1200×900 px.">
          <div className="flex items-center gap-4">
            {raffle?.imageUrl && <img src={raffle.imageUrl} alt="" className="h-16 w-20 rounded-lg object-cover" />}
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
          </div>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <button className="btn-gold">{raffle ? "Guardar cambios" : "Crear rifa"}</button>
      </div>
    </form>
  );
}

import Link from "next/link";
import { Catalog } from "@/components/Catalog";
import { RaffleCard } from "@/components/RaffleCard";
import { WinnerList } from "@/components/WinnerList";
import { site } from "@/lib/config";
import { getCategories, getPublicRaffles, getWinners } from "@/lib/queries";

export const dynamic = "force-dynamic";

const steps = [
  ["Elige tu rifa", "Mira el premio, el precio del boleto y cuántos quedan."],
  ["Paga por transferencia", "Elige un paquete, transfiere al banco que prefieras y sube el comprobante."],
  ["Recibe tus números", "Validamos tu pago (normalmente en pocas horas) y te asignamos números al azar."],
  ["Verifica cuando quieras", "Consulta tus boletos con tu teléfono en el verificador."],
  ["Sorteo en vivo y verificable", "Publicamos la huella del sorteo antes de empezar para que nadie pueda cambiar el resultado."],
];

const faqs = [
  ["¿Cómo sé que el sorteo es justo?", "Antes de vender, publicamos el hash (huella SHA-256) de una semilla secreta. El día del sorteo revelamos la semilla y el número ganador sale de una fórmula pública. Cualquiera puede comprobar que la semilla coincide con la huella y repetir el cálculo en la página de la rifa."],
  ["¿Qué son los premios instantáneos?", "Algunas rifas tienen números premiados. Si al validar tu pago te toca uno de ellos, ganas ese premio de inmediato, además de seguir participando por el premio mayor."],
  ["¿Cuánto tarda la validación?", "Revisamos los comprobantes todos los días. Normalmente en pocas horas y como máximo en 24 horas."],
  ["¿Qué pasa si rechazan mi pago?", "Te contactamos por WhatsApp con el motivo. Si fue un error, puedes volver a enviar tu comprobante."],
  ["¿Cuándo es el sorteo?", "Cada rifa muestra su fecha. Si aún no tiene, se anuncia al alcanzar el porcentaje de venta indicado en la rifa."],
];

export default async function Home() {
  const [raffles, categories, winners] = await Promise.all([getPublicRaffles(), getCategories(), getWinners(6)]);
  const usedCats = categories.filter((c) => raffles.some((r) => r.category?.id === c.id));

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 text-center sm:pt-20">
        <p className="chip mx-auto border-gold/30 bg-gold/10 text-gold">Sorteos verificables · República Dominicana</p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl leading-[1.05] font-extrabold sm:text-6xl">
          Gana premios reales con <span className="text-gold-gradient">rifas transparentes</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted">
          Boletos desde poco dinero, números asignados al azar y un sorteo que cualquiera puede comprobar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="#rifas" className="btn-gold">Ver rifas disponibles</Link>
          <Link href="/verificar" className="btn-ghost">Verificar mis boletos</Link>
        </div>
      </section>

      <section id="rifas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <h2 className="mb-6 font-display text-2xl font-bold sm:text-3xl">Rifas</h2>
        {raffles.length ? (
          <Catalog
            categories={usedCats}
            items={raffles.map((r) => ({ key: r.id, category: r.category?.slug ?? null, node: <RaffleCard r={r} /> }))}
          />
        ) : (
          <p className="card p-10 text-center text-muted">Muy pronto publicaremos nuevas rifas. ¡Síguenos!</p>
        )}
      </section>

      <section id="como-jugar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <h2 className="mb-6 font-display text-2xl font-bold sm:text-3xl">Cómo jugar</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="grid size-9 place-items-center rounded-lg bg-gold font-display font-extrabold text-ink">{i + 1}</span>
              <p className="mt-4 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
        {site.instagram && (
          <p className="mt-4 text-sm text-muted">
            Sorteos en vivo por{" "}
            <a className="text-gold hover:underline" href={`https://instagram.com/${site.instagram}`} target="_blank" rel="noopener">
              @{site.instagram}
            </a>
          </p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Ganadores recientes</h2>
          <Link href="/ganadores" className="text-sm text-gold hover:underline">Ver todos</Link>
        </div>
        <WinnerList winners={winners} />
      </section>

      <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-10">
        <h2 className="mb-6 font-display text-2xl font-bold sm:text-3xl">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="card group p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {q}
                  <span className="text-gold transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

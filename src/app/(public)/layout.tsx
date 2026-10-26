import Link from "next/link";
import { Logo } from "@/components/Logo";
import { site } from "@/lib/config";

const nav = [
  { href: "/#rifas", label: "Rifas" },
  { href: "/#como-jugar", label: "Cómo jugar" },
  { href: "/ganadores", label: "Ganadores" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-glow flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/verificar" className="btn-gold !px-4 !py-2">
            Verificar boleto
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-line/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted md:grid-cols-3">
          <div className="space-y-3">
            <Logo />
            <p>{site.description}</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-white">Información</p>
            <Link href="/terminos" className="block hover:text-white">Términos y condiciones</Link>
            <Link href="/#preguntas" className="block hover:text-white">Preguntas frecuentes</Link>
            <Link href="/ganadores" className="block hover:text-white">Ganadores</Link>
            <Link href="/verificar" className="block hover:text-white">Verificar boletos</Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-white">Contacto</p>
            {site.whatsapp && (
              <a href={`https://wa.me/${site.whatsapp}`} className="block hover:text-white" target="_blank" rel="noopener">
                WhatsApp: +{site.whatsapp}
              </a>
            )}
            {site.instagram && (
              <a href={`https://instagram.com/${site.instagram}`} className="block hover:text-white" target="_blank" rel="noopener">
                Instagram: @{site.instagram}
              </a>
            )}
            {site.legalName && <p>{site.legalName}</p>}
            {site.permit && <p>Permiso: {site.permit}</p>}
          </div>
        </div>
        <p className="border-t border-line/60 py-5 text-center text-xs text-muted">
          © {new Date().getFullYear()} {site.name}. Juega con responsabilidad. Solo mayores de 18 años.
        </p>
      </footer>

      {site.whatsapp && (
        <a
          href={`https://wa.me/${site.whatsapp}`}
          target="_blank"
          rel="noopener"
          aria-label="Escríbenos por WhatsApp"
          className="fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-emerald text-ink shadow-lg shadow-emerald/30 transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z" />
          </svg>
        </a>
      )}
    </div>
  );
}

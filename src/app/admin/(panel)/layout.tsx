import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

async function logout() {
  "use server";
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const pending = await db.order.count({ where: { status: "PENDING" } });
  const nav = [
    { href: "/admin", label: "Resumen" },
    { href: "/admin/pedidos", label: "Pedidos", badge: pending },
    { href: "/admin/rifas", label: "Rifas" },
    { href: "/admin/ganadores", label: "Ganadores" },
    { href: "/admin/bancos", label: "Bancos y categorías" },
  ];
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[230px_1fr]">
      <aside className="border-b border-line bg-panel md:min-h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between p-4 md:block md:space-y-6 md:p-5">
          <Logo />
          <form action={logout} className="md:hidden">
            <button className="text-sm text-muted">Salir</button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-sm md:flex-col md:px-3">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-muted hover:bg-panel-2 hover:text-white">
              {n.label}
              {!!n.badge && <span className="rounded-full bg-gold px-2 text-xs font-bold text-ink">{n.badge}</span>}
            </Link>
          ))}
          <Link href="/" target="_blank" className="shrink-0 rounded-lg px-3 py-2 text-muted hover:text-white">Ver sitio ↗</Link>
        </nav>
        <form action={logout} className="hidden p-5 md:block">
          <button className="text-sm text-muted hover:text-white">Cerrar sesión</button>
        </form>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}

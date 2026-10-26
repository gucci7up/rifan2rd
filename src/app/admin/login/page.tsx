import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { checkCredentials } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/security";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const metadata: Metadata = { title: "Acceso administrador", robots: { index: false } };

async function login(form: FormData) {
  "use server";
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 8, 15 * 60_000)) redirect("/admin/login?e=limit");
  const user = String(form.get("user") ?? "");
  if (!checkCredentials(user, String(form.get("password") ?? ""))) redirect("/admin/login?e=1");
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(user), sessionCookieOptions);
  redirect("/admin");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const e = (await searchParams).e;
  return (
    <div className="bg-glow grid min-h-dvh place-items-center px-4">
      <form action={login} className="card w-full max-w-sm space-y-4 p-8">
        <Logo />
        <h1 className="font-display text-xl font-bold">Panel de administración</h1>
        <input name="user" className="input" placeholder="Usuario" autoComplete="username" required />
        <input name="password" type="password" className="input" placeholder="Contraseña" autoComplete="current-password" required />
        {e && (
          <p className="text-sm text-danger">
            {e === "limit" ? "Demasiados intentos. Espera 15 minutos." : "Usuario o contraseña incorrectos."}
          </p>
        )}
        <button className="btn-gold w-full">Entrar</button>
      </form>
    </div>
  );
}

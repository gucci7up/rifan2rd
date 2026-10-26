import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { site } from "@/lib/config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700", "800"] });

// Todo se renderiza en tiempo de ejecución: la configuración y la base de datos vienen del entorno de Dokploy,
// así la imagen Docker se construye sin acceso a Postgres.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} · Rifas transparentes en RD`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, locale: "es_DO", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#07080c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-DO">
      <body className={`${inter.variable} ${sora.variable} min-h-dvh`}>{children}</body>
    </html>
  );
}

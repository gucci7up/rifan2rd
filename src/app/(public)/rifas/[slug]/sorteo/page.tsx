import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { padTicket } from "@/lib/format";
import { getRaffleBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getRaffleBySlug((await params).slug);
  return r ? { title: `Verificación del sorteo · ${r.title}`, robots: { index: false } } : {};
}

export default async function DrawProof({ params }: Props) {
  const r = await getRaffleBySlug((await params).slug);
  if (!r) notFound();

  const script = `// Node.js 18+. Guarda los números vendidos como numeros.txt (uno por línea).
const { createHash, createHmac } = require("crypto");
const fs = require("fs");
const seed = "${r.seed ?? "<semilla revelada>"}";
const hash = "${r.seedHash ?? ""}";
console.log("Hash coincide:", createHash("sha256").update(seed).digest("hex") === hash);
const nums = fs.readFileSync("numeros.txt", "utf8").trim().split(/\\s+/).map(Number).sort((a, b) => a - b);
const h = createHmac("sha256", seed).update("${r.id}:" + nums.length).digest("hex");
console.log("Número ganador:", nums[Number(BigInt("0x" + h) % BigInt(nums.length))]);`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 text-sm">
      <Link href={`/rifas/${r.slug}`} className="text-muted hover:text-white">← {r.title}</Link>
      <h1 className="font-display text-3xl font-extrabold">Cómo verificar el sorteo</h1>
      <ol className="list-decimal space-y-3 pl-5 text-muted">
        <li>
          Antes de vender publicamos la huella SHA-256 de una semilla secreta:
          <code className="mt-2 block rounded-lg bg-panel-2 p-3 font-mono text-xs break-all text-gold-2">{r.seedHash ?? "—"}</code>
        </li>
        <li>
          El día del sorteo revelamos la semilla:
          <code className="mt-2 block rounded-lg bg-panel-2 p-3 font-mono text-xs break-all">
            {r.seed ?? "Se revelará al momento del sorteo."}
          </code>
        </li>
        <li>
          Ordenamos todos los números vendidos de menor a mayor ({r.sold.toLocaleString("es-DO")} números).{" "}
          {r.status === "DRAWN" && (
            <a href={`/api/rifas/${r.slug}/numeros`} className="text-gold underline">Descargar la lista</a>
          )}
        </li>
        <li>
          Calculamos <code className="text-white">HMAC-SHA256(semilla, &quot;{r.id}:cantidad&quot;)</code>, lo convertimos a número y tomamos el
          residuo de dividirlo entre la cantidad de números vendidos. Esa es la posición del ganador en la lista.
        </li>
      </ol>
      {r.winningNumber != null && (
        <p className="card p-4 text-center">
          Resultado: <b className="font-mono text-xl text-gold">{padTicket(r.winningNumber, r.totalTickets)}</b>
        </p>
      )}
      <div>
        <p className="mb-2 font-semibold">Compruébalo tú mismo</p>
        <pre className="overflow-x-auto rounded-xl bg-panel-2 p-4 font-mono text-xs leading-relaxed">{script}</pre>
      </div>
      <p className="text-xs text-muted">
        Si el sorteo se hizo en vivo con otro método (por ejemplo, la lotería), el número ganador se anuncia en la
        transmisión y la semilla no se usa.
      </p>
    </div>
  );
}

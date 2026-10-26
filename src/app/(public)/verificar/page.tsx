import type { Metadata } from "next";
import { VerifyForm } from "@/components/VerifyForm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Verificar boletos",
  description: "Consulta tus números con tu teléfono o con el número de boleto.",
};

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ rifa?: string }> }) {
  const raffles = await db.raffle.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED", "SOLD_OUT", "DRAWN"] } },
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: "desc" },
  });
  const slug = (await searchParams).rifa;
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-center font-display text-3xl font-extrabold">Verificador de boletos</h1>
      <p className="mt-2 mb-8 text-center text-sm text-muted">
        Elige la rifa y escribe tu teléfono (10 dígitos) o un número de boleto.
      </p>
      {raffles.length ? (
        <VerifyForm raffles={raffles} defaultRaffle={raffles.find((r) => r.slug === slug)?.id} />
      ) : (
        <p className="card p-8 text-center text-muted">Aún no hay rifas publicadas.</p>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { WinnerList } from "@/components/WinnerList";
import { getWinners } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ganadores", description: "Personas reales que ganaron en nuestras rifas." };

export default async function WinnersPage() {
  const winners = await getWinners(100);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Ganadores</h1>
      <p className="mt-2 mb-8 text-sm text-muted">🏆 Premio mayor · ⚡ Premio instantáneo</p>
      <WinnerList winners={winners} />
    </div>
  );
}

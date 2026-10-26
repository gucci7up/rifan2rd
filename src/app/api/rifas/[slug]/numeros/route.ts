import { db } from "@/lib/db";

// Lista pública de números vendidos (sin datos personales), solo después del sorteo.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const raffle = await db.raffle.findUnique({ where: { slug: (await params).slug } });
  if (!raffle || raffle.status !== "DRAWN") return new Response("No disponible", { status: 404 });
  const tickets = await db.ticket.findMany({ where: { raffleId: raffle.id }, select: { number: true }, orderBy: { number: "asc" } });
  return new Response(tickets.map((t) => t.number).join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="numeros-${raffle.slug}.txt"`,
    },
  });
}

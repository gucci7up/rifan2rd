import "server-only";
import { cache } from "react";
import { db } from "./db";
import { rafflesStats, raffleStats } from "./raffles";
import { toNumber } from "./format";

// Nunca seleccionar `seed` aquí: solo se revela después del sorteo.
const publicRaffleSelect = {
  id: true,
  slug: true,
  title: true,
  mainPrize: true,
  description: true,
  imageUrl: true,
  ticketPrice: true,
  totalTickets: true,
  minPerOrder: true,
  maxPerPhone: true,
  status: true,
  drawAt: true,
  drawThresholdPct: true,
  seedHash: true,
  winningNumber: true,
  drawnAt: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

export type PublicRaffle = Awaited<ReturnType<typeof getPublicRaffles>>[number];

function withProgress<T extends { id: number; totalTickets: number; ticketPrice: unknown }>(
  r: T,
  s: { sold: number; pending: number },
) {
  return {
    ...r,
    ticketPrice: toNumber(r.ticketPrice as number),
    sold: s.sold,
    pending: s.pending,
    available: Math.max(0, r.totalTickets - s.sold - s.pending),
    progress: Math.min(100, Math.floor((s.sold / r.totalTickets) * 100)),
  };
}

export const getPublicRaffles = cache(async () => {
  const raffles = await db.raffle.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED", "SOLD_OUT", "DRAWN"] } },
    select: { ...publicRaffleSelect, prizeNumbers: { select: { number: true, prize: true, ticketId: true }, orderBy: { number: "asc" } } },
    orderBy: [{ createdAt: "desc" }],
  });
  const stats = await rafflesStats(raffles.map((r) => r.id));
  const rank = { ACTIVE: 0, PAUSED: 1, SOLD_OUT: 2, DRAWN: 3 } as Record<string, number>;
  return raffles
    .map((r) => withProgress(r, stats.get(r.id)!))
    .sort((a, b) => rank[a.status] - rank[b.status]);
});

export const getRaffleBySlug = cache(async (slug: string) => {
  const r = await db.raffle.findUnique({
    where: { slug },
    select: {
      ...publicRaffleSelect,
      seed: true,
      packages: { orderBy: [{ sortOrder: "asc" }, { quantity: "asc" }] },
      prizeNumbers: { select: { number: true, prize: true, ticketId: true }, orderBy: { number: "asc" } },
    },
  });
  if (!r || r.status === "DRAFT" || r.status === "CANCELLED") return null;
  const { seed, ...rest } = r;
  return {
    ...withProgress(rest, await raffleStats(r.id)),
    seed: r.status === "DRAWN" ? seed : null,
    packages: r.packages.map((p) => ({ ...p, price: toNumber(p.price) })),
  };
});

export const getWinners = cache(async (limit = 24) =>
  db.winner.findMany({
    where: { published: true },
    orderBy: { wonAt: "desc" },
    take: limit,
    include: { raffle: { select: { title: true, slug: true, totalTickets: true } } },
  }),
);

export const getCategories = cache(() => db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }));

export const getBankAccounts = cache(() =>
  db.bankAccount.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
);

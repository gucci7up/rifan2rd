import type { MetadataRoute } from "next";
import { site } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const raffles = await db.raffle.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED", "SOLD_OUT", "DRAWN"] } },
    select: { slug: true, updatedAt: true },
  });
  return [
    { url: site.url, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/ganadores`, changeFrequency: "weekly" },
    { url: `${site.url}/verificar`, changeFrequency: "monthly" },
    { url: `${site.url}/terminos`, changeFrequency: "yearly" },
    ...raffles.map((r) => ({ url: `${site.url}/rifas/${r.slug}`, lastModified: r.updatedAt, priority: 0.8 })),
  ];
}

// Datos de ejemplo: `npm run db:seed`. No lo ejecutes en producción si ya tienes datos reales.
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function seed() {
  const s = randomBytes(32).toString("hex");
  return { seed: s, seedHash: createHash("sha256").update(s).digest("hex") };
}

async function main() {
  const [vehiculos, tecnologia, dinero] = await Promise.all(
    [["Vehículos", "vehiculos"], ["Tecnología", "tecnologia"], ["Dinero", "dinero"]].map(([name, slug], i) =>
      db.category.upsert({ where: { slug }, update: {}, create: { name, slug, sortOrder: i } }),
    ),
  );

  if (!(await db.bankAccount.count())) {
    await db.bankAccount.createMany({
      data: [
        { bank: "Banreservas", holder: "Tu Nombre", accountNumber: "960-000000-0", accountType: "Ahorros" },
        { bank: "Banco Popular", holder: "Tu Nombre", accountNumber: "800000000", accountType: "Ahorros" },
        { bank: "BHD", holder: "Tu Nombre", accountNumber: "0000000-001-0", accountType: "Corriente" },
      ],
    });
  }

  const demo = [
    {
      slug: "honda-civic-2024",
      title: "Honda Civic 2024 + 25 premios de RD$7,500",
      mainPrize: "Honda Civic 2024",
      description: "Recién importado. Además, 25 números premiados se llevan RD$7,500 al instante.",
      categoryId: vehiculos.id,
      ticketPrice: 35,
      totalTickets: 99999,
      minPerOrder: 3,
      packages: [[3, 105], [10, 330, true], [25, 800], [50, 1500]],
      prizes: ["11111", "22222", "33333", "44444", "55555"].map((n) => [Number(n), "RD$7,500"]),
    },
    {
      slug: "5-playstation-5",
      title: "5 PlayStation 5",
      mainPrize: "PlayStation 5",
      description: "Cinco consolas PS5 y 10 premios instantáneos de RD$5,000.",
      categoryId: tecnologia.id,
      ticketPrice: 5,
      totalTickets: 9999,
      minPerOrder: 20,
      packages: [[20, 100], [50, 240, true], [100, 450]],
      prizes: [[1234, "RD$5,000"], [4321, "RD$5,000"], [7777, "RD$5,000"]],
    },
    {
      slug: "rd-100000-en-efectivo",
      title: "RD$100,000 en efectivo",
      mainPrize: "RD$100,000",
      description: "Cien mil pesos para el ganador. Sorteo en vivo.",
      categoryId: dinero.id,
      ticketPrice: 25,
      totalTickets: 9999,
      minPerOrder: 1,
      packages: [[4, 100], [12, 270, true]],
      prizes: [],
    },
  ] as const;

  for (const r of demo) {
    if (await db.raffle.findUnique({ where: { slug: r.slug } })) continue;
    await db.raffle.create({
      data: {
        slug: r.slug,
        title: r.title,
        mainPrize: r.mainPrize,
        description: r.description,
        categoryId: r.categoryId,
        ticketPrice: r.ticketPrice,
        totalTickets: r.totalTickets,
        minPerOrder: r.minPerOrder,
        status: "ACTIVE",
        ...seed(),
        packages: {
          create: r.packages.map(([quantity, price, highlight], i) => ({ quantity, price, highlight: !!highlight, sortOrder: i })),
        },
        prizeNumbers: { create: r.prizes.map(([number, prize]) => ({ number: Number(number), prize: String(prize) })) },
      },
    });
  }
  console.log("Datos de ejemplo listos.");
}

main().finally(() => db.$disconnect());

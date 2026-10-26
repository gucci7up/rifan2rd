import Link from "next/link";
import { Flash, PageTitle, type Search } from "@/components/admin/Flash";
import { RaffleForm } from "@/components/admin/RaffleForm";
import { db } from "@/lib/db";

export default async function NewRaffle({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <Link href="/admin/rifas" className="text-sm text-muted hover:text-white">← Rifas</Link>
      <PageTitle>Nueva rifa</PageTitle>
      <Flash e={sp.e} />
      <RaffleForm categories={categories} />
    </>
  );
}

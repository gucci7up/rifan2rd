import Link from "next/link";
import { site } from "@/lib/config";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name}, inicio`}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-gold-2 to-gold font-display text-lg font-extrabold text-ink shadow-[0_6px_24px_-6px_rgb(244_197_66/0.7)]">
        R
      </span>
      <span className="font-display text-lg font-bold tracking-tight">{site.name}</span>
    </Link>
  );
}

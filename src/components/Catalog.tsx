"use client";

import { useState } from "react";

/** Filtro por categoría. Las tarjetas se renderizan en el servidor y se pasan como hijos. */
export function Catalog({
  categories,
  items,
}: {
  categories: { slug: string; name: string }[];
  items: { key: number; category: string | null; node: React.ReactNode }[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const shown = active ? items.filter((i) => i.category === active) : items;
  const tabs = [{ slug: null, name: "Todas" }, ...categories] as { slug: string | null; name: string }[];

  return (
    <>
      {categories.length > 0 && (
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.slug ?? "all"}
              role="tab"
              aria-selected={active === t.slug}
              onClick={() => setActive(t.slug)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active === t.slug
                  ? "border-gold bg-gold text-ink"
                  : "border-line bg-panel text-muted hover:text-white"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      {shown.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => (
            <div key={i.key} className="contents">
              {i.node}
            </div>
          ))}
        </div>
      ) : (
        <p className="card p-10 text-center text-muted">No hay rifas en esta categoría por ahora.</p>
      )}
    </>
  );
}

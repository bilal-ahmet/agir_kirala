import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { countByCategory } from "@/lib/filters";
import { HScroller } from "./HScroller";

export function CategoryGrid() {
  return (
    <section className="container-page py-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">Kategoriler</h2>
          <p className="mt-1 text-muted">İhtiyacına göre kategori seç, ilanları keşfet.</p>
        </div>
        <Link href="/ilanlar" className="hidden text-sm font-semibold text-accent hover:underline sm:block">
          Tümünü gör →
        </Link>
      </div>

      {/* Yana kaydırılabilir kategori şeridi — sadece kategori isimleri */}
      <HScroller>
        {CATEGORIES.map((c) => {
          const count = countByCategory(c.slug);
          return (
            <Link
              key={c.slug}
              href={`/ilanlar?kategori=${c.slug}`}
              className="group flex w-64 shrink-0 snap-start items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-2"
            >
              <span className="text-4xl">{c.icon}</span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight text-fg group-hover:text-accent">
                  {c.name}
                </span>
                <span className="mt-1 block text-xs text-faint">
                  {count > 0 ? `${count} ilan` : "Yakında"}
                </span>
              </span>
            </Link>
          );
        })}
      </HScroller>
    </section>
  );
}

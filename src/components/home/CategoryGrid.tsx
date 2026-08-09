import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { categoryCounts } from "@/lib/db/queries/listings";
import { HScroller } from "./HScroller";

export async function CategoryGrid() {
  const counts = await categoryCounts();
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
          const count = counts[c.slug] ?? 0;
          return (
            <Link
              key={c.slug}
              href={`/ilanlar?kategori=${c.slug}`}
              className="group flex w-64 shrink-0 snap-start flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block text-lg font-semibold leading-tight text-fg group-hover:text-accent">
                  {c.name}
                </span>
                <span className="mt-1.5 block text-xs leading-snug text-muted">{c.tagline}</span>
              </span>
              <span className="text-xs font-medium text-faint">
                {count > 0 ? `${count} ilan` : "Yakında"}
              </span>
            </Link>
          );
        })}
      </HScroller>
    </section>
  );
}

import Link from "next/link";
import { CATEGORIES, GROUP_LABELS } from "@/lib/categories";
import { countByCategory } from "@/lib/filters";
import type { CategoryGroup } from "@/lib/types";

const GROUPS: CategoryGroup[] = ["is-makinesi", "agir-vasita"];

export function CategoryGrid() {
  return (
    <section className="container-page py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">Kategoriler</h2>
          <p className="mt-1 text-muted">İhtiyacına göre makine ve araç kategorilerini keşfet.</p>
        </div>
        <Link href="/ilanlar" className="hidden text-sm font-semibold text-accent hover:underline sm:block">
          Tümünü gör →
        </Link>
      </div>

      <div className="space-y-8">
        {GROUPS.map((group) => (
          <div key={group}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-accent">
              {GROUP_LABELS[group]}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {CATEGORIES.filter((c) => c.group === group).map((c) => {
                const count = countByCategory(c.slug);
                return (
                  <Link
                    key={c.slug}
                    href={`/ilanlar?kategori=${c.slug}`}
                    className="group flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-2"
                  >
                    <span className="text-3xl">{c.icon}</span>
                    <span className="font-semibold leading-tight text-fg group-hover:text-accent">
                      {c.name}
                    </span>
                    <span className="text-xs text-faint">
                      {count > 0 ? `${count} ilan` : "Yakında"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

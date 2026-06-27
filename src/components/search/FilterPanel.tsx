"use client";

import { FilterControls } from "./FilterControls";
import { useFilterController } from "./filter-controller";
import { parseFilters, activeFilterCount } from "@/lib/filters";

/** Filtre kabuğu (başlık + temizle + kontroller). Sidebar ve mobil sheet'te kullanılır. */
export function FilterPanel({ collapsibleAdvanced = false }: { collapsibleAdvanced?: boolean } = {}) {
  const { sp, clearAll } = useFilterController();
  const count = activeFilterCount(parseFilters(Object.fromEntries(sp.entries())));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold uppercase tracking-tight text-fg">Filtreler</h2>
        {count > 0 && (
          <button onClick={clearAll} className="text-sm font-medium text-accent hover:underline">
            Temizle ({count})
          </button>
        )}
      </div>
      <FilterControls collapsibleAdvanced={collapsibleAdvanced} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { FilterPanel } from "./FilterPanel";
import { SortSelect } from "./SortSelect";
import { useFilters } from "./use-filters";
import { Button, buttonClasses } from "@/components/ui/Button";
import { FilterIcon } from "@/components/ui/icons";
import { parseFilters, activeFilterCount } from "@/lib/filters";

export function MobileFilterBar() {
  const [open, setOpen] = useState(false);
  const { sp } = useFilters();
  const count = activeFilterCount(parseFilters(Object.fromEntries(sp.entries())));

  return (
    <div className="flex items-center gap-2 lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className={buttonClasses("outline", "md", "flex-1")}
      >
        <FilterIcon size={18} /> Filtrele
        {count > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-fg">
            {count}
          </span>
        )}
      </button>
      <SortSelect />

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filtreler"
        side="bottom"
        footer={
          <Button className="w-full" onClick={() => setOpen(false)}>
            Sonuçları Göster
          </Button>
        }
      >
        <FilterPanel />
      </Sheet>
    </div>
  );
}

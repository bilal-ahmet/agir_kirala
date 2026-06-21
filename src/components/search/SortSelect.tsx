"use client";

import { useFilters } from "./use-filters";
import { SORT_OPTIONS } from "@/lib/constants";
import { Select } from "@/components/ui/Field";

export function SortSelect() {
  const { sp, setParam } = useFilters();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden whitespace-nowrap text-sm text-muted sm:inline">Sırala:</span>
      <Select
        value={sp.get("sirala") || "onerilen"}
        onChange={(e) => setParam("sirala", e.target.value)}
        className="h-10 min-w-44"
        aria-label="Sıralama"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

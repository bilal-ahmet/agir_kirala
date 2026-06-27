"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  FilterControllerProvider,
  useLocalFilters,
} from "@/components/search/filter-controller";
import { FilterControls } from "@/components/search/FilterControls";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { FilterIcon } from "@/components/ui/icons";
import { activeFilterCount, parseFilters, searchListings } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Ana sayfa "Filtrele & Keşfet" bölümü.
 * Sol: /ilanlar ile aynı filtre paneli (yerel mod, gelişmiş bölümler accordion).
 * Sağ: her zaman grid (sunucudan resultsSlot olarak gelen öne çıkan ilanlar).
 * Filtreler yerel tutulur; "Sonuçları Gör (N)" → /ilanlar?params.
 */
export function ExploreSection({
  initialTotal,
  resultsSlot,
}: {
  initialTotal: number;
  resultsSlot: ReactNode;
}) {
  const { controller, sp, submit } = useLocalFilters();
  const [sheetOpen, setSheetOpen] = useState(false);
  const hydrated = useHydrated();

  const filters = useMemo(
    () => parseFilters(Object.fromEntries(sp.entries())),
    [sp],
  );
  const activeCount = useMemo(() => activeFilterCount(filters), [filters]);
  // Canlı sonuç sayısı yalnızca hidrasyondan sonra (localStorage ilanları için mismatch güvenli).
  const total = hydrated ? searchListings(filters).total : initialTotal;
  const submitLabel = `Sonuçları Gör${hydrated ? ` (${formatNumber(total)})` : ""}`;

  return (
    <FilterControllerProvider value={controller}>
      <section className="border-y border-line bg-surface/40 py-12">
        <div className="container-page">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                Öne Çıkan İlanlar
              </h2>
              <p className="mt-1 text-muted">
                Soldaki filtrelerle aradığın kritere uygun makineye ulaş.
              </p>
            </div>
            <Link
              href="/ilanlar"
              className="hidden text-sm font-semibold text-accent hover:underline sm:block"
            >
              Tümünü gör →
            </Link>
          </div>

          {/* Mobil: filtre aç */}
          <div className="mb-4 lg:hidden">
            <button
              onClick={() => setSheetOpen(true)}
              className={buttonClasses("outline", "md", "w-full")}
            >
              <FilterIcon size={18} /> Filtrele
              {activeCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-fg">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-6">
            {/* Masaüstü filtre kenar çubuğu */}
            <aside className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-lg border border-line bg-surface">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <h3 className="text-base font-bold uppercase tracking-tight text-fg">
                    Filtreler
                  </h3>
                  {activeCount > 0 && (
                    <button
                      onClick={controller.clearAll}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      Temizle ({activeCount})
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto px-4 no-scrollbar">
                  <FilterControls collapsibleAdvanced />
                </div>
                <div className="border-t border-line p-3">
                  <Button className="w-full" onClick={submit}>
                    {submitLabel} →
                  </Button>
                </div>
              </div>
            </aside>

            {/* Sağ: her zaman grid */}
            <div className="min-w-0 flex-1">
              {resultsSlot}
              <div className="mt-8 text-center">
                <Link href="/ilanlar" className={buttonClasses("outline", "md")}>
                  Tüm İlanları Gör
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobil filtre çekmecesi */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtreler"
        side="bottom"
        footer={
          <Button
            className="w-full"
            onClick={() => {
              setSheetOpen(false);
              submit();
            }}
          >
            {submitLabel} →
          </Button>
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted">{activeCount} filtre seçili</span>
          {activeCount > 0 && (
            <button
              onClick={controller.clearAll}
              className="text-sm font-medium text-accent hover:underline"
            >
              Temizle
            </button>
          )}
        </div>
        <FilterControls collapsibleAdvanced />
      </Sheet>
    </FilterControllerProvider>
  );
}

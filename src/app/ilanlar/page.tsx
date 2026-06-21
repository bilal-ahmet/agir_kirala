import type { Metadata } from "next";
import Link from "next/link";
import { parseFilters, searchListings } from "@/lib/filters";
import { getCategory } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { FilterPanel } from "@/components/search/FilterPanel";
import { MobileFilterBar } from "@/components/search/MobileFilterBar";
import { ActiveFilterChips } from "@/components/search/ActiveFilterChips";
import { SortSelect } from "@/components/search/SortSelect";
import { Pagination } from "@/components/search/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon } from "@/components/ui/icons";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "İlanlar",
  description: "İş makinesi ve ağır vasıta kiralama ilanları. Kategori, konum ve teknik özelliklere göre filtreleyin.",
};

export default async function IlanlarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const { results, total, page, totalPages } = searchListings(filters);
  const category = getCategory(filters.kategori);

  const title = category
    ? `${category.name} Kiralama`
    : filters.q
      ? `"${filters.q}" için sonuçlar`
      : "Tüm İlanlar";

  return (
    <div className="container-page py-6 lg:py-8">
      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-faint">
        <Link href="/" className="hover:text-fg">Ana Sayfa</Link>
        <span>/</span>
        <Link href="/ilanlar" className="hover:text-fg">İlanlar</Link>
        {category && (
          <>
            <span>/</span>
            <span className="text-muted">{category.name}</span>
          </>
        )}
      </nav>

      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-muted">{formatNumber(total)} ilan bulundu</p>
      </div>

      {/* Mobil filtre + sıralama */}
      <div className="mb-4 lg:hidden">
        <MobileFilterBar />
      </div>

      <div className="flex gap-6">
        {/* Masaüstü filtre kenar çubuğu */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-line bg-surface p-4 no-scrollbar">
            <FilterPanel />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Masaüstü sıralama satırı */}
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <ActiveFilterChips />
            <SortSelect />
          </div>
          {/* Mobil aktif çipler */}
          <div className="mb-4 lg:hidden">
            <ActiveFilterChips />
          </div>

          {results.length > 0 ? (
            <>
              <ListingGrid listings={results} />
              <Pagination page={page} totalPages={totalPages} params={params} />
            </>
          ) : (
            <EmptyState
              icon={<SearchIcon size={40} />}
              title="Sonuç bulunamadı"
              description="Aradığınız kriterlere uygun ilan yok. Filtreleri genişletmeyi veya temizlemeyi deneyin."
              action={
                <Link href="/ilanlar" className="text-sm font-semibold text-accent hover:underline">
                  Tüm filtreleri temizle
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { activeListings } from "@/lib/data/listings";
import { ListingCard } from "@/components/listing/ListingCard";
import { buttonClasses } from "@/components/ui/Button";
import { HScroller } from "./HScroller";

export function FeaturedListings() {
  const featured = activeListings()
    .filter((l) => l.featured)
    .slice(0, 6);

  if (featured.length === 0) return null;

  return (
    <section className="border-y border-line bg-surface/40 py-12">
      <div className="container-page">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">Öne Çıkan İlanlar</h2>
            <p className="mt-1 text-muted">Doğrulanmış firmaların seçili makineleri.</p>
          </div>
          <Link href="/ilanlar" className="hidden text-sm font-semibold text-accent hover:underline sm:block">
            Tümünü gör →
          </Link>
        </div>

        {/* Yana kaydırılabilir, küçük kartlar */}
        <HScroller>
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} className="w-64 shrink-0 snap-start" />
          ))}
        </HScroller>

        <div className="mt-8 text-center">
          <Link href="/ilanlar" className={buttonClasses("outline", "md")}>
            Tüm İlanları Gör
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { activeListings } from "@/lib/data/listings";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { buttonClasses } from "@/components/ui/Button";

export function FeaturedListings() {
  const featured = activeListings()
    .filter((l) => l.featured)
    .slice(0, 6);

  if (featured.length === 0) return null;

  return (
    <section className="border-y border-line bg-surface/40 py-14">
      <div className="container-page">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">Öne Çıkan İlanlar</h2>
            <p className="mt-1 text-muted">Doğrulanmış firmaların seçili makineleri.</p>
          </div>
        </div>

        <ListingGrid listings={featured} />

        <div className="mt-8 text-center">
          <Link href="/ilanlar" className={buttonClasses("outline", "md")}>
            Tüm İlanları Gör
          </Link>
        </div>
      </div>
    </section>
  );
}

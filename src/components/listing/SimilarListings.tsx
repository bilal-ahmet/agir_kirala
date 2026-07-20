import type { Listing } from "@/lib/types";
import { ListingGrid } from "./ListingGrid";

export function SimilarListings({ items }: { items: Listing[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-5 text-xl font-bold uppercase tracking-tight">Benzer İlanlar</h2>
      <ListingGrid listings={items} />
    </section>
  );
}

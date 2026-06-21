import type { Listing } from "@/lib/types";
import { similarListings } from "@/lib/filters";
import { ListingGrid } from "./ListingGrid";

export function SimilarListings({ listing }: { listing: Listing }) {
  const items = similarListings(listing, 3);
  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-5 text-xl font-bold uppercase tracking-tight">Benzer İlanlar</h2>
      <ListingGrid listings={items} />
    </section>
  );
}

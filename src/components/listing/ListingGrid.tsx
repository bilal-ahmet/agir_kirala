import type { Listing } from "@/lib/types";
import { ListingCard } from "./ListingCard";
import { cn } from "@/lib/cn";

export function ListingGrid({ listings, className }: { listings: Listing[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}

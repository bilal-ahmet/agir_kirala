"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFavorites } from "@/context/favorites-context";
import { findAnyListing } from "@/lib/storage";
import type { Listing } from "@/lib/types";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { HeartIcon } from "@/components/ui/icons";

export default function FavorilerimPage() {
  const { ids } = useFavorites();
  const listings = useMemo(
    () => ids.map((id) => findAnyListing(id)).filter((l): l is Listing => Boolean(l)),
    [ids],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">Favorilerim</h1>
        <p className="text-muted">{listings.length} ilan</p>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={<HeartIcon size={36} />}
          title="Favori listen boş"
          description="İlanlardaki kalp simgesine dokunarak makineleri favorilerine ekleyebilirsin."
          action={
            <Link href="/ilanlar" className={buttonClasses("accent", "md")}>
              İlanlara Göz At
            </Link>
          }
        />
      ) : (
        <ListingGrid listings={listings} className="sm:grid-cols-2 xl:grid-cols-3" />
      )}
    </div>
  );
}

import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { favoriteListings } from "@/lib/db/queries/favorites";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { HeartIcon } from "@/components/ui/icons";

export default async function FavorilerimPage() {
  const user = await verifySession();
  const listings = await favoriteListings(user.id);

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

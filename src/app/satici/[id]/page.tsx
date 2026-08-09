import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/db/queries/users";
import { activeListingsByOwner } from "@/lib/db/queries/listings";
import { reviewsForUser } from "@/lib/db/queries/reviews";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { EmptyState } from "@/components/ui/EmptyState";
import { MapPinIcon, SearchIcon, StarIcon } from "@/components/ui/icons";
import { OWNER_TYPE_LABELS } from "@/lib/constants";
import { formatMonthYear, timeAgo } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const seller = await getUser(id);
  if (!seller) return { title: "Satıcı" };
  const name = seller.companyName ?? seller.name;
  return {
    title: `${name} — Satıcı İlanları`,
    description: `${name} tarafından yayınlanan iş makinesi ve ağır vasıta kiralama ilanları.`,
  };
}

export default async function SaticiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seller = await getUser(id);
  if (!seller) notFound();

  const [listings, reviews] = await Promise.all([
    activeListingsByOwner(seller.id),
    reviewsForUser(seller.id),
  ]);

  const displayName = seller.companyName ?? seller.name;

  return (
    <div className="container-page py-6 lg:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-faint">
        <Link href="/" className="hover:text-fg">Ana Sayfa</Link>
        <span>/</span>
        <Link href="/ilanlar" className="hover:text-fg">İlanlar</Link>
        <span>/</span>
        <span className="text-muted">{displayName}</span>
      </nav>

      {/* Satıcı başlığı */}
      <header className="rounded-lg border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={displayName} accent={seller.accent} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              {displayName}
            </h1>
            {seller.companyName && seller.companyName !== seller.name && (
              <p className="mt-0.5 text-sm text-muted">Yetkili: {seller.name}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={seller.type === "kurumsal" ? "info" : "neutral"}>
                {OWNER_TYPE_LABELS[seller.type]}
              </Badge>
              {seller.reviewCount > 0 && (
                <Rating value={seller.rating} reviewCount={seller.reviewCount} />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
              {seller.city && (
                <span className="flex items-center gap-1.5">
                  <MapPinIcon size={15} className="text-faint" /> {seller.city}
                </span>
              )}
              <span className="text-faint">
                Üyelik: {formatMonthYear(seller.memberSince)}
              </span>
              <span className="text-faint">
                {listings.length} yayında ilan
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Satıcının ilanları */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold uppercase tracking-tight">
          Yayındaki İlanlar ({listings.length})
        </h2>
        {listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState
            icon={<SearchIcon size={40} />}
            title="Yayında ilan yok"
            description="Bu satıcının şu anda yayında olan bir ilanı bulunmuyor."
            action={
              <Link href="/ilanlar" className="text-sm font-semibold text-accent hover:underline">
                Tüm ilanlara göz at
              </Link>
            }
          />
        )}
      </section>

      {/* Değerlendirmeler */}
      {reviews.length > 0 && (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="mb-4 text-lg font-bold uppercase tracking-tight">
            Değerlendirmeler ({reviews.length})
          </h2>
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">{r.reviewerName}</span>
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <StarIcon
                        key={n}
                        size={14}
                        filled={n <= r.rating}
                        className={n <= r.rating ? "text-accent" : "text-faint"}
                      />
                    ))}
                  </span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-muted">{r.comment}</p>}
                <p className="mt-1 text-xs text-faint">{timeAgo(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

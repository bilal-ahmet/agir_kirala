import Link from "next/link";
import type { Listing } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { getUser } from "@/lib/data/users";
import { PERIODS } from "@/lib/constants";
import { formatPrice, formatUsage, primaryPrice } from "@/lib/format";
import { ListingImage } from "./ListingImage";
import { FavoriteButton } from "./FavoriteButton";
import { Badge } from "@/components/ui/Badge";
import { ClockIcon, GaugeIcon, MapPinIcon, ShieldCheckIcon, StarIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function ListingCard({ listing, className }: { listing: Listing; className?: string }) {
  const category = getCategory(listing.categorySlug);
  const owner = getUser(listing.ownerId);
  const price = primaryPrice(listing.prices);
  const periodShort = price ? PERIODS.find((p) => p.value === price.period)?.short : "";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-all hover:border-line-strong hover:shadow-xl hover:shadow-black/30",
        className,
      )}
    >
      {/* Görsel */}
      <div className="relative">
        <ListingImage
          icon={category?.icon ?? "🛠️"}
          seed={listing.photoSeed}
          className="aspect-[4/3] w-full"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {listing.featured && <Badge tone="accent">⭐ Öne Çıkan</Badge>}
          <Badge tone={listing.operator ? "info" : "neutral"}>
            {listing.operator ? "Operatörlü" : "Operatörsüz"}
          </Badge>
        </div>
        <FavoriteButton id={listing.id} className="absolute right-2.5 top-2.5 z-10" />
      </div>

      {/* Gövde */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">{category?.name}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-fg group-hover:text-accent">
          {listing.title}
        </h3>

        <div className="mt-2 flex items-center gap-1 text-sm text-muted">
          <MapPinIcon size={15} className="text-faint" />
          {listing.district}, {listing.city}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            {category?.usageMetric === "saat" ? <ClockIcon size={14} /> : <GaugeIcon size={14} />}
            {formatUsage(listing.usage, category?.usageMetric ?? "saat")}
          </span>
          <span>{listing.year} model</span>
          {listing.transport === "dahil" && <span className="text-success">Nakliye dahil</span>}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3.5">
          <div>
            {price ? (
              <p className="text-lg font-extrabold text-accent">
                {formatPrice(price.value)}
                <span className="text-xs font-medium text-faint"> /{periodShort}</span>
              </p>
            ) : (
              <p className="text-sm text-faint">Fiyat için iletişime geçin</p>
            )}
          </div>
          {owner && (
            <div className="flex items-center gap-1 text-xs text-muted">
              {owner.verified && <ShieldCheckIcon size={14} className="text-success" />}
              <StarIcon size={13} filled className="text-accent" />
              {owner.rating.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* Tüm kartı tıklanabilir yapan gizli bağlantı */}
      <Link href={`/ilanlar/${listing.id}`} className="absolute inset-0 z-0" aria-label={listing.title} />
    </article>
  );
}

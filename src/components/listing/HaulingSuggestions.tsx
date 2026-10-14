import Link from "next/link";
import type { Listing } from "@/lib/types";
import { haulingPlan } from "@/lib/hauling";
import { ListingGrid } from "./ListingGrid";
import { ArrowRightIcon, TruckIcon } from "@/components/ui/icons";

/**
 * "Nakliye İçin Tır İlanları" — iş makinesi ilanının detayında, makineyi
 * şantiyeye taşıyabilecek tır (lowbed / açık kasa) ilanları.
 *
 * Kurallar lib/hauling.ts'te; öneri anlamsızsa (tır ilanı, kendi yola çıkan
 * makine, nakliye fiyata dahil) bölüm hiç çizilmez.
 */
export function HaulingSuggestions({ listing, items }: { listing: Listing; items: Listing[] }) {
  const plan = haulingPlan(listing);
  if (!plan) return null;

  const href = `/ilanlar?${new URLSearchParams(plan.searchParams)}`;
  const capacity = plan.minCapacity ? `${plan.minCapacity} ton ve üzeri taşıyabilen, ` : "";

  return (
    <section className="mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight">Nakliye İçin Tır İlanları</h2>
          <p className="mt-1 text-sm text-muted">
            Bu makineyi taşımak için {capacity}
            {listing.city} öncelikli lowbed ve açık kasa tırlar.
          </p>
        </div>
        <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
          Tümünü gör <ArrowRightIcon size={16} />
        </Link>
      </div>

      {items.length > 0 ? (
        <ListingGrid listings={items} />
      ) : (
        <Link
          href={href}
          className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-4 text-sm text-muted transition-colors hover:border-accent hover:text-fg"
        >
          <TruckIcon size={22} className="shrink-0 text-accent" />
          <span>
            Şu an bu makineye uygun tır ilanı yok. Tüm lowbed tır ilanlarına göz atın.
          </span>
        </Link>
      )}
    </section>
  );
}

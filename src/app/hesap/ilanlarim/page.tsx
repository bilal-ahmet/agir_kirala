"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useStored } from "@/components/account/useStored";
import { myListings, setListingStatus } from "@/lib/storage";
import { getCategory } from "@/lib/categories";
import { primaryPrice, formatPriceWithPeriod } from "@/lib/format";
import type { ListingStatus } from "@/lib/types";
import { ListingImage } from "@/components/listing/ListingImage";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListIcon, PlusIcon } from "@/components/ui/icons";

const STATUS: Record<ListingStatus, { label: string; tone: BadgeTone }> = {
  aktif: { label: "Aktif", tone: "success" },
  pasif: { label: "Pasif", tone: "neutral" },
  taslak: { label: "Taslak", tone: "warning" },
};

export default function IlanlarimPage() {
  const { user } = useAuth();
  const listings = useStored(() => (user ? myListings(user.id) : []));
  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">İlanlarım</h1>
          <p className="text-muted">{listings.length} ilan</p>
        </div>
        <Link href="/hesap/ilan-ekle" className={buttonClasses("accent", "md")}>
          <PlusIcon size={16} /> Yeni İlan
        </Link>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={<ListIcon size={36} />}
          title="Henüz ilanın yok"
          description="İlk ilanını oluştur ve makineni kiraya vermeye başla."
          action={
            <Link href="/hesap/ilan-ekle" className={buttonClasses("accent", "md")}>
              <PlusIcon size={16} /> İlan Ver
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const category = getCategory(l.categorySlug);
            const price = primaryPrice(l.prices);
            const status = STATUS[l.status];
            return (
              <div key={l.id} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center">
                <Link href={`/ilanlar/${l.id}`} className="shrink-0">
                  <ListingImage icon={category?.icon ?? "🛠️"} seed={l.photoSeed} className="h-20 w-28" iconSize="text-3xl" rounded="rounded-md" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <span className="text-xs text-faint">{category?.name}</span>
                  </div>
                  <Link href={`/ilanlar/${l.id}`} className="mt-1 line-clamp-1 block font-semibold hover:text-accent">
                    {l.title}
                  </Link>
                  {price && (
                    <p className="mt-0.5 text-sm font-bold text-accent">
                      {formatPriceWithPeriod(price.value, price.period)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/ilanlar/${l.id}`} className={buttonClasses("outline", "sm")}>
                    Görüntüle
                  </Link>
                  {l.status === "aktif" ? (
                    <Button size="sm" variant="ghost" onClick={() => setListingStatus(l.id, "pasif")}>
                      Yayından Kaldır
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setListingStatus(l.id, "aktif")}>
                      Yayınla
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

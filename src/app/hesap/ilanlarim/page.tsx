"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useStored } from "@/components/account/useStored";
import { myListings, setListingStatus } from "@/lib/storage";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { primaryPrice, formatPriceWithPeriod } from "@/lib/format";
import type { ListingStatus } from "@/lib/types";
import { ListingImage } from "@/components/listing/ListingImage";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { ListIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const STATUS: Record<ListingStatus, { label: string; tone: BadgeTone }> = {
  aktif: { label: "Aktif", tone: "success" },
  pasif: { label: "Pasif", tone: "neutral" },
  taslak: { label: "Taslak", tone: "warning" },
};

type StatusFilter = "all" | ListingStatus;

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "aktif", label: "Aktif" },
  { value: "pasif", label: "Pasif" },
  { value: "taslak", label: "Taslak" },
];

export default function IlanlarimPage() {
  return (
    <Suspense fallback={null}>
      <IlanlarimInner />
    </Suspense>
  );
}

function IlanlarimInner() {
  const { user } = useAuth();
  const allListings = useStored(() => (user ? myListings(user.id) : []));
  const params = useSearchParams();

  const initialStatus = (params.get("durum") as StatusFilter) || "all";
  const [status, setStatus] = useState<StatusFilter>(
    STATUS_TABS.some((t) => t.value === initialStatus) ? initialStatus : "all",
  );
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState("");

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: allListings.length, aktif: 0, pasif: 0, taslak: 0 };
    for (const l of allListings) c[l.status]++;
    return c;
  }, [allListings]);

  // Kullanıcının ilanlarında bulunan kategoriler (filtre seçenekleri)
  const usedCategories = useMemo(() => {
    const slugs = new Set(allListings.map((l) => l.categorySlug));
    return CATEGORIES.filter((c) => slugs.has(c.slug));
  }, [allListings]);

  const listings = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return allListings.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (categorySlug && l.categorySlug !== categorySlug) return false;
      if (q && !`${l.title} ${l.brand} ${l.model}`.toLocaleLowerCase("tr").includes(q)) return false;
      return true;
    });
  }, [allListings, status, categorySlug, query]);

  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">İlanlarım</h1>
          <p className="text-muted">{allListings.length} ilan</p>
        </div>
        <Link href="/hesap/ilan-ekle" className={buttonClasses("accent", "md")}>
          <PlusIcon size={16} /> Yeni İlan
        </Link>
      </div>

      {allListings.length > 0 && (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          {/* Durum sekmeleri */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setStatus(t.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  status === t.value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                {t.label}
                <span className="ml-1.5 text-xs text-faint">{counts[t.value]}</span>
              </button>
            ))}
          </div>

          {/* Arama + kategori */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Başlık veya markada ara…"
                className="pl-9"
              />
            </div>
            <Select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="sm:w-56"
            >
              <option value="">Tüm Kategoriler</option>
              {usedCategories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {allListings.length === 0 ? (
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
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<SearchIcon size={36} />}
          title="Eşleşen ilan yok"
          description="Filtreleri değiştirerek tekrar deneyin."
        />
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const category = getCategory(l.categorySlug);
            const price = primaryPrice(l.prices);
            const statusInfo = STATUS[l.status];
            return (
              <div key={l.id} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center">
                <Link href={`/ilanlar/${l.id}`} className="shrink-0">
                  <ListingImage icon={category?.icon ?? "🛠️"} seed={l.photoSeed} className="h-20 w-28" iconSize="text-3xl" rounded="rounded-md" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
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

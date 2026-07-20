"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Listing, RentalRequest, RequestStatus } from "@/lib/types";
import { updateRequestStatusAction } from "@/lib/actions/requests";
import { getCategory } from "@/lib/categories";
import { PERIOD_LABELS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import { ListingImage } from "@/components/listing/ListingImage";
import { ReviewForm } from "@/components/account/ReviewForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  beklemede: { label: "Beklemede", tone: "warning" },
  onaylandi: { label: "Onaylandı", tone: "success" },
  reddedildi: { label: "Reddedildi", tone: "danger" },
  iptal: { label: "İptal Edildi", tone: "neutral" },
};

interface RequestCardProps {
  request: RentalRequest;
  role: "incoming" | "outgoing";
  listing: Listing | null;
  counterpartName: string;
}

export function RequestCard({ request, role, listing, counterpartName }: RequestCardProps) {
  const category = listing ? getCategory(listing.categorySlug) : undefined;
  const status = STATUS[request.status];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const setStatus = (next: RequestStatus) => {
    setError(null);
    startTransition(async () => {
      const res = await updateRequestStatusAction(request.id, next);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex gap-4">
        <Link href={`/ilanlar/${request.listingId}`} className="shrink-0">
          <ListingImage
            icon={category?.icon ?? "🛠️"}
            seed={listing?.photoSeed}
            className="h-20 w-28"
            iconSize="text-3xl"
            rounded="rounded-md"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/ilanlar/${request.listingId}`} className="line-clamp-1 font-semibold hover:text-accent">
              {listing?.title ?? "İlan"}
            </Link>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {role === "incoming" ? "Talep eden: " : "İlan sahibi: "}
            <span className="text-fg">{counterpartName}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {formatDate(request.startDate)} – {formatDate(request.endDate)} · {PERIOD_LABELS[request.period]}
          </p>
          <p className="mt-1 font-bold text-accent">{formatPrice(request.totalPrice)}</p>
        </div>
      </div>

      {request.message && (
        <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">
          “{request.message}”
        </p>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {role === "incoming" && request.status === "beklemede" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={pending} onClick={() => setStatus("onaylandi")}>
            Onayla
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("reddedildi")}>
            Reddet
          </Button>
        </div>
      )}

      {role === "outgoing" && request.status === "beklemede" && (
        <div className="mt-3">
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus("iptal")}>
            Talebi İptal Et
          </Button>
        </div>
      )}

      {/* Onaylanmış kiralama sonrası ilan sahibini değerlendir */}
      {role === "outgoing" && request.status === "onaylandi" && (
        <ReviewForm rentalRequestId={request.id} />
      )}
    </div>
  );
}

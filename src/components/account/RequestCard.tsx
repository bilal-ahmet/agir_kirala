"use client";

import Link from "next/link";
import type { RentalRequest, RequestStatus } from "@/lib/types";
import { findAnyListing } from "@/lib/storage";
import { getUser } from "@/lib/data/users";
import { getCategory } from "@/lib/categories";
import { PERIOD_LABELS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import { ListingImage } from "@/components/listing/ListingImage";
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
  onApprove?: () => void;
  onReject?: () => void;
}

export function RequestCard({ request, role, onApprove, onReject }: RequestCardProps) {
  const listing = findAnyListing(request.listingId);
  const category = listing ? getCategory(listing.categorySlug) : undefined;
  const counterpart = getUser(role === "incoming" ? request.renterId : request.ownerId);
  const status = STATUS[request.status];

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
            <span className="text-fg">{counterpart?.name ?? "Kullanıcı"}</span>
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

      {role === "incoming" && request.status === "beklemede" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onApprove}>Onayla</Button>
          <Button size="sm" variant="outline" onClick={onReject}>Reddet</Button>
        </div>
      )}
    </div>
  );
}

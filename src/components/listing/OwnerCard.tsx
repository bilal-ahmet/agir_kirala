import Link from "next/link";
import type { User } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { OWNER_TYPE_LABELS } from "@/lib/constants";
import { formatMonthYear } from "@/lib/format";
import { ChevronRightIcon, MapPinIcon } from "@/components/ui/icons";

export function OwnerCard({ owner }: { owner: User }) {
  return (
    <Link
      href={`/satici/${owner.id}`}
      className="group block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-2"
    >
      <div className="flex items-start gap-3">
        <Avatar name={owner.companyName ?? owner.name} accent={owner.accent} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold group-hover:text-accent">{owner.name}</h3>
            <ChevronRightIcon size={16} className="shrink-0 text-faint" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={owner.type === "kurumsal" ? "info" : "neutral"}>
              {OWNER_TYPE_LABELS[owner.type]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-muted">
        {owner.reviewCount > 0 && <Rating value={owner.rating} reviewCount={owner.reviewCount} />}
        <p className="flex items-center gap-1.5">
          <MapPinIcon size={15} className="text-faint" /> {owner.city}
        </p>
        <p className="text-xs text-faint">Üyelik: {formatMonthYear(owner.memberSince)}</p>
      </div>

      <p className="mt-3 border-t border-line pt-3 text-sm font-semibold text-accent">
        Satıcının tüm ilanlarını gör →
      </p>
    </Link>
  );
}

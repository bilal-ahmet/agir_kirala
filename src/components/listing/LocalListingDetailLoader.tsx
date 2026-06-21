"use client";

import Link from "next/link";
import type { User } from "@/lib/types";
import { findAnyListing } from "@/lib/storage";
import { getUser } from "@/lib/data/users";
import { useAuth } from "@/context/auth-context";
import { useHydrated } from "@/lib/use-hydrated";
import { ListingDetail } from "./ListingDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";

/** Tohum veride bulunmayan (kullanıcının yerel oluşturduğu) ilanı client tarafında yükler. */
export function LocalListingDetailLoader({ id }: { id: string }) {
  const { user } = useAuth();
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="container-page py-20 text-center text-muted">Yükleniyor…</div>;
  }

  const listing = findAnyListing(id);

  if (!listing) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="İlan bulunamadı"
          description="Bu ilan kaldırılmış veya hiç var olmamış olabilir."
          action={
            <Link href="/ilanlar" className={buttonClasses("accent", "md")}>
              Tüm İlanlara Dön
            </Link>
          }
        />
      </div>
    );
  }

  const owner: User | undefined =
    getUser(listing.ownerId) ?? (user && user.id === listing.ownerId ? user : undefined);

  return <ListingDetail listing={listing} owner={owner} />;
}

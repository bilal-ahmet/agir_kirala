"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useFavorites } from "@/context/favorites-context";
import { useStored } from "@/components/account/useStored";
import {
  incomingRequests,
  myListings,
  outgoingRequests,
  setRequestStatus,
} from "@/lib/storage";
import { StatCard } from "@/components/account/StatCard";
import { RequestCard } from "@/components/account/RequestCard";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClockIcon, HeartIcon, InboxIcon, ListIcon, PlusIcon } from "@/components/ui/icons";

export default function OverviewPage() {
  const { user } = useAuth();
  const { count: favCount } = useFavorites();
  const userId = user?.id ?? "";

  const listings = useStored(() => (userId ? myListings(userId) : []));
  const incoming = useStored(() => (userId ? incomingRequests(userId) : []));
  const outgoing = useStored(() => (userId ? outgoingRequests(userId) : []));

  if (!user) return null;

  const activeCount = listings.filter((l) => l.status === "aktif").length;
  const pending = incoming.filter((r) => r.status === "beklemede");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">Merhaba, {user.name}</h1>
        <p className="text-muted">Panelinden ilanlarını ve kiralama taleplerini yönet.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Aktif İlan" value={activeCount} icon={<ListIcon />} href="/hesap/ilanlarim" />
        <StatCard label="Bekleyen Talep" value={pending.length} icon={<InboxIcon />} href="/hesap/gelen-talepler" accent={pending.length > 0} />
        <StatCard label="Gönderdiğim Talep" value={outgoing.length} icon={<ClockIcon />} href="/hesap/taleplerim" />
        <StatCard label="Favorilerim" value={favCount} icon={<HeartIcon />} href="/hesap/favorilerim" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-tight">Son Gelen Talepler</h2>
          {incoming.length > 0 && (
            <Link href="/hesap/gelen-talepler" className="text-sm font-semibold text-accent hover:underline">
              Tümü →
            </Link>
          )}
        </div>

        {pending.length > 0 ? (
          <div className="space-y-3">
            {pending.slice(0, 3).map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                role="incoming"
                onApprove={() => setRequestStatus(r.id, "onaylandi")}
                onReject={() => setRequestStatus(r.id, "reddedildi")}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<InboxIcon size={36} />}
            title="Bekleyen talep yok"
            description="İlanlarına gelen kiralama talepleri burada görünür."
            action={
              <Link href="/hesap/ilan-ekle" className={buttonClasses("accent", "md")}>
                <PlusIcon size={16} /> İlan Ver
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { myListings } from "@/lib/db/queries/listings";
import { incomingRequests, outgoingRequests } from "@/lib/db/queries/requests";
import { favoriteIds } from "@/lib/db/queries/favorites";
import { StatCard } from "@/components/account/StatCard";
import { RequestCard } from "@/components/account/RequestCard";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClockIcon, HeartIcon, InboxIcon, ListIcon, PlusIcon } from "@/components/ui/icons";

export default async function OverviewPage() {
  const user = await verifySession();

  const [listings, incoming, outgoing, favIds] = await Promise.all([
    myListings(user.id),
    incomingRequests(user.id),
    outgoingRequests(user.id),
    favoriteIds(user.id),
  ]);

  const activeCount = listings.filter((l) => l.status === "aktif").length;
  const pending = incoming.filter((v) => v.request.status === "beklemede");

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
        <StatCard label="Favorilerim" value={favIds.length} icon={<HeartIcon />} href="/hesap/favorilerim" />
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
            {pending.slice(0, 3).map((v) => (
              <RequestCard
                key={v.request.id}
                request={v.request}
                role="incoming"
                listing={v.listing}
                counterpartName={v.counterpartName}
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

import { verifySession } from "@/lib/auth/session";
import { incomingRequests } from "@/lib/db/queries/requests";
import { RequestCard } from "@/components/account/RequestCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { InboxIcon } from "@/components/ui/icons";

export default async function GelenTaleplerPage() {
  const user = await verifySession();
  const incoming = await incomingRequests(user.id);
  const pending = incoming.filter((v) => v.request.status === "beklemede");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">Gelen Talepler</h1>
        <p className="text-muted">
          İlanlarına gelen kiralama talepleri · {pending.length} bekleyen
        </p>
      </div>

      {incoming.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={36} />}
          title="Henüz talep yok"
          description="İlanlarına kiralama talebi geldiğinde burada görünecek ve onaylayabileceksin."
        />
      ) : (
        <div className="space-y-3">
          {incoming.map((v) => (
            <RequestCard
              key={v.request.id}
              request={v.request}
              role="incoming"
              listing={v.listing}
              counterpartName={v.counterpartName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

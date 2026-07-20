import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { outgoingRequests } from "@/lib/db/queries/requests";
import { RequestCard } from "@/components/account/RequestCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { ClockIcon } from "@/components/ui/icons";

export default async function TaleplerimPage() {
  const user = await verifySession();
  const outgoing = await outgoingRequests(user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">Taleplerim</h1>
        <p className="text-muted">Gönderdiğin kiralama talepleri · {outgoing.length} talep</p>
      </div>

      {outgoing.length === 0 ? (
        <EmptyState
          icon={<ClockIcon size={36} />}
          title="Henüz talep göndermedin"
          description="Beğendiğin bir ilana kiralama talebi gönder, durumunu buradan takip et."
          action={
            <Link href="/ilanlar" className={buttonClasses("accent", "md")}>
              İlanlara Göz At
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {outgoing.map((v) => (
            <RequestCard
              key={v.request.id}
              request={v.request}
              role="outgoing"
              listing={v.listing}
              counterpartName={v.counterpartName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useAuth } from "@/context/auth-context";
import { useStored } from "@/components/account/useStored";
import { incomingRequests, setRequestStatus } from "@/lib/storage";
import { RequestCard } from "@/components/account/RequestCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { InboxIcon } from "@/components/ui/icons";

export default function GelenTaleplerPage() {
  const { user } = useAuth();
  const incoming = useStored(() => (user ? incomingRequests(user.id) : []));
  if (!user) return null;

  const pending = incoming.filter((r) => r.status === "beklemede");

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
          {incoming.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              role="incoming"
              onApprove={() => setRequestStatus(r.id, "onaylandi")}
              onReject={() => setRequestStatus(r.id, "reddedildi")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useStored } from "@/components/account/useStored";
import { outgoingRequests } from "@/lib/storage";
import { RequestCard } from "@/components/account/RequestCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { ClockIcon } from "@/components/ui/icons";

export default function TaleplerimPage() {
  const { user } = useAuth();
  const outgoing = useStored(() => (user ? outgoingRequests(user.id) : []));
  if (!user) return null;

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
          {outgoing.map((r) => (
            <RequestCard key={r.id} request={r} role="outgoing" />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useStored } from "@/components/account/useStored";
import { conversationsFor, findAnyListing, sendMessage } from "@/lib/storage";
import { getUser } from "@/lib/data/users";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChevronRightIcon, MessageIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export default function MesajlarPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const convos = useStored(() => (userId ? conversationsFor(userId) : []));
  // URL'deki ?c=<id> ile gelen sohbeti başlangıçta seç (lazy init — yalnızca client)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("c"),
  );
  const [draft, setDraft] = useState("");

  if (!user) return null;

  const selected = convos.find((c) => c.id === selectedId) ?? null;

  const other = (participants: string[]) => getUser(participants.find((p) => p !== user.id) ?? "");

  const send = () => {
    if (!selected || !draft.trim()) return;
    sendMessage(selected.id, user.id, draft.trim());
    setDraft("");
  };

  if (convos.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Mesajlar</h1>
        <EmptyState
          icon={<MessageIcon size={36} />}
          title="Henüz mesajın yok"
          description="Bir ilan sahibine mesaj gönderdiğinde sohbetlerin burada görünür."
          action={
            <Link href="/ilanlar" className="text-sm font-semibold text-accent hover:underline">
              İlanlara göz at →
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Mesajlar</h1>

      <div className="grid h-[70vh] overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[20rem_1fr]">
        {/* Sohbet listesi */}
        <div className={cn("flex flex-col border-r border-line", selected && "hidden lg:flex")}>
          <div className="flex-1 overflow-y-auto">
            {convos.map((c) => {
              const o = other(c.participantIds);
              const listing = findAnyListing(c.listingId);
              const last = c.messages[c.messages.length - 1];
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left transition-colors hover:bg-surface-2",
                    selectedId === c.id && "bg-surface-2",
                  )}
                >
                  <Avatar name={o?.name ?? "?"} accent={o?.accent} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o?.name ?? "Kullanıcı"}</p>
                    <p className="truncate text-xs text-faint">{listing?.title}</p>
                    <p className="truncate text-xs text-muted">{last?.text}</p>
                  </div>
                  <ChevronRightIcon size={16} className="shrink-0 text-faint lg:hidden" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Sohbet penceresi */}
        <div className={cn("flex flex-col", !selected && "hidden lg:flex")}>
          {selected ? (
            <ThreadView
              selected={selected}
              currentUserId={user.id}
              other={other(selected.participantIds)}
              listingTitle={findAnyListing(selected.listingId)?.title}
              listingId={selected.listingId}
              onBack={() => setSelectedId(null)}
              draft={draft}
              setDraft={setDraft}
              onSend={send}
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted">
              <div>
                <MessageIcon size={40} className="mx-auto mb-3 text-faint" />
                Bir sohbet seçin
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadView({
  selected,
  currentUserId,
  other,
  listingTitle,
  listingId,
  onBack,
  draft,
  setDraft,
  onSend,
}: {
  selected: { messages: { id: string; senderId: string; text: string; createdAt: string }[] };
  currentUserId: string;
  other: ReturnType<typeof getUser>;
  listingTitle?: string;
  listingId: string;
  onBack: () => void;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button onClick={onBack} className="text-muted hover:text-fg lg:hidden" aria-label="Geri">
          ‹
        </button>
        <Avatar name={other?.name ?? "?"} accent={other?.accent} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{other?.name ?? "Kullanıcı"}</p>
          <Link href={`/ilanlar/${listingId}`} className="truncate text-xs text-accent hover:underline">
            {listingTitle}
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {selected.messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={cn("max-w-[78%]", mine ? "self-end" : "self-start")}>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  mine ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg",
                )}
              >
                {m.text}
              </div>
              <p className={cn("mt-0.5 text-[11px] text-faint", mine && "text-right")}>
                {timeAgo(m.createdAt)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-2 border-t border-line p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mesaj yazın..."
          rows={1}
          className="min-h-11 flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button onClick={onSend} disabled={!draft.trim()}>Gönder</Button>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { ConversationView } from "@/lib/db/queries/conversations";
import { sendMessageAction } from "@/lib/actions/conversations";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { ChevronRightIcon, MessageIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function MesajlarClient({
  conversations,
  currentUserId,
}: {
  conversations: ConversationView[];
  currentUserId: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(sp.get("c"));
  const [draft, setDraft] = useState("");

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const send = () => {
    if (!selected || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    startTransition(async () => {
      await sendMessageAction(selected.id, text);
      router.refresh();
    });
  };

  if (conversations.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Mesajlar</h1>
        <div className="grid place-items-center rounded-lg border border-line bg-surface p-10 text-center text-muted">
          <div>
            <MessageIcon size={36} className="mx-auto mb-3 text-faint" />
            <p className="font-semibold text-fg">Henüz mesajın yok</p>
            <p className="mt-1 text-sm">Bir ilan sahibine mesaj gönderdiğinde sohbetlerin burada görünür.</p>
            <Link href="/ilanlar" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
              İlanlara göz at →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Mesajlar</h1>

      <div className="grid h-[70vh] overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[20rem_1fr]">
        <div className={cn("flex flex-col border-r border-line", selected && "hidden lg:flex")}>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((c) => {
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
                  <Avatar name={c.other.name} accent={c.other.accent} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.other.name}</p>
                    <p className="truncate text-xs text-faint">{c.listingTitle}</p>
                    <p className="truncate text-xs text-muted">{last?.text}</p>
                  </div>
                  <ChevronRightIcon size={16} className="shrink-0 text-faint lg:hidden" />
                </button>
              );
            })}
          </div>
        </div>

        <div className={cn("flex flex-col", !selected && "hidden lg:flex")}>
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button onClick={() => setSelectedId(null)} className="text-muted hover:text-fg lg:hidden" aria-label="Geri">
                  ‹
                </button>
                <Avatar name={selected.other.name} accent={selected.other.accent} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected.other.name}</p>
                  <Link href={`/ilanlar/${selected.listingId}`} className="truncate text-xs text-accent hover:underline">
                    {selected.listingTitle}
                  </Link>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                {selected.messages.map((m) => {
                  const mine = m.senderId === currentUserId;
                  return (
                    <div key={m.id} className={cn("max-w-[78%]", mine ? "self-end" : "self-start")}>
                      <div className={cn("rounded-lg px-3 py-2 text-sm", mine ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg")}>
                        {m.text}
                      </div>
                      <p className={cn("mt-0.5 text-[11px] text-faint", mine && "text-right")}>{timeAgo(m.createdAt)}</p>
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
                      send();
                    }
                  }}
                />
                <Button onClick={send} disabled={pending || !draft.trim()}>Gönder</Button>
              </div>
            </>
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

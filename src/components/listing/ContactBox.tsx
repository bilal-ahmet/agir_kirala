"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Listing, User } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { startConversationAction } from "@/lib/actions/conversations";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { MessageIcon, PhoneIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `90${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

export function ContactBox({ owner, listing }: { owner: User; listing: Listing }) {
  const { user } = useAuth();
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const listingId = listing.id;
  // İlan sahibi "sadece site üzerinden mesaj" seçtiyse veya telefonu yoksa
  // telefon ve WhatsApp hiç gösterilmez.
  const showPhone = listing.contactPreference !== "sadece_mesaj" && !!owner.phone.trim();

  if (user?.id === owner.id) return null;

  const send = () => {
    if (!user) {
      router.push(`/giris?next=/ilanlar/${listingId}`);
      return;
    }
    if (!text.trim()) return;
    const message = text.trim();
    setError(null);
    startTransition(async () => {
      const res = await startConversationAction(listingId, message);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.conversationId) router.push(`/hesap/mesajlar?c=${res.conversationId}`);
    });
  };

  return (
    <div className="space-y-2">
      {showPhone && (
        <>
          <a
            href={`tel:${owner.phone.replace(/\s/g, "")}`}
            className={buttonClasses("solid", "md", "w-full")}
          >
            <PhoneIcon size={18} /> {owner.phone}
          </a>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={waLink(owner.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("outline", "md")}
            >
              WhatsApp
            </a>
            <button
              onClick={() =>
                user ? setComposing((c) => !c) : router.push(`/giris?next=/ilanlar/${listingId}`)
              }
              className={cn(buttonClasses("outline", "md"))}
            >
              <MessageIcon size={18} /> Mesaj
            </button>
          </div>
        </>
      )}

      {!showPhone && (
        <>
          <button
            onClick={() =>
              user ? setComposing((c) => !c) : router.push(`/giris?next=/ilanlar/${listingId}`)
            }
            className={buttonClasses("solid", "md", "w-full")}
          >
            <MessageIcon size={18} /> Site Üzerinden Mesaj Gönder
          </button>
          <p className="text-center text-xs text-faint">
            İlan sahibi yalnızca site üzerinden iletişim kurulmasını tercih ediyor.
          </p>
        </>
      )}

      {composing && user && (
        <div className="space-y-2 rounded-lg border border-line bg-surface-2 p-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${owner.companyName ?? owner.name} kullanıcısına mesajınız...`}
            rows={3}
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button className="w-full" size="sm" onClick={send} disabled={pending || !text.trim()}>
            {pending ? "Gönderiliyor…" : "Mesajı Gönder"}
          </Button>
        </div>
      )}
    </div>
  );
}

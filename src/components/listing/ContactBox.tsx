"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { startConversation } from "@/lib/storage";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { MessageIcon, PhoneIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `90${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

export function ContactBox({ owner, listingId }: { owner: User; listingId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");

  if (user?.id === owner.id) return null;

  const send = () => {
    if (!user) {
      router.push(`/giris?next=/ilanlar/${listingId}`);
      return;
    }
    if (!text.trim()) return;
    const id = startConversation(listingId, user.id, owner.id, text.trim());
    router.push(`/hesap/mesajlar?c=${id}`);
  };

  return (
    <div className="space-y-2">
      {revealed ? (
        <a href={`tel:${owner.phone.replace(/\s/g, "")}`} className={buttonClasses("solid", "md", "w-full")}>
          <PhoneIcon size={18} /> {owner.phone}
        </a>
      ) : (
        <Button variant="solid" className="w-full" onClick={() => setRevealed(true)}>
          <PhoneIcon size={18} /> Telefonu Göster
        </Button>
      )}

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
          onClick={() => (user ? setComposing((c) => !c) : router.push(`/giris?next=/ilanlar/${listingId}`))}
          className={cn(buttonClasses("outline", "md"))}
        >
          <MessageIcon size={18} /> Mesaj
        </button>
      </div>

      {composing && user && (
        <div className="space-y-2 rounded-lg border border-line bg-surface-2 p-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${owner.name} firmasına mesajınız...`}
            rows={3}
          />
          <Button className="w-full" size="sm" onClick={send} disabled={!text.trim()}>
            Mesajı Gönder
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ListingImage } from "./ListingImage";
import { FavoriteButton } from "./FavoriteButton";
import { cn } from "@/lib/cn";

interface GalleryProps {
  id: string;
  baseSeed: number;
  count: number;
  label?: string;
  /** Gerçek yüklenmiş görseller (varsa placeholder yerine kullanılır). */
  photos?: { url: string }[];
  /** Yüklenmiş tanıtım videosu (varsa şeridin ilk öğesi olur). */
  videoUrl?: string;
}

type GalleryItem = { kind: "video"; url: string } | { kind: "photo"; seed: number; url?: string };

export function Gallery({ id, baseSeed, count, label, photos, videoUrl }: GalleryProps) {
  // Gerçek foto varsa onları, yoksa placeholder tohumlarını kullan.
  const photoItems: GalleryItem[] =
    photos && photos.length
      ? photos.map((p, i) => ({ kind: "photo" as const, seed: baseSeed + i, url: p.url }))
      : Array.from({ length: Math.max(count, 1) }, (_, i) => ({
          kind: "photo" as const,
          seed: baseSeed + i,
        }));

  const items: GalleryItem[] = videoUrl
    ? [{ kind: "video", url: videoUrl }, ...photoItems]
    : photoItems;

  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];

  return (
    <div>
      <div className="relative">
        {current.kind === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            preload="metadata"
            playsInline
            className="aspect-[16/10] w-full rounded-lg bg-black object-contain"
          />
        ) : (
          <ListingImage
            seed={current.seed}
            photoUrl={current.url}
            label={label}
            className="aspect-[16/10] w-full"
            rounded="rounded-lg"
            width={1200}
            priority
          />
        )}
        <FavoriteButton id={id} className="absolute right-3 top-3" size={20} />
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={item.kind === "video" ? "Tanıtım videosu" : `Fotoğraf ${i + 1}`}
            >
              {item.kind === "video" ? (
                <span className="grid h-16 w-24 place-items-center rounded-md bg-surface-3 text-xl text-fg">
                  ▶
                </span>
              ) : (
                <ListingImage
                  seed={item.seed}
                  photoUrl={item.url}
                  className="h-16 w-24"
                  rounded="rounded-md"
                  width={192}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

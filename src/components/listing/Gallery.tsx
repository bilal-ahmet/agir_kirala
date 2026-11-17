"use client";

import { useState } from "react";
import { ListingImage } from "./ListingImage";
import { FavoriteButton } from "./FavoriteButton";
import { cn } from "@/lib/cn";
import type { PhotoCredit } from "@/lib/types";
import { UNSPLASH_HOME } from "@/lib/unsplash";

interface GalleryProps {
  id: string;
  baseSeed: number;
  count: number;
  label?: string;
  /** Gerçek yüklenmiş görseller (varsa placeholder yerine kullanılır). */
  photos?: { url: string; credit?: PhotoCredit }[];
  /** Yüklenmiş tanıtım videosu (varsa şeridin ilk öğesi olur). */
  videoUrl?: string;
}

type GalleryItem =
  | { kind: "video"; url: string }
  | { kind: "photo"; seed: number; url?: string; credit?: PhotoCredit };

export function Gallery({ id, baseSeed, count, label, photos, videoUrl }: GalleryProps) {
  // Gerçek foto varsa onları, yoksa placeholder tohumlarını kullan.
  const photoItems: GalleryItem[] =
    photos && photos.length
      ? photos.map((p, i) => ({
          kind: "photo" as const,
          seed: baseSeed + i,
          url: p.url,
          credit: p.credit,
        }))
      : Array.from({ length: Math.max(count, 1) }, (_, i) => ({
          kind: "photo" as const,
          seed: baseSeed + i,
        }));

  const items: GalleryItem[] = videoUrl
    ? [{ kind: "video", url: videoUrl }, ...photoItems]
    : photoItems;

  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];

  // Küçük görsel etiketlerinde "Fotoğraf 1, 2, 3…" numaralandırması (video sayılmaz).
  let sayac = 0;
  const photoNumaralari = items.map((it) => (it.kind === "photo" ? ++sayac : 0));

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

      {/* Unsplash lisansı: fotoğrafçı + Unsplash linkli atıf, görselin hemen altında. */}
      {current.kind === "photo" && current.credit && (
        <p className="mt-1.5 text-right text-xs text-faint">
          Fotoğraf:{" "}
          <a
            href={current.credit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-fg hover:underline"
          >
            {current.credit.name}
          </a>{" "}
          /{" "}
          <a
            href={UNSPLASH_HOME}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-fg hover:underline"
          >
            Unsplash
          </a>
        </p>
      )}

      {items.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-current={i === active}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-md border-2 transition-all",
                i === active
                  ? "border-accent"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
              aria-label={
                item.kind === "video" ? "Tanıtım videosu" : `Fotoğraf ${photoNumaralari[i]}`
              }
            >
              {item.kind === "video" ? (
                <span className="relative block h-16 w-24 overflow-hidden rounded-md bg-black">
                  {/* İlk kare önizleme olarak kullanılır (#t=0.1) */}
                  <video
                    src={`${item.url}#t=0.1`}
                    preload="metadata"
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-black/35 text-lg text-white">
                    ▶
                  </span>
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

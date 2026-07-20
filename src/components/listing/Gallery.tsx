"use client";

import { useState } from "react";
import { ListingImage } from "./ListingImage";
import { FavoriteButton } from "./FavoriteButton";
import { cn } from "@/lib/cn";

interface GalleryProps {
  id: string;
  icon: string;
  baseSeed: number;
  count: number;
  label?: string;
  /** Gerçek yüklenmiş görseller (varsa placeholder yerine kullanılır). */
  photos?: { url: string }[];
}

export function Gallery({ id, icon, baseSeed, count, label, photos }: GalleryProps) {
  // Gerçek foto varsa onları, yoksa placeholder tohumlarını kullan.
  const items: { seed: number; url?: string }[] =
    photos && photos.length
      ? photos.map((p, i) => ({ seed: baseSeed + i, url: p.url }))
      : Array.from({ length: Math.max(count, 1) }, (_, i) => ({ seed: baseSeed + i }));
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];

  return (
    <div>
      <div className="relative">
        <ListingImage
          icon={icon}
          seed={current.seed}
          photoUrl={current.url}
          label={label}
          className="aspect-[16/10] w-full"
          iconSize="text-8xl"
          rounded="rounded-lg"
        />
        <FavoriteButton id={id} className="absolute right-3 top-3" size={20} />
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={`Fotoğraf ${i + 1}`}
            >
              <ListingImage icon={icon} seed={item.seed} photoUrl={item.url} className="h-16 w-24" iconSize="text-2xl" rounded="rounded-md" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

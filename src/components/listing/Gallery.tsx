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
}

export function Gallery({ id, icon, baseSeed, count, label }: GalleryProps) {
  const seeds = Array.from({ length: Math.max(count, 1) }, (_, i) => baseSeed + i);
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative">
        <ListingImage
          icon={icon}
          seed={seeds[active]}
          label={label}
          className="aspect-[16/10] w-full"
          iconSize="text-8xl"
          rounded="rounded-lg"
        />
        <FavoriteButton id={id} className="absolute right-3 top-3" size={20} />
      </div>

      {seeds.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {seeds.map((seed, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={`Fotoğraf ${i + 1}`}
            >
              <ListingImage icon={icon} seed={seed} className="h-16 w-24" iconSize="text-2xl" rounded="rounded-md" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

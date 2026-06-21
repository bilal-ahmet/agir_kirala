"use client";

import { useFavorites } from "@/context/favorites-context";
import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface FavoriteButtonProps {
  id: string;
  className?: string;
  size?: number;
  withLabel?: boolean;
}

export function FavoriteButton({ id, className, size = 18, withLabel }: FavoriteButtonProps) {
  const { isFavorite, toggle, ready } = useFavorites();
  const active = ready && isFavorite(id);

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(id);
  };

  if (withLabel) {
    return (
      <button
        onClick={handle}
        aria-pressed={active}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors",
          active
            ? "border-accent/40 bg-accent-soft text-accent"
            : "border-line-strong text-fg hover:bg-surface-2",
          className,
        )}
      >
        <HeartIcon size={size} filled={active} />
        {active ? "Favorilerde" : "Favorilere Ekle"}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      aria-pressed={active}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-md border backdrop-blur transition-colors",
        active
          ? "border-accent/40 bg-accent-soft text-accent"
          : "border-white/10 bg-black/40 text-white/80 hover:text-white",
        className,
      )}
    >
      <HeartIcon size={size} filled={active} />
    </button>
  );
}

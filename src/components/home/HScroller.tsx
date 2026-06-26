"use client";

import { useRef } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Yatay kaydırılabilir şerit + sağ/sol ok düğmeleri. */
export function HScroller({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Sola kaydır"
        className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full border border-line bg-surface p-2 text-fg shadow-lg hover:bg-surface-2 sm:grid"
      >
        <ChevronRightIcon size={18} className="rotate-180" />
      </button>

      <div
        ref={ref}
        className={cn(
          "flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2 no-scrollbar",
          className,
        )}
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Sağa kaydır"
        className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full border border-line bg-surface p-2 text-fg shadow-lg hover:bg-surface-2 sm:grid"
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}

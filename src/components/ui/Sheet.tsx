"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { XIcon } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "bottom";
}

export function Sheet({ open, onClose, title, children, footer, side = "right" }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelPos =
    side === "right"
      ? "right-0 top-0 h-full w-full max-w-md"
      : "inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl";

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute flex flex-col border-line bg-surface shadow-2xl",
          side === "right" ? "border-l" : "border-t",
          panelPos,
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Kapat"
          >
            <XIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </div>
  );
}

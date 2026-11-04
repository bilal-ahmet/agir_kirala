"use client";

import { cn } from "@/lib/cn";

/** Filtrelerde kullanılan onay kutusu satırı. */
export function CheckRow({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm text-muted hover:text-fg",
        className,
      )}
    >
      {/*
        Girdi görünmez ama satırın TAMAMINI kaplar ve akışta yerinde durur.
        Eskiden `sr-only` idi: position:absolute + 1x1px olduğu için tıklamayla
        odaklandığında tarayıcı bu minik kutuyu görünür kılmak adına filtre
        panelini (overflow-y-auto) binlerce piksel kaydırıyordu — kullanıcı
        kutucuğu işaretler işaretlemez panel gözden kayboluyordu.
      */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <span
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded border peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-surface",
          checked ? "border-accent bg-accent text-accent-fg" : "border-line-strong",
        )}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className={cn(checked && "text-fg")}>{label}</span>
    </label>
  );
}

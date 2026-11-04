"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckRow } from "./CheckRow";

export interface MultiOption {
  value: string;
  label: string;
}

export interface MultiGroup {
  /** Grup başlığı; tek grupta boş bırakılır. */
  label?: string;
  options: MultiOption[];
}

/** Bu sayıdan fazla seçenekte liste üstünde arama kutusu çıkar. */
const SEARCH_THRESHOLD = 8;

const fold = (s: string) => s.toLocaleLowerCase("tr");

/**
 * Çoklu seçim kutusu. Tetikleyici `Select` ile aynı görünür; tıklanınca
 * listesi SATIR İÇİNDE açılır (popover değil): filtre kenar çubuğu
 * `overflow-y-auto` ve mobil Sheet içinde absolute bir açılır menü kırpılırdı.
 */
export function MultiSelect({
  groups,
  selected,
  onToggle,
  onClear,
  placeholder,
  noun,
  disabled,
  className,
}: {
  groups: MultiGroup[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  /** Hiç seçim yokken gösterilen metin ("Tüm Kategoriler"). */
  placeholder: string;
  /** Özet için isim ("il" → "5 il seçili"). */
  noun: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();

  const all = groups.flatMap((g) => g.options);
  const labelOf = new Map(all.map((o) => [o.value, o.label]));
  const chosen = selected.filter((v) => labelOf.has(v));
  const isOpen = open && !disabled;

  const summary =
    chosen.length === 0
      ? placeholder
      : chosen.length <= 2
        ? chosen.map((v) => labelOf.get(v)).join(", ")
        : `${chosen.length} ${noun} seçili`;

  const q = fold(query.trim());
  const visible = groups
    .map((g) => ({ ...g, options: q ? g.options.filter((o) => fold(o.label).includes(q)) : g.options }))
    .filter((g) => g.options.length > 0);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-md border bg-surface-2 px-3 text-left text-sm transition-colors focus:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50",
          isOpen ? "border-accent" : "border-line",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", chosen.length ? "text-fg" : "text-muted")}>{summary}</span>
        {chosen.length > 0 && (
          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-fg">
            {chosen.length}
          </span>
        )}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-180")}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="mt-1.5 rounded-md border border-line bg-surface p-2"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {all.length > SEARCH_THRESHOLD && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Listede ara…"
              aria-label={`${placeholder} içinde ara`}
              className="mb-1.5 h-9 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />
          )}

          <div className="max-h-56 overflow-y-auto pr-1">
            {visible.length === 0 && <p className="px-1 py-2 text-sm text-faint">Sonuç yok.</p>}
            {visible.map((g, i) => (
              <div key={g.label ?? i} className={cn(i > 0 && "mt-1.5 border-t border-line pt-1.5")}>
                {g.label && (
                  <p className="px-1 pb-0.5 text-[11px] font-bold uppercase tracking-wide text-faint">{g.label}</p>
                )}
                {g.options.map((o) => (
                  <CheckRow
                    key={o.value}
                    label={o.label}
                    checked={selected.includes(o.value)}
                    onChange={() => onToggle(o.value)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-1.5 flex items-center justify-between border-t border-line pt-1.5">
            <button
              type="button"
              onClick={onClear}
              disabled={chosen.length === 0}
              className="rounded px-1 py-1 text-xs font-medium text-muted hover:text-fg disabled:opacity-40"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 text-xs font-semibold text-accent hover:underline"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

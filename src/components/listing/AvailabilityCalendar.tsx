"use client";

import { useMemo, useState } from "react";
import type { Availability } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/ui/icons";
import { useRentalSelection } from "./rental-selection";

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/** Pazartesi=0 olacak şekilde haftanın günü. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Kompakt, 12 ay gezinmeli müsaitlik takvimi.
 * Gün seçimi kiralama talebi alanıyla paylaşılır (1. tıklama başlangıç, 2. tıklama bitiş).
 */
export function AvailabilityCalendar({
  listingId,
  availability,
}: {
  listingId: string;
  availability?: Availability;
}) {
  const { start, end, pickDate } = useRentalSelection();

  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const [offset, setOffset] = useState(0);

  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();

  // Mock dolu günler (ilan id'sinden türetilir) — yalnızca availability yoksa
  const booked = useMemo(() => {
    const seed = [...listingId].reduce((a, c) => a + c.charCodeAt(0), 0);
    const set = new Set<number>();
    for (let i = 0; i < 6; i++) set.add(((seed * (i + 3)) % 26) + 1 + i);
    return set;
  }, [listingId]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = mondayIndex(new Date(year, month, 1));
  const cells: (number | null)[] = [
    ...Array(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function dayState(day: number): "past" | "available" | "unavailable" {
    const date = new Date(year, month, day);
    if (date < today) return "past";
    if (availability) {
      const wd = mondayIndex(date);
      if (availability.weekdays.length > 0 && !availability.weekdays.includes(wd)) return "unavailable";
      if (availability.dateFrom && date < new Date(availability.dateFrom)) return "unavailable";
      if (availability.dateTo && date > new Date(availability.dateTo)) return "unavailable";
      return "available";
    }
    return booked.has(day) ? "unavailable" : "available";
  }

  const iso = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="max-w-sm">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="grid h-7 w-7 place-items-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30"
          aria-label="Önceki ay"
        >
          <ChevronDownIcon size={16} className="rotate-90" />
        </button>
        <h3 className="text-sm font-bold">{MONTHS[month]} {year}</h3>
        <button
          onClick={() => setOffset((o) => Math.min(11, o + 1))}
          disabled={offset === 11}
          className="grid h-7 w-7 place-items-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30"
          aria-label="Sonraki ay"
        >
          <ChevronDownIcon size={16} className="-rotate-90" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-[10px] font-semibold text-faint">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />;
          const state = dayState(day);
          const dateIso = iso(day);
          const isStart = start === dateIso;
          const isEnd = end === dateIso;
          const inRange = !!start && !!end && dateIso > start && dateIso < end;
          return (
            <button
              key={i}
              type="button"
              disabled={state !== "available"}
              onClick={() => pickDate(dateIso)}
              className={cn(
                "grid aspect-square place-items-center rounded text-xs transition-colors",
                state === "past" && "text-faint/40",
                state === "unavailable" && "bg-danger/10 text-danger/70 line-through",
                state === "available" && "bg-success/10 text-fg hover:bg-success/25",
                inRange && "bg-accent/25 text-fg",
                (isStart || isEnd) && "bg-accent text-accent-fg hover:bg-accent",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-success/40" /> Müsait</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-danger/40" /> Dolu</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Seçilen</span>
      </div>

      <p className="mt-2 text-[11px] text-faint">
        Bir gün seçin (başlangıç), ardından bitiş gününü seçin. Seçim sağdaki kiralama talebine işlenir.
      </p>
    </div>
  );
}

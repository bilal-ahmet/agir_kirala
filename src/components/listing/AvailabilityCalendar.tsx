"use client";

import { useMemo, useState } from "react";
import type { Availability } from "@/lib/types";
import { cn } from "@/lib/cn";
import { daysBetween } from "@/lib/pricing";
import { ChevronDownIcon } from "@/components/ui/icons";
import { useRentalSelection } from "./rental-selection";

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type DayState = "past" | "available" | "unavailable";

/** Pazartesi=0 olacak şekilde haftanın günü. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** "YYYY-MM-DD" → yerel gece yarısı (new Date(iso) UTC'ye kayardı). */
function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const shortDate = (iso: string) =>
  fromIso(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

/**
 * Kompakt, 12 ay gezinmeli müsaitlik takvimi.
 * Gün seçimi kiralama talebi alanıyla paylaşılır (1. tıklama başlangıç, 2. tıklama bitiş).
 *
 * Not: `cn` sınıf çakışmalarını ÇÖZMEZ (tailwind-merge yok). Aynı özelliği
 * yazan iki sınıf (ör. `bg-success/10` + `bg-accent`) birlikte verilirse
 * kazananı stylesheet sırası belirler — seçim bu yüzden görünmüyordu. Her
 * gün için tek bir görsel durum hesaplanır ve yalnız onun sınıfları verilir.
 */
export function AvailabilityCalendar({
  listingId,
  availability,
}: {
  listingId: string;
  availability?: Availability;
}) {
  const { start, end, pickDate, clear } = useRentalSelection();
  const [hoverIso, setHoverIso] = useState("");

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

  function dayState(date: Date): DayState {
    if (date < today) return "past";
    if (availability) {
      const wd = mondayIndex(date);
      if (availability.weekdays.length > 0 && !availability.weekdays.includes(wd)) return "unavailable";
      if (availability.dateFrom && date < new Date(availability.dateFrom)) return "unavailable";
      if (availability.dateTo && date > new Date(availability.dateTo)) return "unavailable";
      return "available";
    }
    return booked.has(date.getDate()) ? "unavailable" : "available";
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = mondayIndex(new Date(year, month, 1));
  const cells: (number | null)[] = [
    ...Array(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Görünen aralık: seçili aralık ya da (bitiş yokken) imlecin üzerindeki güne kadar önizleme.
  const preview = !!start && !end && !!hoverIso && hoverIso > start;
  const rangeEnd = end || (preview ? hoverIso : "");

  // Seçilen aralıkta dolu gün sayısı (uyarı için; en fazla 1 yıl taranır, ucuz).
  let blockedInRange = 0;
  if (start && end) {
    const d = fromIso(start);
    const last = fromIso(end);
    for (let i = 0; i < 366 && d <= last; i++, d.setDate(d.getDate() + 1)) {
      if (dayState(new Date(d)) === "unavailable") blockedInRange++;
    }
  }

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

      {/* gap-x-0: aralık bandı hücreler arasında kesintisiz uzansın */}
      <div className="grid grid-cols-7 gap-y-1 text-center" onMouseLeave={() => setHoverIso("")}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-[10px] font-semibold text-faint">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />;
          const date = new Date(year, month, day);
          const state = dayState(date);
          const iso = toIso(date);

          const isStart = iso === start;
          const isEnd = iso === rangeEnd;
          const inBand = !!start && !!rangeEnd && iso >= start && iso <= rangeEnd;
          const endpoint = isStart || (isEnd && !preview);

          // Hücre başına TEK görsel durum → tek bir bg/text sınıf kümesi.
          const look = endpoint
            ? "bg-accent text-accent-fg font-bold shadow-sm"
            : inBand
              ? state === "unavailable"
                ? "text-danger line-through"
                : "text-fg font-semibold"
              : state === "past"
                ? "text-faint/40"
                : state === "unavailable"
                  ? "bg-danger/10 text-danger/70 line-through"
                  : "bg-success/10 text-fg hover:bg-success/25";

          return (
            <div
              key={i}
              className={cn(
                "py-px",
                inBand && (preview ? "bg-accent/10" : "bg-accent/25"),
                inBand && isStart && "rounded-l-md",
                inBand && isEnd && "rounded-r-md",
                // Haftanın ilk/son gününde bant kenarı yumuşasın
                inBand && mondayIndex(date) === 0 && "rounded-l-md",
                inBand && mondayIndex(date) === 6 && "rounded-r-md",
              )}
            >
              <button
                type="button"
                disabled={state !== "available" && !endpoint}
                onClick={() => pickDate(iso)}
                onMouseEnter={() => setHoverIso(iso)}
                aria-pressed={endpoint}
                aria-label={`${day} ${MONTHS[month]} ${year}${isStart ? ", başlangıç" : ""}${isEnd && !preview ? ", bitiş" : ""}`}
                className={cn(
                  "mx-auto grid aspect-square w-full max-w-10 place-items-center rounded-md text-xs transition-colors",
                  look,
                )}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-success/40" /> Müsait</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-danger/40" /> Dolu</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Seçilen</span>
      </div>

      {/* Seçim özeti */}
      {start ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-xs">
          <span className="text-fg">
            {end ? (
              <>
                <b>{shortDate(start)}</b> – <b>{shortDate(end)}</b>
                <span className="text-muted"> · {daysBetween(start, end)} gün</span>
              </>
            ) : (
              <>
                Başlangıç <b>{shortDate(start)}</b>
                <span className="text-muted"> · şimdi bitiş gününü seçin</span>
              </>
            )}
          </span>
          <button type="button" onClick={clear} className="shrink-0 font-semibold text-accent hover:underline">
            Temizle
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-faint">
          Bir gün seçin (başlangıç), ardından bitiş gününü seçin. Seçim sağdaki kiralama talebine işlenir.
        </p>
      )}

      {blockedInRange > 0 && (
        <p className="mt-2 text-[11px] text-danger">
          Seçtiğiniz aralıkta {blockedInRange} dolu gün var; talepte satıcıyla netleştirebilirsiniz.
        </p>
      )}
    </div>
  );
}

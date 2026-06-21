"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/** Salt-görünüm müsaitlik takvimi (mock). İlan id'sinden türetilen dolu günler. */
export function AvailabilityCalendar({ listingId }: { listingId: string }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const booked = useMemo(() => {
    const seed = [...listingId].reduce((a, c) => a + c.charCodeAt(0), 0);
    const set = new Set<number>();
    for (let i = 0; i < 6; i++) set.add(((seed * (i + 3)) % 26) + 1 + i);
    return set;
  }, [listingId]);

  const firstDay = new Date(year, month, 1);
  // Pazartesi başlangıç (0=Pzt)
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">{MONTHS[month]} {year}</h3>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> Müsait</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-danger/70" /> Dolu</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-xs font-semibold text-faint">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />;
          const isPast = day < today.getDate();
          const isToday = day === today.getDate();
          const isBooked = booked.has(day);
          return (
            <div
              key={i}
              className={cn(
                "grid aspect-square place-items-center rounded-md text-sm",
                isPast && "text-faint/40",
                !isPast && isBooked && "bg-danger/15 text-danger line-through",
                !isPast && !isBooked && "bg-success/10 text-fg",
                isToday && "ring-2 ring-accent",
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-faint">
        * Takvim bilgilendirme amaçlıdır. Kesin müsaitlik için kiralama talebi gönderin.
      </p>
    </div>
  );
}

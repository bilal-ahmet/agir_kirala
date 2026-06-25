"use client";

import type { Availability } from "@/lib/types";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

const WEEKDAYS = [
  { i: 0, label: "Pzt" },
  { i: 1, label: "Sal" },
  { i: 2, label: "Çar" },
  { i: 3, label: "Per" },
  { i: 4, label: "Cum" },
  { i: 5, label: "Cmt" },
  { i: 6, label: "Paz" },
];

const HOURS = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

/** İlan sahibinin makinesinin müsait olduğu gün/saat/aralığı seçtiği bileşen. */
export function AvailabilityPicker({
  value,
  onChange,
}: {
  value: Availability;
  onChange: (a: Availability) => void;
}) {
  const toggleDay = (i: number) => {
    const has = value.weekdays.includes(i);
    onChange({
      ...value,
      weekdays: has ? value.weekdays.filter((d) => d !== i) : [...value.weekdays, i].sort(),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-muted">
          Müsait Günler <span className="text-faint">(seçilmezse tüm günler müsait sayılır)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d) => {
            const active = value.weekdays.includes(d.i);
            return (
              <button
                key={d.i}
                type="button"
                onClick={() => toggleDay(d.i)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Günlük Müsait Başlangıç">
          <TimeSelect
            value={value.startTime ?? ""}
            onChange={(v) => onChange({ ...value, startTime: v || undefined })}
          />
        </Field>
        <Field label="Günlük Müsait Bitiş">
          <TimeSelect
            value={value.endTime ?? ""}
            onChange={(v) => onChange({ ...value, endTime: v || undefined })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Müsaitlik Başlangıç Tarihi" hint="Belirli bir tarihten itibaren kiralık.">
          <Input
            type="date"
            value={value.dateFrom ?? ""}
            onChange={(e) => onChange({ ...value, dateFrom: e.target.value || undefined })}
          />
        </Field>
        <Field label="Müsaitlik Bitiş Tarihi" hint="Bu tarihe kadar kiralık.">
          <Input
            type="date"
            min={value.dateFrom || undefined}
            value={value.dateTo ?? ""}
            onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
          />
        </Field>
      </div>
    </div>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
    >
      <option value="">Saat</option>
      {HOURS.map((h) => (
        <option key={h} value={h}>{h}</option>
      ))}
    </select>
  );
}

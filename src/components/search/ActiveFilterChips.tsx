"use client";

import { useFilters } from "./use-filters";
import { getCategory, getSubCategoryName } from "@/lib/categories";
import {
  FUEL_LABELS,
  OWNER_TYPE_LABELS,
  PERIOD_LABELS,
  TRANSPORT_LABELS,
} from "@/lib/constants";
import type { FuelType, OwnerType, RentalPeriod, TransportOption } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { XIcon } from "@/components/ui/icons";

interface Chip {
  label: string;
  onRemove: () => void;
}

export function ActiveFilterChips() {
  const { sp, setParam, toggleInList, update, clearAll } = useFilters();
  const kategori = sp.get("kategori") || "";
  const category = getCategory(kategori);
  const chips: Chip[] = [];

  if (kategori && category) {
    chips.push({ label: category.name, onRemove: () => update((p) => {
      p.delete("kategori");
      p.delete("altKategori");
      [...p.keys()].filter((k) => k.startsWith("spec_")).forEach((k) => p.delete(k));
    }) });
  }

  const alt = sp.get("altKategori");
  if (alt && category) chips.push({ label: getSubCategoryName(kategori, alt), onRemove: () => setParam("altKategori", "") });

  (sp.get("marka") || "").split(",").filter(Boolean).forEach((b) =>
    chips.push({ label: b, onRemove: () => toggleInList("marka", b) }),
  );

  if (sp.get("il")) chips.push({ label: sp.get("il")!, onRemove: () => update((p) => { p.delete("il"); p.delete("ilce"); }) });
  if (sp.get("ilce")) chips.push({ label: sp.get("ilce")!, onRemove: () => setParam("ilce", "") });

  const periyot = sp.get("periyot") as RentalPeriod | null;
  if (periyot) chips.push({ label: PERIOD_LABELS[periyot], onRemove: () => setParam("periyot", "") });

  const minF = sp.get("minFiyat");
  const maxF = sp.get("maxFiyat");
  if (minF || maxF) {
    const label = `Fiyat: ${minF ? formatNumber(+minF) : "0"} – ${maxF ? formatNumber(+maxF) + " ₺" : "∞"}`;
    chips.push({ label, onRemove: () => update((p) => { p.delete("minFiyat"); p.delete("maxFiyat"); }) });
  }

  const minY = sp.get("minYil");
  const maxY = sp.get("maxYil");
  if (minY || maxY) {
    chips.push({ label: `Yıl: ${minY || "…"}–${maxY || "…"}`, onRemove: () => update((p) => { p.delete("minYil"); p.delete("maxYil"); }) });
  }

  const op = sp.get("operator");
  if (op) chips.push({ label: op === "operatorlu" ? "Operatörlü" : "Operatörsüz", onRemove: () => setParam("operator", "") });

  const nak = sp.get("nakliye") as TransportOption | null;
  if (nak) chips.push({ label: TRANSPORT_LABELS[nak], onRemove: () => setParam("nakliye", "") });

  const yak = sp.get("yakit") as FuelType | null;
  if (yak) chips.push({ label: FUEL_LABELS[yak], onRemove: () => setParam("yakit", "") });

  const sat = sp.get("saticiTipi") as OwnerType | null;
  if (sat) chips.push({ label: OWNER_TYPE_LABELS[sat], onRemove: () => setParam("saticiTipi", "") });

  if (sp.get("dogrulanmis") === "1") chips.push({ label: "Doğrulanmış satıcı", onRemove: () => setParam("dogrulanmis", "") });

  // Dinamik teknik özellik çipleri
  if (category) {
    for (const field of category.specFields) {
      const val = sp.get(`spec_${field.key}`);
      if (val) {
        const suffix = field.type === "number" ? `${val}+ ${field.unit ?? ""}`.trim() : val;
        chips.push({ label: `${field.label}: ${suffix}`, onRemove: () => setParam(`spec_${field.key}`, "") });
      }
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-1 pl-3 pr-2 text-sm text-fg transition-colors hover:border-accent/40"
        >
          {chip.label}
          <XIcon size={14} className="text-faint" />
        </button>
      ))}
      {chips.length > 1 && (
        <button onClick={clearAll} className="text-sm font-medium text-accent hover:underline">
          Tümünü temizle
        </button>
      )}
    </div>
  );
}

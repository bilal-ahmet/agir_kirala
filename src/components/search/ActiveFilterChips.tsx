"use client";

import { useFilters } from "./use-filters";
import { getCategory, operatorLabel } from "@/lib/categories";
import {
  CONDITION_LABELS,
  FUEL_LABELS,
  NAKLIYE_LABELS,
  OPERATOR_LABELS,
  OWNER_TYPE_LABELS,
  PERIOD_LABELS,
} from "@/lib/constants";
import type {
  FuelType,
  ListingCondition,
  OperatorFilter,
  OwnerType,
  RentalPeriod,
  TransportFilter,
} from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { XIcon } from "@/components/ui/icons";
import { listOf, operatorLabelCategory, specFieldsForSelection, toggleAndPrune } from "./selection";

interface Chip {
  label: string;
  onRemove: () => void;
}

export function ActiveFilterChips() {
  const { sp, setParam, toggleInList, update, clearAll } = useFilters();
  const kategoriler = listOf(sp, "kategori");
  const altKategoriler = listOf(sp, "altKategori");
  const operatorCategory = operatorLabelCategory(kategoriler);
  const chips: Chip[] = [];

  /** Virgüllü çoklu seçim parametresi → değer başına bir çip. */
  const listChips = (key: string, label: (v: string) => string, dependents = false) => {
    listOf(sp, key).forEach((v) =>
      chips.push({
        label: label(v),
        // Kategori/alt kategori/il kaldırılınca altındaki anlamsız seçimler de budanır.
        onRemove: () => (dependents ? update((p) => toggleAndPrune(p, key, v)) : toggleInList(key, v)),
      }),
    );
  };

  if (sp.get("q")) chips.push({ label: `"${sp.get("q")}"`, onRemove: () => setParam("q", "") });

  listChips("kategori", (v) => getCategory(v)?.name ?? v, true);
  const subName = (slug: string) =>
    kategoriler.flatMap((c) => getCategory(c)?.subcategories ?? []).find((s) => s.slug === slug)?.name ?? slug;
  listChips("altKategori", subName, true);

  listChips("marka", (b) => b);
  listChips("il", (v) => v, true);
  listChips("ilce", (v) => v);

  listChips("periyot", (v) => PERIOD_LABELS[v as RentalPeriod] ?? v);

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

  listChips("operator", (v) =>
    operatorCategory
      ? operatorLabel(operatorCategory, v === "operatorlu")
      : (OPERATOR_LABELS[v as OperatorFilter] ?? v),
  );
  listChips("durum", (v) => CONDITION_LABELS[v as ListingCondition] ?? v);
  listChips("nakliye", (v) => NAKLIYE_LABELS[v as TransportFilter] ?? v);
  listChips("yakit", (v) => FUEL_LABELS[v as FuelType] ?? v);
  listChips("saticiTipi", (v) => OWNER_TYPE_LABELS[v as OwnerType] ?? v);

  if (sp.get("fotografli") === "1") chips.push({ label: "Fotoğraflı", onRemove: () => setParam("fotografli", "") });
  if (sp.get("videolu") === "1") chips.push({ label: "Videolu", onRemove: () => setParam("videolu", "") });

  // Dinamik teknik özellik çipleri (seçenekli alanlarda değer başına bir çip)
  for (const field of specFieldsForSelection(kategoriler, altKategoriler)) {
    const key = `spec_${field.key}`;
    const val = sp.get(key);
    if (!val) continue;
    if (field.type === "number") {
      chips.push({ label: `${field.label}: ${`${val}+ ${field.unit ?? ""}`.trim()}`, onRemove: () => setParam(key, "") });
    } else if (field.type === "boolean") {
      chips.push({ label: `${field.label}: Var`, onRemove: () => setParam(key, "") });
    } else {
      listChips(key, (v) => `${field.label}: ${v}`);
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

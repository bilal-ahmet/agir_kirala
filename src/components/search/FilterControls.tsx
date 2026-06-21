"use client";

import { useFilters } from "./use-filters";
import { CATEGORIES, GROUP_LABELS, getCategory, getFilterableSpecFields } from "@/lib/categories";
import { brandsForCategory } from "@/lib/brands";
import { PROVINCE_NAMES, districtsOf } from "@/lib/locations";
import {
  FUEL_LABELS,
  MAX_YEAR,
  MIN_YEAR,
  OWNER_TYPE_LABELS,
  PERIODS,
  TRANSPORT_LABELS,
} from "@/lib/constants";
import type { CategoryGroup, FuelType, OwnerType, TransportOption } from "@/lib/types";
import { Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

const GROUPS: CategoryGroup[] = ["is-makinesi", "agir-vasita"];

export function FilterControls() {
  const { sp, setParam, toggleInList, update } = useFilters();

  const kategori = sp.get("kategori") || "";
  const category = getCategory(kategori);
  const selectedBrands = (sp.get("marka") || "").split(",").filter(Boolean);
  const il = sp.get("il") || "";
  const ilceler = districtsOf(il);

  return (
    <div className="divide-y divide-line">
      {/* Kategori */}
      <Section title="Kategori">
        <Select
          value={kategori}
          onChange={(e) =>
            update((p) => {
              const v = e.target.value;
              if (v) p.set("kategori", v);
              else p.delete("kategori");
              p.delete("altKategori");
              p.delete("marka");
              [...p.keys()].filter((k) => k.startsWith("spec_")).forEach((k) => p.delete(k));
            })
          }
        >
          <option value="">Tüm Kategoriler</option>
          {GROUPS.map((group) => (
            <optgroup key={group} label={GROUP_LABELS[group]}>
              {CATEGORIES.filter((c) => c.group === group).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>

        {category && (
          <Select
            className="mt-2"
            value={sp.get("altKategori") || ""}
            onChange={(e) => setParam("altKategori", e.target.value)}
          >
            <option value="">Tüm Alt Kategoriler</option>
            {category.subcategories.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </Section>

      {/* Konum */}
      <Section title="Konum">
        <Select
          value={il}
          onChange={(e) =>
            update((p) => {
              const v = e.target.value;
              if (v) p.set("il", v);
              else p.delete("il");
              p.delete("ilce");
            })
          }
        >
          <option value="">Tüm Türkiye</option>
          {PROVINCE_NAMES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        {il && ilceler.length > 0 && (
          <Select
            className="mt-2"
            value={sp.get("ilce") || ""}
            onChange={(e) => setParam("ilce", e.target.value)}
          >
            <option value="">Tüm İlçeler</option>
            {ilceler.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        )}
      </Section>

      {/* Fiyatlandırma */}
      <Section title="Fiyatlandırma">
        <Segmented
          value={sp.get("periyot") || ""}
          onChange={(v) => setParam("periyot", v)}
          options={[{ value: "", label: "Hepsi" }, ...PERIODS.map((p) => ({ value: p.value, label: p.label }))]}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <RangeInput keyName="minFiyat" placeholder="Min ₺" />
          <RangeInput keyName="maxFiyat" placeholder="Max ₺" />
        </div>
      </Section>

      {/* Operatör */}
      <Section title="Operatör">
        <Segmented
          value={sp.get("operator") || ""}
          onChange={(v) => setParam("operator", v)}
          options={[
            { value: "", label: "Farketmez" },
            { value: "operatorlu", label: "Operatörlü" },
            { value: "operatorsuz", label: "Operatörsüz" },
          ]}
        />
      </Section>

      {/* Marka */}
      <Section title="Marka">
        <div className="max-h-48 space-y-0.5 overflow-y-auto pr-1">
          {brandsForCategory(kategori).map((brand) => (
            <CheckRow
              key={brand}
              label={brand}
              checked={selectedBrands.includes(brand)}
              onChange={() => toggleInList("marka", brand)}
            />
          ))}
        </div>
      </Section>

      {/* Kategoriye özel teknik filtreler */}
      {category && getFilterableSpecFields(kategori).length > 0 && (
        <Section title="Teknik Özellikler">
          <div className="space-y-2">
            {getFilterableSpecFields(kategori).map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-muted">
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ""}
                  {field.type === "number" ? " — en az" : ""}
                </label>
                <Select
                  value={String(sp.get(`spec_${field.key}`) || "")}
                  onChange={(e) => setParam(`spec_${field.key}`, e.target.value)}
                >
                  <option value="">Hepsi</option>
                  {field.type === "number"
                    ? (field.steps ?? []).map((s) => (
                        <option key={s} value={s}>
                          {s}+ {field.unit}
                        </option>
                      ))
                    : (field.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                </Select>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Model yılı */}
      <Section title="Model Yılı">
        <div className="grid grid-cols-2 gap-2">
          <RangeInput keyName="minYil" placeholder={`En eski (${MIN_YEAR})`} type="number" />
          <RangeInput keyName="maxYil" placeholder={`En yeni (${MAX_YEAR})`} type="number" />
        </div>
      </Section>

      {/* Nakliye */}
      <Section title="Nakliye / Teslimat">
        <Select value={sp.get("nakliye") || ""} onChange={(e) => setParam("nakliye", e.target.value)}>
          <option value="">Farketmez</option>
          {(["dahil", "ekstra", "yok"] as TransportOption[]).map((t) => (
            <option key={t} value={t}>
              {TRANSPORT_LABELS[t]}
            </option>
          ))}
        </Select>
      </Section>

      {/* Yakıt */}
      <Section title="Yakıt Tipi">
        <Select value={sp.get("yakit") || ""} onChange={(e) => setParam("yakit", e.target.value)}>
          <option value="">Farketmez</option>
          {(["dizel", "elektrik", "lpg", "benzin", "hibrit"] as FuelType[]).map((f) => (
            <option key={f} value={f}>
              {FUEL_LABELS[f]}
            </option>
          ))}
        </Select>
      </Section>

      {/* Satıcı */}
      <Section title="Satıcı">
        <Segmented
          value={sp.get("saticiTipi") || ""}
          onChange={(v) => setParam("saticiTipi", v)}
          options={[
            { value: "", label: "Hepsi" },
            ...(["bireysel", "kurumsal"] as OwnerType[]).map((t) => ({
              value: t,
              label: OWNER_TYPE_LABELS[t],
            })),
          ]}
        />
        <CheckRow
          className="mt-3"
          label="Sadece doğrulanmış satıcılar"
          checked={sp.get("dogrulanmis") === "1"}
          onChange={() => setParam("dogrulanmis", sp.get("dogrulanmis") === "1" ? "" : "1")}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4 first:pt-0">
      <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-fg">{title}</h3>
      {children}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "border-accent bg-accent-soft text-accent"
              : "border-line text-muted hover:border-line-strong hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckRow({
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
    <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm text-muted hover:text-fg", className)}>
      <span
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded border",
          checked ? "border-accent bg-accent text-accent-fg" : "border-line-strong",
        )}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {label}
    </label>
  );
}

function RangeInput({
  keyName,
  placeholder,
  type = "number",
}: {
  keyName: string;
  placeholder: string;
  type?: string;
}) {
  const { sp, setParam } = useFilters();
  const current = sp.get(keyName) || "";
  return (
    <Input
      key={current}
      type={type}
      inputMode="numeric"
      defaultValue={current}
      placeholder={placeholder}
      onBlur={(e) => {
        if (e.target.value !== current) setParam(keyName, e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

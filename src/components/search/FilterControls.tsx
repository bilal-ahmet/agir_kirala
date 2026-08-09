"use client";

import { useState } from "react";
import { useFilterController } from "./filter-controller";
import { CATEGORIES, getCategory, getFilterableSpecFields } from "@/lib/categories";
import { brandsForSubcategory, isTurkishBrand } from "@/lib/brands";
import { PROVINCE_NAMES, districtsOf } from "@/lib/locations";
import {
  CONDITIONS,
  CONDITION_LABELS,
  FUEL_LABELS,
  FUEL_TYPES,
  MAX_YEAR,
  MIN_YEAR,
  NAKLIYE_LABELS,
  OWNER_TYPES,
  OWNER_TYPE_LABELS,
  PERIODS,
  TRANSPORT_FILTERS,
} from "@/lib/constants";
import { Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function FilterControls({ collapsibleAdvanced = false }: { collapsibleAdvanced?: boolean } = {}) {
  const { sp, setParam, toggleInList, update } = useFilterController();

  const kategori = sp.get("kategori") || "";
  const altKategori = sp.get("altKategori") || "";
  const category = getCategory(kategori);
  const selectedBrands = (sp.get("marka") || "").split(",").filter(Boolean);
  const il = sp.get("il") || "";
  const ilceler = districtsOf(il);

  /** Virgüllü çoklu seçim parametresinde bir değer seçili mi. */
  const has = (key: string, value: string) =>
    (sp.get(key) || "").split(",").filter(Boolean).includes(value);

  return (
    <div className="divide-y divide-line">
      {/* Kelime ile arama — filtrelerin en başında */}
      <Section title="Kelime ile Ara">
        <TextParamInput keyName="q" placeholder="Marka, model veya ilan başlığı" />
      </Section>

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
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>

        {/* Alt kategori her zaman görünür; kategori seçilmeden kullanılamaz. */}
        <Select
          className="mt-2"
          value={altKategori}
          disabled={!category}
          onChange={(e) =>
            update((p) => {
              const v = e.target.value;
              if (v) p.set("altKategori", v);
              else p.delete("altKategori");
              p.delete("marka");
            })
          }
        >
          <option value="">{category ? "Tüm Alt Kategoriler" : "Önce kategori seçin"}</option>
          {(category?.subcategories ?? []).map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </Select>
        {!category && (
          <p className="mt-1 text-xs text-faint">
            Alt kategori için önce bir kategori seçmelisiniz.
          </p>
        )}
      </Section>

      {/* Konum — il ve ilçe birlikte görünür */}
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
        <Select
          className="mt-2"
          value={sp.get("ilce") || ""}
          disabled={!il || ilceler.length === 0}
          onChange={(e) => setParam("ilce", e.target.value)}
        >
          <option value="">{il ? "Tüm İlçeler" : "Önce il seçin"}</option>
          {ilceler.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        {!il && <p className="mt-1 text-xs text-faint">İlçe için önce bir il seçmelisiniz.</p>}
      </Section>

      {/* Fiyatlandırma */}
      <Section title="Fiyatlandırma">
        <Segmented
          value={sp.get("periyot") || ""}
          onChange={(v) => setParam("periyot", v)}
          options={[{ value: "", label: "Hepsi" }, ...PERIODS.map((p) => ({ value: p.value, label: p.label }))]}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NumberInput keyName="minFiyat" placeholder="Min ₺" />
          <NumberInput keyName="maxFiyat" placeholder="Max ₺" />
        </div>
      </Section>

      {/* Durum */}
      <Section title="Durum">
        {CONDITIONS.map((c) => (
          <CheckRow
            key={c}
            label={CONDITION_LABELS[c]}
            checked={has("durum", c)}
            onChange={() => toggleInList("durum", c)}
          />
        ))}
      </Section>

      {/* Operatör */}
      <Section title="Operatör">
        <Segmented
          value={sp.get("operator") || ""}
          onChange={(v) => setParam("operator", v === (sp.get("operator") || "") ? "" : v)}
          options={[
            { value: "operatorlu", label: "Operatörlü" },
            { value: "operatorsuz", label: "Operatörsüz" },
          ]}
        />
      </Section>

      {/* Marka — seçilen alt kategoriye göre */}
      <Section title="Marka">
        {category && !altKategori && (
          <p className="mb-2 -mt-1 text-xs text-faint">
            Markaları daraltmak için alt kategori seçin.
          </p>
        )}
        <div className="max-h-48 space-y-0.5 overflow-y-auto pr-1">
          {brandsForSubcategory(kategori, altKategori).map((brand) => (
            <CheckRow
              key={brand}
              label={brand}
              checked={selectedBrands.includes(brand)}
              onChange={() => toggleInList("marka", brand)}
              badge={isTurkishBrand(brand) ? "Yerli" : undefined}
            />
          ))}
        </div>
      </Section>

      {/* Medya */}
      <Section title="Medya">
        <CheckRow
          label="Fotoğraflı ilanlar"
          checked={sp.get("fotografli") === "1"}
          onChange={() => setParam("fotografli", sp.get("fotografli") === "1" ? "" : "1")}
        />
        <CheckRow
          label="Videolu ilanlar"
          checked={sp.get("videolu") === "1"}
          onChange={() => setParam("videolu", sp.get("videolu") === "1" ? "" : "1")}
        />
      </Section>

      {/* Kategoriye özel teknik filtreler */}
      {category && getFilterableSpecFields(kategori).length > 0 && (
        <Section title="Teknik Özellikler" collapsible={collapsibleAdvanced}>
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
                  <option value="">Seçiniz</option>
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
      <Section title="Model Yılı" collapsible={collapsibleAdvanced}>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput keyName="minYil" placeholder={`En eski (${MIN_YEAR})`} maxLength={4} />
          <NumberInput keyName="maxYil" placeholder={`En yeni (${MAX_YEAR})`} maxLength={4} />
        </div>
      </Section>

      {/* Nakliye */}
      <Section title="Nakliye" collapsible={collapsibleAdvanced}>
        {TRANSPORT_FILTERS.map((t) => (
          <CheckRow
            key={t}
            label={NAKLIYE_LABELS[t]}
            checked={has("nakliye", t)}
            onChange={() => toggleInList("nakliye", t)}
          />
        ))}
      </Section>

      {/* Yakıt */}
      <Section title="Yakıt Tipi" collapsible={collapsibleAdvanced}>
        {FUEL_TYPES.map((f) => (
          <CheckRow
            key={f}
            label={FUEL_LABELS[f]}
            checked={has("yakit", f)}
            onChange={() => toggleInList("yakit", f)}
          />
        ))}
      </Section>

      {/* Satıcı */}
      <Section title="Satıcı" collapsible={collapsibleAdvanced}>
        {OWNER_TYPES.map((t) => (
          <CheckRow
            key={t}
            label={OWNER_TYPE_LABELS[t]}
            checked={has("saticiTipi", t)}
            onChange={() => toggleInList("saticiTipi", t)}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <div className="py-4 first:pt-0">
        <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-fg">{title}</h3>
        {children}
      </div>
    );
  }

  return (
    <div className="py-4 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide text-fg"
      >
        <span>{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("text-muted transition-transform", open && "rotate-180")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="mt-2.5">{children}</div>}
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
  badge,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  className?: string;
  badge?: React.ReactNode;
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
      <span>{label}</span>
      {badge && (
        <span className="ml-auto rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          {badge}
        </span>
      )}
    </label>
  );
}

/** Serbest metin parametresi (arama kutusu). Blur veya Enter'da URL'e yazar. */
function TextParamInput({ keyName, placeholder }: { keyName: string; placeholder: string }) {
  const { sp, setParam } = useFilterController();
  const current = sp.get(keyName) || "";
  return (
    <Input
      key={current}
      type="search"
      defaultValue={current}
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v !== current) setParam(keyName, v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

/**
 * Sayısal aralık kutusu. `type="number"` KULLANILMAZ: artırma/azaltma okları
 * istenmiyor ve alan eksiye düşmemeli. Girdi yalnızca rakamlara indirgenir.
 */
function NumberInput({
  keyName,
  placeholder,
  maxLength,
}: {
  keyName: string;
  placeholder: string;
  maxLength?: number;
}) {
  const { sp, setParam } = useFilterController();
  const current = sp.get(keyName) || "";

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (digits !== current) setParam(keyName, digits);
  };

  return (
    <Input
      key={current}
      type="text"
      inputMode="numeric"
      maxLength={maxLength}
      defaultValue={current}
      placeholder={placeholder}
      onInput={(e) => {
        // Yazarken harf/işaret girilmesini engelle (eksi dahil).
        const el = e.currentTarget;
        const cleaned = el.value.replace(/\D/g, "");
        if (el.value !== cleaned) el.value = cleaned;
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

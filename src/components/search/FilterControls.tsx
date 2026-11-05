"use client";

import { useState } from "react";
import { useFilterController } from "./filter-controller";
import { CATEGORIES, getCategory, operatorLabel } from "@/lib/categories";
import { brandsForSelection } from "@/lib/brands";
import { PROVINCE_NAMES, districtsOf, scopedDistrict } from "@/lib/locations";
import {
  CONDITIONS,
  CONDITION_LABELS,
  FUEL_LABELS,
  FUEL_TYPES,
  MAX_YEAR,
  MIN_YEAR,
  NAKLIYE_LABELS,
  OPERATOR_FILTERS,
  OPERATOR_LABELS,
  OWNER_TYPES,
  OWNER_TYPE_LABELS,
  PERIODS,
  TRANSPORT_FILTERS,
} from "@/lib/constants";
import { Input, Select } from "@/components/ui/Field";
import { VoiceSearchButton } from "./VoiceSearchButton";
import { CheckRow } from "./CheckRow";
import { MultiSelect, type MultiGroup } from "./MultiSelect";
import {
  clearAndPrune,
  listOf,
  operatorLabelCategory,
  selectedDistricts,
  specFieldsForSelection,
  toggleAndPrune,
  toggleDistrict,
  transportAppliesToSelection,
} from "@/lib/filter-selection";
import { cn } from "@/lib/cn";

export function FilterControls({ collapsibleAdvanced = false }: { collapsibleAdvanced?: boolean } = {}) {
  const { sp, setParam, toggleInList, update } = useFilterController();

  const kategoriler = listOf(sp, "kategori");
  const altKategoriler = listOf(sp, "altKategori");
  const iller = listOf(sp, "il");
  const selectedCategories = kategoriler.flatMap((slug) => getCategory(slug) ?? []);
  const specFields = specFieldsForSelection(kategoriler, altKategoriler);
  const operatorCategory = operatorLabelCategory(kategoriler);

  /** Virgüllü çoklu seçim parametresinde bir değer seçili mi. */
  const has = (key: string, value: string) => listOf(sp, key).includes(value);

  // Bağımlı parametreleri de budayan işlemler (kategori / alt kategori / il).
  const toggleDep = (key: string) => (value: string) => update((p) => toggleAndPrune(p, key, value));
  const clearDep = (key: string) => () => update((p) => clearAndPrune(p, key));

  // Birden çok il seçiliyse ilçeler il başlıklarıyla gruplanır. Değer "İl/İlçe":
  // ilçe adları iller arasında tekrar eder ("Merkez"), yalın ad belirsiz kalırdı.
  const districtGroups: MultiGroup[] = iller.map((il) => ({
    label: iller.length > 1 ? il : undefined,
    options: districtsOf(il).map((d) => ({ value: scopedDistrict(il, d), label: d })),
  }));

  // Birden çok kategori seçiliyse alt kategoriler kategori başlıklarıyla gruplanır.
  const subGroups: MultiGroup[] = selectedCategories.map((c) => ({
    label: selectedCategories.length > 1 ? c.name : undefined,
    options: c.subcategories.map((s) => ({ value: s.slug, label: s.name })),
  }));

  return (
    <div className="divide-y divide-line">
      {/* Kelime ile arama — filtrelerin en başında */}
      <Section title="Kelime ile Ara">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <TextParamInput keyName="q" placeholder="Marka, model veya ilan başlığı" />
          </div>
          {/* Mevcut filtreler verilir: sesle düzenlenebilir ("Kocaeli'yi de ekle"). */}
          <VoiceSearchButton current={sp} />
        </div>
      </Section>

      {/* Kategori */}
      <Section title="Kategori">
        <MultiSelect
          groups={[{ options: CATEGORIES.map((c) => ({ value: c.slug, label: c.name })) }]}
          selected={kategoriler}
          onToggle={toggleDep("kategori")}
          onClear={clearDep("kategori")}
          placeholder="Tüm Kategoriler"
          noun="kategori"
        />

        {/* Alt kategori her zaman görünür; kategori seçilmeden kullanılamaz. */}
        <MultiSelect
          className="mt-2"
          groups={subGroups}
          selected={altKategoriler}
          onToggle={toggleDep("altKategori")}
          onClear={clearDep("altKategori")}
          placeholder={kategoriler.length ? "Tüm Alt Kategoriler" : "Önce kategori seçin"}
          noun="alt kategori"
          disabled={kategoriler.length === 0}
        />
        {kategoriler.length === 0 && (
          <p className="mt-1 text-xs text-faint">
            Alt kategori için önce bir kategori seçmelisiniz.
          </p>
        )}
      </Section>

      {/* Konum — il ve ilçe çoklu; ilçeler il başlıklarıyla gruplanır */}
      <Section title="Konum">
        <MultiSelect
          groups={[{ options: PROVINCE_NAMES.map((p) => ({ value: p, label: p })) }]}
          selected={iller}
          onToggle={toggleDep("il")}
          onClear={clearDep("il")}
          placeholder="Tüm Türkiye"
          noun="il"
        />
        <MultiSelect
          className="mt-2"
          groups={districtGroups}
          selected={selectedDistricts(sp)}
          onToggle={(v) => update((p) => toggleDistrict(p, v))}
          onClear={() => setParam("ilce", "")}
          placeholder={iller.length ? "Tüm İlçeler" : "Önce il seçin"}
          noun="ilçe"
          disabled={iller.length === 0}
        />
        {iller.length === 0 && <p className="mt-1 text-xs text-faint">İlçe için önce bir il seçmelisiniz.</p>}
      </Section>

      {/* Fiyatlandırma */}
      <Section title="Fiyatlandırma">
        {PERIODS.map((p) => (
          <CheckRow
            key={p.value}
            label={p.label}
            checked={has("periyot", p.value)}
            onChange={() => toggleInList("periyot", p.value)}
          />
        ))}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NumberInput keyName="minFiyat" placeholder="Min ₺" />
          <NumberInput keyName="maxFiyat" placeholder="Max ₺" />
        </div>
        <p className="mt-1.5 text-xs text-faint">
          Birden çok periyot seçerseniz fiyat aralığı en düşük olana göre uygulanır.
        </p>
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

      {/* Operatör (tırda "Şoför") */}
      <Section title={operatorCategory ? "Şoför" : "Operatör"}>
        {OPERATOR_FILTERS.map((o) => (
          <CheckRow
            key={o}
            label={operatorCategory ? operatorLabel(operatorCategory, o === "operatorlu") : OPERATOR_LABELS[o]}
            checked={has("operator", o)}
            onChange={() => toggleInList("operator", o)}
          />
        ))}
      </Section>

      {/* Marka — seçilen alt kategoriye göre */}
      <Section title="Marka">
        {kategoriler.length > 0 && altKategoriler.length === 0 && (
          <p className="mb-2 -mt-1 text-xs text-faint">
            Markaları daraltmak için alt kategori seçin.
          </p>
        )}
        <MultiSelect
          groups={[{ options: brandOptions(brandsForSelection(kategoriler, altKategoriler), listOf(sp, "marka")) }]}
          selected={listOf(sp, "marka")}
          onToggle={(b) => toggleInList("marka", b)}
          onClear={() => setParam("marka", "")}
          placeholder="Tüm Markalar"
          noun="marka"
        />
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

      {/* Kategoriye özel teknik filtreler — yalnız tek kategori seçiliyken */}
      {specFields.length > 0 && (
        <Section title="Teknik Özellikler" collapsible={collapsibleAdvanced}>
          <div className="space-y-2">
            {specFields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-muted">
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ""}
                  {field.type === "number" ? " — en az" : ""}
                </label>
                {field.type === "number" || field.type === "boolean" ? (
                  <Select
                    value={String(sp.get(`spec_${field.key}`) || "")}
                    onChange={(e) => setParam(`spec_${field.key}`, e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {field.type === "number" ? (
                      (field.steps ?? []).map((s) => (
                        <option key={s} value={s}>
                          {s}+ {field.unit}
                        </option>
                      ))
                    ) : (
                      // jsonb'deki true, `specs->>key = 'true'` ile eşleşir.
                      <option value="true">Var</option>
                    )}
                  </Select>
                ) : (
                  // Seçenekli alan: çoklu seçim (herhangi biri eşleşirse).
                  <MultiSelect
                    groups={[{ options: (field.options ?? []).map((o) => ({ value: o, label: o })) }]}
                    selected={listOf(sp, `spec_${field.key}`)}
                    onToggle={(v) => toggleInList(`spec_${field.key}`, v)}
                    onClear={() => setParam(`spec_${field.key}`, "")}
                    placeholder="Tümü"
                    noun="seçenek"
                  />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Model yılı */}
      <Section title="Model Yılı" collapsible={collapsibleAdvanced}>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput keyName="minYil" placeholder={`Min (${MIN_YEAR})`} maxLength={4} />
          <NumberInput keyName="maxYil" placeholder={`Max (${MAX_YEAR})`} maxLength={4} />
        </div>
      </Section>

      {/* Nakliye — tırın kendisi nakliye aracı olduğu için orada gizli */}
      {transportAppliesToSelection(kategoriler) && (
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
      )}

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

/**
 * Marka seçenekleri: seçimin listesi + listede olmayan ama seçili markalar
 * (ör. sesle "Scania forklift" dendiyse). Sesli arama söyleneni atmaz; seçili
 * marka panelde de görünmeli ki kullanıcı kendisi kaldırabilsin.
 */
function brandOptions(list: string[], selected: string[]) {
  const extra = selected.filter((b) => !list.includes(b));
  return [...list, ...extra].map((b) => ({ value: b, label: b }));
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

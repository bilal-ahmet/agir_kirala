"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { addLocalListing } from "@/lib/storage";
import {
  CATEGORIES,
  GROUP_LABELS,
  getCategory,
} from "@/lib/categories";
import { brandsForCategory } from "@/lib/brands";
import { PROVINCE_NAMES, districtsOf } from "@/lib/locations";
import {
  FUEL_LABELS,
  MAX_YEAR,
  MIN_YEAR,
  PERIODS,
  TRANSPORT_LABELS,
} from "@/lib/constants";
import type {
  CategoryGroup,
  FuelType,
  Listing,
  PriceMap,
  RentalPeriod,
  TransportOption,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ListingCard } from "@/components/listing/ListingCard";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

const GROUPS: CategoryGroup[] = ["is-makinesi", "agir-vasita"];
const STEPS = ["Kategori", "Temel Bilgiler", "Özellikler", "Fiyat & Yayın"];

type SpecVal = string | number | boolean;

interface FormState {
  categorySlug: string;
  subCategorySlug: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  city: string;
  district: string;
  description: string;
  operator: boolean;
  transport: TransportOption;
  fuel: FuelType;
  usage: string;
  specs: Record<string, SpecVal>;
  prices: Partial<Record<RentalPeriod, string>>;
  minRentalDays: number;
}

export default function IlanEklePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 999));
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    categorySlug: "",
    subCategorySlug: "",
    title: "",
    brand: "",
    model: "",
    year: MAX_YEAR,
    city: "",
    district: "",
    description: "",
    operator: false,
    transport: "ekstra",
    fuel: "dizel",
    usage: "",
    specs: {},
    prices: {},
    minRentalDays: 1,
  });

  const category = getCategory(form.categorySlug);
  const set = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };

  const parsedPrices = useMemo<PriceMap>(() => {
    const out: PriceMap = {};
    for (const p of PERIODS) {
      const v = form.prices[p.value];
      if (v && Number(v) > 0) out[p.value] = Number(v);
    }
    return out;
  }, [form.prices]);

  const parsedSpecs = useMemo<Record<string, SpecVal>>(() => {
    const out: Record<string, SpecVal> = {};
    for (const field of category?.specFields ?? []) {
      const v = form.specs[field.key];
      if (v === undefined || v === "") continue;
      out[field.key] = field.type === "number" ? Number(v) : v;
    }
    return out;
  }, [form.specs, category]);

  const preview: Listing = {
    id: "preview",
    title: form.title || `${form.brand} ${form.model}`.trim() || "Yeni İlan",
    categorySlug: form.categorySlug || "ekskavator",
    subCategorySlug: form.subCategorySlug,
    brand: form.brand || "—",
    model: form.model,
    year: form.year,
    city: form.city || "—",
    district: form.district || "",
    prices: parsedPrices,
    operator: form.operator,
    transport: form.transport,
    fuel: form.fuel,
    usage: Number(form.usage) || 0,
    specs: parsedSpecs,
    description: form.description,
    ownerId: user?.id ?? "",
    status: "aktif",
    createdAt: new Date().toISOString(),
    photoSeed: seed,
    photoCount: 3,
  };

  if (!user) return null;

  const canNext = () => {
    if (step === 0) return Boolean(form.categorySlug && form.subCategorySlug);
    if (step === 1) return Boolean(form.brand && form.model && form.city);
    return true;
  };

  const next = () => {
    if (!canNext()) {
      setError("Lütfen zorunlu alanları doldurun.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const publish = () => {
    if (Object.keys(parsedPrices).length === 0) {
      setError("En az bir fiyatlandırma periyodu girin.");
      return;
    }
    addLocalListing({
      ...preview,
      id: `l-${Date.now()}`,
      title: form.title || `${form.brand} ${form.model}`.trim(),
      minRentalDays: form.minRentalDays,
    });
    router.push("/hesap/ilanlarim");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">İlan Ver</h1>
        <p className="text-muted">Makineni birkaç adımda kiralamaya hazır hale getir.</p>
      </div>

      {/* Adım göstergesi */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                i < step && "bg-success text-white",
                i === step && "bg-accent text-accent-fg",
                i > step && "bg-surface-3 text-faint",
              )}
            >
              {i < step ? <CheckIcon size={16} /> : i + 1}
            </div>
            <span className={cn("hidden text-sm sm:block", i === step ? "font-semibold text-fg" : "text-faint")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface p-5">
        {/* Adım 0: Kategori */}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Kategori">
              <Select
                value={form.categorySlug}
                onChange={(e) => set({ categorySlug: e.target.value, subCategorySlug: "", specs: {} })}
              >
                <option value="">Seçin</option>
                {GROUPS.map((g) => (
                  <optgroup key={g} label={GROUP_LABELS[g]}>
                    {CATEGORIES.filter((c) => c.group === g).map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            {category && (
              <Field label="Alt Kategori">
                <Select value={form.subCategorySlug} onChange={(e) => set({ subCategorySlug: e.target.value })}>
                  <option value="">Seçin</option>
                  {category.subcategories.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}

        {/* Adım 1: Temel bilgiler */}
        {step === 1 && (
          <div className="space-y-4">
            <Field label="İlan Başlığı" hint="Boş bırakırsan marka + model kullanılır.">
              <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Örn. Caterpillar 320 Paletli Ekskavatör" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marka">
                <Select value={form.brand} onChange={(e) => set({ brand: e.target.value })}>
                  <option value="">Seçin</option>
                  {brandsForCategory(form.categorySlug).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Model">
                <Input value={form.model} onChange={(e) => set({ model: e.target.value })} placeholder="Örn. 320 GC" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Model Yılı">
                <Input
                  type="number"
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  value={form.year}
                  onChange={(e) => set({ year: Number(e.target.value) })}
                />
              </Field>
              <Field label="Şehir">
                <Select value={form.city} onChange={(e) => set({ city: e.target.value, district: "" })}>
                  <option value="">Seçin</option>
                  {PROVINCE_NAMES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="İlçe">
                <Select value={form.district} onChange={(e) => set({ district: e.target.value })} disabled={!form.city}>
                  <option value="">Seçin</option>
                  {districtsOf(form.city).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Açıklama">
              <Textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Makinenin durumu, kullanım şartları, ek ekipmanlar..."
                rows={4}
              />
            </Field>
          </div>
        )}

        {/* Adım 2: Özellikler */}
        {step === 2 && category && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Operatör">
                <Select value={form.operator ? "1" : "0"} onChange={(e) => set({ operator: e.target.value === "1" })}>
                  <option value="0">Operatörsüz (kuru kiralama)</option>
                  <option value="1">Operatörlü</option>
                </Select>
              </Field>
              <Field label="Nakliye">
                <Select value={form.transport} onChange={(e) => set({ transport: e.target.value as TransportOption })}>
                  {(["dahil", "ekstra", "yok"] as TransportOption[]).map((t) => (
                    <option key={t} value={t}>{TRANSPORT_LABELS[t]}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Yakıt">
                <Select value={form.fuel} onChange={(e) => set({ fuel: e.target.value as FuelType })}>
                  {(["dizel", "elektrik", "lpg", "benzin", "hibrit"] as FuelType[]).map((f) => (
                    <option key={f} value={f}>{FUEL_LABELS[f]}</option>
                  ))}
                </Select>
              </Field>
              <Field label={category.usageMetric === "saat" ? "Çalışma Saati (motosaat)" : "Kilometre"}>
                <Input
                  type="number"
                  min={0}
                  value={form.usage}
                  onChange={(e) => set({ usage: e.target.value })}
                  placeholder={category.usageMetric === "saat" ? "Örn. 4200" : "Örn. 210000"}
                />
              </Field>
            </div>

            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-fg">
                {category.name} Teknik Özellikleri
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {category.specFields.map((field) => (
                  <Field key={field.key} label={`${field.label}${field.unit ? ` (${field.unit})` : ""}`}>
                    {field.type === "select" ? (
                      <Select
                        value={String(form.specs[field.key] ?? "")}
                        onChange={(e) => set({ specs: { ...form.specs, [field.key]: e.target.value } })}
                      >
                        <option value="">Seçin</option>
                        {(field.options ?? []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </Select>
                    ) : field.type === "boolean" ? (
                      <Select
                        value={form.specs[field.key] ? "1" : "0"}
                        onChange={(e) => set({ specs: { ...form.specs, [field.key]: e.target.value === "1" } })}
                      >
                        <option value="0">Yok</option>
                        <option value="1">Var</option>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        value={String(form.specs[field.key] ?? "")}
                        onChange={(e) => set({ specs: { ...form.specs, [field.key]: e.target.value } })}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Adım 3: Fiyat & yayın */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Label>Fiyatlandırma (₺) — en az bir periyot</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PERIODS.map((p) => (
                  <Field key={p.value} label={p.label}>
                    <Input
                      type="number"
                      min={0}
                      value={form.prices[p.value] ?? ""}
                      onChange={(e) => set({ prices: { ...form.prices, [p.value]: e.target.value } })}
                      placeholder="₺"
                    />
                  </Field>
                ))}
              </div>
            </div>

            <Field label="Minimum Kiralama Süresi (gün)" className="max-w-xs">
              <Input
                type="number"
                min={1}
                value={form.minRentalDays}
                onChange={(e) => set({ minRentalDays: Number(e.target.value) || 1 })}
              />
            </Field>

            <div>
              <Label>Önizleme</Label>
              <div className="max-w-xs">
                <ListingCard listing={preview} />
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {/* Gezinme */}
        <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
          >
            ‹ Geri
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Devam Et ›</Button>
          ) : (
            <Button onClick={publish}>İlanı Yayınla</Button>
          )}
        </div>
      </div>
    </div>
  );
}

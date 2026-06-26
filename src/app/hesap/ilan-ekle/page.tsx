"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { addLocalListing } from "@/lib/storage";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { brandsForCategory } from "@/lib/brands";
import { PROVINCE_NAMES, districtsOf } from "@/lib/locations";
import {
  FUEL_LABELS,
  LISTING_PERIODS,
  MAX_YEAR,
  MIN_YEAR,
} from "@/lib/constants";
import type {
  Availability,
  FuelType,
  Listing,
  ListingStatus,
  PriceMap,
  RentalPeriod,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ListingCard } from "@/components/listing/ListingCard";
import { ListingDetail } from "@/components/listing/ListingDetail";
import { AvailabilityPicker } from "@/components/listing/AvailabilityPicker";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

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
  fuel: FuelType;
  usage: string;
  specs: Record<string, SpecVal>;
  availability: Availability;
  prices: Partial<Record<RentalPeriod, string>>;
  minRentalDays: number;
}

export default function IlanEklePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [previewing, setPreviewing] = useState(false);
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
    fuel: "dizel",
    usage: "",
    specs: {},
    availability: { weekdays: [] },
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
    for (const p of LISTING_PERIODS) {
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

  const hasAvailability =
    form.availability.weekdays.length > 0 ||
    !!form.availability.startTime ||
    !!form.availability.endTime ||
    !!form.availability.dateFrom ||
    !!form.availability.dateTo;

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
    transport: "yok",
    fuel: form.fuel,
    usage: Number(form.usage) || 0,
    specs: parsedSpecs,
    description: form.description,
    ownerId: user?.id ?? "",
    status: "aktif",
    createdAt: new Date().toISOString(),
    photoSeed: seed,
    photoCount: 3,
    ...(hasAvailability ? { availability: form.availability } : {}),
  };

  if (!user) return null;

  // ───────── doğrulama ─────────
  const missingForStep = (s: number): string[] => {
    if (s === 0) {
      const m: string[] = [];
      if (!form.categorySlug) m.push("Kategori");
      if (!form.subCategorySlug) m.push("Alt Kategori");
      return m;
    }
    if (s === 1) {
      const m: string[] = [];
      if (!form.title.trim()) m.push("İlan Başlığı");
      if (!form.brand) m.push("Marka");
      if (!form.year) m.push("Model Yılı");
      if (!form.city) m.push("Şehir");
      if (!form.district) m.push("İlçe");
      return m;
    }
    return [];
  };

  const goToStep = (target: number) => {
    if (target <= maxStep) {
      setStep(target);
      setError(null);
    }
  };

  const next = () => {
    const missing = missingForStep(step);
    if (missing.length > 0) {
      setError(`Lütfen zorunlu alanları doldurun: ${missing.join(", ")}.`);
      return;
    }
    const target = Math.min(step + 1, STEPS.length - 1);
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
    setError(null);
  };

  const buildListing = (status: ListingStatus): Listing => ({
    ...preview,
    id: `l-${Date.now()}`,
    status,
    title: form.title || `${form.brand} ${form.model}`.trim(),
    minRentalDays: form.minRentalDays,
  });

  const saveDraft = () => {
    addLocalListing(buildListing("taslak"));
    router.push("/hesap/ilanlarim?durum=taslak");
  };

  const publish = () => {
    if (Object.keys(parsedPrices).length === 0) {
      setError("En az bir fiyatlandırma periyodu girin.");
      setPreviewing(false);
      setStep(3);
      return;
    }
    addLocalListing(buildListing("aktif"));
    router.push("/hesap/ilanlarim");
  };

  // ───────── önizleme ekranı (ilan sayfası gibi) ─────────
  if (previewing) {
    return (
      <div className="space-y-5">
        {/* Önizleme aksiyon çubuğu */}
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent-soft px-4 py-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-accent">Önizleme Modu</p>
            <p className="text-xs text-muted">İlanın yayınlandığında nasıl görüneceği aşağıdadır.</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreviewing(false)}>
              ‹ Düzenlemeye Dön
            </Button>
            <Button variant="outline" size="sm" onClick={saveDraft}>
              Taslak Kaydet
            </Button>
            <Button size="sm" onClick={publish}>İlanı Yayınla</Button>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* Gerçek ilan detay görünümü */}
        <div className="overflow-hidden rounded-lg border border-line">
          <ListingDetail listing={buildListing("aktif")} owner={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">İlan Ver</h1>
        <p className="text-muted">Makineni birkaç adımda kiralamaya hazır hale getir.</p>
      </div>

      {/* Adım göstergesi — tıklanabilir */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const clickable = i <= maxStep;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => goToStep(i)}
                className={cn(
                  "flex items-center gap-2",
                  clickable ? "cursor-pointer" : "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors",
                    i < step && "bg-success text-white",
                    i === step && "bg-accent text-accent-fg",
                    i > step && "bg-surface-3 text-faint",
                    clickable && i !== step && "hover:ring-2 hover:ring-accent",
                  )}
                >
                  {i < step ? <CheckIcon size={16} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-sm sm:block",
                    i === step ? "font-semibold text-fg" : "text-faint",
                  )}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-line bg-surface p-5">
        {/* Adım 0: Kategori */}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Kategori" required>
              <Select
                value={form.categorySlug}
                onChange={(e) => set({ categorySlug: e.target.value, subCategorySlug: "", specs: {} })}
              >
                <option value="">Seçin</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field
              label="Alt Kategori"
              required
              hint={!category ? "Önce kategori seçin." : undefined}
            >
              <Select
                value={form.subCategorySlug}
                onChange={(e) => set({ subCategorySlug: e.target.value })}
                disabled={!category}
              >
                <option value="">{category ? "Seçin" : "Önce kategori seçin"}</option>
                {(category?.subcategories ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {/* Adım 1: Temel bilgiler */}
        {step === 1 && (
          <div className="space-y-4">
            <Field label="İlan Başlığı" required>
              <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Örn. Caterpillar 320 Paletli Ekskavatör" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marka" required>
                <Select value={form.brand} onChange={(e) => set({ brand: e.target.value })}>
                  <option value="">Seçin</option>
                  {brandsForCategory(form.categorySlug).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Model" hint="İsteğe bağlı.">
                <Input value={form.model} onChange={(e) => set({ model: e.target.value })} placeholder="Örn. 320 GC" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Model Yılı" required>
                <Input
                  type="number"
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  value={form.year}
                  onChange={(e) => set({ year: Number(e.target.value) })}
                />
              </Field>
              <Field label="Şehir" required>
                <Select value={form.city} onChange={(e) => set({ city: e.target.value, district: "" })}>
                  <option value="">Seçin</option>
                  {PROVINCE_NAMES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="İlçe" required>
                <Select value={form.district} onChange={(e) => set({ district: e.target.value })} disabled={!form.city}>
                  <option value="">Seçin</option>
                  {districtsOf(form.city).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Açıklama" hint="İsteğe bağlı.">
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
                  <option value="0">Operatörsüz</option>
                  <option value="1">Operatörlü</option>
                </Select>
              </Field>
              <Field label="Nakliye">
                <Select value="yok" disabled>
                  <option value="yok">Nakliye Yok (Müşteriye Ait)</option>
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

            <div className="border-t border-line pt-4">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-fg">Müsaitlik</h3>
              <p className="mb-3 text-xs text-faint">
                Makinenin hangi gün ve saatlerde kiralanabileceğini belirtin.
              </p>
              <AvailabilityPicker
                value={form.availability}
                onChange={(availability) => set({ availability })}
              />
            </div>
          </div>
        )}

        {/* Adım 3: Fiyat & yayın */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Label required>Fiyatlandırma (₺) — en az bir periyot</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LISTING_PERIODS.map((p) => (
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
              <Label>Kart Önizlemesi</Label>
              <div className="max-w-xs">
                <ListingCard listing={preview} />
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {/* Gezinme */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
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
            <div className="flex gap-3">
              <Button variant="outline" onClick={saveDraft}>
                Taslak Kaydet
              </Button>
              <Button onClick={() => { setError(null); setPreviewing(true); }}>
                Önizle ve Yayınla ›
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

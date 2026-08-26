"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useAuth } from "@/context/auth-context";
import { createListingAction } from "@/lib/actions/listings";
// Tip action modulunden DEGIL kaynagindan gelir: "use server" dosyalari
// tip re-export edemez (calisma aninda ReferenceError).
import type { CreateListingInput } from "@/lib/core/schemas";
import { uploadListingMedia } from "@/lib/upload-client";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { brandsForSubcategory, isTurkishBrand } from "@/lib/brands";
import { PROVINCE_NAMES, districtsOf } from "@/lib/locations";
import {
  ALLOWED_VIDEO_TYPES,
  CONDITIONS,
  CONDITION_LABELS,
  FUEL_LABELS,
  LISTING_PERIODS,
  MAX_VIDEO_BYTES,
  MAX_YEAR,
  MIN_YEAR,
} from "@/lib/constants";
import type {
  Availability,
  ContactPreference,
  FuelType,
  Listing,
  ListingCondition,
  ListingStatus,
  PriceMap,
  RentalPeriod,
  TransportOption,
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
  transport: TransportOption;
  fuel: FuelType;
  condition: ListingCondition;
  contactPreference: ContactPreference;
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
  // İlan kaydedildi ama medya yüklenemedi durumu — ayrı tutulur, çünkü bu bir
  // form doğrulama hatası değil ve kullanıcı ilanlarım sayfasına yönlendirilmez.
  const [mediaError, setMediaError] = useState<string | null>(null);
  // Doğrudan yükleme ilerlemesi (15 MB video için yüzde göstermek şart).
  const [uploadState, setUploadState] = useState<{
    ad: string;
    sira: number;
    toplam: number;
    oran: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const photoPreviews = useMemo(() => photoFiles.map((f) => URL.createObjectURL(f)), [photoFiles]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoPreview = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile],
  );

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
    transport: "yok",
    fuel: "dizel",
    condition: "ikinci_el",
    contactPreference: "telefon_mesaj",
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

  // Profilinde telefon olmayan kullanıcı telefonlu iletişim seçemez.
  const hasPhone = !!user?.phone?.trim();
  const effectiveContactPreference: ContactPreference = hasPhone
    ? form.contactPreference
    : "sadece_mesaj";

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
    transport: form.transport,
    fuel: form.fuel,
    condition: form.condition,
    contactPreference: effectiveContactPreference,
    usage: Number(form.usage) || 0,
    specs: parsedSpecs,
    description: form.description,
    ownerId: user?.id ?? "",
    status: "aktif",
    createdAt: new Date().toISOString(),
    photoSeed: seed,
    // Önizlemede SEÇİLEN gerçek görseller gösterilir (blob: object URL'leri).
    // Eskiden burası boştu, bu yüzden önizlemede yüklenen fotoğraflar yerine
    // placeholder gradyanlar görünüyordu.
    photoCount: photoPreviews.length || undefined,
    photos: photoPreviews.map((url, i) => ({ id: `preview-${i}`, url })),
    ...(videoPreview ? { videoUrl: videoPreview } : {}),
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
    id: "preview",
    status,
    title: form.title || `${form.brand} ${form.model}`.trim(),
    minRentalDays: form.minRentalDays,
  });

  const buildInput = (status: "aktif" | "taslak"): CreateListingInput => ({
    title: form.title || `${form.brand} ${form.model}`.trim(),
    categorySlug: form.categorySlug,
    subCategorySlug: form.subCategorySlug,
    brand: form.brand,
    model: form.model,
    year: form.year,
    city: form.city,
    district: form.district,
    prices: parsedPrices,
    operator: form.operator,
    transport: form.transport,
    fuel: form.fuel,
    condition: form.condition,
    contactPreference: effectiveContactPreference,
    usage: Number(form.usage) || 0,
    specs: parsedSpecs,
    description: form.description,
    minRentalDays: form.minRentalDays,
    availability: hasAvailability ? form.availability : undefined,
    status,
  });

  const submitListing = (status: "aktif" | "taslak") => {
    startTransition(async () => {
      const res = await createListingAction(buildInput(status));
      if (res.error || !res.id) {
        setError(res.error ?? "İlan oluşturulamadı.");
        return;
      }
      // İlan oluşturuldu → seçilen medyayı DOĞRUDAN Supabase'e yükle.
      // Dosyalar Next sunucusundan geçmez; ayrıntı için src/lib/actions/uploads.ts.
      const medyaHatalari: string[] = [];
      const yuklenecek: { kind: "photo" | "video"; file: File }[] = [
        ...photoFiles.map((file) => ({ kind: "photo" as const, file })),
        ...(videoFile ? [{ kind: "video" as const, file: videoFile }] : []),
      ];

      try {
        for (let i = 0; i < yuklenecek.length; i++) {
          const { kind, file } = yuklenecek[i];
          setUploadState({ ad: file.name, sira: i + 1, toplam: yuklenecek.length, oran: 0 });
          const up = await uploadListingMedia(res.id, kind, file, (oran) =>
            setUploadState({ ad: file.name, sira: i + 1, toplam: yuklenecek.length, oran }),
          );
          if (up.error) medyaHatalari.push(`${file.name}: ${up.error}`);
        }
      } catch (e) {
        medyaHatalari.push(e instanceof Error ? e.message : "Medya yüklenemedi.");
      } finally {
        setUploadState(null);
      }

      if (medyaHatalari.length) {
        setMediaError(
          `İlanınız kaydedildi ancak bazı dosyalar yüklenemedi: ${medyaHatalari.join(" · ")} — İlanlarım sayfasından ilanı düzenleyip tekrar deneyebilirsiniz.`,
        );
        return;
      }
      router.push(status === "taslak" ? "/hesap/ilanlarim?durum=taslak" : "/hesap/ilanlarim");
    });
  };

  const saveDraft = () => submitListing("taslak");

  // Yayın için zorunlu fiyat alanı (saatlik)
  const missingPrices = (): string[] => {
    const m: string[] = [];
    if (!parsedPrices.saatlik) m.push("Saatlik Ücret");
    return m;
  };

  const publish = () => {
    const m = missingPrices();
    if (m.length > 0) {
      setError(`Yayınlamak için zorunlu alanlar: ${m.join(", ")}.`);
      setPreviewing(false);
      setStep(3);
      return;
    }
    setMediaError(null);
    submitListing("aktif");
  };

  /** Doğrudan yükleme sırasında gösterilen ilerleme çubuğu. */
  const yuklemeGostergesi = uploadState ? (
    <div
      role="status"
      className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm"
    >
      <p className="font-semibold text-accent">
        Medya yükleniyor — {uploadState.sira}/{uploadState.toplam}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted">{uploadState.ad}</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.round(uploadState.oran * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        %{Math.round(uploadState.oran * 100)} — lütfen sayfayı kapatmayın.
      </p>
    </div>
  ) : null;

  /** İlan kaydedildi ama medya yüklenemedi uyarısı + ilanlarıma git bağlantısı. */
  const mediaUyarisi = mediaError ? (
    <div
      role="alert"
      className="rounded-lg border border-warning/40 bg-accent-soft px-4 py-3 text-sm text-warning"
    >
      <p>{mediaError}</p>
      <Link
        href="/hesap/ilanlarim"
        className="mt-1.5 inline-block font-semibold text-accent hover:underline"
      >
        İlanlarım sayfasına git →
      </Link>
    </div>
  ) : null;

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
            <Button variant="outline" size="sm" onClick={saveDraft} disabled={pending}>
              Taslak Kaydet
            </Button>
            <Button size="sm" onClick={publish} disabled={pending}>İlanı Yayınla</Button>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {yuklemeGostergesi}
        {mediaUyarisi}

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
                onChange={(e) => set({ categorySlug: e.target.value, subCategorySlug: "", brand: "", specs: {} })}
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
                onChange={(e) => set({ subCategorySlug: e.target.value, brand: "" })}
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
              <Field label="Marka" required hint="Seçilen alt kategoriye göre listelenir.">
                <Select value={form.brand} onChange={(e) => set({ brand: e.target.value })}>
                  <option value="">Seçin</option>
                  {brandsForSubcategory(form.categorySlug, form.subCategorySlug).map((b) => (
                    <option key={b} value={b}>{isTurkishBrand(b) ? `${b} (Yerli)` : b}</option>
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
              <Field label="Nakliye" hint="Makineyi siz mi taşıyorsunuz?">
                <Select
                  value={form.transport}
                  onChange={(e) => set({ transport: e.target.value as TransportOption })}
                >
                  <option value="yok">Nakliye Yok (Müşteriye Ait)</option>
                  <option value="dahil">Nakliye Var — Fiyata Dahil</option>
                  <option value="ekstra">Nakliye Var — Ayrıca Ücretli</option>
                </Select>
              </Field>
              <Field label="Durum" required>
                <Select
                  value={form.condition}
                  onChange={(e) => set({ condition: e.target.value as ListingCondition })}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
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
              <Label required>Fiyatlandırma (₺)</Label>
              <p className="mb-2 -mt-1 text-xs text-faint">
                Saatlik ücret zorunludur. Günlük/haftalık/aylık/yıllık opsiyoneldir.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LISTING_PERIODS.map((p) => {
                  const req = p.value === "saatlik";
                  return (
                    <Field key={p.value} label={p.label} required={req}>
                      <Input
                        type="number"
                        min={0}
                        value={form.prices[p.value] ?? ""}
                        onChange={(e) => set({ prices: { ...form.prices, [p.value]: e.target.value } })}
                        placeholder="₺"
                      />
                    </Field>
                  );
                })}
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
              <Label>Fotoğraflar</Label>
              <p className="mb-2 -mt-1 text-xs text-faint">
                JPEG/PNG/WebP, en fazla 8 görsel · her biri 5 MB&apos;a kadar. İsteğe bağlı.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).slice(0, 8);
                  setPhotoFiles(files);
                  setError(null);
                }}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent-fg hover:file:bg-accent-hover"
              />
              {photoPreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {photoPreviews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt={`Görsel ${i + 1}`}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Tanıtım Videosu</Label>
              <p className="mb-2 -mt-1 text-xs text-faint">
                MP4/WebM/MOV, tek video · en fazla{" "}
                {Math.floor(MAX_VIDEO_BYTES / (1024 * 1024))} MB. İsteğe bağlı — videolu
                ilanlar listede &quot;Videolu&quot; rozetiyle öne çıkar.
              </p>
              <input
                type="file"
                accept={ALLOWED_VIDEO_TYPES.join(",")}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX_VIDEO_BYTES) {
                    setError(
                      `Video en fazla ${Math.floor(MAX_VIDEO_BYTES / (1024 * 1024))} MB olabilir. Seçtiğiniz dosya ${(f.size / (1024 * 1024)).toFixed(1)} MB.`,
                    );
                    e.target.value = "";
                    setVideoFile(null);
                    return;
                  }
                  setVideoFile(f);
                  setError(null);
                }}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent-fg hover:file:bg-accent-hover"
              />
              {videoPreview && (
                <div className="mt-3 max-w-sm space-y-2">
                  <video
                    src={videoPreview}
                    controls
                    preload="metadata"
                    playsInline
                    className="aspect-video w-full rounded-md bg-black"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setVideoFile(null)}>
                    Videoyu kaldır
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label required>İletişim Tercihi</Label>
              <p className="mb-2 -mt-1 text-xs text-faint">
                Telefonunuzu paylaşmak istemiyorsanız yalnızca site üzerinden mesaj alabilirsiniz.
              </p>
              <Select
                value={effectiveContactPreference}
                disabled={!hasPhone}
                onChange={(e) =>
                  set({ contactPreference: e.target.value as ContactPreference })
                }
              >
                <option value="telefon_mesaj">Telefon + WhatsApp + Site içi mesaj</option>
                <option value="sadece_mesaj">Sadece site üzerinden mesaj</option>
              </Select>
              {!hasPhone && (
                <p className="mt-1 text-xs text-warning">
                  Profilinizde telefon numarası yok, bu yüzden ilan yalnızca site içi mesajla
                  iletişim kuracak.{" "}
                  <Link href="/hesap/profil" className="font-semibold text-accent hover:underline">
                    Profilime telefon ekle
                  </Link>
                </p>
              )}
            </div>

            <div>
              <Label>Kart Önizlemesi</Label>
              <div className="max-w-xs">
                <ListingCard listing={preview} disableLink />
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {uploadState && <div className="mt-4">{yuklemeGostergesi}</div>}
        {mediaError && <div className="mt-4">{mediaUyarisi}</div>}

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
              <Button variant="outline" onClick={saveDraft} disabled={pending}>
                Taslak Kaydet
              </Button>
              <Button
                onClick={() => {
                  const m = missingPrices();
                  if (m.length > 0) {
                    setError(`Yayınlamak için zorunlu alanlar: ${m.join(", ")}.`);
                    return;
                  }
                  setError(null);
                  setPreviewing(true);
                }}
              >
                Önizle ve Yayınla ›
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import type { Category } from "./types";

// Kategoriler — TEK KAYNAK.
// Filtre paneli, ilan ekleme formu ve detay özellik tablosu hep buradan üretilir.

export const CATEGORIES: Category[] = [
  // ───────────────────────── İŞ MAKİNELERİ ─────────────────────────
  {
    slug: "ekskavator",
    name: "Ekskavatör",
    group: "is-makinesi",
    tagline: "Kazı, yükleme ve hafriyat",
    icon: "🚜",
    usageMetric: "saat",
    subcategories: [
      { slug: "paletli", name: "Paletli Ekskavatör" },
      { slug: "lastikli", name: "Lastikli Ekskavatör" },
      { slug: "mini", name: "Mini Ekskavatör" },
    ],
    specFields: [
      { key: "operasyonAgirligi", label: "Operasyon Ağırlığı", type: "number", unit: "ton", filterable: true, steps: [1, 5, 10, 20, 30, 50] },
      { key: "kovaKapasitesi", label: "Kova Kapasitesi", type: "number", unit: "m³", filterable: true, steps: [0.2, 0.5, 1, 1.5, 2] },
      { key: "kaziDerinligi", label: "Kazı Derinliği", type: "number", unit: "m" },
      { key: "motorGucu", label: "Motor Gücü", type: "number", unit: "HP" },
    ],
  },
  {
    slug: "beko-loder",
    name: "Beko Loder",
    group: "is-makinesi",
    tagline: "Kazıcı yükleyici (JCB tipi)",
    icon: "🚧",
    usageMetric: "saat",
    subcategories: [
      { slug: "2-ceker", name: "2 Çeker (4x2)" },
      { slug: "4-ceker", name: "4 Çeker (4x4)" },
    ],
    specFields: [
      { key: "motorGucu", label: "Motor Gücü", type: "number", unit: "HP", filterable: true, steps: [70, 90, 100, 110] },
      { key: "kovaKapasitesi", label: "Ön Kova Kapasitesi", type: "number", unit: "m³" },
      { key: "kaziDerinligi", label: "Kazı Derinliği", type: "number", unit: "m" },
    ],
  },
  {
    slug: "yukleyici",
    name: "Lastikli Yükleyici",
    group: "is-makinesi",
    tagline: "Loader — yığma ve yükleme",
    icon: "🏗️",
    usageMetric: "saat",
    subcategories: [
      { slug: "lastikli", name: "Lastikli Yükleyici" },
      { slug: "mini", name: "Mini Yükleyici (Bobcat)" },
    ],
    specFields: [
      { key: "kovaKapasitesi", label: "Kova Kapasitesi", type: "number", unit: "m³", filterable: true, steps: [1, 2, 3, 4, 5] },
      { key: "operasyonAgirligi", label: "Operasyon Ağırlığı", type: "number", unit: "ton", filterable: true, steps: [5, 10, 15, 20] },
      { key: "motorGucu", label: "Motor Gücü", type: "number", unit: "HP" },
    ],
  },
  {
    slug: "forklift",
    name: "Forklift",
    group: "is-makinesi",
    tagline: "İstifleme ve yük taşıma",
    icon: "🛻",
    usageMetric: "saat",
    subcategories: [
      { slug: "dizel", name: "Dizel Forklift" },
      { slug: "elektrikli", name: "Elektrikli Forklift" },
      { slug: "lpg", name: "LPG'li Forklift" },
    ],
    specFields: [
      { key: "kaldirmaKapasitesi", label: "Kaldırma Kapasitesi", type: "number", unit: "kg", filterable: true, steps: [1500, 2500, 3500, 5000, 10000] },
      { key: "asansorYuksekligi", label: "Asansör Yüksekliği", type: "number", unit: "m", filterable: true, steps: [3, 4, 5, 6] },
      { key: "yuruyusTipi", label: "Yürüyüş Tipi", type: "select", options: ["Lastik", "Dolgu Lastik"] },
    ],
  },
  {
    slug: "vinc",
    name: "Vinç",
    group: "is-makinesi",
    tagline: "Ağır kaldırma operasyonları",
    icon: "🏗️",
    usageMetric: "saat",
    subcategories: [
      { slug: "mobil", name: "Mobil Vinç" },
      { slug: "kule", name: "Kule Vinç" },
      { slug: "sepetli", name: "Sepetli Vinç (Araç Üstü)" },
      { slug: "paletli", name: "Paletli Vinç" },
    ],
    specFields: [
      { key: "kaldirmaKapasitesi", label: "Kaldırma Kapasitesi", type: "number", unit: "ton", filterable: true, steps: [10, 25, 50, 100, 200, 400] },
      { key: "bomUzunlugu", label: "Bom Uzunluğu", type: "number", unit: "m", filterable: true, steps: [20, 30, 40, 60] },
      { key: "erisimYuksekligi", label: "Erişim Yüksekliği", type: "number", unit: "m" },
    ],
  },
  {
    slug: "manlift",
    name: "Manlift / Platform",
    group: "is-makinesi",
    tagline: "Yüksekte personel erişimi",
    icon: "🪜",
    usageMetric: "saat",
    subcategories: [
      { slug: "makasli", name: "Makaslı Platform" },
      { slug: "eklemli", name: "Eklemli Platform" },
      { slug: "teleskopik", name: "Teleskopik Platform" },
    ],
    specFields: [
      { key: "calismaYuksekligi", label: "Çalışma Yüksekliği", type: "number", unit: "m", filterable: true, steps: [10, 16, 22, 30, 40] },
      { key: "platformKapasitesi", label: "Platform Kapasitesi", type: "number", unit: "kg" },
      { key: "tahrik", label: "Tahrik", type: "select", options: ["Dizel", "Elektrik", "Hibrit"] },
    ],
  },
  {
    slug: "silindir",
    name: "Silindir",
    group: "is-makinesi",
    tagline: "Toprak ve asfalt sıkıştırma",
    icon: "🛢️",
    usageMetric: "saat",
    subcategories: [
      { slug: "toprak", name: "Toprak Silindiri" },
      { slug: "asfalt", name: "Asfalt Silindiri" },
      { slug: "tandem", name: "Tandem Silindir" },
    ],
    specFields: [
      { key: "operasyonAgirligi", label: "Operasyon Ağırlığı", type: "number", unit: "ton", filterable: true, steps: [3, 7, 12, 18] },
      { key: "calismaGenisligi", label: "Çalışma Genişliği", type: "number", unit: "cm" },
    ],
  },
  {
    slug: "dozer",
    name: "Dozer",
    group: "is-makinesi",
    tagline: "Tesviye ve itme işleri",
    icon: "🚜",
    usageMetric: "saat",
    subcategories: [{ slug: "paletli", name: "Paletli Dozer" }],
    specFields: [
      { key: "motorGucu", label: "Motor Gücü", type: "number", unit: "HP", filterable: true, steps: [150, 200, 300, 400] },
      { key: "operasyonAgirligi", label: "Operasyon Ağırlığı", type: "number", unit: "ton" },
    ],
  },
  {
    slug: "beton-pompasi",
    name: "Beton Pompası",
    group: "is-makinesi",
    tagline: "Beton iletim ve pompalama",
    icon: "🏭",
    usageMetric: "saat",
    subcategories: [
      { slug: "arac-ustu", name: "Araç Üstü Pompa" },
      { slug: "sabit", name: "Sabit Pompa" },
    ],
    specFields: [
      { key: "erisimMesafesi", label: "Erişim Mesafesi", type: "number", unit: "m", filterable: true, steps: [24, 32, 42, 52] },
      { key: "debi", label: "Pompalama Debisi", type: "number", unit: "m³/sa" },
    ],
  },
  {
    slug: "jenerator",
    name: "Jeneratör",
    group: "is-makinesi",
    tagline: "Geçici enerji çözümü",
    icon: "⚡",
    usageMetric: "saat",
    subcategories: [
      { slug: "dizel", name: "Dizel Jeneratör" },
      { slug: "kabinli", name: "Kabinli Jeneratör" },
    ],
    specFields: [
      { key: "guc", label: "Güç", type: "number", unit: "kVA", filterable: true, steps: [30, 60, 100, 250, 500] },
      { key: "kabin", label: "Kabin", type: "boolean" },
    ],
  },

  // ───────────────────────── AĞIR VASITALAR ─────────────────────────
  {
    slug: "kamyon",
    name: "Kamyon",
    group: "agir-vasita",
    tagline: "Yük ve hafriyat taşıma",
    icon: "🚚",
    usageMetric: "km",
    subcategories: [
      { slug: "damperli", name: "Damperli Kamyon" },
      { slug: "kasali", name: "Kasalı Kamyon" },
      { slug: "tenteli", name: "Tenteli Kamyon" },
      { slug: "frigorifik", name: "Frigorifik Kamyon" },
    ],
    specFields: [
      { key: "tonaj", label: "Tonaj", type: "number", unit: "ton", filterable: true, steps: [10, 18, 26, 32] },
      { key: "dingil", label: "Dingil", type: "select", options: ["4x2", "6x2", "6x4", "8x4"], filterable: true },
      { key: "kasaUzunlugu", label: "Kasa Uzunluğu", type: "number", unit: "m" },
    ],
  },
  {
    slug: "cekici",
    name: "Çekici (TIR)",
    group: "agir-vasita",
    tagline: "Uzun yol ve dorse çekişi",
    icon: "🚛",
    usageMetric: "km",
    subcategories: [
      { slug: "standart", name: "Standart Çekici" },
      { slug: "low-deck", name: "Alçak Kabin (Low-Deck)" },
    ],
    specFields: [
      { key: "motorGucu", label: "Motor Gücü", type: "number", unit: "HP", filterable: true, steps: [420, 480, 500, 540] },
      { key: "dingil", label: "Dingil", type: "select", options: ["4x2", "6x2", "6x4"], filterable: true },
      { key: "yatakli", label: "Yataklı Kabin", type: "boolean" },
    ],
  },
  {
    slug: "dorse",
    name: "Dorse / Römork",
    group: "agir-vasita",
    tagline: "Çekici arkası taşıma çözümü",
    icon: "🚙",
    usageMetric: "km",
    subcategories: [
      { slug: "lowbed", name: "Lowbed (Havuzlu)" },
      { slug: "tanker", name: "Tanker Dorse" },
      { slug: "silobas", name: "Silobas" },
      { slug: "platform", name: "Platform Dorse" },
      { slug: "damperli", name: "Damperli Dorse" },
    ],
    specFields: [
      { key: "tasimaKapasitesi", label: "Taşıma Kapasitesi", type: "number", unit: "ton", filterable: true, steps: [25, 40, 60, 80] },
      { key: "dingilSayisi", label: "Dingil Sayısı", type: "number", unit: "adet" },
      { key: "uzunluk", label: "Uzunluk", type: "number", unit: "m" },
    ],
  },
  {
    slug: "tanker",
    name: "Tanker",
    group: "agir-vasita",
    tagline: "Su / akaryakıt taşıma",
    icon: "🛢️",
    usageMetric: "km",
    subcategories: [
      { slug: "su", name: "Su Tankeri" },
      { slug: "akaryakit", name: "Akaryakıt Tankeri" },
      { slug: "vidanjor", name: "Vidanjör" },
    ],
    specFields: [
      { key: "hacim", label: "Tank Hacmi", type: "number", unit: "m³", filterable: true, steps: [10, 20, 30, 40] },
      { key: "bolmeSayisi", label: "Bölme Sayısı", type: "number", unit: "adet" },
    ],
  },
];

// ───────────────────────── yardımcılar ─────────────────────────

export function getCategory(slug: string | undefined): Category | undefined {
  if (!slug) return undefined;
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoriesByGroup(group: Category["group"]): Category[] {
  return CATEGORIES.filter((c) => c.group === group);
}

export function getFilterableSpecFields(categorySlug: string | undefined) {
  const cat = getCategory(categorySlug);
  if (!cat) return [];
  return cat.specFields.filter((f) => f.filterable);
}

export function getSubCategoryName(categorySlug: string, subSlug: string): string {
  const cat = getCategory(categorySlug);
  return cat?.subcategories.find((s) => s.slug === subSlug)?.name ?? subSlug;
}

export const GROUP_LABELS: Record<Category["group"], string> = {
  "is-makinesi": "İş Makineleri",
  "agir-vasita": "Ağır Vasıtalar",
};

import type { Category, SpecField } from "./types";

// Kategoriler — TEK KAYNAK.
// Filtre paneli, ilan ekleme formu ve detay özellik tablosu hep buradan üretilir.
// 7 ana kategori; her kategorinin içindeki araçlar alt kategoridir.

// ───────────────────────── tekrar kullanılan özellik alanları ─────────────────────────
const F = {
  motorGucu: (steps?: number[]): SpecField => ({
    key: "motorGucu", label: "Motor Gücü", type: "number", unit: "HP",
    ...(steps ? { filterable: true, steps } : {}),
  }),
  operasyonAgirligi: (steps?: number[]): SpecField => ({
    key: "operasyonAgirligi", label: "Operasyon Ağırlığı", type: "number", unit: "ton",
    ...(steps ? { filterable: true, steps } : {}),
  }),
  kovaKapasitesi: (steps?: number[]): SpecField => ({
    key: "kovaKapasitesi", label: "Kova Kapasitesi", type: "number", unit: "m³",
    ...(steps ? { filterable: true, steps } : {}),
  }),
  kaldirmaKapasitesi: (unit: string, steps?: number[]): SpecField => ({
    key: "kaldirmaKapasitesi", label: "Kaldırma Kapasitesi", type: "number", unit,
    ...(steps ? { filterable: true, steps } : {}),
  }),
  calismaYuksekligi: (steps?: number[]): SpecField => ({
    key: "calismaYuksekligi", label: "Çalışma Yüksekliği", type: "number", unit: "m",
    ...(steps ? { filterable: true, steps } : {}),
  }),
  guc: (steps?: number[]): SpecField => ({
    key: "guc", label: "Güç", type: "number", unit: "kVA",
    ...(steps ? { filterable: true, steps } : {}),
  }),
  tonaj: (steps?: number[]): SpecField => ({
    key: "tonaj", label: "Tonaj", type: "number", unit: "ton",
    ...(steps ? { filterable: true, steps } : {}),
  }),
};

export const CATEGORIES: Category[] = [
  // ───────────────────────── HAFRİYAT MAKİNELERİ ─────────────────────────
  {
    slug: "hafriyat",
    name: "Hafriyat Makineleri",
    tagline: "Kazı, yükleme ve hafriyat",
    icon: "🚜",
    usageMetric: "saat",
    subcategories: [
      { slug: "beko-loder", name: "Beko Loder (Kazıcı Yükleyici)" },
      { slug: "lastikli-yukleyici", name: "Lastikli Yükleyici" },
      { slug: "bobcat", name: "Bobcat (Mini Yükleyici)" },
      { slug: "paletli-yukleyici", name: "Paletli Yükleyici" },
      { slug: "paletli-ekskavator", name: "Paletli Ekskavatör" },
      { slug: "paletli-mini-ekskavator", name: "Paletli Mini Ekskavatör" },
      { slug: "lastikli-ekskavator", name: "Lastikli Ekskavatör" },
    ],
    specFields: [
      F.operasyonAgirligi([1, 5, 10, 20, 30, 50]),
      F.kovaKapasitesi([0.2, 0.5, 1, 1.5, 2, 3, 5]),
      { key: "kaziDerinligi", label: "Kazı Derinliği", type: "number", unit: "m" },
      F.motorGucu([70, 100, 150, 250]),
    ],
  },

  // ───────────────────────── DAMPERLİ KAMYONLAR ─────────────────────────
  {
    slug: "damperli-kamyon",
    name: "Damperli Kamyonlar",
    tagline: "Hafriyat ve agrega taşıma",
    icon: "🚚",
    usageMetric: "km",
    subcategories: [
      { slug: "10-teker", name: "10 Teker Damperli Kamyon" },
      { slug: "kirkayak", name: "Kırkayak Damperli Kamyon" },
      { slug: "belden-kirma", name: "Belden Kırma Kamyon" },
      { slug: "mini", name: "Mini Damperli Kamyon" },
      { slug: "lowbed-cekici", name: "Lowbed Çekici Dorse" },
    ],
    specFields: [
      F.tonaj([10, 18, 26, 32, 40]),
      { key: "dingil", label: "Dingil", type: "select", options: ["4x2", "6x4", "8x4", "10x4"], filterable: true },
      { key: "kasaUzunlugu", label: "Kasa Uzunluğu", type: "number", unit: "m" },
      { key: "tasimaKapasitesi", label: "Taşıma Kapasitesi", type: "number", unit: "ton" },
      { key: "uzunluk", label: "Uzunluk", type: "number", unit: "m" },
      { key: "dingilSayisi", label: "Dingil Sayısı", type: "number", unit: "adet" },
    ],
  },

  // ───────────────────────── BETON MAKİNELERİ ─────────────────────────
  {
    slug: "beton",
    name: "Beton Makineleri",
    tagline: "Beton üretim, iletim ve dağıtım",
    icon: "🏭",
    usageMetric: "saat",
    subcategories: [
      { slug: "beton-mikseri", name: "Beton Mikseri" },
      { slug: "kamyon-ustu-pompa", name: "Kamyon Üstü Beton Pompası" },
      { slug: "sabit-pompa", name: "Sabit Beton Pompası" },
      { slug: "puskurtme-pompa", name: "Püskürtme Beton Pompası" },
      { slug: "transmikser-pompa", name: "Transmikserli Beton Pompası" },
      { slug: "hidrolik-dagitici", name: "Hidrolik Beton Dağıtıcı" },
      { slug: "mekanik-dagitici", name: "Mekanik Beton Dağıtıcı" },
      { slug: "tirmanir-dagitici", name: "Tırmanır Tip Beton Dağıtıcı" },
    ],
    specFields: [
      { key: "erisimMesafesi", label: "Erişim / Kol Mesafesi", type: "number", unit: "m", filterable: true, steps: [12, 24, 32, 42, 52] },
      { key: "debi", label: "Pompalama Debisi", type: "number", unit: "m³/sa" },
      { key: "tamburHacmi", label: "Tambur Hacmi", type: "number", unit: "m³" },
      { key: "dingil", label: "Dingil", type: "select", options: ["6x4", "8x4"] },
    ],
  },

  // ───────────────────────── ASFALT VE YOL MAKİNELERİ ─────────────────────────
  {
    slug: "asfalt-yol",
    name: "Asfalt ve Yol Makineleri",
    tagline: "Sıkıştırma, serim ve yol bakımı",
    icon: "🛣️",
    usageMetric: "saat",
    subcategories: [
      { slug: "asfalt-silindiri", name: "Asfalt Silindiri" },
      { slug: "toprak-silindiri", name: "Toprak Silindiri" },
      { slug: "yama-silindiri", name: "Yama Silindiri" },
      { slug: "vabil-silindir", name: "Lastik Tekerlekli Vabıl Silindir" },
      { slug: "el-silindiri", name: "Vibrasyonlu El Silindiri" },
      { slug: "dozer", name: "Dozer" },
      { slug: "finisher", name: "Finişer" },
      { slug: "greyder", name: "Greyder" },
      { slug: "kaya-delici", name: "Kaya/Rok Delici (Ankraj)" },
      { slug: "asfalt-kazima", name: "Asfalt Kazıma Makinası" },
      { slug: "arazoz", name: "Su Tankeri (Arazöz)" },
    ],
    specFields: [
      F.operasyonAgirligi([1, 3, 7, 12, 18, 25]),
      F.motorGucu([100, 150, 200, 300]),
      { key: "calismaGenisligi", label: "Çalışma / Serim Genişliği", type: "number", unit: "cm" },
      { key: "serimGenisligi", label: "Serim Genişliği", type: "number", unit: "m" },
      { key: "hacim", label: "Tank Hacmi", type: "number", unit: "m³" },
      { key: "bolmeSayisi", label: "Bölme Sayısı", type: "number", unit: "adet" },
    ],
  },

  // ───────────────────────── VİNÇLER VE PLATFORMLAR ─────────────────────────
  {
    slug: "vinc-platform",
    name: "Vinçler ve Platformlar",
    tagline: "Ağır kaldırma ve yüksekte erişim",
    icon: "🏗️",
    usageMetric: "saat",
    subcategories: [
      { slug: "kule-vinc", name: "Kule Vinç" },
      { slug: "hiyap-vinc", name: "Hiyap (Araç Üstü) Vinç" },
      { slug: "mobil-vinc", name: "Mobil (Teleskopik) Vinç" },
      { slug: "sepetli-vinc", name: "Araç Üstü Sepetli Vinç" },
      { slug: "orumcek-vinc", name: "Örümcek Vinç" },
      { slug: "paletli-vinc", name: "Paletli Vinç" },
      { slug: "makasli-platform", name: "Makaslı Platform" },
      { slug: "mini-makasli-platform", name: "Mini Makaslı Platform" },
      { slug: "eklemli-platform", name: "Eklemli Platform" },
      { slug: "dikey-platform", name: "Dikey Platform" },
      { slug: "orumcek-platform", name: "Paletli Örümcek Platform" },
      { slug: "teleskopik-platform", name: "Teleskopik Bomlu Platform" },
      { slug: "insaat-asansoru", name: "İnşaat Asansörü" },
      { slug: "dis-cephe-platformu", name: "Dış Cephe Platformu" },
    ],
    specFields: [
      F.kaldirmaKapasitesi("ton", [2, 10, 25, 50, 100, 200, 400]),
      { key: "bomUzunlugu", label: "Bom Uzunluğu", type: "number", unit: "m", filterable: true, steps: [20, 30, 40, 60] },
      { key: "erisimYuksekligi", label: "Erişim Yüksekliği", type: "number", unit: "m" },
      F.calismaYuksekligi([8, 10, 16, 22, 30, 40]),
      { key: "platformKapasitesi", label: "Platform Kapasitesi", type: "number", unit: "kg" },
      { key: "tahrik", label: "Tahrik", type: "select", options: ["Dizel", "Elektrik", "Hibrit"] },
    ],
  },

  // ───────────────────────── FORKLİFTLER ─────────────────────────
  {
    slug: "forklift",
    name: "Forkliftler",
    tagline: "İstifleme ve yük taşıma",
    icon: "🛻",
    usageMetric: "saat",
    subcategories: [
      { slug: "telehandler", name: "Telehandler (Teleskopik Yükleyici)" },
      { slug: "dizel", name: "Dizel Forklift" },
      { slug: "elektrikli", name: "Elektrikli Forklift" },
      { slug: "lpg-benzinli", name: "LPG & Benzinli Forklift" },
      { slug: "reach-truck", name: "Reach Truck" },
      { slug: "akulu-istif", name: "Akülü İstif Makinası" },
      { slug: "akulu-transpalet", name: "Akülü Transpalet" },
    ],
    specFields: [
      F.kaldirmaKapasitesi("kg", [1500, 2500, 3500, 5000, 10000]),
      { key: "asansorYuksekligi", label: "Kaldırma Yüksekliği", type: "number", unit: "m", filterable: true, steps: [3, 4, 5, 6] },
      { key: "yuruyusTipi", label: "Yürüyüş Tipi", type: "select", options: ["Lastik", "Dolgu Lastik"] },
      F.calismaYuksekligi(),
    ],
  },

  // ───────────────────────── JENERATÖRLER ─────────────────────────
  {
    slug: "jenerator",
    name: "Jeneratörler",
    tagline: "Enerji, aydınlatma ve basınçlı hava",
    icon: "⚡",
    usageMetric: "saat",
    subcategories: [
      { slug: "kabinli-dizel", name: "Kabinli Dizel Jeneratör" },
      { slug: "portatif-dizel", name: "Portatif Dizel Jeneratör" },
      { slug: "portatif-benzinli", name: "Portatif Benzinli Jeneratör" },
      { slug: "mobil", name: "Mobil Jeneratör" },
      { slug: "romorklu", name: "Römorklu Jeneratör" },
      { slug: "aydinlatma-kulesi", name: "Aydınlatma Kulesi" },
      { slug: "kompresor", name: "Kompresör" },
    ],
    specFields: [
      F.guc([10, 30, 60, 100, 250, 500]),
      { key: "kabin", label: "Kabin", type: "boolean" },
      { key: "havaDebisi", label: "Hava Debisi", type: "number", unit: "m³/dk" },
      { key: "basinc", label: "Basınç", type: "number", unit: "bar" },
      { key: "kuleYuksekligi", label: "Kule Yüksekliği", type: "number", unit: "m" },
    ],
  },
];

// ───────────────────────── yardımcılar ─────────────────────────

export function getCategory(slug: string | undefined): Category | undefined {
  if (!slug) return undefined;
  return CATEGORIES.find((c) => c.slug === slug);
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

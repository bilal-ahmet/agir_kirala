import type { Category, SpecField } from "./types";
import { TRAILER_BRANDS } from "./truck-brands";

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

/** Tırda dorsesi olan tipler (çekici hariç hepsi). */
const DORSE_TYPES = [
  "tenteli", "kapali-kasa", "frigorifik", "acik-kasa", "lowbed",
  "damperli", "silobas", "tanker", "konteyner", "oto-tasiyici",
];
/** Kapalı hacimli kuru/soğuk yük dorseleri. */
const BOX_TYPES = ["tenteli", "kapali-kasa", "frigorifik"];

export const CATEGORIES: Category[] = [
  // ───────────────────────── HAFRİYAT MAKİNELERİ ─────────────────────────
  {
    slug: "hafriyat",
    name: "Hafriyat Makineleri",
    tagline: "Kazı, yükleme ve hafriyat",
    usageMetric: "saat",
    needsHauling: true,
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
    usageMetric: "km",
    subcategories: [
      { slug: "10-teker", name: "10 Teker Damperli Kamyon" },
      { slug: "kirkayak", name: "Kırkayak Damperli Kamyon" },
      { slug: "belden-kirma", name: "Belden Kırma Kamyon" },
      { slug: "mini", name: "Mini Damperli Kamyon" },
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
    usageMetric: "saat",
    needsHauling: true,
    subcategories: [
      { slug: "beton-mikseri", name: "Beton Mikseri", selfDriving: true },
      { slug: "kamyon-ustu-pompa", name: "Kamyon Üstü Beton Pompası", selfDriving: true },
      { slug: "sabit-pompa", name: "Sabit Beton Pompası" },
      { slug: "puskurtme-pompa", name: "Püskürtme Beton Pompası" },
      { slug: "transmikser-pompa", name: "Transmikserli Beton Pompası", selfDriving: true },
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
    usageMetric: "saat",
    needsHauling: true,
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
      { slug: "arazoz", name: "Su Tankeri (Arazöz)", selfDriving: true },
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
    usageMetric: "saat",
    needsHauling: true,
    subcategories: [
      { slug: "kule-vinc", name: "Kule Vinç" },
      { slug: "hiyap-vinc", name: "Hiyap (Araç Üstü) Vinç", selfDriving: true },
      { slug: "mobil-vinc", name: "Mobil (Teleskopik) Vinç", selfDriving: true },
      { slug: "sepetli-vinc", name: "Araç Üstü Sepetli Vinç", selfDriving: true },
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
    usageMetric: "saat",
    needsHauling: true,
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
    usageMetric: "saat",
    needsHauling: true,
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
  // ───────────────────────── TIR (ÇEKİCİ + DORSE) ─────────────────────────
  // Alt kategoriler DORSE TİPİNE göre: müşteri ne taşıyacağına göre arar.
  // İlanın markası çekici markasıdır; yalnız dorse kiralanıyorsa dorse markası.
  {
    slug: "tir",
    name: "Tır Kiralama",
    tagline: "Çekici, dorse ve nakliye",
    usageMetric: "km",
    operatorLabels: { yes: "Şoförlü", no: "Şoförsüz" },
    transportApplicable: false,
    tripPricing: true,
    subcategories: [
      { slug: "cekici", name: "Çekici (Dorsesiz)" },
      { slug: "tenteli", name: "Tenteli (Perdeli) Tır" },
      { slug: "kapali-kasa", name: "Kapalı Kasa (Box) Tır" },
      { slug: "frigorifik", name: "Frigorifik (Soğutuculu) Tır" },
      { slug: "acik-kasa", name: "Açık Kasa / Sal (Platform) Tır" },
      { slug: "lowbed", name: "Lowbed (Ağır Nakliye) Tır" },
      { slug: "damperli", name: "Damperli Tır" },
      { slug: "silobas", name: "Silobas Tır" },
      { slug: "tanker", name: "Tanker Tır" },
      { slug: "konteyner", name: "Konteyner Taşıyıcı Tır" },
      { slug: "oto-tasiyici", name: "Oto Taşıyıcı Tır" },
    ],
    specFields: [
      // ── Ortak ──
      {
        key: "kiralamaKapsami", label: "Kiralama Kapsamı", type: "select",
        options: ["Çekici + Dorse", "Yalnız Çekici", "Yalnız Dorse"], filterable: true,
      },
      { key: "cekisTipi", label: "Çekiş Tipi", type: "select", options: ["4x2", "6x2", "6x4"], filterable: true },
      F.motorGucu([400, 450, 480, 500, 550]),
      {
        key: "euroNorm", label: "Emisyon Normu", type: "select",
        options: ["Euro 3", "Euro 4", "Euro 5", "Euro 6"], filterable: true,
      },
      { key: "sanziman", label: "Şanzıman", type: "select", options: ["Otomatik", "Manuel"], filterable: true },
      { key: "kabinTipi", label: "Kabin Tipi", type: "select", options: ["Standart", "Yüksek Tavan", "Kısa Kabin"] },
      { key: "retarder", label: "Retarder / İntarder", type: "boolean" },
      { key: "hidrolikKit", label: "Hidrolik Kit (PTO)", type: "boolean" },
      { key: "adr", label: "ADR (Tehlikeli Madde) Uygun", type: "boolean", filterable: true },

      // ── Dorse (çekici dışındaki tüm tipler) ──
      {
        key: "dorseMarkasi", label: "Dorse Markası", type: "select",
        options: [...TRAILER_BRANDS, "Diğer"], subcategories: DORSE_TYPES,
      },
      {
        key: "dingilSayisi", label: "Dorse Dingil Sayısı", type: "number", unit: "adet",
        filterable: true, steps: [2, 3, 4, 5, 6], subcategories: DORSE_TYPES,
      },
      {
        key: "tasimaKapasitesi", label: "Taşıma Kapasitesi", type: "number", unit: "ton",
        filterable: true, steps: [10, 20, 25, 30, 40, 60, 80, 100], subcategories: DORSE_TYPES,
      },
      {
        key: "kasaUzunlugu", label: "Kasa / Platform Uzunluğu", type: "number", unit: "m",
        filterable: true, steps: [10, 12, 13.6, 16], subcategories: DORSE_TYPES,
      },

      // ── Kuru yük ve frigorifik ──
      {
        key: "paletKapasitesi", label: "Palet Kapasitesi", type: "number", unit: "adet",
        filterable: true, steps: [24, 33], subcategories: BOX_TYPES,
      },
      { key: "icYukseklik", label: "İç Yükseklik", type: "number", unit: "m", subcategories: BOX_TYPES },
      { key: "mega", label: "Mega / Jumbo (3 m iç yükseklik)", type: "boolean", subcategories: BOX_TYPES },
      {
        key: "sogutmaTipi", label: "Soğutma Tipi", type: "select",
        options: ["Soğutmalı (+)", "Dondurmalı (−)", "Çift Bölmeli"], filterable: true, subcategories: ["frigorifik"],
      },
      {
        key: "sogutucuMarka", label: "Soğutucu Ünite", type: "select",
        options: ["Thermo King", "Carrier", "Diğer"], subcategories: ["frigorifik"],
      },
      { key: "atp", label: "ATP Belgesi", type: "boolean", subcategories: ["frigorifik"] },

      // ── Lowbed ──
      {
        key: "lowbedTipi", label: "Lowbed Tipi", type: "select",
        options: ["Platform", "Havuzlu", "Yarı Lowbed", "Modüler"], filterable: true, subcategories: ["lowbed"],
      },
      { key: "platformYuksekligi", label: "Platform Yüksekliği", type: "number", unit: "cm", subcategories: ["lowbed"] },
      {
        key: "rampaTipi", label: "Rampa", type: "select",
        options: ["Hidrolik", "Pnömatik", "Mekanik", "Yok"], filterable: true, subcategories: ["lowbed"],
      },
      { key: "uzayabilir", label: "Uzayabilir Platform", type: "boolean", filterable: true, subcategories: ["lowbed"] },
      { key: "genisleyebilir", label: "Genişleyebilir Platform", type: "boolean", subcategories: ["lowbed"] },

      // ── Hacimli yük ──
      {
        key: "hacim", label: "Hacim", type: "number", unit: "m³",
        filterable: true, steps: [20, 25, 30, 40, 60], subcategories: ["tanker", "silobas", "damperli"],
      },
      { key: "gozSayisi", label: "Göz (Bölme) Sayısı", type: "number", unit: "adet", subcategories: ["tanker"] },
      {
        key: "tankMalzemesi", label: "Tank Malzemesi", type: "select",
        options: ["Alüminyum", "Paslanmaz", "Çelik"], subcategories: ["tanker"],
      },
      {
        key: "yukTipi", label: "Yük Tipi", type: "select",
        options: ["Akaryakıt", "Kimyasal", "Gıda", "Su"], filterable: true, subcategories: ["tanker"],
      },

      // ── Diğer ──
      {
        key: "konteynerTipi", label: "Konteyner Tipi", type: "select",
        options: ["20 ft", "40 ft", "45 ft", "Uzayabilir"], filterable: true, subcategories: ["konteyner"],
      },
      {
        key: "aracKapasitesi", label: "Araç Kapasitesi", type: "number", unit: "adet",
        filterable: true, steps: [4, 6, 8], subcategories: ["oto-tasiyici"],
      },
    ],
  },
];

// ───────────────────────── yardımcılar ─────────────────────────

export function getCategory(slug: string | undefined): Category | undefined {
  if (!slug) return undefined;
  return CATEGORIES.find((c) => c.slug === slug);
}

/**
 * Kategorinin (ve seçiliyse alt kategorinin) geçerli teknik alanları.
 * Alt kategori seçilmemişse yalnız TÜM alt kategorilerde geçerli alanlar döner;
 * aksi halde lowbed'e özel "platform yüksekliği" tenteli tır aramasında da
 * görünürdü.
 */
export function specFieldsFor(categorySlug: string | undefined, subSlug?: string): SpecField[] {
  const cat = getCategory(categorySlug);
  if (!cat) return [];
  return cat.specFields.filter((f) =>
    !f.subcategories ? true : subSlug ? f.subcategories.includes(subSlug) : false,
  );
}

export function getFilterableSpecFields(categorySlug: string | undefined, subSlug?: string) {
  return specFieldsFor(categorySlug, subSlug).filter((f) => f.filterable);
}

/** Operatör alanının kategoriye göre etiketi ("Operatörlü" / tırda "Şoförlü"). */
export function operatorLabel(categorySlug: string | undefined, withOperator: boolean): string {
  const labels = getCategory(categorySlug)?.operatorLabels ?? { yes: "Operatörlü", no: "Operatörsüz" };
  return withOperator ? labels.yes : labels.no;
}

/** Nakliye (dahil/ekstra) alanı bu kategoride anlamlı mı. Tırda değil. */
export function transportApplies(categorySlug: string | undefined): boolean {
  return getCategory(categorySlug)?.transportApplicable !== false;
}

/**
 * Bu ilan için "nakliye için tır" önerisi gösterilmeli mi: makine kategorisi
 * taşınma gerektiriyor ve alt tür kendi başına yola çıkamıyor.
 */
export function needsHauling(categorySlug: string, subSlug: string): boolean {
  const cat = getCategory(categorySlug);
  if (!cat?.needsHauling) return false;
  return !cat.subcategories.find((s) => s.slug === subSlug)?.selfDriving;
}

export function getSubCategoryName(categorySlug: string, subSlug: string): string {
  const cat = getCategory(categorySlug);
  return cat?.subcategories.find((s) => s.slug === subSlug)?.name ?? subSlug;
}

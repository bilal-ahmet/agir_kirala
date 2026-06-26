// Marka verisi — alt kategori bazında YERLİ ve YABANCI markalar.
//
// Filtre paneli ve ilan-ekleme formu, SEÇİLEN ALT KATEGORİYE göre marka listesini
// buradan alır (brandsForSubcategory). Her liste o makine tipini gerçekten üreten
// markalardan oluşur; yerli (Türk) markalar TURKISH_BRANDS kümesinde işaretlidir ve
// listede başa alınır (UI "Yerli" rozeti için isTurkishBrand kullanır).
//
// Diziler "yerli önce, sonra yaygınlık sırası" mantığıyla elle düzenlenmiştir.

import { getCategory } from "./categories";

/** Yerli (Türk) üretici markalar — UI'da "Yerli" rozeti ve sıralama için. */
export const TURKISH_BRANDS = new Set<string>([
  // İş makinesi
  "Hidromek", "Çukurova", "MST",
  // Kamyon & treyler
  "Ford Trucks", "BMC", "Otokar", "Tırsan", "Kässbohrer",
  "Özsan Treyler", "Serin Treyler", "Global Treyler", "Alim Treyler",
  // Beton ekipmanları
  "Atabey", "Betonstar",
  // Platform
  "ELS Lift", "Net Platform",
  // Jeneratör
  "Aksa", "Teksan", "Emsa", "Gücbir", "Aksan", "Dizelsan", "Genpower",
  // Kompresör
  "Dalgakıran", "Ekomak", "Özen Kompresör",
]);

/**
 * Alt kategori (subcategory slug) → o makine tipini üreten markalar.
 * Yerli markalar başa, ardından küresel/yaygın markalar.
 */
export const SUBCATEGORY_BRANDS: Record<string, string[]> = {
  // ───────────────────────── HAFRİYAT MAKİNELERİ ─────────────────────────
  "beko-loder": [
    "Hidromek", "Çukurova", "MST",
    "JCB", "Caterpillar", "Case", "New Holland", "Komatsu", "Terex",
    "Volvo", "John Deere", "Hyundai", "Mecalac", "Kubota", "Mahindra",
  ],
  "lastikli-yukleyici": [
    "Hidromek", "Çukurova", "MST",
    "Caterpillar", "Komatsu", "Volvo", "Liebherr", "Hyundai", "Doosan",
    "Develon", "Case", "New Holland", "JCB", "XCMG", "SDLG", "LiuGong",
    "SANY", "Kawasaki", "Lonking", "Terex", "John Deere",
  ],
  "bobcat": [
    "Bobcat", "Caterpillar", "Case", "New Holland", "JCB", "Kubota",
    "Takeuchi", "Gehl", "Wacker Neuson", "Manitou", "ASV", "Volvo",
    "Hyundai", "GiANT",
  ],
  "paletli-yukleyici": [
    "Caterpillar", "Komatsu", "Case", "John Deere", "Liebherr",
    "New Holland", "Dressta", "ASV", "Takeuchi",
  ],
  "paletli-ekskavator": [
    "Hidromek", "Çukurova",
    "Caterpillar", "Komatsu", "Hitachi", "Volvo", "Hyundai", "Doosan",
    "Develon", "Kobelco", "Liebherr", "JCB", "Case", "SANY", "XCMG",
    "Sumitomo", "LiuGong", "Terex", "New Holland", "Zoomlion", "Kubota",
  ],
  "paletli-mini-ekskavator": [
    "Hidromek", "Çukurova",
    "Bobcat", "Kubota", "Takeuchi", "Yanmar", "Caterpillar", "Komatsu",
    "JCB", "Hitachi", "Hyundai", "Volvo", "Wacker Neuson", "Doosan",
    "Case", "SANY", "IHI", "Kobelco",
  ],
  "lastikli-ekskavator": [
    "Hidromek",
    "Caterpillar", "Komatsu", "Hitachi", "Volvo", "Hyundai", "Doosan",
    "Develon", "Liebherr", "JCB", "Mecalac", "Case", "SANY", "XCMG",
    "Wacker Neuson",
  ],

  // ───────────────────────── DAMPERLİ KAMYONLAR ─────────────────────────
  "10-teker": [
    "Ford Trucks", "BMC",
    "Mercedes-Benz", "MAN", "Scania", "Volvo", "DAF", "Iveco", "Renault Trucks",
  ],
  "kirkayak": [
    "Ford Trucks", "BMC",
    "Mercedes-Benz", "MAN", "Scania", "Volvo", "DAF", "Iveco", "Renault Trucks",
  ],
  "belden-kirma": [
    "Caterpillar", "Volvo", "Komatsu", "Bell", "Terex", "Doosan",
    "Develon", "John Deere", "Hydrema", "Liebherr", "Hitachi", "BELAZ",
  ],
  "mini": [
    "BMC", "Ford Trucks",
    "Isuzu", "Mitsubishi Fuso", "Hyundai", "JAC", "Iveco", "Wacker Neuson",
    "Ausa", "Hinowa", "Messersì", "Cormidi", "Yanmar",
  ],
  "lowbed-cekici": [
    "Ford Trucks", "BMC", "Tırsan", "Kässbohrer", "Özsan Treyler",
    "Serin Treyler", "Global Treyler", "Alim Treyler",
    "Mercedes-Benz", "MAN", "Scania", "Volvo", "DAF", "Iveco", "Renault Trucks",
    "Nooteboom", "Goldhofer", "Faymonville", "Broshuis", "Schmitz Cargobull", "Krone",
  ],

  // ───────────────────────── BETON MAKİNELERİ ─────────────────────────
  "beton-mikseri": [
    "Atabey", "Betonstar",
    "Mercedes-Benz", "MAN", "Ford Trucks", "Iveco",
    "Liebherr", "Stetter", "Schwing-Stetter", "CIFA", "Putzmeister",
    "Imer", "Carmix", "Frumecar", "Baryval",
  ],
  "kamyon-ustu-pompa": [
    "Betonstar", "Atabey",
    "Putzmeister", "Schwing", "Schwing-Stetter", "CIFA", "SANY",
    "Zoomlion", "Junjin", "KCP", "Everdigm", "Sermac", "Daewoo",
  ],
  "sabit-pompa": [
    "Betonstar", "Atabey",
    "Putzmeister", "Schwing", "CIFA", "SANY", "Zoomlion",
    "Everdigm", "Junjin", "Mecbo", "KCP",
  ],
  "puskurtme-pompa": [
    "Betonstar", "Atabey",
    "Putzmeister", "Sika", "Normet", "Meyco", "Aliva", "CIFA", "SANY", "Filamos",
  ],
  "transmikser-pompa": [
    "Betonstar", "Atabey",
    "Putzmeister", "CIFA", "Schwing-Stetter", "SANY", "Zoomlion",
  ],
  "hidrolik-dagitici": [
    "Betonstar", "Atabey",
    "Putzmeister", "Schwing", "CIFA", "SANY", "Zoomlion",
  ],
  "mekanik-dagitici": [
    "Betonstar", "Atabey",
    "Putzmeister", "Schwing", "CIFA", "SANY",
  ],
  "tirmanir-dagitici": [
    "Betonstar", "Atabey",
    "Putzmeister", "Schwing", "CIFA", "SANY",
  ],

  // ───────────────────────── ASFALT VE YOL MAKİNELERİ ─────────────────────────
  "asfalt-silindiri": [
    "Hamm", "Bomag", "Dynapac", "Caterpillar", "Volvo", "Ammann",
    "Sakai", "JCB", "Case", "XCMG", "Hyundai", "SANY",
  ],
  "toprak-silindiri": [
    "Hamm", "Bomag", "Dynapac", "Caterpillar", "Volvo", "Ammann",
    "Sakai", "JCB", "Case", "XCMG", "SANY", "Hyundai", "LiuGong",
  ],
  "yama-silindiri": [
    "Bomag", "Hamm", "Ammann", "Dynapac", "Wacker Neuson", "Caterpillar", "JCB",
  ],
  "vabil-silindir": [
    "Hamm", "Bomag", "Dynapac", "Ammann", "Caterpillar", "Sakai", "XCMG", "Lonking",
  ],
  "el-silindiri": [
    "Bomag", "Wacker Neuson", "Ammann", "Hamm", "Dynapac",
    "Weber MT", "Belle", "Mikasa", "Atlas Copco",
  ],
  "dozer": [
    "Caterpillar", "Komatsu", "Liebherr", "John Deere", "Case",
    "Dressta", "Shantui", "SEM", "XCMG", "HBXG", "SANY",
  ],
  "finisher": [
    "Vögele", "Dynapac", "Bomag", "Caterpillar", "Volvo",
    "Sumitomo", "SANY", "XCMG", "Titan", "Tesab",
  ],
  "greyder": [
    "Hidromek",
    "Caterpillar", "Komatsu", "Volvo", "John Deere", "Case", "New Holland",
    "SANY", "XCMG", "LiuGong", "Mitsubishi", "Champion",
  ],
  "kaya-delici": [
    "Epiroc", "Atlas Copco", "Sandvik", "Furukawa", "Montabert",
    "Soosan", "Tamrock", "Casagrande", "Soilmec", "Junjin", "Hausherr",
  ],
  "asfalt-kazima": [
    "Wirtgen", "Bomag", "Caterpillar", "Dynapac", "Roadtec", "SANY", "XCMG",
  ],
  "arazoz": [
    "Ford Trucks", "BMC", "Otokar",
    "Mercedes-Benz", "MAN", "Iveco", "Isuzu", "Scania", "DAF",
  ],

  // ───────────────────────── VİNÇLER VE PLATFORMLAR ─────────────────────────
  "kule-vinc": [
    "Liebherr", "Potain", "Wolffkran", "Comansa", "Zoomlion", "XCMG",
    "SANY", "Jaso", "Terex", "Raimondi", "Saez", "Cattaneo", "FM Gru",
  ],
  "hiyap-vinc": [
    "HIAB", "Palfinger", "Fassi", "PM", "Effer", "Cormach",
    "Amco Veba", "Hyva", "Atlas", "Copma", "Ferrari", "Unic",
  ],
  "mobil-vinc": [
    "Liebherr", "Grove", "Tadano", "Terex", "Demag", "Kobelco",
    "Zoomlion", "XCMG", "SANY", "Link-Belt", "Kato", "Locatelli", "Faun",
  ],
  "sepetli-vinc": [
    "Çukurova", "ELS Lift",
    "Palfinger", "Bronto Skylift", "Multitel", "Comet", "Socage",
    "Ruthmann", "GSR", "CTE", "Isoli", "Versalift", "Klubb", "Easy Lift",
  ],
  "orumcek-vinc": [
    "Maeda", "Unic", "Jekko", "Hoeflon", "Spydercrane",
    "Galizia", "Kegiom", "GGR",
  ],
  "paletli-vinc": [
    "Liebherr", "Manitowoc", "Kobelco", "SANY", "Zoomlion", "XCMG",
    "Terex", "Demag", "Hitachi Sumitomo", "Link-Belt", "IHI", "Sennebogen",
  ],
  "makasli-platform": [
    "ELS Lift", "Net Platform",
    "Genie", "JLG", "Haulotte", "Skyjack", "JCB", "Manitou", "Snorkel",
    "Holland Lift", "Dingli", "Sinoboom", "Zoomlion", "SANY", "MEC",
  ],
  "mini-makasli-platform": [
    "ELS Lift", "Net Platform",
    "Genie", "JLG", "Haulotte", "Skyjack", "Dingli", "Sinoboom",
    "Snorkel", "MEC", "Custom Equipment",
  ],
  "eklemli-platform": [
    "ELS Lift",
    "Genie", "JLG", "Haulotte", "Snorkel", "Manitou", "Niftylift",
    "Dingli", "Sinoboom", "Zoomlion", "SANY",
  ],
  "dikey-platform": [
    "ELS Lift", "Net Platform",
    "Genie", "JLG", "Haulotte", "Faraone", "Power Tower", "Hetronik",
  ],
  "orumcek-platform": [
    "ELS Lift",
    "Easy Lift", "Platform Basket", "CMC", "Hinowa", "Palazzani",
    "Teupen", "Omme Lift", "Bluelift", "Leguan",
  ],
  "teleskopik-platform": [
    "ELS Lift",
    "Genie", "JLG", "Haulotte", "Manitou", "Snorkel", "Skyjack",
    "Dingli", "Sinoboom", "Zoomlion",
  ],
  "insaat-asansoru": [
    "Alimak", "GEDA", "Böcker", "Stros", "Maber",
    "Electroelsa", "Saeclimber", "Camac", "Hek", "Scanclimber",
  ],
  "dis-cephe-platformu": [
    "Alimak", "Manntech", "XSPlatforms", "Tractel",
    "CoxGomyl", "Sky Climber", "GEDA",
  ],

  // ───────────────────────── FORKLİFTLER ─────────────────────────
  "telehandler": [
    "Manitou", "JCB", "Merlo", "Caterpillar", "Genie", "Bobcat", "Magni",
    "Dieci", "Haulotte", "Kramer", "Faresin", "JLG", "New Holland",
    "Case", "Liebherr", "Massey Ferguson", "Claas", "Xtreme", "Wacker Neuson",
  ],
  "dizel": [
    "Toyota", "Linde", "Hyster", "Yale", "Still", "Caterpillar", "Komatsu",
    "Mitsubishi", "Doosan", "Develon", "Hyundai", "Hangcha", "Heli", "Clark",
    "UniCarriers", "Crown", "Jungheinrich", "Manitou", "Kalmar", "Combilift",
    "Baoli", "EP", "Maximal",
  ],
  "elektrikli": [
    "Toyota", "Linde", "Still", "Jungheinrich", "Yale", "Hyster", "Crown",
    "Mitsubishi", "Doosan", "Hyundai", "Hangcha", "Heli", "EP", "Clark",
    "Komatsu", "UniCarriers", "Combilift", "Baoli", "Noblelift",
  ],
  "lpg-benzinli": [
    "Toyota", "Hyster", "Yale", "Caterpillar", "Mitsubishi", "Komatsu",
    "UniCarriers", "Clark", "Doosan", "Hyundai", "Hangcha", "Heli",
    "Manitou", "Linde",
  ],
  "reach-truck": [
    "Toyota", "Linde", "Jungheinrich", "Still", "Crown", "Yale", "Hyster",
    "Mitsubishi", "UniCarriers", "Hangcha", "Heli", "EP", "Doosan",
    "Hyundai", "Combilift",
  ],
  "akulu-istif": [
    "Toyota", "Linde", "Jungheinrich", "Still", "Crown", "Yale", "Hyster",
    "EP", "Hangcha", "Heli", "Noblelift", "Pramac", "Hyundai",
  ],
  "akulu-transpalet": [
    "Toyota", "Linde", "Jungheinrich", "Still", "Crown", "Yale", "Hyster",
    "EP", "Hangcha", "Heli", "Noblelift", "Pramac", "Zowell",
  ],

  // ───────────────────────── JENERATÖRLER ─────────────────────────
  "kabinli-dizel": [
    "Aksa", "Teksan", "Emsa", "Gücbir", "Aksan", "Dizelsan", "Genpower",
    "Caterpillar", "Cummins", "Perkins", "FG Wilson", "Volvo Penta", "SDMO",
    "Kohler", "Atlas Copco", "Himoinsa", "Doosan", "John Deere", "Baudouin", "Pramac",
  ],
  "portatif-dizel": [
    "Aksa", "Teksan", "Genpower",
    "Cummins", "Pramac", "Atlas Copco", "Hyundai", "Kipor", "Kubota",
    "Yanmar", "Denyo", "Europower", "SDMO", "Kohler", "Endress",
  ],
  "portatif-benzinli": [
    "Genpower", "Aksa",
    "Hyundai", "Honda", "Kipor", "Champion", "Briggs & Stratton",
    "Pramac", "Yamaha", "Wacker Neuson", "Senci", "Loncin",
  ],
  "mobil": [
    "Aksa", "Teksan", "Emsa", "Gücbir",
    "Atlas Copco", "Caterpillar", "Cummins", "FG Wilson", "Himoinsa",
    "SDMO", "Pramac", "Doosan",
  ],
  "romorklu": [
    "Aksa", "Teksan", "Emsa", "Gücbir", "Aksan",
    "Atlas Copco", "Caterpillar", "Cummins", "FG Wilson", "Himoinsa",
    "SDMO", "Pramac",
  ],
  "aydinlatma-kulesi": [
    "Aksa", "Teksan", "Emsa",
    "Atlas Copco", "Generac", "Himoinsa", "SDMO", "Wacker Neuson", "Terex",
    "Trime", "Doosan", "Towerlight", "JCB", "Pramac",
  ],
  "kompresor": [
    "Dalgakıran", "Ekomak", "Özen Kompresör",
    "Atlas Copco", "Ingersoll Rand", "Kaeser", "Sullair", "Doosan",
    "CompAir", "Chicago Pneumatic", "Boge", "Gardner Denver", "Fini", "ELGi",
  ],
};

// ───────────────────────── yardımcılar ─────────────────────────

/** Verilen markanın yerli (Türk) üretici olup olmadığını döndürür. */
export function isTurkishBrand(brand: string): boolean {
  return TURKISH_BRANDS.has(brand);
}

/** Yerli markaları başa alır, geri kalanların göreli sırasını korur. */
function orderBrands(list: string[]): string[] {
  const turkish: string[] = [];
  const foreign: string[] = [];
  for (const b of list) (TURKISH_BRANDS.has(b) ? turkish : foreign).push(b);
  return [...turkish, ...foreign];
}

/** Tüm markaların tekil birleşimi (kategori/alt kategori seçilmediğinde). */
export const ALL_BRANDS = orderBrands(
  Array.from(new Set(Object.values(SUBCATEGORY_BRANDS).flat())),
);

/**
 * Seçilen alt kategoriye göre marka listesini döndürür.
 * - Alt kategori varsa: o makine tipinin markaları.
 * - Sadece kategori varsa: o kategorideki tüm alt kategorilerin tekil birleşimi.
 * - Hiçbiri yoksa: tüm markalar.
 */
export function brandsForSubcategory(
  categorySlug?: string,
  subSlug?: string,
): string[] {
  if (subSlug && SUBCATEGORY_BRANDS[subSlug]) {
    return orderBrands(SUBCATEGORY_BRANDS[subSlug]);
  }
  if (categorySlug) {
    const cat = getCategory(categorySlug);
    if (cat) {
      const seen = new Set<string>();
      const union: string[] = [];
      for (const s of cat.subcategories) {
        for (const b of SUBCATEGORY_BRANDS[s.slug] ?? []) {
          if (!seen.has(b)) {
            seen.add(b);
            union.push(b);
          }
        }
      }
      if (union.length) return orderBrands(union);
    }
  }
  return ALL_BRANDS;
}

/**
 * Kategori bazlı marka listesi (geriye dönük uyumluluk).
 * Alt kategori bilindiğinde brandsForSubcategory tercih edilmelidir.
 */
export function brandsForCategory(categorySlug?: string): string[] {
  return brandsForSubcategory(categorySlug, undefined);
}

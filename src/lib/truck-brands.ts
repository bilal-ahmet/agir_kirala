// Tır markaları — çekici ve dorse (treyler) üreticileri.
//
// Ayrı modülde duruyor çünkü hem categories.ts (dorse markası seçim alanı) hem
// brands.ts (alt kategori marka listeleri) kullanıyor; brands.ts zaten
// categories.ts'i import ettiği için listeler orada olsaydı döngü oluşurdu.
// Saf veri modülü: hiçbir şey import etmez.
//
// Kaynaklar: TREDER (Treyler Üreticileri Derneği) üye listesi, üretici
// siteleri, dorse rehberleri. Liste sırası: yerli önce, sonra yaygınlık.

/** Çekici markaları (Türkiye pazarında satılan ve ikinci elde yaygın olanlar). */
export const TRUCK_BRANDS = [
  "Ford Trucks", "BMC",
  "Mercedes-Benz", "Renault Trucks", "Volvo", "Scania", "MAN", "DAF", "Iveco",
  "Hyundai", "Sitrak", "Shacman", "FAW", "Dongfeng", "Foton", "Astra",
] as const;

/** Yerli dorse üreticileri. */
export const TURKISH_TRAILER_BRANDS = [
  "Tırsan", "Kässbohrer", "Koluman", "Otokar", "Özgül", "Nursan",
  "Serin Treyler", "Özsan Treyler", "Global Treyler", "Alim Treyler", "Aksoylu",
  "Yalçın Dorse", "Güneysan Dorse", "Reis Treyler", "Komodo Treyler", "Nükte Trailer",
  "OKT Trailer", "Scorpion Trailer", "Takdir Treyler", "Tal Treyler", "Adakon Treyler",
  "Fesan", "Çarsan", "Özünlü Damper", "Şahin Tanker", "Sinanlı Tanker",
  "Gürleşenyıl", "Doğuş Treyler",
] as const;

/** Yabancı dorse üreticileri. */
export const FOREIGN_TRAILER_BRANDS = [
  "Krone", "Schmitz Cargobull", "Kögel", "Wielton", "Schwarzmüller", "Fliegl",
  "Lecitrailer", "Chereau", "Lamberet", "Feldbinder", "Spitzer",
  "Nooteboom", "Goldhofer", "Faymonville", "Broshuis", "Doll", "Cometto",
  "Scheuerle", "Meusburger", "Langendorf",
] as const;

/** Tüm dorse markaları (ilan formundaki "Dorse Markası" seçimi). */
export const TRAILER_BRANDS: string[] = [...TURKISH_TRAILER_BRANDS, ...FOREIGN_TRAILER_BRANDS];

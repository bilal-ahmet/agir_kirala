// Ağır vasıta & iş makinesi kiralama pazaryeri — domain tipleri.
// Bu katman ileride gerçek API/DB ile değiştirilebilir; UI yalnızca bu tiplere bağlıdır.

/** Kiralama fiyatlandırma periyodu */
export type RentalPeriod = "saatlik" | "gunluk" | "haftalik" | "aylik";

/** Üst kategori grubu */
export type CategoryGroup = "agir-vasita" | "is-makinesi";

/** İlan sahibi tipi */
export type OwnerType = "bireysel" | "kurumsal";

/** Teslimat / nakliye seçeneği */
export type TransportOption = "dahil" | "ekstra" | "yok";

/** Yakıt tipi */
export type FuelType = "dizel" | "benzin" | "elektrik" | "lpg" | "hibrit";

/** İlan durumu */
export type ListingStatus = "aktif" | "pasif" | "taslak";

/** Kiralama talebi durumu */
export type RequestStatus = "beklemede" | "onaylandi" | "reddedildi" | "iptal";

/** Dinamik teknik özellik alanının türü */
export type SpecFieldType = "number" | "select" | "boolean";

/** Kategoriye özel teknik özellik tanımı (tek kaynak — filtre + form + detay tablosu) */
export interface SpecField {
  key: string;
  label: string;
  type: SpecFieldType;
  /** number için birim (ör. "ton", "m³", "HP") */
  unit?: string;
  /** select için seçenekler */
  options?: string[];
  /** Aramada filtre olarak gösterilsin mi */
  filterable?: boolean;
  /** number alanlar için filtre kademe değerleri (örn. min seçici) */
  steps?: number[];
}

export interface SubCategory {
  slug: string;
  name: string;
}

export interface Category {
  slug: string;
  name: string;
  group: CategoryGroup;
  /** Kısa açıklama (kategori kartı) */
  tagline: string;
  /** Görsel/placeholder için emoji-glif */
  icon: string;
  subcategories: SubCategory[];
  /** Bu kategorideki ilanların teknik özellik şeması */
  specFields: SpecField[];
  /** Bu kategoride çalışma ölçüsü saat (motosaat) mi yoksa km mi */
  usageMetric: "saat" | "km";
}

export interface User {
  id: string;
  name: string;
  type: OwnerType;
  companyName?: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  /** ISO tarih — üyelik başlangıcı */
  memberSince: string;
  phone: string;
  email: string;
  city: string;
  /** Avatar/baş harf için renk tohumu */
  accent?: string;
}

/** Bir periyot bazında kira fiyatı (₺). Sahibi yalnızca sunduğu periyotları doldurur. */
export type PriceMap = Partial<Record<RentalPeriod, number>>;

export interface Listing {
  id: string;
  title: string;
  categorySlug: string;
  subCategorySlug: string;
  brand: string;
  model: string;
  year: number;
  city: string;
  district: string;
  prices: PriceMap;
  /** Operatörlü mü kiralanıyor (true) yoksa kuru kiralama mı */
  operator: boolean;
  transport: TransportOption;
  fuel?: FuelType;
  /** Kullanım: kategoriye göre saat (motosaat) veya km */
  usage: number;
  /** Kategoriye özel teknik özellikler (SpecField.key → değer) */
  specs: Record<string, string | number | boolean>;
  description: string;
  ownerId: string;
  status: ListingStatus;
  /** ISO tarih */
  createdAt: string;
  featured?: boolean;
  /** Minimum kiralama süresi (gün) */
  minRentalDays?: number;
  /** Görsel çeşitliliği için tohum (placeholder gradyanı) */
  photoSeed?: number;
  /** Kaç fotoğraf gösterileceği (placeholder galeri) */
  photoCount?: number;
}

export interface RentalRequest {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  /** ISO tarih */
  startDate: string;
  endDate: string;
  period: RentalPeriod;
  message: string;
  status: RequestStatus;
  createdAt: string;
  /** Hesaplanan toplam tutar (₺) */
  totalPrice: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  /** [kiralayan, ilanSahibi] */
  participantIds: [string, string];
  messages: Message[];
  updatedAt: string;
}

/** searchParams'tan türetilen filtre durumu */
export interface FilterState {
  q?: string;
  kategori?: string;
  altKategori?: string;
  marka?: string[];
  il?: string;
  ilce?: string;
  periyot?: RentalPeriod;
  minFiyat?: number;
  maxFiyat?: number;
  minYil?: number;
  maxYil?: number;
  operator?: "operatorlu" | "operatorsuz";
  nakliye?: TransportOption;
  saticiTipi?: OwnerType;
  dogrulanmis?: boolean;
  yakit?: FuelType;
  /** Dinamik teknik filtreler: specKey → min değer (number) veya tam eşleşme (string) */
  specs?: Record<string, number | string>;
  sirala?: SortKey;
  sayfa?: number;
}

export type SortKey =
  | "onerilen"
  | "yeni"
  | "fiyat-artan"
  | "fiyat-azalan"
  | "yil-yeni"
  | "kullanim-az"
  | "puan";

// Ağır vasıta & iş makinesi kiralama pazaryeri — domain tipleri.
// Bu katman ileride gerçek API/DB ile değiştirilebilir; UI yalnızca bu tiplere bağlıdır.

/** Kiralama fiyatlandırma periyodu */
export type RentalPeriod = "saatlik" | "gunluk" | "haftalik" | "aylik" | "yillik";

/** İlan sahibi tipi */
export type OwnerType = "bireysel" | "kurumsal";

/** Nakliye seçeneği */
export type TransportOption = "dahil" | "ekstra" | "yok";

/** Yakıt tipi */
export type FuelType = "dizel" | "benzin" | "elektrik" | "lpg" | "hibrit";

/** İlanın durumu: sıfır mı, ikinci el mi */
export type ListingCondition = "sifir" | "ikinci_el";

/** İlan sahibinin iletişim tercihi. "sadece_mesaj" → telefon/WhatsApp gösterilmez. */
export type ContactPreference = "telefon_mesaj" | "sadece_mesaj";

/** Filtrede nakliye seçimi (transport değerlerinin kullanıcıya görünen sadeleştirmesi) */
export type TransportFilter = "var" | "yok";

/** Filtrede operatör seçimi */
export type OperatorFilter = "operatorlu" | "operatorsuz";

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
  /** Kısa açıklama (kategori kartı) */
  tagline: string;
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

/** İlan müsaitlik bilgisi (ilan sahibi tarafından belirlenir). */
export interface Availability {
  /** Müsait olunan haftanın günleri (0=Pzt … 6=Pz). Boş = tüm günler. */
  weekdays: number[];
  /** Günlük müsait başlangıç saati ("08:00"). */
  startTime?: string;
  /** Günlük müsait bitiş saati ("18:00"). */
  endTime?: string;
  /** Müsaitlik aralığı başlangıç tarihi (ISO, "2026-07-01"). */
  dateFrom?: string;
  /** Müsaitlik aralığı bitiş tarihi (ISO). */
  dateTo?: string;
}

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
  /** Sıfır / 2. el */
  condition: ListingCondition;
  /** Telefon + mesaj mı, yalnızca site içi mesaj mı */
  contactPreference: ContactPreference;
  /** Yüklenmiş tanıtım videosunun public URL'si (varsa) */
  videoUrl?: string;
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
  /** İlan sahibinin belirlediği müsaitlik */
  availability?: Availability;
  /** Görsel çeşitliliği için tohum (placeholder gradyanı — gerçek foto yoksa) */
  photoSeed?: number;
  /** Kaç fotoğraf gösterileceği (placeholder galeri) */
  photoCount?: number;
  /** Yüklenmiş gerçek görseller (Supabase Storage). Boşsa placeholder kullanılır. */
  photos?: ListingPhoto[];
  /** İlan sahibi özeti (kart üzerinde rozet/puan için denormalize). */
  ownerVerified?: boolean;
  ownerRating?: number;
}

/** Yüklenmiş ilan görseli */
export interface ListingPhoto {
  id: string;
  /** Orijinal (1600 px'e sığdırılmış WebP; eski kayıtlarda ham yükleme). */
  url: string;
  /** 400 px WebP küçük boy. Eski kayıtlarda yok — tüketici url'e düşer. */
  thumbUrl?: string;
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

/**
 * searchParams'tan türetilen filtre durumu.
 * Çoklu seçimli alanlar dizi tutar ve URL'de virgülle ayrılır (ör. `yakit=dizel,elektrik`).
 */
export interface FilterState {
  q?: string;
  kategori?: string;
  altKategori?: string;
  marka?: string[];
  il?: string;
  ilce?: string;
  periyot?: RentalPeriod[];
  minFiyat?: number;
  maxFiyat?: number;
  minYil?: number;
  maxYil?: number;
  operator?: OperatorFilter[];
  nakliye?: TransportFilter[];
  saticiTipi?: OwnerType[];
  yakit?: FuelType[];
  durum?: ListingCondition[];
  /** Yalnızca fotoğrafı olan ilanlar */
  fotografli?: boolean;
  /** Yalnızca videosu olan ilanlar */
  videolu?: boolean;
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

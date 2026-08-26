import type { Conversation, Listing, RentalRequest, User } from "../types";

/**
 * API SERİLEŞTİRME SÖZLEŞMESİ
 *
 * PARA: `totalPrice` ve `rating` STRING döner ("1234.56"). Postgres numeric →
 * JSON double → Dart double zincirinde yuvarlama hataları oluşur; para asla
 * kayan noktalı sayı olarak taşınmaz. `prices` (PriceMap) tam sayı TL olduğu
 * için olduğu gibi kalır.
 *
 * TARİH: timestamp'ler ISO-8601 UTC (mapper'lar zaten toISOString üretiyor);
 * `startDate`/`endDate` "YYYY-MM-DD" düz string (yerel gün, saat dilimi yok);
 * `availability.startTime/endTime` "HH:mm" yerel duvar saati, saat dilimi taşımaz.
 *
 * FOTOĞRAF: `{ id, thumb, original }`. `thumb` ASLA null değildir — küçük boyu
 * olmayan eski satırlarda orijinale düşer. Böylece istemcinin fallback yazması
 * gerekmez.
 */

export interface ApiPhoto {
  id: string;
  /** 400 px WebP. Küçük boy yoksa orijinale düşer. */
  thumb: string;
  /** 1600 px'e sığdırılmış WebP (eski kayıtlarda ham yükleme olabilir). */
  original: string;
}

export interface ApiListing extends Omit<Listing, "photos" | "ownerRating"> {
  photos: ApiPhoto[];
  ownerRating?: string;
}

export function serializeListing(listing: Listing): ApiListing {
  const { photos, ownerRating, ...rest } = listing;
  return {
    ...rest,
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      thumb: p.thumbUrl ?? p.url,
      original: p.url,
    })),
    ownerRating: ownerRating != null ? ownerRating.toFixed(1) : undefined,
  };
}

export interface ApiUser extends Omit<User, "rating"> {
  rating: string;
}

export function serializeUser(user: User): ApiUser {
  return { ...user, rating: user.rating.toFixed(1) };
}

/**
 * Halka açık kullanıcı görünümü.
 * `email` HER ZAMAN düşer. `phone` yalnız ilan sahibi telefon paylaşımını
 * seçmişse ve numarası doluysa döner.
 */
export type ApiPublicUser = Omit<ApiUser, "email" | "phone"> & { phone?: string };

export function toPublicUser(user: User, includePhone = false): ApiPublicUser {
  const { email: _email, phone, rating, ...rest } = user;
  void _email;
  return {
    ...rest,
    rating: rating.toFixed(1),
    ...(includePhone && phone.trim() ? { phone } : {}),
  };
}

export interface ApiRentalRequest extends Omit<RentalRequest, "totalPrice"> {
  totalPrice: string;
}

export function serializeRequest(request: RentalRequest): ApiRentalRequest {
  return { ...request, totalPrice: request.totalPrice.toFixed(2) };
}

export interface ApiConversation extends Conversation {
  /** Karşı taraftan, benim son okuma damgamdan sonra gelen mesaj var mı. */
  unread?: boolean;
}

import "server-only";

import type { Conversation, Listing, Message, RentalRequest, User } from "../../types";
import type {
  ConversationRow,
  ListingPhotoRow,
  ListingRow,
  MessageRow,
  RentalRequestRow,
  UserRow,
} from "../schema";

/** uuid'den deterministik placeholder tohumu (gerçek foto yoksa görsel çeşitliliği için). */
function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 1000;
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    companyName: row.companyName ?? undefined,
    verified: row.verified,
    rating: Number(row.rating),
    reviewCount: row.reviewCount,
    memberSince: row.memberSince.toISOString(),
    phone: row.phone,
    email: row.email,
    city: row.city,
    accent: row.accent ?? undefined,
  };
}

export function toListing(
  row: ListingRow,
  photos: ListingPhotoRow[] = [],
  owner?: { verified: boolean; rating: number | string },
): Listing {
  const sorted = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: row.id,
    title: row.title,
    categorySlug: row.categorySlug,
    subCategorySlug: row.subCategorySlug,
    brand: row.brand,
    model: row.model,
    year: row.year,
    city: row.city,
    district: row.district,
    prices: row.prices,
    operator: row.operator,
    transport: row.transport,
    fuel: row.fuel ?? undefined,
    condition: row.condition,
    contactPreference: row.contactPreference,
    videoUrl: row.videoUrl ?? undefined,
    usage: row.usage,
    specs: row.specs,
    description: row.description,
    ownerId: row.ownerId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    featured: row.featured,
    minRentalDays: row.minRentalDays ?? undefined,
    availability: row.availability ?? undefined,
    photoSeed: seedFromId(row.id),
    photoCount: sorted.length || undefined,
    photos: sorted.map((p) => ({ id: p.id, url: p.url })),
    ownerVerified: owner?.verified,
    ownerRating: owner ? Number(owner.rating) : undefined,
  };
}

export function toRequest(row: RentalRequestRow): RentalRequest {
  return {
    id: row.id,
    listingId: row.listingId,
    renterId: row.renterId,
    ownerId: row.ownerId,
    startDate: row.startDate,
    endDate: row.endDate,
    period: row.period,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    totalPrice: Number(row.totalPrice),
  };
}

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    senderId: row.senderId,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toConversation(row: ConversationRow, messages: MessageRow[]): Conversation {
  return {
    id: row.id,
    listingId: row.listingId,
    participantIds: [row.renterId, row.ownerId],
    messages: messages.map(toMessage),
    updatedAt: row.updatedAt.toISOString(),
  };
}

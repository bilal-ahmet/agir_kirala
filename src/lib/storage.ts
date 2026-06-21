// Tarayıcı tarafı kalıcılık (mock backend yerine).
// Yalnızca client component'lerden çağrılmalıdır (window'a erişir).
// İleride gerçek API geldiğinde bu modülün yerini fetch çağrıları alır.

import type { Conversation, Listing, Message, RentalRequest, User } from "./types";
import { LISTINGS } from "./data/listings";
import { REQUESTS } from "./data/requests";
import { CONVERSATIONS } from "./data/conversations";

const KEYS = {
  auth: "avk:auth",
  favorites: "avk:favorites",
  listings: "avk:listings",
  requests: "avk:requests",
  conversations: "avk:conversations",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // Aynı sekmedeki diğer dinleyiciler için
    window.dispatchEvent(new CustomEvent("avk:storage", { detail: { key } }));
  } catch {
    /* sessizce yok say */
  }
}

// ───────── Oturum ─────────
export function loadSession(): User | null {
  return read<User | null>(KEYS.auth, null);
}
export function saveSession(user: User): void {
  write(KEYS.auth, user);
}
export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYS.auth);
  window.dispatchEvent(new CustomEvent("avk:storage", { detail: { key: KEYS.auth } }));
}

// ───────── Favoriler ─────────
export function loadFavorites(): string[] {
  return read<string[]>(KEYS.favorites, []);
}
export function saveFavorites(ids: string[]): void {
  write(KEYS.favorites, ids);
}

// ───────── Kullanıcı ilanları (yerel) ─────────
function loadLocalListings(): Listing[] {
  return read<Listing[]>(KEYS.listings, []);
}
export function addLocalListing(listing: Listing): void {
  write(KEYS.listings, [listing, ...loadLocalListings()]);
}

/** Tohum + yerel ilanları birleştir (yerel olan tohumu geçersiz kılar). */
function mergeListings(): Listing[] {
  const local = loadLocalListings();
  const localIds = new Set(local.map((l) => l.id));
  return [...local, ...LISTINGS.filter((l) => !localIds.has(l.id))];
}

/** İlan durumunu güncelle (tohum ilan ise yerele kopyalanır). */
export function setListingStatus(id: string, status: Listing["status"]): void {
  const local = loadLocalListings();
  const existing = local.find((l) => l.id === id);
  if (existing) {
    write(KEYS.listings, local.map((l) => (l.id === id ? { ...l, status } : l)));
    return;
  }
  const seed = LISTINGS.find((l) => l.id === id);
  if (seed) write(KEYS.listings, [{ ...seed, status }, ...local]);
}

// ───────── Kiralama talepleri (yerel) ─────────
function loadLocalRequests(): RentalRequest[] {
  return read<RentalRequest[]>(KEYS.requests, []);
}
export function addLocalRequest(req: RentalRequest): void {
  write(KEYS.requests, [req, ...loadLocalRequests()]);
}

/** Tohum + yerel talepleri birleştir (yerel olan tohumu geçersiz kılar). */
function mergeRequests(): RentalRequest[] {
  const local = loadLocalRequests();
  const localIds = new Set(local.map((r) => r.id));
  return [...local, ...REQUESTS.filter((r) => !localIds.has(r.id))];
}

/** Talep durumunu güncelle (tohum talep ise yerele kopyalanır). */
export function setRequestStatus(id: string, status: RentalRequest["status"]): void {
  const local = loadLocalRequests();
  const existing = local.find((r) => r.id === id);
  if (existing) {
    write(KEYS.requests, local.map((r) => (r.id === id ? { ...r, status } : r)));
    return;
  }
  const seed = REQUESTS.find((r) => r.id === id);
  if (seed) write(KEYS.requests, [{ ...seed, status }, ...local]);
}

// ───────── Birleştirilmiş erişim (mock + yerel) ─────────

/** Bir kullanıcının tüm ilanları (tohum + yerel, yerel öncelikli). */
export function myListings(userId: string): Listing[] {
  return mergeListings()
    .filter((l) => l.ownerId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** Kullanıcıya gelen talepler (ilan sahibi olarak). */
export function incomingRequests(userId: string): RentalRequest[] {
  return mergeRequests()
    .filter((r) => r.ownerId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** Kullanıcının gönderdiği talepler (kiralayan olarak). */
export function outgoingRequests(userId: string): RentalRequest[] {
  return mergeRequests()
    .filter((r) => r.renterId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** Yerel + tohum ilanları birlikte bul (detay/talep için). */
export function findAnyListing(id: string): Listing | undefined {
  return loadLocalListings().find((l) => l.id === id) ?? LISTINGS.find((l) => l.id === id);
}

// ───────── Sohbetler (yerel) ─────────
function loadLocalConversations(): Conversation[] {
  return read<Conversation[]>(KEYS.conversations, []);
}

/** Tohum + yerel sohbetleri birleştir (yerel olan tohumu geçersiz kılar). */
export function conversationsFor(userId: string): Conversation[] {
  const local = loadLocalConversations();
  const localIds = new Set(local.map((c) => c.id));
  const merged = [...local, ...CONVERSATIONS.filter((c) => !localIds.has(c.id))];
  return merged
    .filter((c) => c.participantIds.includes(userId))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

function persistConversation(conv: Conversation): void {
  const local = loadLocalConversations().filter((c) => c.id !== conv.id);
  write(KEYS.conversations, [conv, ...local]);
}

/** Mevcut sohbeti bul (yerel veya tohum). */
function findConversation(id: string): Conversation | undefined {
  return loadLocalConversations().find((c) => c.id === id) ?? CONVERSATIONS.find((c) => c.id === id);
}

/** Bir ilan için iki kullanıcı arasındaki sohbeti bul. */
function findConversationByListing(listingId: string, a: string, b: string): Conversation | undefined {
  return conversationsFor(a).find(
    (c) => c.listingId === listingId && c.participantIds.includes(b),
  );
}

/** İlan detayından mesaj başlat (varsa devam ettir). convId döner. */
export function startConversation(
  listingId: string,
  fromUserId: string,
  toUserId: string,
  text: string,
): string {
  const existing = findConversationByListing(listingId, fromUserId, toUserId);
  const now = new Date().toISOString();
  const msg: Message = { id: `m-${Date.now()}`, senderId: fromUserId, text, createdAt: now };
  if (existing) {
    persistConversation({ ...existing, messages: [...existing.messages, msg], updatedAt: now });
    return existing.id;
  }
  const conv: Conversation = {
    id: `c-${Date.now()}`,
    listingId,
    participantIds: [fromUserId, toUserId],
    messages: [msg],
    updatedAt: now,
  };
  persistConversation(conv);
  return conv.id;
}

/** Mevcut sohbete mesaj ekle (tohum sohbet ise yerele kopyalanır). */
export function sendMessage(convId: string, senderId: string, text: string): void {
  const conv = findConversation(convId);
  if (!conv) return;
  const now = new Date().toISOString();
  const msg: Message = { id: `m-${Date.now()}`, senderId, text, createdAt: now };
  persistConversation({ ...conv, messages: [...conv.messages, msg], updatedAt: now });
}

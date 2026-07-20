import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../index";
import { listingPhotos, listings, rentalRequests, users } from "../schema";
import type { Listing, RentalRequest } from "../../types";
import { toListing, toRequest } from "./mappers";

export interface RequestView {
  request: RentalRequest;
  listing: Listing | null;
  counterpartName: string;
}

/** Talep listesini ilgili ilan + karşı taraf adıyla zenginleştirir. */
async function enrich(
  reqRows: (typeof rentalRequests.$inferSelect)[],
  counterpart: "renterId" | "ownerId",
): Promise<RequestView[]> {
  const requests = reqRows.map(toRequest);
  if (!requests.length) return [];

  const listingIds = [...new Set(requests.map((r) => r.listingId))];
  const userIds = [...new Set(requests.map((r) => r[counterpart]))];

  const [listingRows, photoRows, userRows] = await Promise.all([
    db.select().from(listings).where(inArray(listings.id, listingIds)),
    db.select().from(listingPhotos).where(inArray(listingPhotos.listingId, listingIds)),
    db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)),
  ]);

  const listingMap = new Map(
    listingRows.map((l) => [
      l.id,
      toListing(
        l,
        photoRows.filter((p) => p.listingId === l.id),
      ),
    ]),
  );
  const nameMap = new Map(userRows.map((u) => [u.id, u.name]));

  return requests.map((r) => ({
    request: r,
    listing: listingMap.get(r.listingId) ?? null,
    counterpartName: nameMap.get(r[counterpart]) ?? "Kullanıcı",
  }));
}

/** Kullanıcıya gelen talepler (ilan sahibi olarak), en yeni önce. */
export async function incomingRequests(userId: string): Promise<RequestView[]> {
  const rows = await db
    .select()
    .from(rentalRequests)
    .where(eq(rentalRequests.ownerId, userId))
    .orderBy(desc(rentalRequests.createdAt));
  return enrich(rows, "renterId");
}

/** Kullanıcının gönderdiği talepler (kiralayan olarak), en yeni önce. */
export async function outgoingRequests(userId: string): Promise<RequestView[]> {
  const rows = await db
    .select()
    .from(rentalRequests)
    .where(eq(rentalRequests.renterId, userId))
    .orderBy(desc(rentalRequests.createdAt));
  return enrich(rows, "ownerId");
}

export async function getRequest(id: string): Promise<RentalRequest | undefined> {
  const row = await db.query.rentalRequests.findFirst({ where: eq(rentalRequests.id, id) });
  return row ? toRequest(row) : undefined;
}

/** Bekleyen gelen talep sayısı (sidebar rozeti). */
export async function pendingIncomingCount(userId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rentalRequests)
    .where(and(eq(rentalRequests.ownerId, userId), eq(rentalRequests.status, "beklemede")));
  return n;
}

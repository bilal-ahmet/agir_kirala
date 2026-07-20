"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { rentalRequests } from "../db/schema";
import { verifySession } from "../auth/session";
import { getListingById } from "../db/queries/listings";
import { computeRentalTotal } from "../pricing";
import type { RequestStatus } from "../types";

const createSchema = z.object({
  listingId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Başlangıç tarihi geçersiz."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitiş tarihi geçersiz."),
  period: z.enum(["saatlik", "gunluk", "haftalik", "aylik", "yillik"]),
  message: z.string().trim().max(2000).default(""),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export type CreateRentalRequestInput = z.input<typeof createSchema>;

export async function createRentalRequestAction(
  input: CreateRentalRequestInput,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await verifySession();

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Talep bilgileri geçersiz." };
  const d = parsed.data;

  const listing = await getListingById(d.listingId);
  if (!listing || listing.status !== "aktif") return { error: "İlan bulunamadı." };
  if (listing.ownerId === user.id) return { error: "Kendi ilanınıza talep gönderemezsiniz." };

  // Tutar server'da yeniden hesaplanır (client'a güvenilmez).
  const calc = computeRentalTotal(
    listing.prices,
    d.period,
    d.startDate,
    d.endDate,
    d.startTime ?? "",
    d.endTime ?? "",
  );
  if (!calc) return { error: "Tutar hesaplanamadı. Tarih ve periyodu kontrol edin." };
  if (listing.minRentalDays && calc.days < listing.minRentalDays) {
    return { error: `Bu ilan için minimum kiralama süresi ${listing.minRentalDays} gündür.` };
  }

  const timeNote =
    d.startTime || d.endTime ? `Saat: ${d.startTime || "—"}${d.endTime ? `–${d.endTime}` : ""}` : "";
  const fullMessage = [d.message.trim(), timeNote].filter(Boolean).join("\n");

  await db.insert(rentalRequests).values({
    listingId: listing.id,
    renterId: user.id,
    ownerId: listing.ownerId,
    startDate: d.startDate,
    endDate: d.endDate,
    period: d.period,
    message: fullMessage,
    status: "beklemede",
    totalPrice: calc.total.toFixed(2),
  });

  revalidatePath("/hesap/taleplerim");
  revalidatePath("/hesap/gelen-talepler");
  return { ok: true };
}

const updateSchema = z.enum(["onaylandi", "reddedildi", "iptal"]);

/** Talep durumu güncelle: owner onaylar/reddeder, renter iptal eder. */
export async function updateRequestStatusAction(
  requestId: string,
  status: RequestStatus,
): Promise<{ error?: string }> {
  const user = await verifySession();
  if (!updateSchema.safeParse(status).success) return { error: "Geçersiz durum." };

  const req = await db.query.rentalRequests.findFirst({
    where: eq(rentalRequests.id, requestId),
  });
  if (!req) return { error: "Talep bulunamadı." };

  const isOwnerAction = status === "onaylandi" || status === "reddedildi";
  if (isOwnerAction && req.ownerId !== user.id) return { error: "Bu işlem için yetkiniz yok." };
  if (status === "iptal" && req.renterId !== user.id) return { error: "Bu işlem için yetkiniz yok." };

  await db
    .update(rentalRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(rentalRequests.id, requestId));

  revalidatePath("/hesap/taleplerim");
  revalidatePath("/hesap/gelen-talepler");
  return {};
}

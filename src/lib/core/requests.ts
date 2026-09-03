import "server-only";

import { eq } from "drizzle-orm";
import { db } from "../db";
import { listings, rentalRequests } from "../db/schema";
import { getListingById } from "../db/queries/listings";
import { computeRentalTotal } from "../pricing";
import type { RequestStatus, User } from "../types";
import { fail, mutated, pgConstraint, type MutationResult } from "./errors";
import { createRentalRequestSchema, updateRequestStatusSchema, type CreateRentalRequestInput } from "./schemas";
import { preview, type Notification } from "../notify/types";

const REVALIDATE = ["/hesap/taleplerim", "/hesap/gelen-talepler"];

export async function createRentalRequest(
  user: User,
  input: CreateRentalRequestInput,
): Promise<MutationResult<{ id: string }>> {
  const parsed = createRentalRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail("validation", parsed.error.issues[0]?.message ?? "Talep bilgileri geçersiz.");
  }
  const d = parsed.data;

  const listing = await getListingById(d.listingId);
  if (!listing) return fail("not_found", "İlan bulunamadı.");
  if (listing.status !== "aktif") return fail("listing_not_active", "İlan yayında değil.");
  if (listing.ownerId === user.id) {
    return fail("self_action", "Kendi ilanınıza talep gönderemezsiniz.");
  }

  // Tutar server'da yeniden hesaplanır (client'a güvenilmez).
  const calc = computeRentalTotal(
    listing.prices,
    d.period,
    d.startDate,
    d.endDate,
    d.startTime ?? "",
    d.endTime ?? "",
  );
  if (!calc) return fail("validation", "Tutar hesaplanamadı. Tarih ve periyodu kontrol edin.");
  if (listing.minRentalDays && calc.days < listing.minRentalDays) {
    return fail(
      "validation",
      `Bu ilan için minimum kiralama süresi ${listing.minRentalDays} gündür.`,
    );
  }

  const timeNote =
    d.startTime || d.endTime ? `Saat: ${d.startTime || "—"}${d.endTime ? `–${d.endTime}` : ""}` : "";
  const fullMessage = [d.message.trim(), timeNote].filter(Boolean).join("\n");

  try {
    const [created] = await db
      .insert(rentalRequests)
      .values({
        listingId: listing.id,
        renterId: user.id,
        ownerId: listing.ownerId,
        startDate: d.startDate,
        endDate: d.endDate,
        period: d.period,
        message: fullMessage,
        status: "beklemede",
        totalPrice: calc.total.toFixed(2),
      })
      .returning({ id: rentalRequests.id });

    // İlan sahibi talebi kaçırmamalı: bildirim ona gider (talep eden zaten biliyor).
    const notification: Notification = {
      userId: listing.ownerId,
      title: "Yeni kiralama talebi",
      body: preview(`${user.name} · ${listing.title} · ${d.startDate} → ${d.endDate}`),
      data: { type: "request_created", id: created.id, listingId: listing.id },
    };

    return mutated({ id: created.id }, REVALIDATE, [notification]);
  } catch (e) {
    /**
     * Idempotency: rental_requests_dedupe kısmi unique index'i ihlal edilirse
     * sürücü ham Postgres 23505 fırlatır. Çevrilmezse kullanıcı 500 görür —
     * oysa bu beklenen bir durumdur (mobilde çift dokunma / timeout retry).
     * Yalnız BU constraint çevrilir; diğer 23505'ler gerçek hata olarak yükselir.
     */
    if (pgConstraint(e) === "rental_requests_dedupe") {
      return fail("conflict", "Bu tarihler için zaten bekleyen bir talebiniz var.");
    }
    throw e;
  }
}

/** Talep durumu güncelle: owner onaylar/reddeder, renter iptal eder. */
export async function updateRequestStatus(
  user: User,
  requestId: string,
  status: RequestStatus,
): Promise<MutationResult<{ id: string }>> {
  if (!updateRequestStatusSchema.safeParse(status).success) {
    return fail("validation", "Geçersiz durum.");
  }

  const req = await db.query.rentalRequests.findFirst({
    where: eq(rentalRequests.id, requestId),
  });
  if (!req) return fail("not_found", "Talep bulunamadı.");

  const isOwnerAction = status === "onaylandi" || status === "reddedildi";
  if (isOwnerAction && req.ownerId !== user.id) {
    return fail("forbidden", "Bu işlem için yetkiniz yok.");
  }
  if (status === "iptal" && req.renterId !== user.id) {
    return fail("forbidden", "Bu işlem için yetkiniz yok.");
  }

  await db
    .update(rentalRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(rentalRequests.id, requestId));

  // Bildirim her zaman KARŞI tarafa: onay/red kiralayana, iptal ilan sahibine.
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, req.listingId),
    columns: { title: true },
  });
  const title = listing?.title ?? "İlan";

  const copy: Record<typeof status & string, { userId: string; title: string; body: string }> = {
    onaylandi: { userId: req.renterId, title: "Talebiniz onaylandı", body: title },
    reddedildi: { userId: req.renterId, title: "Talebiniz reddedildi", body: title },
    iptal: { userId: req.ownerId, title: "Talep iptal edildi", body: `${user.name} · ${title}` },
    beklemede: { userId: req.renterId, title: "Talep güncellendi", body: title },
  };
  const c = copy[status];

  const notification: Notification = {
    userId: c.userId,
    title: c.title,
    body: preview(c.body),
    data: {
      type:
        status === "onaylandi"
          ? "request_approved"
          : status === "reddedildi"
            ? "request_rejected"
            : "request_cancelled",
      id: requestId,
      listingId: req.listingId,
    },
  };

  return mutated({ id: requestId }, REVALIDATE, [notification]);
}

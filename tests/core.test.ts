/**
 * Core davranış testleri.
 *
 * İş mantığı server action'lardan src/lib/core'a taşındı; bu refactor web'in TÜM
 * mutasyon yollarına dokundu. Elle tıklayarak doğrulamak yeterli bir güvence
 * değildi — bu set "kırıldı mı?" sorusunu saniyeler içinde cevaplar ve /api/v1
 * uçları da aynı core'u çağırdığı için onların da regresyon ağıdır.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { listings, rentalRequests, sessions, users } from "@/lib/db/schema";
import { toUser } from "@/lib/db/queries/mappers";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/token";
import type { User } from "@/lib/types";

import * as coreListings from "@/lib/core/listings";
import * as coreRequests from "@/lib/core/requests";
import * as coreConversations from "@/lib/core/conversations";
import * as coreFavorites from "@/lib/core/favorites";
import * as coreAccount from "@/lib/core/account";
import * as coreAuth from "@/lib/core/auth";

// ───────── Yardımcılar ─────────

const createdUserIds: string[] = [];

async function makeUser(overrides: Partial<{ phone: string; password: string }> = {}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      name: "Test Kullanıcı",
      email: `test-${randomUUID()}@example.test`,
      passwordHash: await hashPassword(overrides.password ?? "test1234"),
      type: "bireysel",
      phone: overrides.phone ?? "5551112233",
      city: "Ankara",
    })
    .returning();
  createdUserIds.push(row.id);
  return toUser(row);
}

/** Geçerli bir ilan girdisi — testler yalnız ilgilendikleri alanı ezer. */
function listingInput(over: Record<string, unknown> = {}) {
  return {
    title: "Test İş Makinesi",
    categorySlug: "hafriyat",
    subCategorySlug: "paletli-ekskavator",
    brand: "Caterpillar",
    year: 2020,
    city: "Ankara",
    district: "Çankaya",
    prices: { saatlik: 1000, gunluk: 8000 },
    status: "aktif" as const,
    ...over,
  };
}

function expectFail(res: { ok: boolean }, code: string) {
  expect(res.ok).toBe(false);
  expect((res as unknown as { error: { code: string } }).error.code).toBe(code);
}

function value<T>(res: { ok: boolean }): T {
  expect(res.ok).toBe(true);
  return (res as unknown as { value: T }).value;
}

let owner: User;
let renter: User;

beforeAll(async () => {
  owner = await makeUser();
  renter = await makeUser();
});

afterAll(async () => {
  // Kullanıcı silme cascade ile ilan/talep/sohbet/oturumları da temizler.
  if (createdUserIds.length) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
});

// ───────── İlanlar ─────────

describe("ilanlar", () => {
  it("ilan oluşturur", async () => {
    const res = await coreListings.createListing(owner, listingInput());
    const { id } = value<{ id: string }>(res);
    expect(id).toBeTruthy();
    // Etkilenen web yolları sonuçla birlikte döner (revalidation sözleşmesi).
    expect((res as { revalidate: string[] }).revalidate).toContain("/ilanlar");
  });

  it("saatlik ücreti olmayan ilan yayınlanamaz", async () => {
    const res = await coreListings.createListing(
      owner,
      listingInput({ prices: { gunluk: 8000 }, status: "aktif" }),
    );
    expectFail(res, "validation");
  });

  it("saatlik ücreti olmayan ilan taslak olarak kaydedilebilir", async () => {
    const res = await coreListings.createListing(
      owner,
      listingInput({ prices: { gunluk: 8000 }, status: "taslak" }),
    );
    expect(res.ok).toBe(true);
  });

  it("geçersiz kategori reddedilir", async () => {
    const res = await coreListings.createListing(owner, listingInput({ categorySlug: "uydurma" }));
    expectFail(res, "validation");
  });

  it("aktif ilandan saatlik ücret kaldırılamaz", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );
    // Bu değişmez yalnız create'te olsaydı delinirdi: ilan aramada görünmeye
    // devam eder ama talep formu tutar hesaplayamazdı.
    const res = await coreListings.updateListing(owner, id, { prices: { gunluk: 9000 } });
    expectFail(res, "validation");
  });

  it("saatlik ücreti olmayan taslak ilan aktifleştirilemez", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(
        owner,
        listingInput({ prices: { gunluk: 8000 }, status: "taslak" }),
      ),
    );
    const res = await coreListings.updateListingStatus(owner, id, "aktif");
    expectFail(res, "validation");
  });

  it("fiyat güncellemesi jsonb'yi TAM DEĞİŞTİRİR (merge etmez)", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );
    await coreListings.updateListing(owner, id, { prices: { saatlik: 1500 } });
    const row = await db.query.listings.findFirst({ where: eq(listings.id, id) });
    // gunluk gitmeli — merge olsaydı alan silmek imkânsız olurdu.
    expect(row?.prices).toEqual({ saatlik: 1500 });
  });

  it("başkasının ilanı güncellenemez", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );
    expectFail(await coreListings.updateListing(renter, id, { title: "Çalındı" }), "not_found");
  });

  it("başkasının ilanı silinemez", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );
    expectFail(await coreListings.deleteListing(renter, id), "not_found");
  });
});

// ───────── Görünürlük ─────────

describe("ilan görünürlüğü", () => {
  it("aktif olmayan ilanı sahibi görür, başkası görmez", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput({ status: "taslak" })),
    );

    expect(await coreListings.getListingForViewer(id, owner.id)).toBeTruthy();
    // UUID'yi bilmek erişim hakkı değildir.
    expect(await coreListings.getListingForViewer(id, renter.id)).toBeUndefined();
    expect(await coreListings.getListingForViewer(id)).toBeUndefined();
  });

  it("aktif ilanı herkes görür", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );
    expect(await coreListings.getListingForViewer(id)).toBeTruthy();
  });
});

// ───────── Talepler ─────────

describe("talepler", () => {
  let listingId: string;

  beforeAll(async () => {
    listingId = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput({ minRentalDays: 1 })),
    ).id;
  });

  it("talep oluşturur ve tutarı sunucuda hesaplar", async () => {
    const res = await coreRequests.createRentalRequest(renter, {
      listingId,
      startDate: "2026-09-01",
      endDate: "2026-09-03",
      period: "gunluk",
    });
    const { id } = value<{ id: string }>(res);
    const row = await db.query.rentalRequests.findFirst({ where: eq(rentalRequests.id, id) });
    // 2 gün × 8000 — istemciden gelen bir tutar kullanılmaz.
    expect(Number(row?.totalPrice)).toBe(16000);
  });

  it("kendi ilanına talep gönderilemez", async () => {
    expectFail(
      await coreRequests.createRentalRequest(owner, {
        listingId,
        startDate: "2026-10-01",
        endDate: "2026-10-02",
        period: "gunluk",
      }),
      "self_action",
    );
  });

  it("aynı tarihlere ikinci bekleyen talep 409 verir (idempotency)", async () => {
    const body = {
      listingId,
      startDate: "2026-11-01",
      endDate: "2026-11-05",
      period: "gunluk" as const,
    };
    expect((await coreRequests.createRentalRequest(renter, body)).ok).toBe(true);
    // Mobilde çift dokunma / timeout retry: 500 değil, anlamlı bir çakışma.
    expectFail(await coreRequests.createRentalRequest(renter, body), "conflict");
  });

  it("yayında olmayan ilana talep gönderilemez", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput({ status: "taslak" })),
    );
    expectFail(
      await coreRequests.createRentalRequest(renter, {
        listingId: id,
        startDate: "2026-09-01",
        endDate: "2026-09-02",
        period: "gunluk",
      }),
      "listing_not_active",
    );
  });

  it("talebi yalnızca doğru taraf yönetir", async () => {
    const { id } = value<{ id: string }>(
      await coreRequests.createRentalRequest(renter, {
        listingId,
        startDate: "2026-12-01",
        endDate: "2026-12-03",
        period: "gunluk",
      }),
    );

    // Kiralayan onaylayamaz; ilan sahibi iptal edemez.
    expectFail(await coreRequests.updateRequestStatus(renter, id, "onaylandi"), "forbidden");
    expectFail(await coreRequests.updateRequestStatus(owner, id, "iptal"), "forbidden");
    expect((await coreRequests.updateRequestStatus(owner, id, "onaylandi")).ok).toBe(true);
  });
});

// ───────── Mesajlar ─────────

describe("mesajlar", () => {
  it("sohbet başlatır, katılımcı olmayan mesaj gönderemez", async () => {
    const { id: listingId } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );

    const { conversationId } = value<{ conversationId: string }>(
      await coreConversations.startConversation(renter, listingId, "Merhaba, müsait mi?"),
    );
    expect(conversationId).toBeTruthy();

    const outsider = await makeUser();
    expectFail(
      await coreConversations.sendMessage(outsider, conversationId, "İzinsiz giriş"),
      "not_found",
    );

    expect((await coreConversations.sendMessage(owner, conversationId, "Müsait.")).ok).toBe(true);
  });

  it("kendi ilanına mesaj gönderilemez", async () => {
    const { id: listingId } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );
    expectFail(
      await coreConversations.startConversation(owner, listingId, "kendime"),
      "self_action",
    );
  });

  it("boş mesaj reddedilir", async () => {
    const { id: listingId } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );
    expectFail(await coreConversations.startConversation(renter, listingId, "   "), "validation");
  });
});

// ───────── Favoriler ─────────

describe("favoriler", () => {
  it("toggle ekler ve çıkarır", async () => {
    const { id } = value<{ id: string }>(
      await coreListings.createListing(owner, listingInput()),
    );
    expect(value<{ favorite: boolean }>(await coreFavorites.toggleFavorite(renter, id)).favorite).toBe(true);
    expect(value<{ favorite: boolean }>(await coreFavorites.toggleFavorite(renter, id)).favorite).toBe(false);
  });
});

// ───────── Hesap ─────────

describe("hesap", () => {
  it("şifre değiştirir ve DİĞER oturumları kapatır", async () => {
    const user = await makeUser({ password: "eskisifre" });

    const currentHash = hashToken("bu-cihaz");
    const otherHash = hashToken("diger-cihaz");
    const future = new Date(Date.now() + 86_400_000);
    await db.insert(sessions).values([
      { userId: user.id, tokenHash: currentHash, client: "mobile", expiresAt: future },
      { userId: user.id, tokenHash: otherHash, client: "mobile", expiresAt: future },
    ]);

    expectFail(
      await coreAccount.changePassword(
        user,
        { currentPassword: "yanlis", newPassword: "yenisifre" },
        currentHash,
      ),
      "unauthorized",
    );

    const res = await coreAccount.changePassword(
      user,
      { currentPassword: "eskisifre", newPassword: "yenisifre" },
      currentHash,
    );
    expect(value<{ closedSessions: number }>(res).closedSessions).toBe(1);

    const remaining = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    // Kullanıcı kendi cihazından atılmaz — sıfırlama akışından kasıtlı farkı bu.
    expect(remaining.map((s) => s.tokenHash)).toEqual([currentHash]);

    expect((await coreAuth.authenticate({ email: "", password: "" })).ok).toBe(false);
  });

  it("anonimleştirme: giriş kapanır, ilanlar pasifleşir, yorumlar kalır", async () => {
    const victim = await makeUser({ password: "sifre123" });
    const { id: listingId } = value<{ id: string }>(
      await coreListings.createListing(victim, listingInput()),
    );

    const row = await db.query.users.findFirst({ where: eq(users.id, victim.id) });
    expect((await coreAuth.authenticate({ email: row!.email, password: "sifre123" })).ok).toBe(true);

    expect((await coreAccount.anonymizeAccount(victim.id)).ok).toBe(true);

    const after = await db.query.users.findFirst({ where: eq(users.id, victim.id) });
    // Satır SİLİNMEZ: karşı tarafların mesaj/talep/yorum geçmişi kırılmasın.
    expect(after).toBeTruthy();
    expect(after!.name).toBe("Silinmiş kullanıcı");
    expect(after!.deletedAt).toBeTruthy();
    expect(after!.phone).toBe("");

    // Eski şifreyle de, tombstone e-postayla da giriş yok.
    expect((await coreAuth.authenticate({ email: row!.email, password: "sifre123" })).ok).toBe(false);

    const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
    expect(listing!.status).toBe("pasif");
    // Görünürlük kuralı devreye girer: ilan artık kimseye açılmaz.
    expect(await coreListings.getListingForViewer(listingId)).toBeUndefined();

    // İkinci kez silinemez.
    expectFail(await coreAccount.anonymizeAccount(victim.id), "conflict");
  });
});

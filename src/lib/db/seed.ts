// Seed: mevcut mock verisini (src/lib/data/*) DB'ye taşır.
// Çalıştır: npm run db:seed  (tsx ile). server-only import etmez.

import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import { USERS } from "../data/users";
import { LISTINGS } from "../data/listings";
import { REQUESTS } from "../data/requests";
import { CONVERSATIONS } from "../data/conversations";
import * as schema from "./schema";

loadEnvConfig(process.cwd());

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL / DATABASE_URL tanımlı değil (.env.local).");
}

// Tüm demo hesapların ortak şifresi.
const DEMO_PASSWORD = "demo1234";

async function main() {
  const client = postgres(connectionString!, { max: 1, prepare: false });
  const db = drizzle(client, { schema, casing: "snake_case" });

  console.log("→ Tablolar temizleniyor…");
  await db.execute(sql`
    truncate table
      ${schema.reviews}, ${schema.messages}, ${schema.conversations},
      ${schema.rentalRequests}, ${schema.favorites}, ${schema.listingPhotos},
      ${schema.listings}, ${schema.sessions}, ${schema.users}
    restart identity cascade
  `);

  // Eski string id → yeni uuid eşlemeleri.
  const userId = new Map<string, string>();
  const listingId = new Map<string, string>();

  // ───────── users ─────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userRows = USERS.map((u) => {
    const id = randomUUID();
    userId.set(u.id, id);
    return {
      id,
      name: u.name,
      email: u.email.trim().toLowerCase(),
      passwordHash,
      type: u.type,
      companyName: u.companyName ?? null,
      verified: u.verified,
      rating: u.rating.toFixed(1),
      reviewCount: u.reviewCount,
      phone: u.phone,
      city: u.city,
      accent: u.accent ?? null,
      memberSince: new Date(u.memberSince),
    };
  });
  await db.insert(schema.users).values(userRows);
  console.log(`✓ ${userRows.length} kullanıcı`);

  // ───────── listings ─────────
  const listingRows = LISTINGS.map((l) => {
    const id = randomUUID();
    listingId.set(l.id, id);
    const owner = userId.get(l.ownerId);
    if (!owner) throw new Error(`İlan ${l.id} için bilinmeyen owner ${l.ownerId}`);
    return {
      id,
      title: l.title,
      categorySlug: l.categorySlug,
      subCategorySlug: l.subCategorySlug,
      brand: l.brand,
      model: l.model,
      year: l.year,
      city: l.city,
      district: l.district,
      prices: l.prices,
      operator: l.operator,
      transport: l.transport,
      fuel: l.fuel ?? null,
      // Demo veride "durum" alanı yok — son iki model yılı sıfır sayılır.
      condition: l.year >= new Date().getFullYear() - 1 ? ("sifir" as const) : ("ikinci_el" as const),
      usage: l.usage,
      specs: l.specs,
      description: l.description,
      ownerId: owner,
      status: l.status,
      featured: l.featured ?? false,
      minRentalDays: l.minRentalDays ?? null,
      availability: l.availability ?? null,
      createdAt: new Date(l.createdAt),
    };
  });
  await db.insert(schema.listings).values(listingRows);
  console.log(`✓ ${listingRows.length} ilan`);

  // ───────── rental_requests ─────────
  const requestRows = REQUESTS.flatMap((r) => {
    const lid = listingId.get(r.listingId);
    const renter = userId.get(r.renterId);
    const owner = userId.get(r.ownerId);
    if (!lid || !renter || !owner) {
      console.warn(`⚠ Talep ${r.id} atlandı (eksik referans)`);
      return [];
    }
    return [
      {
        listingId: lid,
        renterId: renter,
        ownerId: owner,
        startDate: r.startDate,
        endDate: r.endDate,
        period: r.period,
        message: r.message,
        status: r.status,
        totalPrice: r.totalPrice.toFixed(2),
        createdAt: new Date(r.createdAt),
      },
    ];
  });
  if (requestRows.length) await db.insert(schema.rentalRequests).values(requestRows);
  console.log(`✓ ${requestRows.length} kiralama talebi`);

  // ───────── conversations + messages ─────────
  let messageCount = 0;
  for (const c of CONVERSATIONS) {
    const lid = listingId.get(c.listingId);
    const [renterOld, ownerOld] = c.participantIds;
    const renter = userId.get(renterOld);
    const owner = userId.get(ownerOld);
    if (!lid || !renter || !owner) {
      console.warn(`⚠ Sohbet ${c.id} atlandı (eksik referans)`);
      continue;
    }
    const convId = randomUUID();
    await db.insert(schema.conversations).values({
      id: convId,
      listingId: lid,
      renterId: renter,
      ownerId: owner,
      updatedAt: new Date(c.updatedAt),
    });
    const msgRows = c.messages.flatMap((m) => {
      const sender = userId.get(m.senderId);
      if (!sender) return [];
      return [
        {
          conversationId: convId,
          senderId: sender,
          text: m.text,
          createdAt: new Date(m.createdAt),
        },
      ];
    });
    if (msgRows.length) await db.insert(schema.messages).values(msgRows);
    messageCount += msgRows.length;
  }
  console.log(`✓ ${CONVERSATIONS.length} sohbet, ${messageCount} mesaj`);

  // ───────── örnek reviews (net-new özelliğin demosu) ─────────
  // Not: users.rating/reviewCount seed değerlerinden korunur (recompute yapılmaz).
  const demoOwner = userId.get("u1");
  const sampleReviews = [
    { reviewerOld: "u4", targetOld: "u1", listingOld: "l1", rating: 5, comment: "Makine bakımlı, operatör çok deneyimliydi. Teşekkürler." },
    { reviewerOld: "u7", targetOld: "u1", listingOld: "l5", rating: 4, comment: "Zamanında teslim, iletişim iyiydi." },
  ];
  if (demoOwner) {
    const reviewRows = sampleReviews.flatMap((r) => {
      const reviewer = userId.get(r.reviewerOld);
      const target = userId.get(r.targetOld);
      const lid = listingId.get(r.listingOld);
      if (!reviewer || !target || !lid) return [];
      return [
        {
          listingId: lid,
          reviewerId: reviewer,
          targetUserId: target,
          rentalRequestId: null,
          rating: r.rating,
          comment: r.comment,
        },
      ];
    });
    if (reviewRows.length) await db.insert(schema.reviews).values(reviewRows);
    console.log(`✓ ${reviewRows.length} örnek yorum`);
  }

  await client.end();
  console.log(`\nBitti. Demo giriş: ${USERS[0].email} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

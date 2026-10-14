// Tır kategorisindeki örnek ilanları veritabanına EKLER — hiçbir şey silmez.
//
// Ana seed (src/lib/db/seed.ts) tüm tabloları boşaltıp baştan yazar; canlı
// veride çalıştırılamaz. Bu betik yalnız eksik tır ilanlarını ekler:
// - İlan sahibi demo kullanıcının e-postasıyla bulunur (src/lib/data/users.ts).
// - Aynı sahibin aynı başlıklı ilanı varsa atlanır; tekrar çalıştırmak güvenli.
//
// Çalıştır:
//   npm run db:seed:tir -- --dry-run   # ne ekleneceğini yazar, yazmaz
//   npm run db:seed:tir

import { loadEnvConfig } from "@next/env";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { LISTINGS } from "../src/lib/data/listings";
import { USERS } from "../src/lib/data/users";
import * as schema from "../src/lib/db/schema";

loadEnvConfig(process.cwd());

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL / DATABASE_URL tanımlı değil (.env.local).");

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const client = postgres(connectionString!, { max: 1, prepare: false });
  const db = drizzle(client, { schema, casing: "snake_case" });

  const emailOf = new Map(USERS.map((u) => [u.id, u.email.trim().toLowerCase()]));
  const tir = LISTINGS.filter((l) => l.categorySlug === "tir");

  let added = 0;
  let skipped = 0;
  for (const l of tir) {
    const email = emailOf.get(l.ownerId);
    const owner = email
      ? await db.query.users.findFirst({ where: eq(schema.users.email, email), columns: { id: true } })
      : undefined;
    if (!owner) {
      console.warn(`⚠ ${l.id} atlandı: sahibi (${email ?? l.ownerId}) veritabanında yok`);
      skipped++;
      continue;
    }

    const existing = await db.query.listings.findFirst({
      where: and(eq(schema.listings.ownerId, owner.id), eq(schema.listings.title, l.title)),
      columns: { id: true },
    });
    if (existing) {
      console.log(`· ${l.id} zaten var: ${l.title}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`+ ${l.id} eklenecek: ${l.title} (${l.subCategorySlug}, ${l.city})`);
      added++;
      continue;
    }

    await db.insert(schema.listings).values({
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
      // Ana seed'le aynı kural: son iki model yılı sıfır sayılır.
      condition: l.year >= new Date().getFullYear() - 1 ? "sifir" : "ikinci_el",
      usage: l.usage,
      specs: l.specs,
      description: l.description,
      ownerId: owner.id,
      status: l.status,
      featured: l.featured ?? false,
      minRentalDays: l.minRentalDays ?? null,
      availability: l.availability ?? null,
      createdAt: new Date(l.createdAt),
    });
    console.log(`✓ ${l.id} eklendi: ${l.title}`);
    added++;
  }

  await client.end();
  console.log(`\n${dryRun ? "Kuru çalıştırma — " : ""}${added} ${dryRun ? "eklenecek" : "eklendi"}, ${skipped} atlandı.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

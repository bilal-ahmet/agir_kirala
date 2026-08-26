import "server-only";

import { lt, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "../db";
import { rateLimits } from "../db/schema";
import { AppError } from "../core/errors";

/**
 * Sabit pencereli sayaç — DB'de.
 *
 * Vercel serverless'te süreç-içi sayaç işe yaramaz: her istek ayrı bir lambda
 * örneğine düşebilir, bellekteki sayaç paylaşılmaz.
 *
 * BİLİNÇLİ KARAR: her mutasyona genel bir limit KONULMADI. Her mutasyona bir
 * ekstra yazma eklemek, pooler üzerinde kullanıcı başına serileşen bir hotspot
 * yaratırdı. Limit yalnız spam'e veya maliyete açık uçlarda var (aşağıdaki
 * LIMITS tablosu).
 */

export const LIMITS = {
  /** Mesaj/sohbet spam'i */
  msg: { max: 30, windowMs: 60_000 },
  /** İmzalı URL üretimi bedava değil */
  ticket: { max: 30, windowMs: 60 * 60_000 },
  listing: { max: 20, windowMs: 60 * 60_000 },
  req: { max: 20, windowMs: 60 * 60_000 },
  login: { max: 10, windowMs: 15 * 60_000 },
  register: { max: 5, windowMs: 60 * 60_000 },
  forgot: { max: 3, windowMs: 60 * 60_000 },
} as const;

export type LimitName = keyof typeof LIMITS;

/** İstemci IP'si — ters vekil arkasındaki ilk hop. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Sayacı bir artırır; pencere dolmuşsa sıfırlayarak yeniden başlatır.
 *
 * Pencere sıfırlaması UPSERT'ün İÇİNDE, CASE ile yapılır. Düz `count = count + 1`
 * yazsaydık sayaç sonsuza dek birikir ve limit bir kez aşıldığında kullanıcı
 * kalıcı olarak kilitlenirdi.
 */
export async function enforceRateLimit(name: LimitName, subject: string): Promise<void> {
  const { max, windowMs } = LIMITS[name];
  const key = `${name}:${subject}`;
  const interval = sql.raw(`interval '${Math.round(windowMs / 1000)} seconds'`);

  const rows = await db.execute<{ count: number }>(sql`
    insert into ${rateLimits} (key, count, reset_at)
    values (${key}, 1, now() + ${interval})
    on conflict (key) do update set
      count = case when ${rateLimits}.reset_at < now() then 1 else ${rateLimits}.count + 1 end,
      reset_at = case when ${rateLimits}.reset_at < now() then now() + ${interval} else ${rateLimits}.reset_at end
    returning count
  `);

  // Süresi geçmiş satırları fırsat buldukça temizle (sessions'taki kalıp).
  void db
    .delete(rateLimits)
    .where(lt(rateLimits.resetAt, new Date()))
    .catch(() => {});

  if ((rows[0]?.count ?? 0) > max) {
    throw new AppError("rate_limited", "Çok fazla deneme yaptınız. Lütfen biraz sonra tekrar deneyin.");
  }
}

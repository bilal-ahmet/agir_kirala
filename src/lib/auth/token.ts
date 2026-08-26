import { createHash, randomBytes } from "node:crypto";

/**
 * Oturum ve şifre-sıfırlama token'ları için ortak yardımcılar.
 *
 * Bağımsız modül: session.ts (server-only, cookie'ye bağlı) ile core katmanı
 * arasında döngüsel bağımlılık kurulmasın diye ayrı duruyor.
 *
 * Token'lar opak rastgele dizelerdir; DB'de yalnızca SHA-256 hash'i tutulur.
 * Böylece veritabanı sızsa bile mevcut oturumlar ele geçirilemez.
 */

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

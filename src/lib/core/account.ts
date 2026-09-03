import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import {
  favorites,
  listings,
  passwordResetTokens,
  sessions,
  users,
} from "../db/schema";
import { hashPassword, verifyPassword } from "../auth/password";
import { generateToken } from "../auth/token";
import { toUser } from "../db/queries/mappers";
import type { User } from "../types";
import { collectFieldErrors, fail, mutated, type MutationResult } from "./errors";
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from "./schemas";

export async function updateProfile(
  user: User,
  input: ProfileInput,
): Promise<MutationResult<{ user: User }>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "validation",
      "Lütfen işaretli alanları düzeltin.",
      collectFieldErrors(parsed.error.issues),
    );
  }

  const [updated] = await db
    .update(users)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone ?? "",
      city: parsed.data.city,
      companyName: user.type === "kurumsal" ? (parsed.data.companyName ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return mutated({ user: toUser(updated) }, ["/hesap/profil"]);
}

/**
 * Oturum açıkken şifre değiştirme.
 *
 * Mevcut oturum HARİÇ diğer tüm oturumlar kapatılır. Kasıtlı fark: e-posta
 * yoluyla şifre sıfırlama TÜM oturumları siler, çünkü orası olası bir hesap ele
 * geçirme senaryosudur; burada kullanıcı mevcut şifresini zaten biliyor ve
 * kendi cihazından atılmak istemez.
 *
 * `currentTokenHash` parametre olarak gelir: core oturum okumaz (taşıma
 * katmanından bağımsız kalması için), bu bilgiyi çağıran verir.
 */
export async function changePassword(
  user: User,
  input: ChangePasswordInput,
  currentTokenHash: string,
): Promise<MutationResult<{ closedSessions: number }>> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "validation",
      "Lütfen işaretli alanları düzeltin.",
      collectFieldErrors(parsed.error.issues),
    );
  }

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!row) return fail("not_found", "Kullanıcı bulunamadı.");
  if (!(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return fail("unauthorized", "Mevcut şifreniz hatalı.", {
      currentPassword: "Mevcut şifreniz hatalı.",
    });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

  const closed = await db
    .delete(sessions)
    .where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, currentTokenHash)))
    .returning({ id: sessions.id });

  return mutated({ closedSessions: closed.length }, ["/hesap/profil"]);
}

/**
 * HESAP SİLME = ANONİMLEŞTİRME.
 *
 * Satırı cascade ile silmek YANLIŞ olurdu: kullanıcının yazdığı yorumlar da
 * giderdi → karşı tarafın puanı geriye dönük değişirdi; mesajları karşı tarafın
 * sohbetinden kaybolurdu; talep geçmişi delinirdi. Mağazalar kullanıcının kendi
 * verisinin silinmesini ister, başkalarının verisinin değil.
 *
 * Bunun yerine: kişisel veri temizlenir, kimlik tombstone'a çevrilir, giriş
 * imkânsızlaştırılır, ilanlar yayından kaldırılır. Yorum/mesaj/talep kalır —
 * yazar adı artık "Silinmiş kullanıcı"dır. Puan yeniden hesaplanmaz çünkü
 * hiçbir yorum silinmez.
 */
export async function anonymizeAccount(userId: string): Promise<MutationResult<{ id: string }>> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!row) return fail("not_found", "Kullanıcı bulunamadı.");
  if (row.deletedAt) return fail("conflict", "Bu hesap zaten silinmiş.");

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: "Silinmiş kullanıcı",
        // NOT NULL + unique olduğu için boşaltılamaz; çakışmayan tombstone yazılır.
        email: `silinmis-${userId}@anon.local`,
        // Rastgele hash: bu hesaba hiçbir şifre uymaz.
        passwordHash: generateToken(),
        phone: "",
        companyName: null,
        accent: null,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Erişim anında kapanır (getSessionContext deletedAt'i zaten reddeder ama
    // satırları bırakmanın anlamı yok) + kişisel tercihler temizlenir.
    // Push aboneliği OneSignal tarafında: istemci OneSignal.logout() çağırır.
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(favorites).where(eq(favorites.userId, userId));

    // İlanlar silinmez (talep/sohbet geçmişi bu satırlara bağlı) ama yayından
    // kalkar. Görünürlük kuralı sayesinde artık gerçekten erişilemezler.
    await tx
      .update(listings)
      .set({ status: "pasif", updatedAt: new Date() })
      .where(eq(listings.ownerId, userId));
  });

  return mutated({ id: userId }, ["/ilanlar", "/hesap"]);
}

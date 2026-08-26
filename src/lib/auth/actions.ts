"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { passwordResetTokens, sessions, users } from "../db/schema";
import { getUserRowByEmail } from "../db/queries/users";
import * as coreAuth from "../core/auth";
import { updateProfile } from "../core/account";
import { collectFieldErrors } from "../core/errors";
import { profileSchema } from "../core/schemas";
import { hashPassword } from "./password";
import { hashToken } from "./token";
import { createSession, destroySession, verifySession } from "./session";

// Doğrulama şemaları src/lib/core/schemas.ts içinde: aynı kuralları JSON API'nin
// ikinci kez yazması gerekmesin diye. Buradaki fonksiyonlar FormData'yı çözüp
// core'a devreder.

export interface AuthState {
  /** Forma ait genel hata (ör. "E-posta veya şifre hatalı"). */
  error?: string;
  /** Alan adı → hata mesajı. Tüm doğrulama hataları birlikte döner. */
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** Bilgi amaçlı başarı mesajı (şifre sıfırlama talebi vb.). */
  message?: string;
}

/** next parametresini güvenli (yalnızca site-içi göreli yol) hale getirir. */
function safeNext(raw: FormDataEntryValue | null): string {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/hesap";
}

/** Core hata sonucunu form durumuna çevirir. */
function toAuthState(error: { message: string; fieldErrors?: Record<string, string> }): AuthState {
  return { error: error.message, fieldErrors: error.fieldErrors };
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const res = await coreAuth.authenticate({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!res.ok) return toAuthState(res.error);

  await createSession(res.value.id);
  redirect(safeNext(formData.get("next")));
}

/** Demo hesabıyla hızlı giriş. */
export async function demoLoginAction(formData: FormData): Promise<void> {
  const row = await getUserRowByEmail("demo@kiralamadunyasi.com");
  if (row) await createSession(row.id);
  redirect(safeNext(formData.get("next")));
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const res = await coreAuth.registerUser({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    phone: (formData.get("phone") as string) || undefined,
    city: String(formData.get("city") ?? ""),
    type: (formData.get("type") as "bireysel" | "kurumsal") ?? "bireysel",
    companyName: (formData.get("companyName") as string) || undefined,
  });
  if (!res.ok) return toAuthState(res.error);

  await createSession(res.value.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await verifySession();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    city: formData.get("city"),
    companyName: formData.get("companyName") || undefined,
  });
  if (!parsed.success) {
    return {
      error: "Lütfen işaretli alanları düzeltin.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const res = await updateProfile(user, parsed.data);
  if (!res.ok) return toAuthState(res.error);

  revalidatePath("/hesap/profil");
  return { success: true };
}

// ───────── Şifre sıfırlama ─────────

/** Sıfırlama linkinin mutlak adresi — proxy arkasında da doğru host'u kullanır. */
async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const forgotFormSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
});

/**
 * Şifre sıfırlama talebi. Hesabın var olup olmadığından BAĞIMSIZ olarak aynı
 * mesajı döner (kullanıcı sayımı/enumeration sızdırmamak için).
 */
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = forgotFormSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      error: "Lütfen işaretli alanları düzeltin.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const res = await coreAuth.sendPasswordResetFor(parsed.data.email, await siteOrigin());
  if (!res.ok) return toAuthState(res.error);
  return { success: true, message: res.value.message };
}

const resetSchema = z
  .object({
    token: z.string().min(1, "Geçersiz bağlantı."),
    password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
    passwordConfirm: z.string().min(1, "Şifreyi tekrar girin."),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Şifreler eşleşmiyor.",
    path: ["passwordConfirm"],
  });

/**
 * Token'ı doğrular, şifreyi günceller, token'ı mühürler ve kullanıcının
 * TÜM oturumlarını kapatır (çalınmış oturum kalmasın).
 *
 * Oturum içi şifre değiştirmeden (core/account.changePassword) kasıtlı olarak
 * farklıdır: orası mevcut cihazı ayakta bırakır, çünkü kullanıcı eski şifreyi
 * zaten biliyordur. Burası ise olası bir ele geçirme senaryosudur.
 */
export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return {
      error: "Lütfen işaretli alanları düzeltin.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const tokenRow = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, hashToken(parsed.data.token)),
      gt(passwordResetTokens.expiresAt, new Date()),
      isNull(passwordResetTokens.usedAt),
    ),
  });
  if (!tokenRow) {
    return {
      error: "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir sıfırlama talebi oluşturun.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, tokenRow.userId));

  await Promise.all([
    db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenRow.id)),
    db.delete(sessions).where(eq(sessions.userId, tokenRow.userId)),
  ]);

  redirect("/giris?sifirlandi=1");
}

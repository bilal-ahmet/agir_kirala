"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { passwordResetTokens, sessions, users } from "../db/schema";
import { getUserRowByEmail } from "../db/queries/users";
import { PROVINCE_NAMES } from "../locations";
import { sendPasswordResetEmail } from "../email";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, hashToken, verifySession } from "./session";

export interface AuthState {
  /** Forma ait genel hata (ör. "E-posta veya şifre hatalı"). */
  error?: string;
  /** Alan adı → hata mesajı. Tüm doğrulama hataları birlikte döner. */
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** Bilgi amaçlı başarı mesajı (şifre sıfırlama talebi vb.). */
  message?: string;
}

/**
 * Zod hatalarının TAMAMINI alan bazında toplar.
 * Eskiden yalnızca issues[0] dönüyordu; kullanıcı her hata için ayrı ayrı
 * sunucuya gidip geliyordu.
 */
function collectFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** next parametresini güvenli (yalnızca site-içi göreli yol) hale getirir. */
function safeNext(raw: FormDataEntryValue | null): string {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/hesap";
}

const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifrenizi girin."),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Lütfen aşağıdaki alanları düzeltin.", fieldErrors: collectFieldErrors(parsed.error) };
  }

  const row = await getUserRowByEmail(parsed.data.email);
  if (!row || !(await verifyPassword(parsed.data.password, row.passwordHash))) {
    return { error: "E-posta veya şifre hatalı." };
  }

  await createSession(row.id);
  redirect(safeNext(formData.get("next")));
}

/** Demo hesabıyla hızlı giriş. */
export async function demoLoginAction(formData: FormData): Promise<void> {
  const row = await getUserRowByEmail("demo@kiralamadunyasi.com");
  if (row) await createSession(row.id);
  redirect(safeNext(formData.get("next")));
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Ad soyad girin (en az 2 karakter)."),
    email: z.string().trim().email("Geçerli bir e-posta girin."),
    password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
    // Telefon isteğe bağlı: paylaşmak istemeyenler ilanlarında yalnızca
    // site içi mesajla iletişim kurabilir (bkz. contactPreference).
    phone: z.string().trim().optional(),
    city: z.enum(PROVINCE_NAMES as [string, ...string[]], { message: "Şehir seçin." }),
    type: z.enum(["bireysel", "kurumsal"]),
    companyName: z.string().trim().optional(),
  })
  .refine((d) => d.type !== "kurumsal" || (d.companyName && d.companyName.length > 1), {
    message: "Firma adı girin.",
    path: ["companyName"],
  });

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
    city: formData.get("city"),
    type: formData.get("type"),
    companyName: formData.get("companyName") || undefined,
  });
  if (!parsed.success) {
    return {
      error: "Lütfen işaretli alanları düzeltin.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const existing = await getUserRowByEmail(d.email);
  if (existing) {
    return {
      error: "Lütfen işaretli alanları düzeltin.",
      fieldErrors: { email: "Bu e-posta zaten kayıtlı." },
    };
  }

  const [created] = await db
    .insert(users)
    .values({
      name: d.name,
      email: d.email.toLowerCase(),
      passwordHash: await hashPassword(d.password),
      type: d.type,
      companyName: d.type === "kurumsal" ? d.companyName : null,
      phone: d.phone ?? "",
      city: d.city,
      accent: "#f5b100",
    })
    .returning({ id: users.id });

  await createSession(created.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad girin."),
  phone: z.string().trim().optional(),
  city: z.enum(PROVINCE_NAMES as [string, ...string[]], { message: "Şehir seçin." }),
  companyName: z.string().trim().optional(),
});

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
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone ?? "",
      city: parsed.data.city,
      companyName: user.type === "kurumsal" ? (parsed.data.companyName ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/hesap/profil");
  return { success: true };
}

// ───────── Şifre sıfırlama ─────────

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 saat

/** Sıfırlama linkinin mutlak adresi — proxy arkasında da doğru host'u kullanır. */
async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const forgotSchema = z.object({
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
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      error: "Lütfen işaretli alanları düzeltin.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const genericSuccess: AuthState = {
    success: true,
    message:
      "E-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.",
  };

  const row = await getUserRowByEmail(parsed.data.email);
  if (!row) return genericSuccess;

  // Süresi geçmiş token'ları temizle ve yenisini üret.
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));

  const token = randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    userId: row.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  const url = `${await siteOrigin()}/sifre-sifirla?token=${token}`;
  try {
    await sendPasswordResetEmail(row.email, url);
  } catch (e) {
    console.error("Şifre sıfırlama e-postası gönderilemedi:", e);
    return { error: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin." };
  }

  return genericSuccess;
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
      fieldErrors: collectFieldErrors(parsed.error),
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

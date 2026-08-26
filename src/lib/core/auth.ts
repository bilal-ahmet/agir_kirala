import "server-only";

import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "../db";
import { passwordResetTokens, users } from "../db/schema";
import { getUserRowByEmail } from "../db/queries/users";
import { hashPassword, verifyPassword } from "../auth/password";
import { hashToken } from "../auth/token";
import { sendPasswordResetEmail } from "../email";
import { toUser } from "../db/queries/mappers";
import type { User } from "../types";
import { collectFieldErrors, fail, ok, type Result } from "./errors";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "./schemas";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 saat

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "E-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.";

/** Kimlik doğrulama. Hesap anonimleştirilmişse giriş imkânsızdır. */
export async function authenticate(input: LoginInput): Promise<Result<User>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "validation",
      "Lütfen aşağıdaki alanları düzeltin.",
      collectFieldErrors(parsed.error.issues),
    );
  }

  const row = await getUserRowByEmail(parsed.data.email);
  if (!row || row.deletedAt || !(await verifyPassword(parsed.data.password, row.passwordHash))) {
    return fail("unauthorized", "E-posta veya şifre hatalı.");
  }
  return ok(toUser(row));
}

export async function registerUser(input: RegisterInput): Promise<Result<User>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "validation",
      "Lütfen işaretli alanları düzeltin.",
      collectFieldErrors(parsed.error.issues),
    );
  }
  const d = parsed.data;

  const existing = await getUserRowByEmail(d.email);
  if (existing) {
    return fail("conflict", "Lütfen işaretli alanları düzeltin.", {
      email: "Bu e-posta zaten kayıtlı.",
    });
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
    .returning();

  return ok(toUser(created));
}

/**
 * Şifre sıfırlama talebi. Hesabın var olup olmadığından BAĞIMSIZ olarak aynı
 * sonucu döner (kullanıcı sayımı/enumeration sızdırmamak için).
 */
export async function sendPasswordResetFor(
  email: string,
  origin: string,
): Promise<Result<{ message: string }>> {
  const row = await getUserRowByEmail(email);
  if (!row || row.deletedAt) return ok({ message: PASSWORD_RESET_GENERIC_MESSAGE });

  // Süresi geçmiş token'ları temizle ve yenisini üret.
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));

  const token = randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    userId: row.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  try {
    await sendPasswordResetEmail(row.email, `${origin}/sifre-sifirla?token=${token}`);
  } catch (e) {
    console.error("Şifre sıfırlama e-postası gönderilemedi:", e);
    return fail("internal", "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.");
  }

  return ok({ message: PASSWORD_RESET_GENERIC_MESSAGE });
}

/** Kullanıcı id'sinden domain tipi (oturum kurulduktan sonra yanıt gövdesi için). */
export async function getUserById(id: string): Promise<User | undefined> {
  const row = await db.query.users.findFirst({ where: eq(users.id, id) });
  return row ? toUser(row) : undefined;
}

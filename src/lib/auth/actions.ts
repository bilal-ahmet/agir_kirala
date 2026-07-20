"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { getUserRowByEmail } from "../db/queries/users";
import { PROVINCE_NAMES } from "../locations";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, verifySession } from "./session";

export interface AuthState {
  error?: string;
  success?: boolean;
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
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş." };
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
    name: z.string().trim().min(2, "Ad soyad girin."),
    email: z.string().trim().email("Geçerli bir e-posta girin."),
    password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
    phone: z.string().trim().min(1, "Telefon girin."),
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
    phone: formData.get("phone"),
    city: formData.get("city"),
    type: formData.get("type"),
    companyName: formData.get("companyName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz kayıt bilgisi." };
  }
  const d = parsed.data;

  const existing = await getUserRowByEmail(d.email);
  if (existing) return { error: "Bu e-posta zaten kayıtlı." };

  const [created] = await db
    .insert(users)
    .values({
      name: d.name,
      email: d.email.toLowerCase(),
      passwordHash: await hashPassword(d.password),
      type: d.type,
      companyName: d.type === "kurumsal" ? d.companyName : null,
      phone: d.phone,
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
  phone: z.string().trim().min(1, "Telefon girin."),
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
    phone: formData.get("phone"),
    city: formData.get("city"),
    companyName: formData.get("companyName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz profil bilgisi." };
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
      city: parsed.data.city,
      companyName: user.type === "kurumsal" ? (parsed.data.companyName ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/hesap/profil");
  return { success: true };
}

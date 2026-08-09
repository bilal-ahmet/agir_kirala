"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field, PasswordInput } from "@/components/ui/Field";

export function ResetPasswordForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(resetPasswordAction, {});
  const fieldErrors = state.fieldErrors ?? {};

  if (!token) {
    return (
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Geçersiz Bağlantı</h1>
        <p className="mt-2 text-sm text-muted">
          Şifre sıfırlama bağlantısı eksik veya bozuk. Lütfen yeni bir talep oluşturun.
        </p>
        <Link
          href="/sifremi-unuttum"
          className="mt-4 inline-block font-semibold text-accent hover:underline"
        >
          Yeni bağlantı iste →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Yeni Şifre Belirle</h1>
        <p className="mt-1 text-sm text-muted">
          Yeni şifrenizi girin. Kaydettiğinizde açık olan tüm oturumlarınız kapatılır.
        </p>
      </div>

      <p className="mb-3 text-xs text-faint">
        <span className="font-semibold text-danger">*</span> işaretli alanlar zorunludur.
      </p>

      <form action={formAction} className="space-y-3" noValidate>
        <input type="hidden" name="token" value={token} />

        <Field label="Yeni Şifre" required hint="En az 6 karakter." error={fieldErrors.password}>
          <PasswordInput
            name="password"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.password}
          />
        </Field>

        <Field label="Yeni Şifre (Tekrar)" required error={fieldErrors.passwordConfirm}>
          <PasswordInput
            name="passwordConfirm"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.passwordConfirm}
          />
        </Field>

        {state.error && (
          <p
            role="alert"
            className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Şifremi Güncelle"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/giris" className="font-semibold text-accent hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}

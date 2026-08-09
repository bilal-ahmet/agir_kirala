"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestPasswordResetAction,
    {},
  );
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Şifremi Unuttum</h1>
        <p className="mt-1 text-sm text-muted">
          Kayıtlı e-posta adresinizi girin, size yeni şifre belirleme bağlantısı gönderelim.
        </p>
      </div>

      {state.success ? (
        <div
          role="status"
          className="rounded-lg border border-success/40 bg-success-soft px-4 py-3 text-sm text-success"
        >
          {state.message}
        </div>
      ) : (
        <form action={formAction} className="space-y-3" noValidate>
          <Field label="E-posta" required error={fieldErrors.email}>
            <Input
              type="email"
              name="email"
              placeholder="ornek@eposta.com"
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
            />
          </Field>

          {state.error && !state.fieldErrors && (
            <p
              role="alert"
              className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger"
            >
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Gönderiliyor…" : "Sıfırlama Bağlantısı Gönder"}
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        Şifreni hatırladın mı?{" "}
        <Link href="/giris" className="font-semibold text-accent hover:underline">
          Giriş Yap
        </Link>
      </p>
    </div>
  );
}

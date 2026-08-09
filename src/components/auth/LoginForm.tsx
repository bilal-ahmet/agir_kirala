"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { demoLoginAction, loginAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function LoginForm() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/hesap";
  const justReset = sp.get("sifirlandi") === "1";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginAction, {});
  const fieldErrors = state.fieldErrors ?? {};
  // Şifre hatalıysa "Şifremi unuttum" bağlantısını öne çıkar.
  const credentialsFailed = !!state.error && !state.fieldErrors;

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Giriş Yap</h1>
        <p className="mt-1 text-sm text-muted">Hesabınla hem kirala hem kiraya ver.</p>
      </div>

      {justReset && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-success/40 bg-success-soft px-4 py-3 text-sm text-success"
        >
          Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
        </p>
      )}

      <form action={demoLoginAction}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="mb-4 w-full rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-left text-sm transition-colors hover:border-accent/50"
        >
          <span className="font-semibold text-accent">⚡ Demo hesabıyla gir</span>
          <span className="mt-0.5 block text-xs text-muted">
            Yılmaz İş Makineleri — dolu ilan, talep ve mesajları incele.
          </span>
        </button>
      </form>

      <div className="mb-4 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" /> veya e-posta ile <span className="h-px flex-1 bg-line" />
      </div>

      <form action={formAction} className="space-y-3" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field label="E-posta" required error={fieldErrors.email}>
          <Input
            type="email"
            name="email"
            placeholder="ornek@eposta.com"
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
          />
        </Field>
        <Field label="Şifre" required error={fieldErrors.password}>
          <PasswordInput
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!fieldErrors.password}
          />
        </Field>

        {state.error && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            <p>{state.error}</p>
            {credentialsFailed && (
              <p className="mt-1.5">
                <Link
                  href="/sifremi-unuttum"
                  className="font-semibold underline underline-offset-2"
                >
                  Şifremi unuttum — yeni şifre belirle
                </Link>
              </p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
        </Button>
      </form>

      <p className={cn("mt-4 text-center text-sm", credentialsFailed ? "hidden" : "text-muted")}>
        <Link href="/sifremi-unuttum" className="font-medium text-accent hover:underline">
          Şifremi unuttum
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-muted">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-accent hover:underline">Kayıt Ol</Link>
      </p>
    </div>
  );
}

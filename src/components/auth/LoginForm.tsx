"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { demoLoginAction, loginAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function LoginForm() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/hesap";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Giriş Yap</h1>
        <p className="mt-1 text-sm text-muted">Hesabınla hem kirala hem kiraya ver.</p>
      </div>

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

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <Field label="E-posta">
          <Input type="email" name="email" placeholder="ornek@eposta.com" autoComplete="email" required />
        </Field>
        <Field label="Şifre">
          <Input type="password" name="password" placeholder="••••••••" autoComplete="current-password" required />
        </Field>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          Giriş Yap
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-accent hover:underline">Kayıt Ol</Link>
      </p>
    </div>
  );
}

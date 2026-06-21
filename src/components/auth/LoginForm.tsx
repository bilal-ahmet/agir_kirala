"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { DEMO_USER_ID, USERS } from "@/lib/data/users";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

const demo = USERS.find((u) => u.id === DEMO_USER_ID)!;

export function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/hesap";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("E-posta adresinizi girin.");
    login(email);
    router.replace(next);
  };

  const useDemo = () => {
    login(demo.email);
    router.replace(next);
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Giriş Yap</h1>
        <p className="mt-1 text-sm text-muted">Hesabınla hem kirala hem kiraya ver.</p>
      </div>

      <button
        onClick={useDemo}
        className="mb-4 w-full rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-left text-sm transition-colors hover:border-accent/50"
      >
        <span className="font-semibold text-accent">⚡ Demo hesabıyla gir</span>
        <span className="mt-0.5 block text-xs text-muted">
          {demo.name} — dolu ilan, talep ve mesajları incele.
        </span>
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" /> veya e-posta ile <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Field label="E-posta">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Şifre">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" size="lg">Giriş Yap</Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-accent hover:underline">Kayıt Ol</Link>
      </p>
    </div>
  );
}

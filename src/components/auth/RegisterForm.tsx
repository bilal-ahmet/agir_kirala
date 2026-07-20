"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { registerAction, type AuthState } from "@/lib/auth/actions";
import type { OwnerType } from "@/lib/types";
import { PROVINCE_NAMES } from "@/lib/locations";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function RegisterForm() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/hesap";
  const [type, setType] = useState<OwnerType>("bireysel");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(registerAction, {});

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Kayıt Ol</h1>
        <p className="mt-1 text-sm text-muted">Tek hesap — hem kirala hem kiraya ver.</p>
      </div>

      {/* Hesap tipi */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(["bireysel", "kurumsal"] as OwnerType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-lg border px-4 py-3 text-sm font-semibold capitalize transition-colors",
              type === t ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-fg",
            )}
          >
            {t === "bireysel" ? "Bireysel" : "Kurumsal"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="type" value={type} />

        <Field label={type === "kurumsal" ? "Yetkili Ad Soyad" : "Ad Soyad"}>
          <Input name="name" placeholder="Ad Soyad" required />
        </Field>

        {type === "kurumsal" && (
          <Field label="Firma Adı">
            <Input name="companyName" placeholder="Firma Ünvanı" required />
          </Field>
        )}

        <Field label="E-posta">
          <Input type="email" name="email" placeholder="ornek@eposta.com" required />
        </Field>

        <Field label="Şifre" hint="En az 6 karakter.">
          <Input type="password" name="password" placeholder="••••••••" autoComplete="new-password" required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefon">
            <Input name="phone" placeholder="05XX XXX XX XX" required />
          </Field>
          <Field label="Şehir">
            <Select name="city" defaultValue="">
              <option value="">Seçin</option>
              {PROVINCE_NAMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          Hesap Oluştur
        </Button>
        <p className="text-center text-xs text-faint">
          Kayıt olarak Kullanım Şartları ve Gizlilik Politikası&apos;nı kabul etmiş olursunuz.
        </p>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Zaten hesabın var mı?{" "}
        <Link href="/giris" className="font-semibold text-accent hover:underline">Giriş Yap</Link>
      </p>
    </div>
  );
}

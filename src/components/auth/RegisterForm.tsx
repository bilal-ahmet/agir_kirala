"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { registerAction, type AuthState } from "@/lib/auth/actions";
import type { OwnerType } from "@/lib/types";
import { PROVINCE_NAMES } from "@/lib/locations";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function RegisterForm() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/hesap";
  const [type, setType] = useState<OwnerType>("bireysel");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(registerAction, {});
  const fieldErrors = state.fieldErrors ?? {};
  const errorList = Object.values(fieldErrors);

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

      <p className="mb-3 text-xs text-faint">
        <span className="font-semibold text-danger">*</span> işaretli alanlar zorunludur.
      </p>

      {/* Tüm doğrulama hataları tek seferde, birlikte. */}
      {errorList.length > 0 && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger"
        >
          <p className="font-semibold">Lütfen aşağıdaki {errorList.length} alanı düzeltin:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errorList.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      {state.error && errorList.length === 0 && (
        <p role="alert" className="mb-3 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      {/*
        noValidate: tarayıcının yerleşik doğrulaması ilk hatalı alanda durup
        "lütfen bu alanı doldurun" gösteriyordu. Doğrulama sunucuda yapılır ve
        TÜM hatalar birlikte döner.
      */}
      <form action={formAction} className="space-y-3" noValidate>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="type" value={type} />

        <Field
          label={type === "kurumsal" ? "Yetkili Ad Soyad" : "Ad Soyad"}
          required
          error={fieldErrors.name}
        >
          <Input name="name" placeholder="Ad Soyad" aria-invalid={!!fieldErrors.name} />
        </Field>

        {type === "kurumsal" && (
          <Field label="Firma Adı" required error={fieldErrors.companyName}>
            <Input
              name="companyName"
              placeholder="Firma Ünvanı"
              aria-invalid={!!fieldErrors.companyName}
            />
          </Field>
        )}

        <Field label="E-posta" required error={fieldErrors.email}>
          <Input
            type="email"
            name="email"
            placeholder="ornek@eposta.com"
            aria-invalid={!!fieldErrors.email}
          />
        </Field>

        <Field label="Şifre" required hint="En az 6 karakter." error={fieldErrors.password}>
          <PasswordInput
            name="password"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.password}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Telefon"
            hint="İsteğe bağlı."
            error={fieldErrors.phone}
          >
            <Input
              name="phone"
              placeholder="05XX XXX XX XX"
              aria-invalid={!!fieldErrors.phone}
            />
          </Field>
          <Field label="Şehir" required error={fieldErrors.city}>
            <Select name="city" defaultValue="" aria-invalid={!!fieldErrors.city}>
              <option value="">Seçiniz</option>
              {PROVINCE_NAMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>

        <p className="text-xs text-faint">
          Telefonunuzu girmeseniz de kayıt olabilirsiniz; bu durumda ilanlarınızda yalnızca
          site üzerinden mesajla iletişim kurulur.
        </p>

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Hesap oluşturuluyor…" : "Hesap Oluştur"}
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

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import type { OwnerType } from "@/lib/types";
import { PROVINCE_NAMES } from "@/lib/locations";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function RegisterForm() {
  const { register, user, ready } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/hesap";

  const [type, setType] = useState<OwnerType>("bireysel");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !city) {
      return setError("Lütfen zorunlu alanları doldurun.");
    }
    register({ name, email, phone, city, type, companyName });
    router.replace(next);
  };

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

      <form onSubmit={submit} className="space-y-3">
        <Field label={type === "kurumsal" ? "Yetkili Ad Soyad" : "Ad Soyad"}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad Soyad" />
        </Field>

        {type === "kurumsal" && (
          <Field label="Firma Adı">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Firma Ünvanı" />
          </Field>
        )}

        <Field label="E-posta">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefon">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX XXX XX XX" />
          </Field>
          <Field label="Şehir">
            <Select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Seçin</option>
              {PROVINCE_NAMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" size="lg">Hesap Oluştur</Button>
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

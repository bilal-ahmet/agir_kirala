"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import type { OwnerType } from "@/lib/types";
import { PROVINCE_NAMES } from "@/lib/locations";
import { formatMonthYear } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { OWNER_TYPE_LABELS } from "@/lib/constants";
import { CheckIcon, ShieldCheckIcon } from "@/components/ui/icons";

export default function ProfilPage() {
  const { user, updateProfile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(() => ({
    name: user?.name ?? "",
    companyName: user?.companyName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    city: user?.city ?? "",
    type: (user?.type ?? "bireysel") as OwnerType,
  }));

  if (!user) return null;

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: form.name,
      companyName: form.type === "kurumsal" ? form.companyName : undefined,
      email: form.email,
      phone: form.phone,
      city: form.city,
      type: form.type,
    });
    setSaved(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">Profil</h1>
        <p className="text-muted">Hesap bilgilerini güncelle.</p>
      </div>

      <div className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
        <Avatar name={form.name || user.name} accent={user.accent} size={56} />
        <div>
          <p className="font-bold">{form.name || user.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={form.type === "kurumsal" ? "info" : "neutral"}>
              {OWNER_TYPE_LABELS[form.type]}
            </Badge>
            {user.verified ? (
              <Badge tone="success" icon={<ShieldCheckIcon size={12} />}>Doğrulanmış</Badge>
            ) : (
              <Badge tone="warning">Doğrulanmamış</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-faint">Üyelik: {formatMonthYear(user.memberSince)}</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <div className="grid grid-cols-2 gap-2">
          {(["bireysel", "kurumsal"] as OwnerType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set({ type: t })}
              className={
                "rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors " +
                (form.type === t ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-fg")
              }
            >
              {OWNER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <Field label={form.type === "kurumsal" ? "Yetkili Ad Soyad" : "Ad Soyad"}>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>

        {form.type === "kurumsal" && (
          <Field label="Firma Adı">
            <Input value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} />
          </Field>
        )}

        <Field label="E-posta">
          <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefon">
            <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="05XX XXX XX XX" />
          </Field>
          <Field label="Şehir">
            <Select value={form.city} onChange={(e) => set({ city: e.target.value })}>
              <option value="">Seçin</option>
              {PROVINCE_NAMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit">Değişiklikleri Kaydet</Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-success">
              <CheckIcon size={16} /> Kaydedildi
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

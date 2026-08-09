"use client";

import { useActionState } from "react";
import { useAuth } from "@/context/auth-context";
import { updateProfileAction, type AuthState } from "@/lib/auth/actions";
import { PROVINCE_NAMES } from "@/lib/locations";
import { formatMonthYear } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { OWNER_TYPE_LABELS } from "@/lib/constants";
import { CheckIcon } from "@/components/ui/icons";

export default function ProfilPage() {
  const { user } = useAuth();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(updateProfileAction, {});

  if (!user) return null;
  const saved = !pending && state.success === true;
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">Profil</h1>
        <p className="text-muted">Hesap bilgilerini güncelle.</p>
      </div>

      <div className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
        <Avatar name={user.name} accent={user.accent} size={56} />
        <div>
          <p className="font-bold">{user.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={user.type === "kurumsal" ? "info" : "neutral"}>
              {OWNER_TYPE_LABELS[user.type]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-faint">Üyelik: {formatMonthYear(user.memberSince)}</p>
        </div>
      </div>

      <form action={formAction} className="space-y-4 rounded-lg border border-line bg-surface p-5" noValidate>
        <p className="text-xs text-faint">
          <span className="font-semibold text-danger">*</span> işaretli alanlar zorunludur.
        </p>

        <Field
          label={user.type === "kurumsal" ? "Yetkili Ad Soyad" : "Ad Soyad"}
          required
          error={fieldErrors.name}
        >
          <Input name="name" defaultValue={user.name} aria-invalid={!!fieldErrors.name} />
        </Field>

        {user.type === "kurumsal" && (
          <Field label="Firma Adı" error={fieldErrors.companyName}>
            <Input
              name="companyName"
              defaultValue={user.companyName ?? ""}
              aria-invalid={!!fieldErrors.companyName}
            />
          </Field>
        )}

        <Field label="E-posta" hint="E-posta değiştirilemez.">
          <Input type="email" value={user.email} disabled />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Telefon"
            hint="Boş bırakırsanız ilanlarınızda telefon/WhatsApp gösterilmez."
            error={fieldErrors.phone}
          >
            <Input
              name="phone"
              defaultValue={user.phone}
              placeholder="05XX XXX XX XX"
              aria-invalid={!!fieldErrors.phone}
            />
          </Field>
          <Field label="Şehir" required error={fieldErrors.city}>
            <Select name="city" defaultValue={user.city} aria-invalid={!!fieldErrors.city}>
              <option value="">Seçiniz</option>
              {PROVINCE_NAMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>Değişiklikleri Kaydet</Button>
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

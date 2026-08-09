"use client";

import { useState } from "react";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const controlBase =
  "w-full rounded-md border border-line bg-surface-2 text-fg placeholder:text-faint transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50";

/** Hatalı alanların kenarlığı (aria-invalid ile birlikte). */
const controlInvalid =
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:border-danger aria-[invalid=true]:focus:ring-danger";

export function Label({
  className,
  required,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-muted", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-danger" title="Zorunlu alan" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn(controlBase, controlInvalid, "h-11 px-3.5 text-sm", className)} {...props} />
  );
}

/** Şifre alanı — sağında göster/gizle (göz) düğmesiyle. */
export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        aria-pressed={visible}
        title={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-faint transition-colors hover:text-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlBase, controlInvalid, "min-h-24 px-3.5 py-2.5 text-sm", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, controlInvalid, "h-11 px-3 text-sm", className)} {...props}>
      {children}
    </select>
  );
}

interface FieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  /** Sunucudan dönen alan hatası — kontrolün altında kırmızı gösterilir. */
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Etiket + kontrol + ipucu/hata sarmalayıcı */
export function Field({ label, htmlFor, hint, required, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-faint">{hint}</p>
      )}
    </div>
  );
}

import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const controlBase =
  "w-full rounded-md border border-line bg-surface-2 text-fg placeholder:text-faint transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-muted", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, "h-11 px-3.5 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(controlBase, "min-h-24 px-3.5 py-2.5 text-sm", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "h-11 px-3 text-sm", className)} {...props}>
      {children}
    </select>
  );
}

interface FieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Etiket + kontrol + ipucu sarmalayıcı */
export function Field({ label, htmlFor, hint, children, className }: FieldProps) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

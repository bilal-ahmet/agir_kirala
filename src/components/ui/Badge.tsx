import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "info" | "danger" | "warning";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent/30",
  success: "bg-success-soft text-success border-success/30",
  info: "bg-info-soft text-info border-info/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  warning: "bg-accent-soft text-warning border-warning/30",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  icon?: ReactNode;
}

export function Badge({ children, tone = "neutral", className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold leading-tight",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

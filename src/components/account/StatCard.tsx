import Link from "next/link";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  accent?: boolean;
}

export function StatCard({ label, value, icon, href, accent }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-line bg-surface p-4 transition-colors",
        href && "hover:border-line-strong",
      )}
    >
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-lg",
          accent ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted",
        )}
      >
        {icon}
      </span>
      <div>
        <p className="text-2xl font-extrabold leading-none">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

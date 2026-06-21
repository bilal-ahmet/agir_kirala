import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-fg shadow-sm">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 17h4l2-5h6l3 5h2" />
          <path d="M9 12V7h4l3 5" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="18" cy="18" r="1.6" />
        </svg>
      </span>
      <span className="text-lg font-extrabold uppercase leading-none tracking-tight">
        <span className="text-fg">AĞIR</span>
        <span className="text-accent">KİRALA</span>
      </span>
    </Link>
  );
}

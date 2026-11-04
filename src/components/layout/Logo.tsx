import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      {/* Simge kendi yuvarlak köşeli zeminiyle geliyor (public/logo.png, 512×512).
          Yanındaki yazı bağlantının adı olduğu için görsel dekoratif (alt=""). */}
      <Image
        src="/logo.png"
        alt=""
        width={36}
        height={36}
        loading="eager"
        className="h-9 w-9 shrink-0 drop-shadow-sm"
      />
      {/* leading-tight: "AĞIR"daki Ğ şapkası leading-none ile kırpılıyordu. */}
      <span className="text-lg font-extrabold uppercase leading-tight tracking-tight">
        <span className="text-fg">AĞIR</span>
        <span className="text-accent">KİRALA</span>
      </span>
    </Link>
  );
}

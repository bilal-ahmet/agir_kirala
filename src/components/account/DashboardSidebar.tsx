"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useFavorites } from "@/context/favorites-context";
import { useStored } from "./useStored";
import { conversationsFor, incomingRequests } from "@/lib/storage";
import {
  ClockIcon,
  HeartIcon,
  InboxIcon,
  ListIcon,
  MessageIcon,
  PlusIcon,
  UserIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function DashboardSidebar() {
  const { user } = useAuth();
  const { count: favCount } = useFavorites();
  const pathname = usePathname();
  const userId = user?.id ?? "";

  const incoming = useStored(() => (userId ? incomingRequests(userId) : []));
  const convos = useStored(() => (userId ? conversationsFor(userId) : []));
  const pendingIncoming = incoming.filter((r) => r.status === "beklemede").length;

  const items = [
    { href: "/hesap", label: "Genel Bakış", icon: <UserIcon size={18} />, exact: true },
    { href: "/hesap/ilanlarim", label: "İlanlarım", icon: <ListIcon size={18} /> },
    { href: "/hesap/gelen-talepler", label: "Gelen Talepler", icon: <InboxIcon size={18} />, badge: pendingIncoming },
    { href: "/hesap/taleplerim", label: "Taleplerim", icon: <ClockIcon size={18} /> },
    { href: "/hesap/mesajlar", label: "Mesajlar", icon: <MessageIcon size={18} />, badge: convos.length },
    { href: "/hesap/favorilerim", label: "Favorilerim", icon: <HeartIcon size={18} />, badge: favCount },
    { href: "/hesap/profil", label: "Profil", icon: <UserIcon size={18} /> },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
      <Link
        href="/hesap/ilan-ekle"
        className={cn(
          "mb-1 hidden items-center gap-2 rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg hover:bg-accent-hover lg:flex",
        )}
      >
        <PlusIcon size={18} /> Yeni İlan Ver
      </Link>

      {items.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-surface-3 text-fg"
                : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <span className={active ? "text-accent" : ""}>{item.icon}</span>
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-fg">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/context/auth-context";
import { useFavorites } from "@/context/favorites-context";
import { CATEGORIES } from "@/lib/categories";
import { buttonClasses } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  ChevronDownIcon,
  HeartIcon,
  ListIcon,
  LogoutIcon,
  MenuIcon,
  MessageIcon,
  PlusIcon,
  UserIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function Header() {
  const { user, ready, logout } = useAuth();
  const { count, ready: favReady } = useFavorites();
  const [openMenu, setOpenMenu] = useState<"kategori" | "user" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4" ref={ref}>
        <Logo />

        {/* Masaüstü gezinme */}
        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          <div className="relative">
            <button
              onClick={() => setOpenMenu((m) => (m === "kategori" ? null : "kategori"))}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
            >
              Kategoriler
              <ChevronDownIcon size={16} className={cn("transition-transform", openMenu === "kategori" && "rotate-180")} />
            </button>
            {openMenu === "kategori" && (
              <div className="absolute left-0 top-full mt-2 grid w-[32rem] grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-3 shadow-2xl">
                {CATEGORIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/ilanlar?kategori=${c.slug}`}
                    onClick={() => setOpenMenu(null)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-surface-2"
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <span>
                      <span className="block text-sm font-semibold text-fg">{c.name}</span>
                      <span className="block text-xs text-faint">{c.tagline}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/ilanlar" className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg">
            Tüm İlanlar
          </Link>
          <Link href="/#nasil-calisir" className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg">
            Nasıl Çalışır?
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link
            href="/hesap/favorilerim"
            className="relative hidden rounded-md p-2.5 text-muted hover:bg-surface-2 hover:text-fg sm:inline-flex"
            aria-label="Favorilerim"
          >
            <HeartIcon />
            {favReady && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg">
                {count}
              </span>
            )}
          </Link>

          <Link href="/hesap/ilan-ekle" className={buttonClasses("accent", "sm", "hidden sm:inline-flex")}>
            <PlusIcon size={16} /> İlan Ver
          </Link>

          {/* Hesap */}
          {ready && user ? (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setOpenMenu((m) => (m === "user" ? null : "user"))}
                className="flex items-center gap-2 rounded-md p-1 pl-2 hover:bg-surface-2"
              >
                <Avatar name={user.name} accent={user.accent} size={32} />
                <ChevronDownIcon size={16} className="text-muted" />
              </button>
              {openMenu === "user" && (
                <div className="absolute right-0 top-full mt-2 w-60 rounded-lg border border-line bg-surface p-1.5 shadow-2xl">
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-faint">{user.email}</p>
                  </div>
                  <MenuLink href="/hesap" icon={<UserIcon size={16} />} onClick={() => setOpenMenu(null)}>
                    Panelim
                  </MenuLink>
                  <MenuLink href="/hesap/ilanlarim" icon={<ListIcon size={16} />} onClick={() => setOpenMenu(null)}>
                    İlanlarım
                  </MenuLink>
                  <MenuLink href="/hesap/mesajlar" icon={<MessageIcon size={16} />} onClick={() => setOpenMenu(null)}>
                    Mesajlar
                  </MenuLink>
                  <button
                    onClick={() => {
                      logout();
                      setOpenMenu(null);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-line px-3 py-2 text-sm text-danger hover:bg-surface-2"
                  >
                    <LogoutIcon size={16} /> Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/giris" className={buttonClasses("outline", "sm", "hidden lg:inline-flex")}>
              Giriş Yap
            </Link>
          )}

          {/* Mobil menü tetikleyici */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2.5 text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
            aria-label="Menü"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
    >
      {icon}
      {children}
    </Link>
  );
}

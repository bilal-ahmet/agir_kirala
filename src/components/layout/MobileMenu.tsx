"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { useAuth } from "@/context/auth-context";
import { useFavorites } from "@/context/favorites-context";
import { CATEGORIES, GROUP_LABELS } from "@/lib/categories";
import type { CategoryGroup } from "@/lib/types";
import { HeartIcon, ListIcon, LogoutIcon, MessageIcon, PlusIcon, UserIcon } from "@/components/ui/icons";

const GROUPS: CategoryGroup[] = ["is-makinesi", "agir-vasita"];

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, ready, logout } = useAuth();
  const { count } = useFavorites();

  return (
    <Sheet open={open} onClose={onClose} title="Menü" side="right">
      <div className="space-y-6">
        {ready && user ? (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-3">
            <Avatar name={user.name} accent={user.accent} size={44} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-faint">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link href="/giris" onClick={onClose} className={buttonClasses("outline", "md")}>
              Giriş Yap
            </Link>
            <Link href="/kayit" onClick={onClose} className={buttonClasses("accent", "md")}>
              Kayıt Ol
            </Link>
          </div>
        )}

        <Link href="/hesap/ilan-ekle" onClick={onClose} className={buttonClasses("accent", "md", "w-full")}>
          <PlusIcon size={18} /> Ücretsiz İlan Ver
        </Link>

        <nav className="space-y-1">
          <MobileLink href="/ilanlar" onClick={onClose} icon={<ListIcon size={18} />}>
            Tüm İlanlar
          </MobileLink>
          <MobileLink href="/hesap/favorilerim" onClick={onClose} icon={<HeartIcon size={18} />}>
            Favorilerim {count > 0 && <span className="text-accent">({count})</span>}
          </MobileLink>
          {user && (
            <>
              <MobileLink href="/hesap" onClick={onClose} icon={<UserIcon size={18} />}>
                Panelim
              </MobileLink>
              <MobileLink href="/hesap/mesajlar" onClick={onClose} icon={<MessageIcon size={18} />}>
                Mesajlar
              </MobileLink>
            </>
          )}
        </nav>

        <div className="space-y-4">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
                {GROUP_LABELS[group]}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.filter((c) => c.group === group).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/ilanlar?kategori=${c.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 py-2 text-sm text-muted hover:text-fg"
                  >
                    <span>{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {user && (
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm text-danger hover:bg-surface-2"
          >
            <LogoutIcon size={18} /> Çıkış Yap
          </button>
        )}
      </div>
    </Sheet>
  );
}

function MobileLink({
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
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
    >
      {icon}
      {children}
    </Link>
  );
}

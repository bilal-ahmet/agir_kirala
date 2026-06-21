"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, GROUP_LABELS } from "@/lib/categories";
import { PROVINCE_NAMES } from "@/lib/locations";
import type { CategoryGroup } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const GROUPS: CategoryGroup[] = ["is-makinesi", "agir-vasita"];

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState("");
  const [il, setIl] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (kategori) params.set("kategori", kategori);
    if (il) params.set("il", il);
    router.push(`/ilanlar${params.toString() ? `?${params}` : ""}`);
  };

  const fieldCls =
    "h-12 w-full bg-transparent px-4 text-sm text-fg placeholder:text-faint focus:outline-none";

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-line bg-surface/95 p-2 shadow-2xl shadow-black/40 backdrop-blur md:flex-row md:items-center md:gap-0",
        className,
      )}
    >
      <div className="flex flex-1 items-center md:border-r md:border-line">
        <SearchIcon size={18} className="ml-2 shrink-0 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ne kiralamak istersiniz? (ör. ekskavatör, vinç)"
          className={fieldCls}
          aria-label="Arama"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:flex md:gap-0">
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          className={cn(fieldCls, "rounded-md border border-line md:rounded-none md:border-0 md:border-r md:border-line md:min-w-44")}
          aria-label="Kategori"
        >
          <option value="">Tüm Kategoriler</option>
          {GROUPS.map((group) => (
            <optgroup key={group} label={GROUP_LABELS[group]}>
              {CATEGORIES.filter((c) => c.group === group).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          value={il}
          onChange={(e) => setIl(e.target.value)}
          className={cn(fieldCls, "rounded-md border border-line md:rounded-none md:border-0 md:min-w-36")}
          aria-label="Şehir"
        >
          <option value="">Tüm Türkiye</option>
          {PROVINCE_NAMES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" size="lg" className="md:ml-2 md:h-12">
        <SearchIcon size={18} /> Ara
      </Button>
    </form>
  );
}

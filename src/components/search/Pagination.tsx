import Link from "next/link";
import { cn } from "@/lib/cn";

type Params = Record<string, string | string[] | undefined>;

function buildHref(params: Params, page: number): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "sayfa" || v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else sp.set(k, v);
  }
  if (page > 1) sp.set("sayfa", String(page));
  const qs = sp.toString();
  return `/ilanlar${qs ? `?${qs}` : ""}`;
}

export function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: Params;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = Math.max(1, end - 4); i <= end; i++) pages.push(i);

  const cellBase =
    "grid h-10 min-w-10 place-items-center rounded-md border px-3 text-sm font-medium transition-colors";

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Sayfalama">
      {page > 1 && (
        <Link href={buildHref(params, page - 1)} className={cn(cellBase, "border-line text-muted hover:text-fg")}>
          ‹ Önceki
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(params, p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            cellBase,
            p === page
              ? "border-accent bg-accent text-accent-fg"
              : "border-line text-muted hover:text-fg",
          )}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={buildHref(params, page + 1)} className={cn(cellBase, "border-line text-muted hover:text-fg")}>
          Sonraki ›
        </Link>
      )}
    </nav>
  );
}

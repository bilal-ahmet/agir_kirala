import { cn } from "@/lib/cn";

/** Yükleme iskeleti bloğu. loading.tsx dosyalarında kullanılır. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

/** İlan kartı iskeleti — ListingCard ile aynı ölçüler (layout shift olmasın). */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-32" />
        <div className="border-t border-line pt-3.5">
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    </div>
  );
}

/** N adet ilan kartı iskeleti — ListingGrid ile aynı grid sınıfları. */
export function ListingGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

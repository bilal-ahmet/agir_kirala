import { ListingGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-6 lg:py-8">
      <Skeleton className="mb-3 h-4 w-56" />
      <div className="mb-5 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <ListingGridSkeleton />
        </div>
      </div>
    </div>
  );
}

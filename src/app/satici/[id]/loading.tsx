import { ListingGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-6 lg:py-8">
      <Skeleton className="mb-4 h-4 w-64" />

      <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
        <div className="flex gap-4">
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <Skeleton className="h-6 w-56" />
        <ListingGridSkeleton count={6} />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-6 lg:py-8">
      <Skeleton className="mb-4 h-4 w-72" />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="aspect-[16/10] w-full rounded-lg" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-24" />
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-64" />
          </div>

          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="mt-8 space-y-3 border-t border-line pt-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>

        <div className="space-y-4 lg:col-span-1">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

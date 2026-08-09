import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-52" />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

import { cn } from "@/lib/cn";
import { StarIcon } from "./icons";

interface RatingProps {
  value: number;
  reviewCount?: number;
  size?: number;
  className?: string;
  showValue?: boolean;
}

export function Rating({ value, reviewCount, size = 14, className, showValue = true }: RatingProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="flex text-accent">
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} size={size} filled={i < Math.round(value)} className={i < Math.round(value) ? "" : "text-line-strong"} />
        ))}
      </span>
      {showValue && (
        <span className="text-sm font-semibold text-fg">{value.toFixed(1)}</span>
      )}
      {reviewCount != null && (
        <span className="text-xs text-faint">({reviewCount})</span>
      )}
    </span>
  );
}

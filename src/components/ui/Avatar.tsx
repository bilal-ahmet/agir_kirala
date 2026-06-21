import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  accent?: string;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toLocaleUpperCase("tr")).join("");
}

export function Avatar({ name, accent = "#f5b100", size = 40, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-bold text-base",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${accent}22`,
        color: accent,
        fontSize: size * 0.4,
        border: `1px solid ${accent}55`,
      }}
    >
      {initials(name)}
    </span>
  );
}

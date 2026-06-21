import { cn } from "@/lib/cn";

// Gerçek fotoğraf yerine tasarlanmış placeholder (demo). İleride next/image ile değiştirilir.
// photoSeed'e göre çelik tonlu gradyan + kategori glifi.

const GRADIENTS: [string, string][] = [
  ["#26303b", "#0d0f12"],
  ["#332b1a", "#0d0c0a"],
  ["#2a2433", "#0e0c12"],
  ["#1f2e2a", "#0a0d0c"],
  ["#30262a", "#100c0d"],
  ["#283041", "#0b0d12"],
];

interface ListingImageProps {
  icon: string;
  label?: string;
  seed?: number;
  className?: string;
  iconSize?: string;
  rounded?: string;
}

export function ListingImage({
  icon,
  label,
  seed = 0,
  className,
  iconSize = "text-6xl",
  rounded = "rounded-t-lg",
}: ListingImageProps) {
  const [from, to] = GRADIENTS[Math.abs(seed) % GRADIENTS.length];

  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden", rounded, className)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div className="bg-grid absolute inset-0 opacity-60" />
      <span className={cn("relative opacity-80 drop-shadow", iconSize)} aria-hidden>
        {icon}
      </span>
      {label && (
        <span className="absolute bottom-2 left-2 rounded bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur">
          {label}
        </span>
      )}
    </div>
  );
}

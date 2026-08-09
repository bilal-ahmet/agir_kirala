import { cn } from "@/lib/cn";
import { storageImageUrl } from "@/lib/image";

// Fotoğraf yoksa tasarlanmış placeholder: photoSeed'e göre çelik tonlu gradyan + grid dokusu.

const GRADIENTS: [string, string][] = [
  ["#26303b", "#0d0f12"],
  ["#332b1a", "#0d0c0a"],
  ["#2a2433", "#0e0c12"],
  ["#1f2e2a", "#0a0d0c"],
  ["#30262a", "#100c0d"],
  ["#283041", "#0b0d12"],
];

interface ListingImageProps {
  label?: string;
  seed?: number;
  /** Gerçek yüklenmiş görsel URL'si (varsa placeholder yerine gösterilir). */
  photoUrl?: string;
  className?: string;
  rounded?: string;
  /** Supabase dönüştürme genişliği (px). Küçük kartlar için orijinali indirmemek adına. */
  width?: number;
  /** İlk ekranda görünen görsel (hero/galeri) için lazy yerine eager. */
  priority?: boolean;
}

export function ListingImage({
  label,
  seed = 0,
  photoUrl,
  className,
  rounded = "rounded-t-lg",
  width,
  priority,
}: ListingImageProps) {
  const [from, to] = GRADIENTS[Math.abs(seed) % GRADIENTS.length];
  const src = storageImageUrl(photoUrl, width);

  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden", rounded, className)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {src ? (
        // Supabase public URL — next/image remotePatterns gerektirmemek için düz img.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label ?? ""}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="bg-grid absolute inset-0 opacity-60" />
      )}
      {label && (
        <span className="absolute bottom-2 left-2 rounded bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur">
          {label}
        </span>
      )}
    </div>
  );
}

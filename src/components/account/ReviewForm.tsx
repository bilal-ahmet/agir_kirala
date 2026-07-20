"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReviewAction } from "@/lib/actions/reviews";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { StarIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Onaylanmış kiralama için ilan sahibine 1–5 puan + yorum bırakma. */
export function ReviewForm({ rentalRequestId }: { rentalRequestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <p className="mt-3 text-sm text-success">Değerlendirmeniz için teşekkürler!</p>;
  }

  if (!open) {
    return (
      <div className="mt-3">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Değerlendir
        </Button>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    if (rating < 1) {
      setError("Lütfen 1–5 arası puan verin.");
      return;
    }
    startTransition(async () => {
      const res = await createReviewAction({ rentalRequestId, rating, comment });
      if (res.error) setError(res.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-3 space-y-2 rounded-md border border-line bg-surface-2 p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} yıldız`}
          >
            <StarIcon size={22} filled={(hover || rating) >= n} className={cn((hover || rating) >= n ? "text-accent" : "text-faint")} />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Deneyiminizi paylaşın (opsiyonel)..."
        rows={2}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>Gönder</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Vazgeç</Button>
      </div>
    </div>
  );
}

"use client";

import {
  createUploadTicketAction,
  registerUploadedMediaAction,
  type MediaKind,
} from "@/lib/actions/uploads";
import { resizeForUpload } from "@/lib/image-resize";

/**
 * Dosyayı imzalı adrese DOĞRUDAN yükler (tarayıcı → Supabase Storage).
 *
 * fetch yerine XMLHttpRequest kullanılıyor: fetch yükleme ilerlemesi bildirmiyor,
 * büyük bir videoda kullanıcıya yüzde göstermek gerekiyor.
 *
 * Gövde biçimi supabase-js'in uploadToSignedUrl'ü ile aynı: Blob gövdeler
 * FormData içinde "cacheControl" + boş adlı alan olarak gönderilir.
 */
function putSignedUrl(
  signedUrl: string,
  body: Blob,
  onProgress?: (oran: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", body);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Depolama sunucusu ${xhr.status} döndü: ${xhr.responseText.slice(0, 200)}`));
    };
    xhr.onerror = () => reject(new Error("Ağ hatası — yükleme tamamlanamadı."));
    xhr.ontimeout = () => reject(new Error("Yükleme zaman aşımına uğradı."));
    xhr.send(form);
  });
}

export interface UploadSonucu {
  url?: string;
  error?: string;
}

/**
 * Tek dosyayı uçtan uca yükler: (foto ise küçült) → bilet al → doğrudan yükle →
 * veritabanına kaydet. Hiçbir aşamada dosya Next sunucusundan geçmez.
 *
 * Fotoğraflarda iki dosya gider: 1600 px orijinal + 400 px küçük boy. Küçültme
 * yapılamazsa (eski tarayıcı) ham dosya yüklenir ve thumbPath gönderilmez —
 * sunucu bunu opsiyonel kabul ettiği için ilan yine kaydedilir.
 */
export async function uploadListingMedia(
  listingId: string,
  kind: MediaKind,
  file: File,
  onProgress?: (oran: number) => void,
): Promise<UploadSonucu> {
  const resized = kind === "photo" ? await resizeForUpload(file) : null;

  const { ticket, error } = await createUploadTicketAction(
    listingId,
    kind,
    file.type,
    resized ? resized.original.size : file.size,
  );
  if (error || !ticket) return { error: error ?? "Yükleme bileti alınamadı." };

  try {
    await putSignedUrl(ticket.original.signedUrl, resized?.original ?? file, onProgress);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Yükleme başarısız." };
  }

  // Küçük boy: başarısız olursa yükleme iptal EDİLMEZ, yalnızca thumbPath
  // gönderilmez. Küçültme bir iyileştirmedir, ön koşul değil.
  let thumbPath: string | undefined;
  if (resized && ticket.thumb) {
    try {
      await putSignedUrl(ticket.thumb.signedUrl, resized.thumb);
      thumbPath = ticket.thumb.path;
    } catch {
      thumbPath = undefined;
    }
  }

  return registerUploadedMediaAction(listingId, kind, ticket.original.path, thumbPath);
}

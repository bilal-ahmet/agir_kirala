"use client";

import {
  createUploadTicketAction,
  registerUploadedMediaAction,
  type MediaKind,
} from "@/lib/actions/uploads";

/**
 * Dosyayı imzalı adrese DOĞRUDAN yükler (tarayıcı → Supabase Storage).
 *
 * fetch yerine XMLHttpRequest kullanılıyor: fetch yükleme ilerlemesi bildirmiyor,
 * 15 MB'lık bir videoda kullanıcıya yüzde göstermek gerekiyor.
 *
 * Gövde biçimi supabase-js'in uploadToSignedUrl'ü ile aynı: Blob gövdeler
 * FormData içinde "cacheControl" + boş adlı alan olarak gönderilir.
 */
function putSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (oran: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);

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
    xhr.send(body);
  });
}

export interface UploadSonucu {
  url?: string;
  error?: string;
}

/**
 * Tek dosyayı uçtan uca yükler: bilet al → doğrudan yükle → veritabanına kaydet.
 * Hiçbir aşamada dosya Next sunucusundan geçmez.
 */
export async function uploadListingMedia(
  listingId: string,
  kind: MediaKind,
  file: File,
  onProgress?: (oran: number) => void,
): Promise<UploadSonucu> {
  const { ticket, error } = await createUploadTicketAction(
    listingId,
    kind,
    file.type,
    file.size,
  );
  if (error || !ticket) return { error: error ?? "Yükleme bileti alınamadı." };

  try {
    await putSignedUrl(ticket.signedUrl, file, onProgress);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Yükleme başarısız." };
  }

  return registerUploadedMediaAction(listingId, kind, ticket.path);
}

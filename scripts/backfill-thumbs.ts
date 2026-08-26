/**
 * TEK SEFERLİK: küçük boyu olmayan eski görseller için 400 px WebP üretir.
 *
 *   npm i -D sharp
 *   npm run backfill:thumbs
 *
 * Bu script olmasa da hiçbir şey kırılmaz — serializer thumbUrl yoksa orijinale
 * düşer. Yalnızca eski ilanlar liste görünümünde gereksiz ağır kalır.
 *
 * sharp bilerek devDependency: uygulama paketine girmez, yalnız bakım aracıdır.
 */
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const THUMB_WIDTH = 400;
const BUCKET = "listing-photos";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // sharp yalnız burada gerekli; kurulu değilse anlaşılır bir mesajla çık.
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default as unknown as typeof import("sharp");
  } catch {
    console.error("sharp kurulu değil. Önce:  npm i -D sharp");
    process.exit(1);
  }

  const rows = await sql<{ id: string; storage_path: string }[]>`
    select id, storage_path from listing_photos where thumb_url is null
  `;
  console.log(`Küçük boyu olmayan görsel: ${rows.length}`);

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const { data: file, error } = await supabase.storage.from(BUCKET).download(row.storage_path);
      if (error || !file) throw new Error(error?.message ?? "indirilemedi");

      const buffer = Buffer.from(await file.arrayBuffer());
      const thumb = await sharp(buffer)
        .rotate() // EXIF yönü uygulanır
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

      // Orijinalin yanına aynı adla: <uuid>.<ext> → <uuid>_400.webp
      const thumbPath = row.storage_path.replace(/\.[^./]+$/, "") + "_400.webp";
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(thumbPath, thumb, { contentType: "image/webp", upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath);
      await sql`
        update listing_photos
        set thumb_url = ${pub.publicUrl}, thumb_storage_path = ${thumbPath}
        where id = ${row.id}
      `;

      done++;
      process.stdout.write(`\r${done}/${rows.length} tamam`);
    } catch (e) {
      failed++;
      console.error(`\n[${row.storage_path}] atlandı:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`\nBitti. Başarılı: ${done}, atlanan: ${failed}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

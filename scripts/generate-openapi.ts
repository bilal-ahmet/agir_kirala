/**
 * public/openapi.json üretir — Flutter tarafında Dart model codegen girdisi.
 *
 *   npm run openapi
 *   # Flutter: openapi-generator / swagger_dart_code_generator ile modelleri üret
 *
 * Uç her istekte /api/v1/openapi.json'dan da servis edilir; buradaki dosya
 * codegen araçlarının sunucu çalıştırmadan okuyabilmesi içindir.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOpenApiDocument } from "../src/lib/api/openapi";

async function main() {
  const doc = buildOpenApiDocument();
  const out = path.join(process.cwd(), "public", "openapi.json");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(doc, null, 2), "utf8");

  const pathCount = Object.keys(doc.paths as object).length;
  console.log(`OpenAPI yazıldı: ${out} (${pathCount} yol)`);

  // servers[0] kod üreteçlerine varsayılan basePath olur; yer tutucu kalırsa
  // üretilen Dart istemcisi var olmayan bir adrese istek atar.
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.warn(
      "\nUYARI: NEXT_PUBLIC_SITE_URL tanımlı değil; servers[0] yer tutucu adres içeriyor." +
        "\nDart codegen öncesi üretim adresiyle yeniden üretin:" +
        "\n  NEXT_PUBLIC_SITE_URL=https://alanadiniz.com npm run openapi\n",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

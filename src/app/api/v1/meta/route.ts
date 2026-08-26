import { withApi, ok } from "@/lib/api/handler";
import { CATEGORIES } from "@/lib/categories";
import { ALL_BRANDS, SUBCATEGORY_BRANDS } from "@/lib/brands";
import { PROVINCES } from "@/lib/locations";
import {
  ALLOWED_VIDEO_TYPES,
  CONDITION_LABELS,
  FUEL_LABELS,
  MAX_VIDEO_BYTES,
  MIN_YEAR,
  OWNER_TYPE_LABELS,
  PERIOD_LABELS,
  PERIODS,
  RESULTS_PER_PAGE,
  SORT_OPTIONS,
  TRANSPORT_LABELS,
} from "@/lib/constants";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, MAX_PHOTOS, MAX_THUMB_BYTES } from "@/lib/core/uploads";

/**
 * İstemci taksonomisi ve limitleri — TEK kaynak.
 * Flutter kategorileri, markaları, illeri veya dosya limitlerini hardcode etmez;
 * aksi halde bir kategori eklendiğinde mobil uygulama mağaza güncellemesi
 * beklemek zorunda kalırdı.
 */
export const GET = withApi(async () =>
  ok({
    categories: CATEGORIES,
    brands: { all: ALL_BRANDS, bySubcategory: SUBCATEGORY_BRANDS },
    provinces: PROVINCES,
    periods: PERIODS,
    labels: {
      period: PERIOD_LABELS,
      fuel: FUEL_LABELS,
      transport: TRANSPORT_LABELS,
      condition: CONDITION_LABELS,
      ownerType: OWNER_TYPE_LABELS,
    },
    sortOptions: SORT_OPTIONS,
    limits: {
      maxPhotos: MAX_PHOTOS,
      maxPhotoBytes: MAX_PHOTO_BYTES,
      maxThumbBytes: MAX_THUMB_BYTES,
      allowedPhotoTypes: ALLOWED_PHOTO_TYPES,
      maxVideoBytes: MAX_VIDEO_BYTES,
      allowedVideoTypes: ALLOWED_VIDEO_TYPES,
      resultsPerPage: RESULTS_PER_PAGE,
      minYear: MIN_YEAR,
      maxYear: new Date().getFullYear(),
      /** İstemcinin üretmesi beklenen görsel boyutları (bkz. upload-ticket). */
      imageTargets: { thumbWidth: 400, originalMaxWidth: 1600, format: "image/webp" },
    },
  }),
);

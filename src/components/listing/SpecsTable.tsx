import type { Listing } from "@/lib/types";
import { getCategory, operatorLabel, specFieldsFor, transportApplies } from "@/lib/categories";
import { FUEL_LABELS, TRANSPORT_LABELS } from "@/lib/constants";
import { formatUsage } from "@/lib/format";

export function SpecsTable({ listing }: { listing: Listing }) {
  const category = getCategory(listing.categorySlug);

  // Sabit alanlar + kategoriye özel teknik alanlar
  const rows: { label: string; value: string }[] = [
    { label: "Marka", value: listing.brand },
    { label: "Model", value: listing.model },
    { label: "Model Yılı", value: String(listing.year) },
    {
      label: category?.usageMetric === "saat" ? "Çalışma Saati" : "Kilometre",
      value: formatUsage(listing.usage, category?.usageMetric ?? "saat"),
    },
    {
      label: category?.operatorLabels ? "Şoför" : "Operatör",
      value: category?.operatorLabels
        ? operatorLabel(listing.categorySlug, listing.operator)
        : listing.operator
          ? "Operatörlü"
          : "Operatörsüz (kuru kiralama)",
    },
  ];
  // Tırın kendisi nakliye aracı: "nakliye dahil/ekstra" satırı anlamsız.
  if (transportApplies(listing.categorySlug)) {
    rows.push({ label: "Nakliye", value: TRANSPORT_LABELS[listing.transport] });
  }

  if (listing.fuel) rows.push({ label: "Yakıt", value: FUEL_LABELS[listing.fuel] });

  for (const field of specFieldsFor(listing.categorySlug, listing.subCategorySlug)) {
    const raw = listing.specs[field.key];
    if (raw == null) continue;
    let value: string;
    if (field.type === "boolean") value = raw ? "Var" : "Yok";
    else value = `${raw}${field.unit ? ` ${field.unit}` : ""}`;
    rows.push({ label: field.label, value });
  }

  return (
    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 border-b border-line py-2.5">
          <dt className="text-sm text-muted">{row.label}</dt>
          <dd className="text-right text-sm font-semibold text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

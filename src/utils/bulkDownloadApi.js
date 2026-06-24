import locations from "../constants/locations";
import { buildBulkExportTableEntry } from "../constants/bulkDownloadBundles";

export const BULK_DOWNLOAD_EXPORT_FAILED = "Failed to export data.";

export const BULK_DOWNLOAD_EXPORT_FAILED_MESSAGE = {
  prefix: "Please try to download data later, or report issue through the ",
  formHref: "https://airtable.com/app3LpG05CtIRpj7q/pagutpBlODNBc2Lwr/form",
  formLabel: "form",
};


function formatDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/** One municipality → use its name; multiple → "Municipalities {bundle} data.{ext}". */
export function buildBulkDownloadFilename(municipalities, bundleSlug, extension) {
  const muniLabel =
    municipalities.length === 1 ? municipalities[0] : "municipalities";
  const dateStamp = formatDateStamp();

  return `${muniLabel} ${bundleSlug} data ${dateStamp}.${extension}`;
}

export async function requestBulkExport({
  municipalities,
  tables,
  format = "zip",
  bundleSlug = "housing",
  useMetadataColumns = false,
}) {
  if (municipalities.length === 0) {
    throw new Error("Select at least one municipality.");
  }

  if (tables.length === 0) {
    throw new Error("Please select at least one table.");
  }

  const defaultExtension = format === "zip" ? "zip" : "xlsx";

  const payload = {
    token: import.meta.env.VITE_MAPC_API_TOKEN,
    format,
    bundleSlug,
    municipalities,
    geography: { values: municipalities },
    useMetadataColumns,
    tables: tables.map((tableConfig) => buildBulkExportTableEntry(tableConfig)),
  };

  const response = await fetch(`${locations.BROWSER_API}/bulk-export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(BULK_DOWNLOAD_EXPORT_FAILED);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const filename =
    filenameMatch?.[1] ||
    buildBulkDownloadFilename(municipalities, bundleSlug, defaultExtension);

  return { blob, filename };
}

/** Trigger a browser download from a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

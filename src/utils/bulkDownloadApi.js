import locations from "../constants/locations";
import { buildBulkExportTableEntry } from "../constants/bulkDownloadBundles";

export const BULK_DOWNLOAD_EXPORT_FAILED = "Failed to export data.";

export const BULK_DOWNLOAD_EXPORT_FAILED_MESSAGE = {
  prefix: "Please try to download data later, or report issue through the ",
  formHref: "https://airtable.com/app3LpG05CtIRpj7q/pagutpBlODNBc2Lwr/form",
  formLabel: "form",
};

// _bulk_download_bundle.id = bundle_id in _bulk_download_bundle_table_list (e.g. "housing")
const BULK_DOWNLOAD_BUNDLE_LIST = "_bulk_download_bundle";
const BULK_DOWNLOAD_BUNDLE_TABLE_LIST_VIEW = "_bulk_download_bundle_table_list";
const BULK_DOWNLOAD_BUNDLE_TABLES_STORED_PROCEDURE = "bulk-download-bundle-tables";

function formatDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function parseYearList(value) {
  if (Array.isArray(value)) {
    return value.map((year) => String(year)).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "{}") {
      return [];
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((year) => year.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    }
  }

  return [];
}

/** Map one _bulk_download_bundle_table_list row to a frontend table config. */
function toBundleTableConfig(row, availableYears = []) {
  const datasetId = row.dataset_id;
  return {
    table: row.table_name,
    datasetId: datasetId != null && datasetId !== "" ? String(datasetId) : null,
    database: row.db_name || "ds",
    schema: row.schema_name || "tabular",
    geoColumn: row.geo_column || "municipal",
    source: row.source || "",
    yearColumn: row.year_column || "",
    defaultSelectedYears: parseYearList(row.default_selected_years),
    availableYears,
  };
}

/** Combine table config rows with available years from the named query. */
function mergeBundleTableConfigs(tableRows, availableYearsByTable) {
  return tableRows.map((row) =>
    toBundleTableConfig(row, availableYearsByTable[row.table_name] ?? []),
  );
}

function groupBundleListFromRows(bundleRows, tableRows) {
  const tablesByBundleId = tableRows.reduce((acc, row) => {
    if (!acc[row.bundle_id]) {
      acc[row.bundle_id] = [];
    }
    acc[row.bundle_id].push(toBundleTableConfig(row));
    return acc;
  }, {});

  return bundleRows.reduce((acc, row) => {
    const bundleId = row.bundle_id ?? row.id;
    acc[bundleId] = {
      id: bundleId,
      title: row.title,
      description: row.description,
      geographyType: row.geography_type || row.geographyType || "municipality",
      sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
      tables: tablesByBundleId[bundleId] || [],
    };
    return acc;
  }, {});
}

async function fetchBundleListApiRows(bundleId) {
  const token = import.meta.env.VITE_MAPC_API_TOKEN;
  const apiBase = `${locations.BROWSER_API}?token=${token}&database=ds&schema=tabular`;

  // Bundle table column is `id`; table list view column is `bundle_id` (same slug, e.g. "housing")
  let bundleUrl = `${apiBase}&table=${BULK_DOWNLOAD_BUNDLE_LIST}`;
  let tableUrl = `${apiBase}&table=${BULK_DOWNLOAD_BUNDLE_TABLE_LIST_VIEW}`;

  if (bundleId) {
    bundleUrl = `${bundleUrl}&filters=id:${bundleId}`;
    tableUrl = `${tableUrl}&filters=bundle_id:${bundleId}`;
  }

  const [bundleResponse, tableResponse] = await Promise.all([
    fetch(bundleUrl),
    fetch(tableUrl),
  ]);

  if (!bundleResponse.ok) {
    throw new Error(`HTTP error! status: ${bundleResponse.status}`);
  }

  if (!tableResponse.ok) {
    throw new Error(`HTTP error! status: ${tableResponse.status}`);
  }

  const [bundleData, tableData] = await Promise.all([
    bundleResponse.json(),
    tableResponse.json(),
  ]);

  let bundleRows = bundleData.rows || [];
  // Filter active client-side. The API `filters=active:Y` path can return stale
  // cached metadata (e.g. an outdated housing title).
  if (!bundleId) {
    bundleRows = bundleRows.filter((row) => String(row.active ?? "Y").toUpperCase() === "Y");
  }

  return [bundleRows, tableData.rows || []];
}

export async function fetchBulkDownloadBundles() {
  const [bundleRows, tableRows] = await fetchBundleListApiRows();
  const bundles = groupBundleListFromRows(bundleRows, tableRows);
  return Object.fromEntries(
    Object.entries(bundles).sort(([, a], [, b]) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  );
}

export async function fetchBulkDownloadBundle(bundleId) {
  const token = import.meta.env.VITE_MAPC_API_TOKEN;
  const apiBase = `${locations.BROWSER_API}?token=${token}&database=ds&schema=tabular`;

  const [yearsResponse, tableResponse, metaResponse] = await Promise.all([
    fetch(
      `${locations.BROWSER_API}/named-query?token=${token}&queryName=${BULK_DOWNLOAD_BUNDLE_TABLES_STORED_PROCEDURE}&bundleId=${encodeURIComponent(bundleId)}`,
    ),
    fetch(`${apiBase}&table=${BULK_DOWNLOAD_BUNDLE_TABLE_LIST_VIEW}&filters=bundle_id:${encodeURIComponent(bundleId)}`),
    fetch(`${apiBase}&table=${BULK_DOWNLOAD_BUNDLE_LIST}&filters=id:${encodeURIComponent(bundleId)}`),
  ]);

  if (!yearsResponse.ok) {
    throw new Error(`HTTP error! status: ${yearsResponse.status}`);
  }

  if (!tableResponse.ok) {
    throw new Error(`HTTP error! status: ${tableResponse.status}`);
  }

  const [yearsData, tableData, metaData] = await Promise.all([
    yearsResponse.json(),
    tableResponse.json(),
    metaResponse.ok ? metaResponse.json() : Promise.resolve({ rows: [] }),
  ]);

  const tableRows = tableData.rows || [];
  if (!tableRows.length) {
    return null;
  }

  const availableYearsByTable = (yearsData.rows || []).reduce((acc, row) => {
    acc[row.table_name] = parseYearList(row.available_years);
    return acc;
  }, {});

  const meta = metaData.rows?.[0];

  return {
    id: bundleId,
    title: meta?.title ?? "",
    description: meta?.description ?? "",
    geographyType: meta?.geography_type || meta?.geographyType || "municipality",
    tables: mergeBundleTableConfigs(tableRows, availableYearsByTable),
  };
}

export function buildBulkDownloadFilename(municipalities, bundleSlug, extension) {
  const muniLabel = municipalities.length === 1 ? municipalities[0] : "municipalities";
  const dateStamp = formatDateStamp();
  return `${muniLabel} ${bundleSlug} data ${dateStamp}.${extension}`;
}

export async function requestBulkExport({
  municipalities,
  tables,
  format = "zip",
  bundleSlug = "housing",
  useMetadataColumns = true,
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

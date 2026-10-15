/** Helpers for bulk download bundle table config */

/** max tables (bundle + inventory) that can be included in one download. */
export const MAX_BULK_DOWNLOAD_TABLES = 40;

/** Other bundles. Community Engagement Plan can select more than 10 geographies. */
export const MAX_BULK_DOWNLOAD_GEOGRAPHIES = 10;


export const MAX_BULK_DOWNLOAD_TOTAL_ROWS = 50_000;

const formatCount = (value) => Number(value).toLocaleString("en-US");

function yearSpanForBulkEstimate(table) {
  if (Array.isArray(table.years) && table.years.length > 0) return table.years.length;
  // No years selected means the download includes every year on the table.
  if (Array.isArray(table.availableYears) && table.availableYears.length > 0) {
    return table.availableYears.length;
  }
  return 1;
}

/** Empty string when the selection fits. Otherwise the reason to block the download. */
export function bulkDownloadSelectionTooLarge(tables, geographyCount) {
  const geoCount = Math.max(Number(geographyCount) || 0, 0);
  let total = 0;
  for (const table of tables) {
    total += geoCount * yearSpanForBulkEstimate(table);
  }
  if (total > MAX_BULK_DOWNLOAD_TOTAL_ROWS) {
    const tableCount = tables.length;
    const tableWord = tableCount === 1 ? "table" : "tables";
    return `This download would include about ${formatCount(total)} rows across ${formatCount(tableCount)} ${tableWord}. One download can include up to ${formatCount(MAX_BULK_DOWNLOAD_TOTAL_ROWS)} rows. Select fewer years, tables, or geographies.`;
  }
  return "";
}
/** front-end only: pick municipal tables from Data Inventory (no curated table list). */
export const CUSTOM_BULK_DOWNLOAD_BUNDLE_ID = "custom";

export const CUSTOM_BULK_DOWNLOAD_BUNDLE = {
  id: CUSTOM_BULK_DOWNLOAD_BUNDLE_ID,
  title: "Custom Data Download",
  description:
    "Choose municipal tables from the Data Inventory and download them for one or more interested geographies.",
  geographyType: "municipality",
  tables: [],
  isCustomInventory: true,
};

export function isCustomBulkDownloadBundle(bundleId) {
  return bundleId === CUSTOM_BULK_DOWNLOAD_BUNDLE_ID;
}

/** Map a Data Inventory dataset to a bulk-download table config. */
export function tableConfigFromInventoryDataset(dataset) {
  return {
    table: dataset.table_name,
    datasetId: dataset.seq_id != null && dataset.seq_id !== "" ? String(dataset.seq_id) : null,
    database: dataset.db_name || "ds",
    schema: dataset.schemaname || "tabular",
    geoColumn: String(dataset.geocolumn || dataset.geo_column || "").trim(),
    source: dataset.source || "",
    yearColumn: dataset.yearcolumn || "",
    availableYears: [],
    isCustom: true,
  };
}

/**
 * Dropdown options for geography search: `{ muniId, municipal }` from
 * bulk_download_datakeys_all.
 */
export function buildBulkDownloadMunicipalitySearchable(rows = []) {
  const options = [];
  const seen = new Set();

  rows.forEach((row) => {
    const municipal = String(row.municipal || "").trim();
    const muniId = Number(row.muniId);
    if (!municipal || !Number.isFinite(muniId) || seen.has(muniId)) return;
    seen.add(muniId);
    options.push({ muniId, municipal });
  });

  return options;
}

/** @param {object} tableConfig */
export function tableHasYearFilter(tableConfig) {
  return Boolean(tableConfig.yearColumn);
}

/** @param {object} tableConfig */
export function buildBulkExportTableEntry(tableConfig) {
  const hasYearFilter = tableHasYearFilter(tableConfig);
  const years = hasYearFilter
    ? (tableConfig.years ?? tableConfig.defaultSelectedYears ?? [])
        .map((year) => String(year).trim())
        .filter(Boolean)
    : [];

  const entry = {
    database: tableConfig.database || "ds",
    schema: tableConfig.schema || "tabular",
    table: tableConfig.table,
    years,
  };

  entry.geoColumn = tableConfig.geoColumn || "municipal";

  if (hasYearFilter && years.length > 0) {
    entry.yearColumn = tableConfig.yearColumn;
  }

  if (Array.isArray(tableConfig.columns)) {
    entry.columns = tableConfig.columns
      .map((column) => String(column).trim())
      .filter(Boolean)
      .join(",");
  }

  return entry;
}

/** @param {object[]} tables */
export function buildInitialYearsByTable(tables) {
  return Object.fromEntries(tables.map(({ table }) => [table, []]));
}

/**
 * Resolve display title and source from _data_browser when available.
 * @param {object} tableConfig
 * @param {object[]} datasets
 */
export function getTableDisplayInfo(tableConfig, datasets = []) {
  const match = datasets.find((d) => d.table_name === tableConfig.table);

  return {
    title: match?.menu3 || tableConfig.source || tableConfig.table,
    source: match?.source || tableConfig.source || "",
  };
}
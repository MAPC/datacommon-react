/** Helpers for bulk download bundle table config (loaded from DB via bulkDownloadApi). */

/** max tables (bundle + inventory) that can be included in one download. */
export const MAX_BULK_DOWNLOAD_TABLES = 40;

/** Other bundles. Community Engagement Plan is not capped. Matches prql-js MAX_MUNICIPALITIES_PER_REQUEST. */
export const MAX_BULK_DOWNLOAD_GEOGRAPHIES = 10;

/** Match prql-js/export/bulkExport.js. One row per geography per year. */
export const MAX_BULK_DOWNLOAD_ROWS_PER_TABLE = 10_000;
export const MAX_BULK_DOWNLOAD_TOTAL_ROWS = 50_000;
const MAX_BULK_DOWNLOAD_YEARS_WHEN_UNFILTERED = 35;

function yearSpanForBulkEstimate(table) {
  if (Array.isArray(table.years) && table.years.length > 0) return table.years.length;
  if (table.yearColumn) return MAX_BULK_DOWNLOAD_YEARS_WHEN_UNFILTERED;
  return 1;
}

/** Empty string when the selection fits. Otherwise the reason to block the download. */
export function bulkDownloadSelectionTooLarge(tables, geographyCount) {
  const geoCount = Math.max(Number(geographyCount) || 0, 0);
  let total = 0;
  for (const table of tables) {
    const rows = geoCount * yearSpanForBulkEstimate(table);
    if (rows > MAX_BULK_DOWNLOAD_ROWS_PER_TABLE) {
      return "This download is too large for one table. Each geography and year adds a row, and this combination is over the limit. Select fewer years or fewer geographies.";
    }
    total += rows;
  }
  if (total > MAX_BULK_DOWNLOAD_TOTAL_ROWS) {
    return "This download is too large. Geographies, years, and tables together are over the limit. Select fewer years, fewer tables, or fewer geographies.";
  }
  return "";
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

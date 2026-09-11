/** Helpers for bulk download bundle table config (loaded from DB via bulkDownloadApi). */

/** max tables (bundle + inventory) that can be included in one download. */
export const MAX_BULK_DOWNLOAD_TABLES = 40;

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

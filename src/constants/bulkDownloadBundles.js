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

/** Special region rows in municipal tables (not cities/towns). */
export const BULK_DOWNLOAD_EXTRA_GEOGRAPHIES = [
  {
    name: "MAPC",
    muniId: 352,
    municipalAliases: ["MAPC", "Metropolitan Area Planning Council"],
  },
  {
    name: "Massachusetts",
    muniId: 353,
    municipalAliases: ["Massachusetts"],
  },
];

export const BULK_DOWNLOAD_EXTRA_GEOGRAPHY_NAMES = BULK_DOWNLOAD_EXTRA_GEOGRAPHIES.map(
  (geo) => geo.name,
);

const MAPC_GEOGRAPHY = BULK_DOWNLOAD_EXTRA_GEOGRAPHIES.find((geo) => geo.muniId === 352);

function addUniqueName(names, seen, name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  names.push(trimmed);
}

/** Match a selected name against extra geography display names or aliases. */
export function findBulkDownloadExtraGeography(selectedName) {
  const needle = String(selectedName).toLowerCase();
  return BULK_DOWNLOAD_EXTRA_GEOGRAPHIES.find((place) => {
    if (place.name.toLowerCase() === needle) return true;
    return (place.municipalAliases || []).some((alias) => alias.toLowerCase() === needle);
  });
}

/**
 * Search names for the municipality dropdown: rows from bulk_download_datakeys_all,
 * plus MAPC aliases that may not appear as the stored municipal name.
 */
export function buildBulkDownloadMunicipalitySearchable(rows = []) {
  const names = [];
  const seen = new Set();

  (MAPC_GEOGRAPHY?.municipalAliases || []).forEach((alias) => addUniqueName(names, seen, alias));
  rows.forEach((row) => addUniqueName(names, seen, row.municipal));

  return names;
}

/**
 * Turn the names the user picked into the names stored in the tables.
 * Example: "MAPC" is stored as "MAPC" in most tables, but as
 * "Metropolitan Area Planning Council" in some tables.
 */
export function expandBulkDownloadGeographyValues(selectedNames = []) {
  const namesToSend = [];

  for (const selectedName of selectedNames) {
    const specialPlace = findBulkDownloadExtraGeography(selectedName);

    if (specialPlace) {
      namesToSend.push(...specialPlace.municipalAliases);
    } else {
      namesToSend.push(selectedName);
    }
  }

  return [...new Set(namesToSend)];
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

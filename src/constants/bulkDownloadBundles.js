/** Helpers for bulk download bundle table config (loaded from DB via bulkDownloadApi). */

import { getDatasetGeography, getDatasetGeographyLabel } from "../utils/manageDatasets";

/** max tables (bundle + inventory) that can be included in one download. */
export const MAX_BULK_DOWNLOAD_TABLES = 40;

/** Map a Data Inventory dataset to a bulk-download table config. */
export function tableConfigFromInventoryDataset(dataset) {
  const geography = getDatasetGeography(dataset);
  const isMunicipal = geography === "municipal";
  return {
    table: dataset.table_name,
    datasetId: dataset.seq_id != null && dataset.seq_id !== "" ? String(dataset.seq_id) : null,
    database: dataset.db_name || "ds",
    schema: dataset.schemaname || "tabular",
    geoColumn: String(dataset.geocolumn || dataset.geo_column || "").trim(),
    skipGeographyFilter: !isMunicipal,
    source: dataset.source || "",
    yearColumn: dataset.yearcolumn || "",
    availableYears: [],
    isCustom: true,
    isNonMunicipal: !isMunicipal,
    geography,
    geographyLabel: getDatasetGeographyLabel(dataset),
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

/**
 * Turn the names the user picked into the names stored in the tables.
 * Example: "MAPC" is stored as "MAPC" in most tables, but as
 * "Metropolitan Area Planning Council" in some tables.
 */
export function expandBulkDownloadGeographyValues(selectedNames = []) {
  const namesToSend = [];

  for (const selectedName of selectedNames) {
    const specialPlace = BULK_DOWNLOAD_EXTRA_GEOGRAPHIES.find(
      (place) => place.name.toLowerCase() === String(selectedName).toLowerCase(),
    );

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

  if (!tableConfig.skipGeographyFilter) {
    entry.geoColumn = tableConfig.geoColumn || "municipal";
  }

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

import axios from "axios";

/**
 * Find the municipal _data_browser entry for a bulk-download table.
 * @param {object[]} datasets
 * @param {string} tableName
 */
export function getDatasetForBulkTable(datasets, tableName) {
  return (
    datasets.find((d) => d.table_name === tableName)
  );
}

/**
 * Resolve the year column from _data_browser metadata, with config fallback.
 * @param {{ table: string, yearColumn?: string }} tableConfig
 * @param {object[]} datasets
 */
export function getYearColumnForTable(tableConfig, datasets) {
  const dataset = getDatasetForBulkTable(datasets, tableConfig.table);
  return dataset?.yearcolumn || tableConfig.yearColumn || null;
}

/**
 * Fetch all distinct years available for a table.
 */
export async function fetchAvailableYearsForTable(tableConfig, datasets) {
  const dataset = getDatasetForBulkTable(datasets, tableConfig.table);
  const database = tableConfig.database || dataset?.db_name || "ds";
  const schema = tableConfig.schema || dataset?.schemaname || "tabular";
  const yearColumn = getYearColumnForTable(tableConfig, datasets);

  if (!yearColumn) {
    return [];
  }

  const response = await axios.get(
    `/api/?token=${import.meta.env.VITE_MAPC_API_TOKEN}&distinctColumn=${yearColumn}&database=${database}&schema=${schema}&table=${tableConfig.table}&limit=50`,
  );

  const rows = response?.data?.rows || [];
  return rows // return the years in descending order
    .map((row) => String(Object.values(row)[0]))
    .filter(Boolean)
    // some years are strings, some are numbers, so we need to sort them as numbers
    .sort((a, b) => Number(b) - Number(a) || b.localeCompare(a));
}

/**
 * Pre-select only the configured default years that exist in the available set.
 * @param {string[]} defaultSelectedYears
 * @param {string[]} availableYears
 */
export function resolveDefaultSelectedYears(defaultSelectedYears, availableYears) {
  const defaults = (defaultSelectedYears || []).map((year) => String(year));
  if (!availableYears.length) {
    return defaults;
  }
  const availableSet = new Set(availableYears.map((year) => String(year)));
  return defaults.filter((year) => availableSet.has(year));
}

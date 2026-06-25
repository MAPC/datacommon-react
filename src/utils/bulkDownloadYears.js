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
  // return the years in descending order
  return rows.map((row) => Object.values(row)[0]).sort().reverse();
}

/**
 * Pre-select only the configured default years that exist in the available set.
 * @param {string[]} defaultSelectedYears
 * @param {string[]} availableYears
 */
export function resolveDefaultSelectedYears(defaultSelectedYears, availableYears) {
  if (!availableYears.length) {
    return [...defaultSelectedYears];
  }
  return defaultSelectedYears.filter((year) => availableYears.includes(year));
}

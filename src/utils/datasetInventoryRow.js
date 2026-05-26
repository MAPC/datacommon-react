/**
 * DataCommon dataset catalog / inventory table rows: resolve the dataset id for linking to
 * /browser/datasets/:id. Rows use `seq_id` only.
 */
export function getInventoryRowDatasetId(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const v = row.seq_id;
  if (v != null && v !== "") {
    return v;
  }
  return null;
}

/** True when viewing the tabular `_data_browser` dataset catalog table. */
export function isDatasetInventoryCatalog(dataset) {
  return Boolean(dataset && dataset.table_name === "_data_browser");
}

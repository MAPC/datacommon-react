/** Stable key for preview row reorder (survives sort and pagination). */
export function getDatasetRowKey(row, fallbackIndex = 0) {
  if (!row || typeof row !== "object") return `row:${fallbackIndex}`;

  // Per-row API id (unique even when muni_id/geo repeats across years or categories).
  for (const field of ["seq_id", "id"]) {
    const v = row[field];
    if (v != null && v !== "") return `${field}:${v}`;
  }

  const compositeFields = [
    "muni_id",
    "geo_id",
    "ct_id",
    "acs_year",
    "cal_year",
    "fy",
    "year",
    "naicscode",
    "race_eth",
  ];
  const parts = compositeFields
    .map((field) => {
      const v = row[field];
      if (v == null || v === "") return null;
      return `${field}:${v}`;
    })
    .filter(Boolean);
  if (parts.length > 1) return parts.join("|");

  try {
    return `hash:${JSON.stringify(row)}`;
  } catch {
    return `row:${fallbackIndex}`;
  }
}

/** Keep custom column order in sync when selection changes. */
export function syncPreviewColumnOrder(prevOrder, selectedColumns, columnKeys) {
  const selectedSet = new Set(selectedColumns || []);
  const kept = (prevOrder || []).filter((name) => selectedSet.has(name));
  const keptSet = new Set(kept);
  const added = (columnKeys || [])
    .map((col) => col.name)
    .filter((name) => selectedSet.has(name) && !keptSet.has(name));
  return [...kept, ...added];
}

export function orderColumnKeys(columnKeys, selectedColumns, previewColumnOrder) {
  const selectedSet = new Set(selectedColumns || []);
  const visible = (columnKeys || []).filter((col) => selectedSet.has(col.name));
  if (!previewColumnOrder?.length) return visible;

  const byName = new Map(visible.map((col) => [col.name, col]));
  const ordered = [];
  previewColumnOrder.forEach((name) => {
    if (byName.has(name)) {
      ordered.push(byName.get(name));
      byName.delete(name);
    }
  });
  byName.forEach((col) => ordered.push(col));
  return ordered;
}

/** Merge custom row order with filtered rows; append rows not yet in order. */
export function applyPreviewRowOrder(rows, previewRowOrder) {
  const visible = (rows || []).map((row, i) => ({ row, key: getDatasetRowKey(row, i) }));

  if (!previewRowOrder?.length) return visible.map(({ row }) => row);

  const buckets = new Map();
  visible.forEach(({ row, key }) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  });

  const ordered = [];
  previewRowOrder.forEach((key) => {
    const bucket = buckets.get(key);
    if (!bucket?.length) return;
    ordered.push(bucket.shift());
    if (!bucket.length) buckets.delete(key);
  });
  buckets.forEach((bucket) => {
    bucket.forEach((row) => ordered.push(row));
  });
  return ordered;
}

export function reorderList(list, fromIndex, toIndex) {
  if (!list?.length || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  if (fromIndex >= next.length || toIndex >= next.length) return list;
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

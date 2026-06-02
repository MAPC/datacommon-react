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

/**
 * user selected column(includes hidden/deselected columns).
 * Deselected columns stay in place so re-adding restores their prior position.
 */
export function syncPreviewColumnOrder(prevOrder, _selectedColumns, columnKeys) {
  const allColumnNames = columnKeys.map((col) => col.name);
  const columnKeySet = new Set(allColumnNames);
  // Filter out columns that are not in the columnKeys
  const order = prevOrder.filter((name) => columnKeySet.has(name));

  allColumnNames.forEach((name) => {
    if (!order.includes(name)) {
      order.push(name);
    }
  });

  return order;
}

/**
 * Apply a reorder of visible columns while keeping hidden columns at their slots.
 */
export function mergeVisibleColumnReorder(fullOrder, visibleColumnNames, reorderedVisible) {
  const visibleSet = new Set(visibleColumnNames);
  const queue = [...reorderedVisible];
  const merged = [];

  fullOrder.forEach((name) => {
    if (visibleSet.has(name)) {
      if (queue.length) merged.push(queue.shift());
    } else {
      merged.push(name);
    }
  });

  queue.forEach((name) => merged.push(name));
  return merged;
}

/**
 * True when visible columns are ordered differently than metadata default.
 * Compares layout (previewColumnOrder) to columnKeys order — not to the already-rendered order.
 */
export function isVisibleColumnOrderCustom(previewColumnOrder, visibleColumnNames, columnKeys) {
  if (!visibleColumnNames?.length) return false;

  const visibleSet = new Set(visibleColumnNames);
  const defaultVisibleOrder = (columnKeys || [])
    .map((col) => col.name)
    .filter((name) => visibleSet.has(name));

  const layoutVisibleOrder = (previewColumnOrder || []).filter((name) => visibleSet.has(name));
  const currentVisibleOrder =
    layoutVisibleOrder.length === defaultVisibleOrder.length
      ? layoutVisibleOrder
      : defaultVisibleOrder;

  return currentVisibleOrder.join("|") !== defaultVisibleOrder.join("|");
}

export function orderColumnKeys(columnKeys, selectedColumns, previewColumnOrder) {
  const selectedSet = new Set(selectedColumns || []);
  const visible = columnKeys.filter((col) => selectedSet.has(col.name));
  if (!previewColumnOrder.length) return visible;

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
  const visible = (rows).map((row, i) => ({ row, key: getDatasetRowKey(row, i) }));

  if (!previewRowOrder.length) return visible.map(({ row }) => row);

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
  if (!list.length || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  if (fromIndex >= next.length || toIndex >= next.length) return list;
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

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
  const defaultVisibleOrder = columnKeys
    .map((col) => col.name)
    .filter((name) => visibleSet.has(name));

  const layoutVisibleOrder = previewColumnOrder.filter((name) => visibleSet.has(name));
  const currentVisibleOrder =
    layoutVisibleOrder.length === defaultVisibleOrder.length
      ? layoutVisibleOrder
      : defaultVisibleOrder;

  return currentVisibleOrder.join("|") !== defaultVisibleOrder.join("|");
}

/**
 * Get the column segments for the preview table.
 */
export function getPreviewTableColumnSegments(previewColumnOrder, columnKeys, selectedColumns) {
  const selectedSet = new Set(selectedColumns);
  const columnNameToColumn = new Map((columnKeys).map((col) => [col.name, col]));
  const layoutOrder = previewColumnOrder?.length
    ? previewColumnOrder.filter((name) => columnNameToColumn.has(name))
    : columnKeys.map((col) => col.name);

  const segments = [];
  let hiddenColumns = [];
  
  const flushHiddenColumns = () => {
    if (!hiddenColumns.length) return;
    segments.push({ type: "hidden", columnNames: [...hiddenColumns] });
    hiddenColumns = [];
  };

  layoutOrder.forEach((name) => {
    if (selectedSet.has(name)) {
      flushHiddenColumns();
      const col = columnNameToColumn.get(name);
      if (col) segments.push({ type: "visible", column: col });
    } else {
      hiddenColumns.push(name);
    }
  });
  flushHiddenColumns();

  return segments;
}

export function getHiddenColumnMarkerLabel(hiddenColumnNames, columnKeys) {
  const aliases = hiddenColumnNames.map((name) => {
    const col = columnKeys.find((c) => c.name === name);
    return col?.alias || name;
  });
  if (!aliases.length) return "Show hidden columns";
  if (aliases.length === 1) return `Show hidden column: ${aliases[0]}`;
  return `Show ${aliases.length} hidden columns (${aliases.join(", ")})`;
}

export function orderColumnKeys(columnKeys, selectedColumns, previewColumnOrder) {
  const selectedSet = new Set(selectedColumns);
  const visible = columnKeys.filter((col) => selectedSet.has(col.name));
  if (!previewColumnOrder.length) return visible;

  const columnNameToColumnMap = new Map(visible.map((col) => [col.name, col]));
  const ordered = [];
  previewColumnOrder.forEach((name) => {
    if (columnNameToColumnMap.has(name)) {
      ordered.push(columnNameToColumnMap.get(name));
      columnNameToColumnMap.delete(name);
    }
  });
  columnNameToColumnMap.forEach((col) => ordered.push(col));
  return ordered;
}

/** Merge custom row order with filtered rows; append rows not yet in order. */
export function applyPreviewRowOrder(rows, previewRowOrder) {
  const rowsWithStableKeys = rows.map((row, rowIndex) => ({
    row,
    stableRowKey: getDatasetRowKey(row, rowIndex),
  }));

  if (!previewRowOrder.length) {
    return rowsWithStableKeys.map(({ row }) => row);
  }

  // Group rows by drag key; multiple rows can share the same key.
  const rowQueuesByStableKey = new Map();
  rowsWithStableKeys.forEach(({ row, stableRowKey }) => {
    if (!rowQueuesByStableKey.has(stableRowKey)) {
      rowQueuesByStableKey.set(stableRowKey, []);
    }
    rowQueuesByStableKey.get(stableRowKey).push(row);
  });

  const rowsInSavedOrder = [];
  previewRowOrder.forEach((savedRowKey) => {
    const queuedRowsForKey = rowQueuesByStableKey.get(savedRowKey);
    if (!queuedRowsForKey?.length) {
      return;
    }
    rowsInSavedOrder.push(queuedRowsForKey.shift());
    if (!queuedRowsForKey.length) {
      rowQueuesByStableKey.delete(savedRowKey);
    }
  });

  rowQueuesByStableKey.forEach((remainingRowsForKey) => {
    remainingRowsForKey.forEach((row) => rowsInSavedOrder.push(row));
  });

  return rowsInSavedOrder;
}

export function reorderList(list, fromIndex, toIndex) {
  if (!list.length) {
    return list;
  }
  // No change
  if (fromIndex === toIndex) {
    return list;
  }
  if (fromIndex < 0 || toIndex < 0) {
    return list;
  }

  const next = [...list];
  
  if (fromIndex >= next.length) {
    return list;
  }
  if (toIndex >= next.length) {
    return list;
  }

  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

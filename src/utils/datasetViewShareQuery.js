/**
 * Build / parse URL query for dataset table view (share & embed).
 * Uses repeated `col` and `geo` params so values may contain commas.
 */

export const DATASET_VIEW_SHARE_MAX_URL_LENGTH = 2048;

export function normalizeGeographicFrame(value) {
  const frame = String(value || "").trim().toLowerCase();
  if (frame === "mapc" || frame === "massachusetts") return frame;
  return null;
}

function isMarginLikeColumn(col) {
  const name = String(col?.name || "");
  const alias = String(col?.alias || "").toLowerCase();
  const details = String(col?.details || "").toLowerCase();
  return (
    alias.includes("margin of error") ||
    details.includes("margin of error") ||
    /(?:_mp|_me|_moe|_mep|_m)$/i.test(name) ||
    /[0-9][a-z0-9_]*me$/i.test(name) ||
    /[a-z0-9_]mep$/i.test(name)
  );
}

/** Base (non-MOE) column names that are currently selected — used for compact share URLs. */
export function getVisibleSelectedBaseColumnNames(selectedColumns, columnKeys) {
  const visibleNames = new Set(
    (columnKeys || []).filter((col) => !isMarginLikeColumn(col)).map((c) => String(c.name)),
  );
  return (selectedColumns || []).filter((name) => visibleNames.has(String(name)));
}

/**
 * @param {object} options
 * @param {boolean} options.embed - add embed=1
 * @param {"table"|"map"} [options.viewMode]
 * @param {string|null} [options.mapVariable] - choropleth column when viewMode is map
 * @param {string|null} [options.geographicFrame] - massachusetts | mapc
 * @param {Record<string, string>|null} [options.mapDimensionSelections] - extra map category pickers
 * @param {Array<{name?: string}>} options.columnKeys
 * @param {string[]} options.selectedColumns
 * @param {Array} options.availableGeographies
 * @param {Array} options.selectedGeographies
 * @param {Array} options.availableYears
 * @param {Array} options.selectedYears
 * @param {string} [options.queryYearColumn]
 */
export function buildDatasetViewShareSearchParams({
  embed,
  viewMode = "table",
  mapVariable = null,
  geographicFrame = null,
  mapDimensionSelections = null,
  columnKeys,
  selectedColumns,
  availableGeographies,
  selectedGeographies,
  availableYears,
  selectedYears,
  queryYearColumn,
}) {
  const params = new URLSearchParams();
  if (embed) {
    params.set("embed", "1");
  }

  if (viewMode === "map") {
    if (mapVariable) {
      params.set("mapVar", String(mapVariable));
    }
    const frame = normalizeGeographicFrame(geographicFrame);
    if (frame) {
      params.set("geoFrame", frame);
    }
    Object.entries(mapDimensionSelections || {}).forEach(([columnName, value]) => {
      if (!columnName || value == null || String(value) === "") return;
      params.append("mapDim", `${columnName}:${value}`);
    });
  } else {
    const visibleKeys = (columnKeys || []).filter((c) => !isMarginLikeColumn(c));
    const allBaseNames = visibleKeys.map((c) => c.name);
    const selectedBases = getVisibleSelectedBaseColumnNames(selectedColumns, columnKeys);
    const allColumnsSelected =
      allBaseNames.length > 0 &&
      allBaseNames.length === selectedBases.length &&
      allBaseNames.every((n) => selectedBases.includes(n));
    if (!allColumnsSelected && selectedBases.length > 0) {
      selectedBases.forEach((name) => params.append("col", String(name)));
    }
  }

  const geosAvail = availableGeographies || [];
  const geosSel = selectedGeographies || [];
  if (geosAvail.length > 0 && geosSel.length > 0 && geosSel.length < geosAvail.length) {
    geosSel.forEach((g) => params.append("geo", String(g)));
  }

  if (queryYearColumn && (availableYears || []).length > 0) {
    const yearsSel = selectedYears || [];
    if (viewMode === "map") {
      // Map embeds/shares should always pin the selected year (map uses one year).
      const mapYears = yearsSel.length ? yearsSel : [availableYears[0]];
      mapYears.forEach((y) => params.append("year", String(y)));
    } else {
      const defaultYears = [availableYears[0]];
      const matchesDefault =
        yearsSel.length === defaultYears.length &&
        yearsSel.every((y, i) => String(y) === String(defaultYears[i]));
      if (!matchesDefault && yearsSel.length > 0) {
        yearsSel.forEach((y) => params.append("year", String(y)));
      }
    }
  }

  return params;
}

/**
 * Read col/geo/year/mapVar overrides from location.search.
 * Caller applies expandSelectedWithMargins for cols.
 * @returns {{
 *   baseColumnNames: string[]|null,
 *   geographies: string[]|null,
 *   years: (string|number)[]|null,
 *   mapVariable: string|null,
 *   geographicFrame: string|null,
 *   mapDimensionSelections: Record<string, string>|null,
 * }}
 */
export function parseDatasetViewShareSearch(search) {
  const raw = typeof search === "string" ? search : "";
  const qs = raw.startsWith("?") ? raw.slice(1) : raw;
  const params = new URLSearchParams(qs);

  const baseColumnNames = params.getAll("col").map(String).filter(Boolean);
  const geographies = params.getAll("geo").map(String).filter(Boolean);
  const years = params.getAll("year").map(String).filter(Boolean);
  const mapVariable = params.get("mapVar");
  const geographicFrame = normalizeGeographicFrame(params.get("geoFrame"));
  const mapDimensionSelections = {};
  params.getAll("mapDim").forEach((entry) => {
    const rawEntry = String(entry ?? "");
    const separator = rawEntry.indexOf(":");
    if (separator <= 0) return;
    const columnName = rawEntry.slice(0, separator).trim();
    const value = rawEntry.slice(separator + 1);
    if (!columnName || value === "") return;
    mapDimensionSelections[columnName] = value;
  });

  return {
    baseColumnNames: baseColumnNames.length ? baseColumnNames : null,
    geographies: geographies.length ? geographies : null,
    years: years.length ? years : null,
    mapVariable: mapVariable ? String(mapVariable) : null,
    geographicFrame,
    mapDimensionSelections: Object.keys(mapDimensionSelections).length ? mapDimensionSelections : null,
  };
}

export function resolveGeographiesFromUrl(parsed, availableGeographies) {
  if (!parsed.geographies?.length || !(availableGeographies || []).length) return null;
  const avail = new Set((availableGeographies || []).map(String));
  const next = parsed.geographies.filter((g) => avail.has(String(g)));
  return next.length ? next : null;
}

export function resolveYearsFromUrl(parsed, availableYears) {
  if (!parsed.years?.length || !(availableYears || []).length) return null;
  const wanted = new Set(parsed.years.map(String));
  const next = (availableYears || []).filter((y) => wanted.has(String(y)));
  return next.length ? next : null;
}

function columnHeaderLabel(col) {
  return String(col?.alias || col?.label || col?.name || "").trim().toLowerCase();
}

/** Keep the same map column across municipal ↔ tract tables (by name, then alias). */
export function resolveCarriedMapVariable(preferredName, nextColumnKeys = [], previousColumnKeys = []) {
  const wanted = String(preferredName || "").trim();
  if (!wanted) return null;
  const next = nextColumnKeys || [];
  if (next.some((col) => String(col?.name || "") === wanted)) return wanted;
  const prev = (previousColumnKeys || []).find((col) => String(col?.name || "") === wanted);
  const prevLabel = columnHeaderLabel(prev);
  if (!prevLabel) return null;
  const match = next.find((col) => columnHeaderLabel(col) === prevLabel);
  return match?.name ? String(match.name) : null;
}

export function resolveCarriedMapDimensions(selections = {}, nextColumnKeys = []) {
  const names = new Set((nextColumnKeys || []).map((col) => String(col?.name || "")).filter(Boolean));
  const next = {};
  Object.entries(selections || {}).forEach(([name, value]) => {
    if (!names.has(String(name))) return;
    if (value == null || String(value) === "") return;
    next[name] = String(value);
  });
  return next;
}

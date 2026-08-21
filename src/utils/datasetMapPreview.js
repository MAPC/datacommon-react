/** Helpers for dataset browser map-preview choropleths. */

export const MAP_VIEW_GEOGRAPHY_TYPES = {
  municipal: "municipal",
  census_tracts: "census_tracts",
  block_groups: "block_groups",
  blocks: "blocks",
  /** `_data_browser.menu1 === "Boundaries"` — table already has polygons in `shape`. */
  boundary: "boundary",
};

const MUNICIPAL_MAP_JOIN_COLUMNS = ["muni_id", "muni_name", "municipal"];
/** Name columns for the tabular "All geographies" dropdown / row filter (not map join). */
const MUNICIPAL_TABLE_FILTER_COLUMNS = ["muni_name", "municipal", "muni"];
const TRACT_GEO_COLUMNS = [
  "ct20_id",
  "ct10_id",
  "geoid",
  "GEOID",
];

const OWN_SHAPE_COLUMN_NAMES = new Set(["shape", "geometry", "geom"]);

/** `_data_browser.menu1 === "Boundaries"` */
export function isBoundariesCategory(menu1) {
  return String(menu1 || "").trim().toLowerCase() === "boundaries";
}

/**
 * Detect geography type from `_data_browser.geography`, or Boundaries category.
 * Known geography values: municipal, census_tracts, block_groups, blocks, null.
 *
 * @param {string|null|undefined} [_tableName]
 * @param {string|null|undefined} [geography] `_data_browser.geography`
 * @param {{ menu1?: string|null }} [options]
 */
export function detectDatasetGeographyType(_tableName, geography = null, { menu1 = null } = {}) {
  if (geography != null && geography !== "") {
    const value = String(geography).trim().toLowerCase();
    if (value === MAP_VIEW_GEOGRAPHY_TYPES.municipal) {
      return MAP_VIEW_GEOGRAPHY_TYPES.municipal;
    }
    if (value === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts) {
      return MAP_VIEW_GEOGRAPHY_TYPES.census_tracts;
    }
    if (value === MAP_VIEW_GEOGRAPHY_TYPES.block_groups) {
      return MAP_VIEW_GEOGRAPHY_TYPES.block_groups;
    }
    if (value === MAP_VIEW_GEOGRAPHY_TYPES.blocks) {
      return MAP_VIEW_GEOGRAPHY_TYPES.blocks;
    }
  }
  if (isBoundariesCategory(menu1)) {
    return MAP_VIEW_GEOGRAPHY_TYPES.boundary;
  }
  return null;
}

/**
 * Map preview: municipal + census tract choropleths, and Boundaries-category layers.
 */
export function isMapPreviewSupported(geographyType) {
  return (
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal ||
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts ||
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.boundary
  );
}

const ID_LIKE_COLUMN_PATTERN =
  /^(muni(_?id)?|municipal(_?id)?|town(_?id)?|municipality(_?id)?|geo(_?id)?|objectid|gid)$/i;

const NON_MAPPABLE_COLUMN_NAMES = new Set(
  [
    "seq_id",
    "shape",
    "geometry",
    "geom",
    "logrecno",
    "county_id",
    "nbhd_id",
    "fips_id",
    "objectid",
    "id",
    "rpa_id",
    "website",
    "naicscode",
    "adj_year",
    "statefp",
    "countyfp",
    "tractce",
    "name",
    "namelsad",
    "mtfcc",
    "funcstat",
    "intptlat",
    "intptlon",
    ...MUNICIPAL_MAP_JOIN_COLUMNS,
    ...TRACT_GEO_COLUMNS,
  ].map((name) => name.toLowerCase()),
);

const NO_DATA_COLOR = "#E0E0E0";
const CHOROPLETH_COLORS = ["#EDF8FB", "#B2E2E2", "#66C2A4", "#2CA25F", "#006D2C"];

/**
 * Municipal, census tract, and block group tables can export GeoJSON via the export API.
 * Boundaries-category tables use standard geospatial export instead.
 * Pass `_data_browser.geography` (or an already-resolved geography type) as the second arg.
 */
export function supportsTabularGeojsonExport(tableName, geography = null, { menu1 = null } = {}) {
  if (isBoundariesCategory(menu1)) return false;
  const geographyType = detectDatasetGeographyType(tableName, geography, { menu1 });
  if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.boundary) return false;
  return (
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal ||
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts ||
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.block_groups
  );
}

/**
 * Column used for the tabular geography dropdown / filter 
 * @param {Object} sampleRow
 * @returns {string}
 */
export function resolveTableGeographyColumn(sampleRow) {
  if (!sampleRow) return null;
  const withValue = MUNICIPAL_TABLE_FILTER_COLUMNS.find(
    (col) => sampleRow[col] != null && sampleRow[col] !== "",
  );
  if (withValue) return withValue;
  return MUNICIPAL_TABLE_FILTER_COLUMNS.find((col) => col in sampleRow) || null;
}

/**
 * Column used to join table rows to map polygons (prefer muni_id / tract ids).
 * @param {object|null} sampleRow
 * @param {"municipal"|"census_tracts"|"boundary"|null} geographyType
 * @param {string|null} [preferredColumn]
 */
export function resolveMapGeographyColumn(sampleRow, geographyType, preferredColumn = null) {
  if (preferredColumn && sampleRow && sampleRow[preferredColumn] != null && sampleRow[preferredColumn] !== "") {
    return preferredColumn;
  }
  if (!sampleRow) return preferredColumn || null;

  const candidates =
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts
      ? TRACT_GEO_COLUMNS
      : MUNICIPAL_MAP_JOIN_COLUMNS;

  // Prefer a column that actually has a value (older ACS years often have ct10_id only).
  const withValue = candidates.find((col) => sampleRow[col] != null && sampleRow[col] !== "");
  if (withValue) return withValue;

  return candidates.find((col) => col in sampleRow) || preferredColumn || null;
}

function isNumericLike(value) {
  if (value == null || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return false;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n);
}

/**
 * Find the margin-of-error column paired with a base estimate column.
 * Mirrors DataViewerPage / DatasetHeader pairing (alias + common ACS suffixes).
 * @param {Array<{name?: string, alias?: string, details?: string}>} columnKeys
 * @param {string|null|undefined} baseColumnName
 * @returns {string|null}
 */
export function getMarginColumnForBase(columnKeys = [], baseColumnName) {
  const base = String(baseColumnName || "");
  if (!base) return null;

  const byName = new Set((columnKeys || []).map((c) => String(c?.name || "")).filter(Boolean));
  if (!byName.has(base)) return null;

  const byAlias = {};
  (columnKeys || []).forEach((col) => {
    const alias = String(col?.alias || "").trim().toLowerCase();
    if (alias) byAlias[alias] = String(col?.name || "");
  });

  const normalizeAliasMetric = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/\s*;\s*(estimate|margin of error)\s*$/i, "")
      .replace(/\s*,\s*(estimate|margin of error)\s*$/i, "")
      .trim();

  const getBaseCandidates = (name) => {
    const candidates = [];
    const n = String(name || "");

    if (n.endsWith("_mep")) {
      candidates.push(n.slice(0, -4) + "_p");
    } else if (/mep$/i.test(n)) {
      candidates.push(n.slice(0, -3) + "_p");
    }
    if (n.endsWith("_mp")) {
      candidates.push(n.slice(0, -3) + "_p");
      candidates.push(n.slice(0, -3));
    }
    if (n.endsWith("_me")) {
      candidates.push(n.slice(0, -3));
    } else if (/[0-9][a-z0-9_]*me$/i.test(n)) {
      candidates.push(n.slice(0, -2));
    }
    if (n.endsWith("_moe")) {
      candidates.push(n.slice(0, -4));
    }
    if (
      n.endsWith("_m") &&
      !n.endsWith("_me") &&
      !n.endsWith("_mp") &&
      !n.endsWith("_moe") &&
      !n.endsWith("_mep")
    ) {
      candidates.push(n.slice(0, -2));
    }

    return [...new Set(candidates.filter(Boolean))];
  };

  const pairs = [];
  (columnKeys || []).forEach((col) => {
    const name = String(col?.name || "");
    if (!name) return;

    const alias = String(col?.alias || "").toLowerCase();
    const details = String(col?.details || "").toLowerCase();
    const hintFromMetadata = alias.includes("margin of error") || details.includes("margin of error");
    const suffixHint =
      /(?:_mp|_me|_moe|_mep|_m)$/i.test(name) ||
      /[0-9][a-z0-9_]*me$/i.test(name) ||
      /[a-z0-9_]mep$/i.test(name);
    if (!hintFromMetadata && !suffixHint) return;

    let pairedBase = null;
    if (alias.includes("margin of error")) {
      const estimateAlias = alias.replace("margin of error", "estimate").replace(/\s+/g, " ").trim();
      if (byAlias[estimateAlias]) {
        pairedBase = byAlias[estimateAlias];
      } else {
        const normalized = normalizeAliasMetric(alias);
        const matchedBase = (columnKeys || []).find((candidate) => {
          const a = String(candidate?.alias || "").toLowerCase();
          const isEstimate = /\bestimate\b/i.test(a) || (!/\bmargin of error\b/i.test(a) && !!a);
          return isEstimate && normalizeAliasMetric(a) === normalized;
        });
        if (matchedBase?.name) pairedBase = matchedBase.name;
      }
    }
    if (!pairedBase) {
      pairedBase = getBaseCandidates(name).find((candidate) => byName.has(candidate)) || null;
    }
    if (pairedBase === base) pairs.push(name);
  });

  return pairs[0] || null;
}

/**
 * Columns that can draw a choropleth 
 * Uses all table columns */
export function getMappableColumns(columnKeys = [], rows = [], geographyColumn = null, yearColumn = "") {
  const sample = rows.slice(0, 40);

  const isExcludedIdColumn = (col) => {
    const name = String(col?.name || "");
    const alias = String(col?.alias || "").toLowerCase();
    if (NON_MAPPABLE_COLUMN_NAMES.has(name.toLowerCase())) return true;
    if (ID_LIKE_COLUMN_PATTERN.test(name)) return true;
    if (alias.includes("municipal id") || alias.includes("municipality id") || alias.includes("muni id")) {
      return true;
    }
    if (/(^|[^a-z])id([^a-z]|$)/i.test(name) && /muni|municipal|town|geo/i.test(name)) {
      return true;
    }
    return false;
  };

  return (columnKeys || [])
    .filter((col) => col.name !== geographyColumn)
    .filter((col) => col.name !== yearColumn)
    .filter((col) => !isExcludedIdColumn(col))
    .filter((col) => {
      const alias = String(col?.alias || "").toLowerCase();
      const details = String(col?.details || "").toLowerCase();
      return !(alias.includes("margin of error") || details.includes("margin of error"));
    })
    .filter((col) => sample.some((row) => isNumericLike(row?.[col.name])))
    .map((col) => ({
      name: col.name,
      label: col.alias || col.name,
    }));
}

/**
 * Apply the same year / geography / column filters used by the tabular preview.
 */
export function filterRowsForMapPreview({
  rows = [],
  queryYearColumn = "",
  selectedYears = [],
  geographyColumn = null,
  selectedGeographies = [],
  availableGeographies = [],
  columnFilters = [],
} = {}) {
  let filtered = Array.isArray(rows) ? [...rows] : [];

  if (queryYearColumn && selectedYears?.length) {
    const yearSet = new Set(selectedYears.map(String));
    filtered = filtered.filter((row) => yearSet.has(String(row[queryYearColumn])));
  }

  if (
    geographyColumn &&
    selectedGeographies?.length > 0 &&
    availableGeographies?.length > 0 &&
    selectedGeographies.length < availableGeographies.length
  ) {
    const geoSet = new Set(selectedGeographies);
    filtered = filtered.filter((row) => geoSet.has(row[geographyColumn]));
  }

  if (columnFilters?.length) {
    columnFilters.forEach((filter) => {
      filtered = filtered.filter((row) => {
        const columnValue = row[filter.columnKey];
        if (filter.filterType === "contains") {
          if (columnValue == null) return false;
          return String(columnValue).toLowerCase().includes(String(filter.textValue).toLowerCase());
        }
        if (filter.filterType === "is") {
          if (columnValue == null) return false;
          return String(columnValue) === String(filter.textValue);
        }
        if (filter.filterType === "greaterThan") {
          return Number(columnValue) > Number(filter.textValue);
        }
        if (filter.filterType === "lessThan") {
          return Number(columnValue) < Number(filter.textValue);
        }
        if (filter.filterType === "equals") {
          return Math.abs(Number(columnValue) - Number(filter.textValue)) < 0.005;
        }
        if (filter.filterType === "isEmpty") {
          return columnValue == null || columnValue === "";
        }
        if (filter.filterType === "isNotEmpty") {
          return columnValue != null && columnValue !== "";
        }
        return true;
      });
    });
  }

  return filtered;
}

export function normalizeMunicipalKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeTractKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 11) return digits.slice(-11);
  if (digits.length === 10) return `0${digits}`;
  return digits || raw.toLowerCase();
}

function toNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Collapse multi-year rows to one value per geography (latest year wins when year column present).
 */
export function buildValueByGeography({
  rows,
  geographyColumn,
  valueColumn,
  yearColumn = "",
  geographyType,
} = {}) {
  const normalize =
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts
      ? normalizeTractKey
      : normalizeMunicipalKey;

  const map = new Map();

  (rows || []).forEach((row) => {
    const key = normalize(row?.[geographyColumn]);
    if (!key) return;
    const value = toNumber(row?.[valueColumn]);
    if (value == null) return;

    // ACS years like "2006-10" are not numeric; keep string compare as fallback.
    const rawYear = yearColumn ? row?.[yearColumn] : null;
    const yearNum = rawYear != null && rawYear !== "" ? Number(rawYear) : NaN;
    const year = Number.isFinite(yearNum) ? yearNum : rawYear != null ? String(rawYear) : "";
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { value, year });
      return;
    }
    if (typeof year === "number" && typeof prev.year === "number") {
      if (year > prev.year) map.set(key, { value, year });
      return;
    }
    if (typeof year === "string" && typeof prev.year === "string" && year > prev.year) {
      map.set(key, { value, year });
    }
  });

  const values = new Map();
  map.forEach((entry, key) => values.set(key, entry.value));
  return values;
}

/**
 * Build choropleth values from geometry-joined features 
 * Geometry API returns full rows for the selected year
 */
export function buildValueByGeographyFromFeatures({
  features = [],
  valueColumn,
  geographyType,
} = {}) {
  const map = new Map();
  (features || []).forEach((feature) => {
    const properties = feature?.properties || {};
    const joinKey = properties.__joinKey;
    let key = "";
    if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts) {
      const raw =
        properties.ct20_id ??
        properties.ct10_id ??
        properties.GEOID ??
        properties.geoid ??
        (joinKey && properties[joinKey] != null ? properties[joinKey] : null);
      key = normalizeTractKey(raw);
    } else {
      const raw =
        (joinKey && properties[joinKey] != null ? properties[joinKey] : null) ??
        properties.muni_id ??
        properties.municipal ??
        properties.town ??
        properties.NAME;
      key = normalizeMunicipalKey(raw);
    }
    if (!key) return;
    const value = toNumber(properties[valueColumn]);
    if (value == null) return;
    map.set(key, value);
  });
  return map;
}

function quantileBreaks(sortedValues, breakCount) {
  if (!sortedValues.length || breakCount < 2) return [];
  const breaks = [];
  for (let i = 1; i < breakCount; i += 1) {
    const idx = Math.floor((i / breakCount) * (sortedValues.length - 1));
    breaks.push(sortedValues[idx]);
  }
  // Quantiles on zero-heavy data can repeat the same cut; keep unique ascending breaks.
  return [...new Set(breaks)].sort((a, b) => a - b);
}

/**
 * Infer a display unit from column metadata / naming.
 * Metadata has no dedicated unit field; ACS aliases often use "% …" or end in `_p`.
 * @param {{name?: string, alias?: string, details?: string, label?: string}|null|undefined} column
 * @returns {string|null}
 */
export function getColumnUnit(column) {
  if (!column) return null;
  const name = String(column.name || "");
  const alias = String(column.alias || column.label || "").trim();
  const details = String(column.details || "");

  if (
    /_p$/i.test(name) ||
    alias.startsWith("%") ||
    /\bpercent(?:age)?\b/i.test(alias) ||
    /\bpercent(?:age)?\b/i.test(details)
  ) {
    return "%";
  }
  return null;
}

/**
 * @param {number[]} values
 * @param {{ unit?: string|null }} [options]
 * @returns {{
 *   colorForValue: (n:number|null)=>string,
 *   legend: Array<{label:string,color:string}>,
 *   binningDescription: string,
 * }}
 */
export function buildChoroplethScale(values = [], { unit = null } = {}) {
  const numeric = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!numeric.length) {
    return {
      colorForValue: () => NO_DATA_COLOR,
      legend: [{ label: "No data", color: NO_DATA_COLOR }],
      binningDescription: "Classification: no numeric values",
    };
  }

  const format = (n) => {
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2,
    }).format(n);
    return unit === "%" ? `${formatted}%` : formatted;
  };

  const domainMin = numeric[0];
  const domainMax = numeric[numeric.length - 1];
  const uniqueValues = [...new Set(numeric)];

  if (uniqueValues.length === 1) {
    return {
      colorForValue: (n) => (Number.isFinite(n) ? CHOROPLETH_COLORS[0] : NO_DATA_COLOR),
      legend: [
        { label: format(uniqueValues[0]), color: CHOROPLETH_COLORS[0] },
        { label: "No data", color: NO_DATA_COLOR },
      ],
      binningDescription: "Classification: single value",
    };
  }

  const valuesAreIntegers = numeric.every((n) => Number.isInteger(n));
  const displayDecimals = (n) => (Math.abs(n) >= 100 ? 0 : 2);
  const exclusiveUpper = (min, max) => {
    if (valuesAreIntegers || Number.isInteger(max)) {
      return Math.max(min, max - 1);
    }
    const decimals = Math.max(displayDecimals(min), displayDecimals(max));
    const step = 10 ** -decimals;
    const upper = Number((max - step).toFixed(decimals));
    return Math.max(min, upper);
  };

  // Quantile classification across all numeric values.
  const classifyValues = numeric;
  const classifyMin = domainMin;
  const classifyMax = domainMax;
  const classifyUnique = uniqueValues;

  const availableColors = CHOROPLETH_COLORS;
  const binCount = Math.min(availableColors.length, Math.max(2, classifyUnique.length));

  let breaks = quantileBreaks(classifyValues, binCount).filter((b) => b > classifyMin && b < classifyMax);

  if (breaks.length < Math.min(2, binCount - 1)) {
    const nonzero = classifyValues.filter((v) => v !== 0);
    if (nonzero.length > 1) {
      const extra = quantileBreaks(nonzero, binCount).filter((b) => b > classifyMin && b < classifyMax);
      breaks = [...new Set([...breaks, ...extra])].sort((a, b) => a - b);
    }
  }

  const maxBreaks = availableColors.length - 1;
  if (breaks.length > maxBreaks) {
    const sampled = [];
    for (let i = 0; i < maxBreaks; i += 1) {
      const idx = Math.round((i / (maxBreaks - 1 || 1)) * (breaks.length - 1));
      sampled.push(breaks[idx]);
    }
    breaks = [...new Set(sampled)].sort((a, b) => a - b);
  }

  const uniqueEdges = [...new Set([classifyMin, ...breaks, classifyMax])].sort((a, b) => a - b);
  const ranges = [];
  if (classifyUnique.length === 1) {
    ranges.push({
      min: classifyMin,
      max: classifyMax,
      colorIndex: 0,
    });
  } else {
    for (let i = 0; i < uniqueEdges.length - 1; i += 1) {
      if (uniqueEdges[i] === uniqueEdges[i + 1]) continue;
      ranges.push({
        min: uniqueEdges[i],
        max: uniqueEdges[i + 1],
        colorIndex: i,
      });
    }
  }

  // Mutually exclusive classes: [min, max) for every class except the last, which is [min, max].
  const colorForValue = (n) => {
    if (!Number.isFinite(n)) return NO_DATA_COLOR;
    for (let i = 0; i < ranges.length; i += 1) {
      const isLast = i === ranges.length - 1;
      if (isLast ? n <= ranges[i].max : n < ranges[i].max) {
        const colorIndex = Math.min(ranges[i].colorIndex, CHOROPLETH_COLORS.length - 1);
        return CHOROPLETH_COLORS[colorIndex];
      }
    }
    const last = ranges[ranges.length - 1];
    return CHOROPLETH_COLORS[Math.min(last?.colorIndex ?? 0, CHOROPLETH_COLORS.length - 1)];
  };

  const legend = ranges.map((range, i) => {
    const isLast = i === ranges.length - 1;
    const upper = isLast ? range.max : exclusiveUpper(range.min, range.max);
    const label =
      upper === range.min
        ? format(range.min)
        : `${format(range.min)}-${format(upper)}`;
    return {
      label,
      color: CHOROPLETH_COLORS[Math.min(range.colorIndex, CHOROPLETH_COLORS.length - 1)],
    };
  });
  legend.push({ label: "No data", color: NO_DATA_COLOR });

  const binningDescription = "Classification: Quantile";

  return { colorForValue, legend, binningDescription };
}

/**
 * Join tabular values onto polygon features for Mapbox fill-color match expressions.
 */
export function enrichBoundariesWithValues({
  baseGeojson,
  valueByGeography,
  moeByGeography = null,
  geographyType,
  colorForValue,
  displayNameProperty,
} = {}) {
  if (!baseGeojson?.features) {
    return { type: "FeatureCollection", features: [] };
  }

  const getFeatureKey = (properties = {}) => {
    if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts) {
      // Prefer real tract ids over whatever __joinKey was inferred (e.g. statefp).
      const raw =
        properties.ct20_id ||
        properties.ct10_id ||
        properties.GEOID ||
        properties.geoid ||
        (properties.__joinKey && properties[properties.__joinKey] != null
          ? properties[properties.__joinKey]
          : null);
      return normalizeTractKey(raw);
    }
    // Boundaries / native shape layers: prefer a per-feature id over a shared parent id.
    if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.boundary) {
      const preferred = [
        "nbhd_id",
        "GEOID",
        "geoid",
        "ct20_id",
        "ct10_id",
        "rpa_id",
        "county_id",
        "objectid",
      ];
      for (const col of preferred) {
        if (properties[col] != null && properties[col] !== "") {
          return String(properties[col]);
        }
      }
      const joinKey = properties.__joinKey;
      if (joinKey && properties[joinKey] != null) return String(properties[joinKey]);
      return properties.__mapKey != null ? String(properties.__mapKey) : "";
    }
    const joinKey = properties.__joinKey;
    if (joinKey && properties[joinKey] != null) {
      return normalizeMunicipalKey(properties[joinKey]);
    }
    return normalizeMunicipalKey(
      properties.muni_id ?? properties.town_id ?? properties.municipal ?? properties.town ?? properties.NAME,
    );
  };

  const getDisplayName = (properties = {}) => {
    if (displayNameProperty && properties[displayNameProperty]) {
      return String(properties[displayNameProperty]);
    }
    if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts) {
      return (
        properties.ct20_id ||
        properties.ct10_id
      );
    }
    if (properties.__mapLabel) return String(properties.__mapLabel);
    const town = properties.municipal || properties.town || properties.NAME || "";
    if (town) {
      return String(town)
        .toLowerCase()
        .replace(/\b\w/g, (s) => s.toUpperCase());
    }
    return properties.muni_id != null || properties.town_id != null
      ? `Muni ${properties.muni_id ?? properties.town_id}`
      : "Municipality";
  };

  return {
    type: "FeatureCollection",
    features: baseGeojson.features.map((feature) => {
      const key = getFeatureKey(feature.properties);
      const value = valueByGeography.get(key);
      const hasValue = Number.isFinite(value);
      const moeRaw = moeByGeography?.get(key);
      const moe = Number.isFinite(moeRaw) ? moeRaw : null;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          __mapKey: key,
          __mapValue: hasValue ? value : null,
          __mapMoe: moe,
          __mapColor: colorForValue(hasValue ? value : null),
          __mapLabel: getDisplayName(feature.properties),
        },
      };
    }),
  };
}

/**
 * Convert NAD83 / Massachusetts Mainland (EPSG:26986, meters) → WGS84 lon/lat.
 * Geometry API returns State Plane coordinates; Mapbox needs EPSG:4326.
 * @param {number} x
 * @param {number} y
 * @returns {[number, number]}
 */
export function massachusettsStatePlaneToWgs84(x, y) {
  // GRS80 ellipsoid
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const e = Math.sqrt(e2);

  const deg2rad = Math.PI / 180;
  const lat1 = 42.68333333333333 * deg2rad;
  const lat2 = 41.71666666666667 * deg2rad;
  const lat0 = 41 * deg2rad;
  const lon0 = -71.5 * deg2rad;
  const falseEasting = 200000.0;
  const falseNorthing = 750000.0;

  const m = (lat) => {
    const sinLat = Math.sin(lat);
    return (
      (Math.cos(lat) / Math.sqrt(1 - e2 * sinLat * sinLat))
    );
  };
  const t = (lat) => {
    const sinLat = Math.sin(lat);
    return (
      Math.tan(Math.PI / 4 - lat / 2) /
      Math.pow((1 - e * sinLat) / (1 + e * sinLat), e / 2)
    );
  };

  const m1 = m(lat1);
  const m2 = m(lat2);
  const t0 = t(lat0);
  const t1 = t(lat1);
  const t2 = t(lat2);
  const n = Math.log(m1 / m2) / Math.log(t1 / t2);
  const f0 = m1 / (n * Math.pow(t1, n));
  const rho0 = a * f0 * Math.pow(t0, n);

  const xPrime = x - falseEasting;
  const yPrime = y - falseNorthing;
  const rho = Math.sign(n) * Math.sqrt(xPrime * xPrime + (rho0 - yPrime) * (rho0 - yPrime));
  const theta = Math.atan2(xPrime, rho0 - yPrime);
  const tVal = Math.pow(rho / (a * f0), 1 / n);

  let lat = Math.PI / 2 - 2 * Math.atan(tVal);
  for (let i = 0; i < 5; i += 1) {
    const sinLat = Math.sin(lat);
    lat =
      Math.PI / 2 -
      2 *
        Math.atan(
          tVal * Math.pow((1 - e * sinLat) / (1 + e * sinLat), e / 2),
        );
  }
  const lon = theta / n + lon0;
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

function isProjectedCoord(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [x, y] = coord;
  return Math.abs(x) > 180 || Math.abs(y) > 90;
}

function reprojectPosition(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return coord;
  if (!isProjectedCoord(coord)) return [coord[0], coord[1]];
  return massachusettsStatePlaneToWgs84(coord[0], coord[1]);
}

function reprojectCoords(coords) {
  if (!Array.isArray(coords) || coords.length === 0) return coords;
  if (typeof coords[0] === "number") return reprojectPosition(coords);
  return coords.map(reprojectCoords);
}

function reprojectGeometry(geometry) {
  if (!geometry?.type || !geometry.coordinates) return geometry;
  return {
    ...geometry,
    coordinates: reprojectCoords(geometry.coordinates),
  };
}

/**
 * Normalize metadata / API join_key strings.
 * Possible values: "ct10_id", "ct20_id", "ct10_id or ct20_id", "muni_id", "municipal", …
 */
export function parseGeometryJoinKey(joinKey) {
  const raw = String(joinKey ?? "").trim().toLowerCase();
  if (!raw) return { mode: "unknown", tokens: [] };

  const hasCt10 = /\bct10_id\b/.test(raw);
  const hasCt20 = /\bct20_id\b/.test(raw);
  const hasMuniId = /\bmuni_id\b/.test(raw);
  const hasMunicipal = /\bmunicipal\b/.test(raw) && !hasMuniId;

  if (hasCt10 && hasCt20) {
    return { mode: "ct10_or_ct20", tokens: ["ct10_id", "ct20_id"] };
  }
  if (hasCt20) return { mode: "ct20_id", tokens: ["ct20_id"] };
  if (hasCt10) return { mode: "ct10_id", tokens: ["ct10_id"] };
  if (hasMuniId) return { mode: "muni_id", tokens: ["muni_id"] };
  if (hasMunicipal) return { mode: "municipal", tokens: ["municipal"] };
  return { mode: "unknown", tokens: [] };
}

function resultJoinToken(result) {
  return String(result?.join_key || result?.data_column || "")
    .trim()
    .toLowerCase();
}

function countResultRowsForYear(result, yearKey) {
  const rowsByYear = result?.rows || {};
  if (yearKey) {
    const rows = rowsByYear[yearKey];
    if (!Array.isArray(rows)) return 0;
    return rows.filter((row) => row?.geometry).length || rows.length;
  }
  return Object.values(rowsByYear).reduce((sum, rows) => {
    if (!Array.isArray(rows)) return sum;
    return sum + (rows.filter((row) => row?.geometry).length || rows.length);
  }, 0);
}

/**
 * Pick the geometry API result for the requested year.
 *
 * Prefer the metadata join_key (ct10_id or ct20_id) when it has rows for that year.
 * If it doesn't (common for ACS years that switched from ct10 → ct20),
 * use whichever result in `results[]` actually has geometries.
 *
 * Supports both `{ results: [...] }` and flat single-result responses.
 */
export function pickGeometryApiResult(payload, year) {
  if (!payload) return null;
  const yearKey = year != null ? String(year) : null;
  const joinMeta = parseGeometryJoinKey(payload.join_key);

  if (Array.isArray(payload.results) && payload.results.length) {
    const candidates = payload.results.filter((result) => countResultRowsForYear(result, yearKey) > 0);
    if (!candidates.length) return null;

    // Prefer the metadata join column when it has data for this year.
    if (joinMeta.mode === "ct10_id") {
      const preferred = candidates.find((r) => resultJoinToken(r) === "ct10_id");
      if (preferred) return preferred;
    }
    if (joinMeta.mode === "ct20_id") {
      const preferred = candidates.find((r) => resultJoinToken(r) === "ct20_id");
      if (preferred) return preferred;
    }

    // Metadata join column missing for this year (e.g. join_key=ct10_id but 2020-24
    // only has ct20_id) — pick the result with the most geometries.
    if (candidates.length === 1) return candidates[0];
    return [...candidates].sort(
      (a, b) => countResultRowsForYear(b, yearKey) - countResultRowsForYear(a, yearKey),
    )[0];
  }

  // Flat response shape (single strategy)
  if (payload.rows && typeof payload.rows === "object") {
    if (yearKey && countResultRowsForYear(payload, yearKey) === 0) {
      return null;
    }
    return payload;
  }
  return null;
}

/**
 * turn data from the geometry API into a Mapbox-ready GeoJSON FeatureCollection.
 * Coordinates are converted from MA State Plane to lon/lat (WGS84).
 *
 * @param {object} result
 * @param {string|number|null} year
 */
export function geometryApiResultToFeatureCollection(result, year) {
  if (!result?.rows) return { type: "FeatureCollection", features: [] };
  const yearKey = year != null ? String(year) : Object.keys(result.rows)[0];
  const rows = (yearKey && result.rows[yearKey]) || [];
  const joinKey = result.join_key || result.data_column || "ct20_id";
  const isMunicipal = joinKey === "muni_id" || joinKey === "municipal";

  return {
    type: "FeatureCollection",
    features: rows
      .filter((row) => row?.geometry)
      .map((row) => {
        const { geometry, data, ...rest } = row;
        const nested =
          Array.isArray(data) && data.length
            ? data[0]
            : data && typeof data === "object"
              ? data
              : null;
        const properties = {
          ...(nested && typeof nested === "object" ? nested : {}),
          ...rest,
        };
        // Keep full nested rows for export when present.
        if (Array.isArray(data) && data.length > 1) {
          properties.__dataRows = data;
        }

        const id =
          properties[joinKey] ??
          rest[joinKey] ??
          properties.muni_id ??
          properties.municipal ??
          properties.ct20_id ??
          properties.ct10_id ??
          properties.geoid;
        const municipalLabel = properties.municipal || properties.town || rest.municipal;
        const tractLabel =
          (joinKey === "ct10_id" ? properties.ct10_id : null) ||
          (joinKey === "ct20_id" ? properties.ct20_id : null) ||
          properties.ct20_id ||
          properties.ct10_id ||
          properties.geoid ||
          properties.GEOID;
        return {
          type: "Feature",
          id: id != null ? String(id) : undefined,
          properties: {
            ...properties,
            __joinKey: joinKey,
            __mapLabel: isMunicipal
              ? municipalLabel
                ? String(municipalLabel)
                    .toLowerCase()
                    .replace(/\b\w/g, (s) => s.toUpperCase())
                : properties.muni_id != null
                  ? `Muni ${properties.muni_id}`
                  : "Municipality"
              : tractLabel,
          },
          geometry: reprojectGeometry(geometry),
        };
      }),
  };
}

/**
 * Fetch joined geometries from the DataCommon geometry API.
 * - Census tracts: 2010 (`ct10_id`) or 2020 (`ct20_id`) polygons
 * - Municipal: `muni_id` / `municipal` -> mapc.ma_municipalities
 *
 * Example:
 * `/api/geometry?token=...&database=ds&schema=tabular&table=..._acs_m&years=2018-22&yearColumn=acs_year`
 *
 * @param {{
 *   database?: string,
 *   schema?: string,
 *   table: string,
 *   years?: Array<string|number>,
 *   yearColumn?: string|null,
 * }} params
 */
export async function fetchDatasetGeometry(params = {}) {
  const { database = "ds", schema = "tabular", table, years = [], yearColumn = null } = params;
  if (!table) throw new Error("table is required for geometry fetch");

  const search = new URLSearchParams({
    token: import.meta.env.VITE_MAPC_API_TOKEN,
    database,
    schema,
    table,
  });
  if (years?.length) {
    search.set("years", years.map(String).join(","));
  }
  if (yearColumn) {
    search.set("yearColumn", String(yearColumn));
  }

  const response = await fetch(`/api/geometry?${search.toString()}`);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Geometry API HTTP ${response.status}`);
  }

  const payload = await response.json();
  const year = years?.[0] ?? payload.years?.[0] ?? null;
  const result = pickGeometryApiResult(payload, year);
  if (!result) {
    throw new Error("Geometry API returned no features for this year");
  }

  const featureCollection = geometryApiResultToFeatureCollection(result, year);
  if (!featureCollection.features.length) {
    throw new Error("Geometry API returned no polygons for this year");
  }

  return {
    featureCollection,
    joinKey: result.join_key || result.data_column || null,
    geometrySource: result.geometry_source || null,
    yearColumn: payload.year_column || yearColumn || null,
    year,
  };
}

export function formatMapValue(value, unit = null) {
  if (!Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  }).format(value);
  return unit === "%" ? `${formatted}%` : formatted;
}

/**
 * Adapt the static / Redux municipal FeatureCollection for map preview joins.
 * Static asset uses `town` / `town_id`; GIS table uses `municipal` / `muni_id`.
 */
export function adaptMunicipalBoundaryGeojson(geojson) {
  if (!geojson?.features?.length) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: geojson.features.map((feature) => {
      const props = feature.properties || {};
      const muniId = props.muni_id ?? props.town_id ?? null;
      const municipal = props.municipal ?? props.town ?? props.NAME ?? null;
      return {
        ...feature,
        properties: {
          ...props,
          muni_id: muniId,
          municipal,
          __joinKey: "muni_id",
          __mapLabel: municipal != null ? String(municipal) : muniId != null ? `Muni ${muniId}` : "Municipality",
        },
      };
    }),
  };
}

/** Overlay boundary tables in gisdata.mapc */
export const GIS_BOUNDARY_LAYERS = {
  municipal: {
    database: "gisdata",
    schema: "mapc",
    table: "ma_municipalities",
  },
  // MAPC region outline uses the static asset (same as community profiles MapBox).
  // gisdata.mapc.mapc_municipalities_poly is not authorized for the public API token.
  mapcRegion: {
    source: "static",
    asset: "mapc-regions",
  },
};

/**
 * Quote mixed-case Postgres identifiers (e.g. GEOID) so they are not folded to lowercase.
 * @param {string} column
 * @returns {string}
 */
function quoteSqlIdentifier(column) {
  if (!column || typeof column !== "string") return column;
  if (column.includes("(") || column.includes('"')) return column;
  if (column !== column.toLowerCase()) return `"${column.replace(/"/g, '""')}"`;
  return column;
}

/**
 * Read a row value when the API may return GEOID or geoid.
 * @param {object} row
 * @param {string} column
 */
function rowValue(row, column) {
  if (!row || column == null) return undefined;
  if (row[column] !== undefined) return row[column];
  const lower = String(column).toLowerCase();
  if (row[lower] !== undefined) return row[lower];
  const match = Object.keys(row).find((key) => key.toLowerCase() === lower);
  return match != null ? row[match] : undefined;
}

/** Attribute columns to request (everything except geometry). */
function attributeColumnsFromNames(columnNames = []) {
  return [...new Set(
    (columnNames || [])
      .map((name) => String(name || "").trim())
      .filter((name) => name && !OWN_SHAPE_COLUMN_NAMES.has(name.toLowerCase())),
  )].slice(0, 40);
}

/** Stable id for feature keys — prefer per-feature ids, never a shared parent id like muni_id. */
function pickIdColumn(attributeColumns = []) {
  const exact = (wanted) =>
    attributeColumns.find((col) => col.toLowerCase() === wanted);
  // Most-specific first. muni_id is last: neighborhoods / tracts share one muni_id.
  const preferred = [
    "geoid",
    "ct20_id",
    "ct10_id",
    "nbhd_id",
    "rpa_id",
    "county_id",
    "objectid",
    "muni_id",
  ];
  for (const want of preferred) {
    const hit = exact(want);
    if (hit) return hit;
  }
  return (
    attributeColumns.find((col) => /_id$/i.test(col)) ||
    exact("id") ||
    attributeColumns[0] ||
    "objectid"
  );
}

/** Human-readable label — prefer a name-like column, else the id. */
function pickLabelColumn(attributeColumns = [], idColumn) {
  const preferredNames = [
    "municipal",
    "county",
    "rpa_name",
    "neighborhd",
    "namelsad",
    "name",
    "acronym",
    "town",
  ];
  for (const want of preferredNames) {
    const hit = attributeColumns.find((col) => col.toLowerCase() === want);
    if (hit) return hit;
  }
  const idLower = String(idColumn || "").toLowerCase();
  const fallback = attributeColumns.find((col) => {
    const lower = col.toLowerCase();
    return (
      lower !== idLower &&
      lower !== "objectid" &&
      lower !== "id" &&
      !/_id$/i.test(col) &&
      !/^(area_|aland|awater)/i.test(col)
    );
  });
  return fallback || idColumn;
}

const gisBoundaryCache = new Map();
const nativeBoundaryCache = new Map();

/**
 * Load a table’s own `shape` column as WGS84 GeoJSON (no geometry-API join).
 * Uses column names from the DB / page — no hardcoded table list.
 *
 * @param {{
 *   database: string,
 *   schema: string,
 *   table: string,
 *   columnNames?: string[],
 *   boundaryLabel?: string|null,
 * }} params
 */
export async function fetchNativeBoundaryGeojson(params = {}) {
  const { table, database, schema } = params;
  if (!table || !database || !schema) {
    throw new Error("database, schema, and table are required for native boundary fetch");
  }

  const attributeColumns = attributeColumnsFromNames(params.columnNames);
  if (!attributeColumns.length) {
    throw new Error(`No attribute columns available for ${schema}.${table}`);
  }

  const idColumn = pickIdColumn(attributeColumns);
  const labelColumn = pickLabelColumn(attributeColumns, idColumn);
  const boundaryLabel = params.boundaryLabel || "Boundaries";
  const cacheKey = `${database}.${schema}.${table}:${attributeColumns.join(",")}`;

  if (nativeBoundaryCache.has(cacheKey)) {
    return nativeBoundaryCache.get(cacheKey);
  }

  const pending = (async () => {
    const columns = [
      ...attributeColumns.map(quoteSqlIdentifier),
      "sde.ST_AsText(shape) as geom_wkt",
    ].join(",");
    const search = new URLSearchParams({
      token: import.meta.env.VITE_MAPC_API_TOKEN,
      database,
      schema,
      table,
      columns,
      orderByColumn: quoteSqlIdentifier(idColumn),
      orderByDirection: "ASC",
      limit: "5000",
    });

    const response = await fetch(`/api?${search.toString()}`);
    if (!response.ok) {
      throw new Error(`Native boundary HTTP ${response.status}`);
    }
    const payload = await response.json();
    const rows = payload.rows || [];

    const features = rows
      .map((row) => {
        const geometry = parseWktPolygon(rowValue(row, "geom_wkt"));
        if (!geometry) return null;
        const id = rowValue(row, idColumn);
        const label = rowValue(row, labelColumn);
        const properties = {
          __joinKey: idColumn,
          __mapLabel: String(label ?? id ?? "Feature"),
        };
        attributeColumns.forEach((col) => {
          const value = rowValue(row, col);
          if (value != null) properties[col] = value;
        });
        // Geometry API / details panel often look for ct20_id on 2020 tracts.
        if (properties.GEOID != null && properties.ct20_id == null) {
          properties.ct20_id = properties.GEOID;
        }
        return {
          type: "Feature",
          id: id != null ? String(id) : undefined,
          properties,
          geometry: reprojectGeometry(geometry),
        };
      })
      .filter(Boolean);

    if (!features.length) {
      throw new Error(`No geometries returned for ${schema}.${table}`);
    }

    return {
      featureCollection: { type: "FeatureCollection", features },
      joinKey: idColumn,
      boundaryLabel,
    };
  })();

  nativeBoundaryCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (err) {
    nativeBoundaryCache.delete(cacheKey);
    throw err;
  }
}

/**
 * Parse a simple WKT POLYGON / MULTIPOLYGON into GeoJSON geometry coordinates.
 * @param {string} wkt
 * @returns {{ type: string, coordinates: any } | null}
 */
export function parseWktPolygon(wkt) {
  if (!wkt || typeof wkt !== "string") return null;
  const trimmed = wkt.trim();

  const parseRing = (ringText) =>
    ringText
      .trim()
      .split(",")
      .map((pair) => {
        const parts = pair.trim().split(/\s+/).map(Number);
        if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
          return null;
        }
        return [parts[0], parts[1]];
      })
      .filter(Boolean);

  const stripOneOuterParenPair = (value) => {
    const text = value.trim();
    if (!text.startsWith("(") || !text.endsWith(")")) return text;
    let depth = 0;
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === "(") depth += 1;
      else if (text[i] === ")") {
        depth -= 1;
        if (depth === 0) {
          if (i !== text.length - 1) return text;
          return text.slice(1, -1).trim();
        }
      }
    }
    return text;
  };

  const splitTopLevel = (value) => {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i += 1) {
      const ch = value[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      else if (ch === "," && depth === 0) {
        parts.push(value.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(value.slice(start).trim());
    return parts.filter(Boolean);
  };

  const parsePolygonCoords = (polygonText) => {
    const body = stripOneOuterParenPair(polygonText);
    return splitTopLevel(body)
      .map((ringText) => parseRing(stripOneOuterParenPair(ringText)))
      .filter((ring) => ring.length >= 4);
  };

  if (/^MULTIPOLYGON/i.test(trimmed)) {
    const content = stripOneOuterParenPair(trimmed.replace(/^MULTIPOLYGON\s*/i, ""));
    const polygons = splitTopLevel(content)
      .map(parsePolygonCoords)
      .filter((rings) => rings.length > 0);
    if (!polygons.length) return null;
    return { type: "MultiPolygon", coordinates: polygons };
  }

  if (/^POLYGON/i.test(trimmed)) {
    const rings = parsePolygonCoords(trimmed.replace(/^POLYGON\s*/i, ""));
    if (!rings.length) return null;
    return { type: "Polygon", coordinates: rings };
  }

  return null;
}

/**
 * fetch mapc boundary overlays from gisdata (municipal) or static assets (MAPC region)
 */
export async function fetchGisBoundaryLayer(layerKey) {
  const config = GIS_BOUNDARY_LAYERS[layerKey];
  if (!config) {
    throw new Error(`Unknown GIS boundary layer: ${layerKey}`);
  }

  if (gisBoundaryCache.has(layerKey)) {
    return gisBoundaryCache.get(layerKey);
  }

  const pending = (async () => {
    if (config.source === "static" && config.asset === "mapc-regions") {
      const module = await import("../assets/data/mapc-regions.json");
      const fc = module.default || module;
      if (!fc?.features?.length) {
        throw new Error("MAPC regions asset has no features");
      }
      return fc;
    }

    const search = new URLSearchParams({
      token: import.meta.env.VITE_MAPC_API_TOKEN,
      database: config.database,
      schema: config.schema,
      table: config.table,
      columns: "muni_id,municipal,sde.ST_AsText(shape) as geom_wkt",
      orderByColumn: "muni_id",
      orderByDirection: "ASC",
      limit: "1000",
    });

    const response = await fetch(`/api?${search.toString()}`);
    if (!response.ok) {
      throw new Error(`GIS boundary HTTP ${response.status}`);
    }
    const payload = await response.json();
    const rows = payload.rows || [];

    const features = rows
      .map((row) => {
        const geometry = parseWktPolygon(row.geom_wkt);
        if (!geometry) return null;
        return {
          type: "Feature",
          properties: {
            muni_id: row.muni_id,
            municipal: row.municipal,
            town: row.municipal,
          },
          geometry: reprojectGeometry(geometry),
        };
      })
      .filter(Boolean);

    if (!features.length) {
      throw new Error(`No geometries returned for ${config.schema}.${config.table}`);
    }

    return { type: "FeatureCollection", features };
  })();

  gisBoundaryCache.set(layerKey, pending);
  try {
    return await pending;
  } catch (err) {
    gisBoundaryCache.delete(layerKey);
    throw err;
  }
}

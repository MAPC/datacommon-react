/** Helpers for dataset browser map-preview choropleths. */

export const MAP_VIEW_GEOGRAPHY_TYPES = {
  municipal: "municipal",
  census_tracts: "census_tracts",
};

const MUNICIPAL_GEO_COLUMNS = ["muni_id", "muni_name", "municipal"];
const TRACT_GEO_COLUMNS = [
  "ct20_id",
  "ct10_id",
  "geoid",
  "GEOID",
];

const ID_LIKE_COLUMN_PATTERN =
  /^(muni(_?id)?|municipal(_?id)?|town(_?id)?|municipality(_?id)?|geo(_?id)?|objectid|gid)$/i;

const NON_MAPPABLE_COLUMN_NAMES = new Set(
  [
    "seq_id",
    "shape",
    "geometry",
    "geom",
    "the_geom",
    ...MUNICIPAL_GEO_COLUMNS,
    ...TRACT_GEO_COLUMNS,
  ].map((name) => name.toLowerCase()),
);

const NO_DATA_COLOR = "#E0E0E0";
const CHOROPLETH_COLORS = ["#EDF8FB", "#B2E2E2", "#66C2A4", "#2CA25F", "#006D2C"];

/**
 * @param {string} tableName
 * @returns {"municipal"|"census_tracts"|null}
 */
export function detectDatasetGeographyType(tableName) {
  if (!tableName || typeof tableName !== "string") return null;
  if (tableName.endsWith("_m")) return MAP_VIEW_GEOGRAPHY_TYPES.municipal;
  if (tableName.endsWith("_ct")) return MAP_VIEW_GEOGRAPHY_TYPES.census_tracts;
  return null;
}

/**
 * @param {string|null|undefined} geographyType
 * @returns {boolean}
 */
export function isMapPreviewSupported(geographyType) {
  return (
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal ||
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts
  );
}

/**
 * @param {object|null} sampleRow
 * @param {"municipal"|"census_tracts"|null} geographyType
 * @param {string|null} [preferredColumn]
 */
export function resolveMapGeographyColumn(sampleRow, geographyType, preferredColumn = null) {
  if (preferredColumn && sampleRow && preferredColumn in sampleRow) {
    return preferredColumn;
  }
  if (!sampleRow) return preferredColumn || null;

  const candidates =
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts
      ? TRACT_GEO_COLUMNS
      : MUNICIPAL_GEO_COLUMNS;

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
 * Columns that can drive a choropleth (numeric values present in sample rows).
 * Uses all table columns (not the table-view column selection), since that control is hidden in map view.
 * @param {Array<{name:string, alias?:string}>} columnKeys
 * @param {object[]} rows
 * @param {string|null} geographyColumn
 * @param {string} [yearColumn]
 */
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
 * Build choropleth values from geometry-joined features (preferred for map view).
 * Geometry API returns full rows for the selected year and is not limited to the
 * browser's 15k-row table preview, so older years still map correctly.
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
        (joinKey && properties[joinKey] != null ? properties[joinKey] : null) ??
        properties.ct20_id ??
        properties.ct10_id ??
        properties.geoid ??
        properties.GEOID;
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
  if (!sortedValues.length) return [];
  const breaks = [];
  for (let i = 1; i < breakCount; i += 1) {
    const idx = Math.floor((i / breakCount) * (sortedValues.length - 1));
    breaks.push(sortedValues[idx]);
  }
  return breaks;
}

/**
 * @param {number[]} values
 * @returns {{ colorForValue: (n:number|null)=>string, legend: Array<{label:string,color:string}> }}
 */
export function buildChoroplethScale(values = []) {
  const numeric = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!numeric.length) {
    return {
      colorForValue: () => NO_DATA_COLOR,
      legend: [{ label: "No data", color: NO_DATA_COLOR }],
    };
  }

  const unique = [...new Set(numeric)];
  const colorCount = Math.min(CHOROPLETH_COLORS.length, Math.max(2, unique.length));
  const colors = CHOROPLETH_COLORS.slice(0, colorCount);
  const breaks = quantileBreaks(numeric, colorCount);

  const colorForValue = (n) => {
    if (!Number.isFinite(n)) return NO_DATA_COLOR;
    let idx = 0;
    while (idx < breaks.length && n > breaks[idx]) idx += 1;
    return colors[Math.min(idx, colors.length - 1)];
  };

  const format = (n) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2,
    }).format(n);

  const legend = [];
  let lower = numeric[0];
  for (let i = 0; i < colors.length; i += 1) {
    const upper = i < breaks.length ? breaks[i] : numeric[numeric.length - 1];
    legend.push({
      label: i === 0 ? `${format(lower)} – ${format(upper)}` : `${format(lower)} – ${format(upper)}`,
      color: colors[i],
    });
    lower = upper;
  }
  legend.push({ label: "No data", color: NO_DATA_COLOR });

  return { colorForValue, legend };
}

/**
 * Join tabular values onto polygon features for Mapbox fill-color match expressions.
 */
export function enrichBoundariesWithValues({
  baseGeojson,
  valueByGeography,
  geographyType,
  colorForValue,
  displayNameProperty,
} = {}) {
  if (!baseGeojson?.features) {
    return { type: "FeatureCollection", features: [] };
  }

  const getFeatureKey = (properties = {}) => {
    if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts) {
      const joinKey = properties.__joinKey;
      if (joinKey && properties[joinKey] != null) {
        return normalizeTractKey(properties[joinKey]);
      }
      const raw =
        properties.ct20_id ||
        properties.ct10_id ||
        properties.GEOID20 ||
        properties.geoid20 ||
        properties.GEOID10 ||
        properties.geoid10 ||
        properties.GEOID ||
        properties.geoid ||
        properties.TRACTCE20 ||
        properties.TRACTCE;
      return normalizeTractKey(raw);
    }
    const joinKey = properties.__joinKey;
    if (joinKey && properties[joinKey] != null) {
      return normalizeMunicipalKey(properties[joinKey]);
    }
    return normalizeMunicipalKey(
      properties.muni_id ?? properties.town ?? properties.municipal ?? properties.NAME,
    );
  };

  const getDisplayName = (properties = {}) => {
    if (displayNameProperty && properties[displayNameProperty]) {
      return String(properties[displayNameProperty]);
    }
    if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts) {
      return (
        properties.__mapLabel ||
        properties.ct20_id ||
        properties.ct10_id ||
        properties.NAME20 ||
        properties.NAMELSAD20 ||
        properties.NAME ||
        properties.geoid20 ||
        properties.GEOID20 ||
        "Tract"
      );
    }
    if (properties.__mapLabel) return String(properties.__mapLabel);
    const town = properties.municipal || properties.NAME || "";
    if (town) {
      return String(town)
        .toLowerCase()
        .replace(/\b\w/g, (s) => s.toUpperCase());
    }
    return properties.muni_id != null ? `Muni ${properties.muni_id}` : "Municipality";
  };

  return {
    type: "FeatureCollection",
    features: baseGeojson.features.map((feature) => {
      const key = getFeatureKey(feature.properties);
      const value = valueByGeography.get(key);
      const hasValue = Number.isFinite(value);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          __mapKey: key,
          __mapValue: hasValue ? value : null,
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
 * Pick the geometry API result that has rows for the requested year.
 * Prefer 2020 tracts (ct20_id) when both vintages are present.
 * Supports both `{ results: [...] }` and flat single-result responses.
 */
export function pickGeometryApiResult(payload, year) {
  if (!payload) return null;
  const yearKey = year != null ? String(year) : null;

  if (Array.isArray(payload.results) && payload.results.length) {
    const withRows = payload.results.filter((result) => {
      const rowsByYear = result?.rows || {};
      if (yearKey && Array.isArray(rowsByYear[yearKey]) && rowsByYear[yearKey].length) {
        return true;
      }
      return Object.values(rowsByYear).some((rows) => Array.isArray(rows) && rows.length > 0);
    });
    if (!withRows.length) return null;
    const prefer20 = withRows.find((r) => r.join_key === "ct20_id" || r.data_column === "ct20_id");
    return prefer20 || withRows[0];
  }

  // Flat response shape
  if (payload.rows && typeof payload.rows === "object") {
    return payload;
  }
  return null;
}

/**
 * Convert a geometry API result into a WGS84 GeoJSON FeatureCollection.
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
        const { geometry, ...properties } = row;
        const id =
          properties[joinKey] ??
          properties.muni_id ??
          properties.municipal ??
          properties.ct20_id ??
          properties.ct10_id ??
          properties.geoid;
        const municipalLabel = properties.municipal || properties.town || properties.NAME;
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

/**
 * @deprecated Prefer fetchDatasetGeometry for tract map preview.
 * MassGIS Census 2020 tracts fallback when the geometry API has no features.
 */
export async function fetchMassachusettsCensusTracts() {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "GEOID20,NAME20,NAMELSAD20",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });

  const urls = [
    `https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/Census2020/Census2020_Tracts/MapServer/0/query?${params}`,
    `https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/Census_2020_Tracts_MAPC/FeatureServer/0/query?${params}`,
  ];

  let lastError;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`Tract boundaries HTTP ${response.status}`);
        continue;
      }
      const geojson = await response.json();
      if (!geojson?.features?.length) {
        lastError = new Error("Tract boundaries response had no features");
        continue;
      }
      return geojson;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Unable to load census tract boundaries");
}

export function formatMapValue(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  }).format(value);
}

const INTERNAL_MAP_PROPERTY_KEYS = new Set([
  "__mapKey",
  "__mapColor",
  "__mapLabel",
  "__mapValue",
  "__joinKey",
  "__dataRows",
]);

/**
 * Build a downloadable GeoJSON FeatureCollection from painted map features.
 * Strips internal choropleth paint keys; keeps data attributes and geometries.
 * @param {object|null|undefined} featureCollection
 * @returns {object}
 */
export function buildExportableMapGeojson(featureCollection) {
  const features = (featureCollection?.features || [])
    .filter((feature) => feature?.geometry)
    .map((feature) => {
      const properties = {};
      Object.entries(feature.properties || {}).forEach(([key, value]) => {
        if (INTERNAL_MAP_PROPERTY_KEYS.has(key)) return;
        properties[key] = value;
      });
      return {
        type: "Feature",
        id: feature.id,
        properties,
        geometry: feature.geometry,
      };
    });

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * @param {object} featureCollection
 * @param {string} filename
 */
export function downloadMapGeojson(featureCollection, filename) {
  const geojson = buildExportableMapGeojson(featureCollection);
  const blob = new Blob([JSON.stringify(geojson)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".geojson") ? filename : `${filename}.geojson`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Overlay boundary tables in gisdata.mapc */
export const GIS_BOUNDARY_LAYERS = {
  municipal: {
    database: "gisdata",
    schema: "mapc",
    table: "ma_municipalities",
  },
  mapcRegion: {
    database: "gisdata",
    schema: "mapc",
    table: "mapc_municipalities_poly",
  },
};

const gisBoundaryCache = new Map();

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
 * Fetch municipal / MAPC boundary overlays from gisdata.
 * SQL equivalent:
 *   select muni_id, municipal, shape from mapc.<table> order by muni_id
 *
 * @param {"municipal"|"mapcRegion"} layerKey
 * @returns {Promise<GeoJSON.FeatureCollection>}
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

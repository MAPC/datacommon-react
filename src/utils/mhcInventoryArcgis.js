import locations from "../constants/locations";
import { parseWktPoint, reprojectGeometry } from "./datasetMapPreview";

export const MHC_FEATURE_SERVER_BASE =
  "https://services1.arcgis.com/hGdibHYSPO59RG1h/ArcGIS/rest/services/MHC_Inventory_GDB/FeatureServer";

export const MHC_LAYER_IDS = {
  points: 0,
  areas: 1,
};

const gisPointsCache = new Map();

const PAGE_SIZE = 2000;
const PARALLEL_PAGE_CONCURRENCY = 5;
const INVENTORY_FIELDS_SHARED = [
  "OBJECTID",
  "MHCN",
  "TYPE",
  "DESIGNATIO",
  "D_DATE",
  "LEGEND",
  "HISTORIC_N",
  "COMMON_NAM",
  "ADDRESS",
  "TOWN_NAME",
  "CONSTRUCTI",
  "MAKER",
  "USE_TYPE",
  "SIGNIFICAN",
];

function outFieldsForLayer(layerId) {
  if (layerId === MHC_LAYER_IDS.points) {
    return [...INVENTORY_FIELDS_SHARED, "DEMOLISHED", "ARCHITECTU"].join(",");
  }
  return [...INVENTORY_FIELDS_SHARED, "ARCH"].join(",");
}

const metadataCache = new Map();
const geojsonCache = new Map();

async function queryArcgisPage(layerId, where, offset, recordCount) {
  const search = new URLSearchParams({
    where: where || "1=1",
    outFields: outFieldsForLayer(layerId),
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultOffset: String(offset),
    resultRecordCount: String(recordCount),
  });
  const url = `${MHC_FEATURE_SERVER_BASE}/${layerId}/query?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MHC inventory query HTTP ${res.status}`);
  }
  const fc = await res.json();
  if (fc?.error) {
    throw new Error(fc.error.message || "MHC inventory query failed");
  }
  const features = Array.isArray(fc.features) ? fc.features : [];
  const exceeded = Boolean(fc.exceededTransferLimit ?? fc.properties?.exceededTransferLimit);
  return { features, exceeded };
}

async function fetchArcgisFeatureCount(layerId, where) {
  const search = new URLSearchParams({
    where: where || "1=1",
    returnCountOnly: "true",
    f: "json",
  });
  const url = `${MHC_FEATURE_SERVER_BASE}/${layerId}/query?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MHC count query HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json?.error) {
    throw new Error(json.error.message || "MHC count query failed");
  }
  const count = Number(json.count);
  return Number.isFinite(count) ? count : 0;
}

function escapeSqlString(value) {
  return String(value || "").replace(/'/g, "''");
}

export function normalizeTownName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Match profile display name to the municipality label used in ma-munis / dropdown options
 * (e.g. "Boston" → "BOSTON").
 * @param {string} displayName
 * @param {object|null|undefined} municipalFeature
 * @param {{ features?: object[] }|null|undefined} municipalityGeojson
 */
export function resolveProfileTownName(displayName, municipalFeature, municipalityGeojson) {
  const fromFeature = municipalFeature?.properties?.town;
  if (fromFeature) return String(fromFeature);
  const norm = normalizeTownName(displayName);
  if (!norm) return "";
  const match = (municipalityGeojson?.features || []).find(
    (f) => normalizeTownName(f.properties?.town) === norm,
  );
  return match?.properties?.town ? String(match.properties.town) : String(displayName || "");
}

export function townNameToProfileSlug(name) {
  return normalizeTownName(name).replace(/\s+/g, "-");
}

export function buildTownWhereClause(townName) {
  const norm = normalizeTownName(townName);
  if (!norm) return "1=0";
  return `LOWER(TOWN_NAME)='${escapeSqlString(norm)}'`;
}

/** Title-case town label for gisdata `town_name` filters (e.g. BOSTON → Boston). */
export function formatTownForGisdataFilter(townName) {
  return String(townName || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function gisRowValue(row, column) {
  if (!row || !column) return undefined;
  const want = String(column).toLowerCase();
  const direct = row[column];
  if (direct !== undefined) return direct;
  const hit = Object.keys(row).find((k) => k.toLowerCase() === want);
  return hit != null ? row[hit] : undefined;
}

function gisPointRowToFeature(row) {
  const geometry = reprojectGeometry(parseWktPoint(gisRowValue(row, "geom_wkt")));
  if (!geometry?.coordinates) return null;
  const legend = gisRowValue(row, "legend");
  const townName = gisRowValue(row, "town_name");
  const designatio = gisRowValue(row, "designatio");
  const useType = gisRowValue(row, "use_type");
  const constructi = gisRowValue(row, "constructi");
  const historicN = gisRowValue(row, "historic_n");
  const objectid = gisRowValue(row, "objectid");
  return {
    type: "Feature",
    id: objectid != null ? String(objectid) : undefined,
    geometry,
    properties: {
      OBJECTID: objectid,
      LEGEND: legend,
      TOWN_NAME: townName,
      DESIGNATIO: designatio,
      USE_TYPE: useType,
      CONSTRUCTI: constructi,
      HISTORIC_N: historicN,
    },
  };
}

export async function fetchMhcInventoryPoints(townName) {
  const townFilter = formatTownForGisdataFilter(townName);
  if (!townFilter) {
    return { type: "FeatureCollection", features: [] };
  }
  const cacheKey = townFilter.toLowerCase();
  if (gisPointsCache.has(cacheKey)) {
    return gisPointsCache.get(cacheKey);
  }

  const columns = [
    "legend",
    "town_name",
    "designatio",
    "use_type",
    "constructi",
    "sde.ST_AsText(shape) as geom_wkt",
  ].join(",");

  const pending = (async () => {

    const search = new URLSearchParams({
      token: import.meta.env.VITE_MAPC_API_TOKEN,
      database: "gisdata",
      schema: "mapc",
      table: "mhc_inventory_pt",
      columns,
      filters: `town_name:${townFilter}`,
    });
    const res = await fetch(`${locations.BROWSER_API}?${search.toString()}`);
    if (!res.ok) {
      throw new Error(`MHC gisdata points HTTP ${res.status}`);
    }
    const payload = await res.json();
    const rows = payload.rows || [];
    const features = rows
      .map((row) => gisPointRowToFeature(row))
      .filter(Boolean);
    return { type: "FeatureCollection", features };
  })();

  gisPointsCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (err) {
    gisPointsCache.delete(cacheKey);
    throw err;
  }
}

export async function fetchArcgisLayerMetadata(layerId) {
  const key = String(layerId);
  if (metadataCache.has(key)) {
    return metadataCache.get(key);
  }
  const url = `${MHC_FEATURE_SERVER_BASE}/${layerId}?f=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MHC layer metadata HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || "MHC layer metadata failed");
  }
  metadataCache.set(key, json);
  return json;
}

/**
 * Paginated GeoJSON query for an ArcGIS feature layer.
 * @param {number} layerId
 * @param {string} where
 */
export async function fetchArcgisLayerGeojson(layerId, where) {
  const cacheKey = `${layerId}|${where || "1=1"}`;
  if (geojsonCache.has(cacheKey)) {
    return geojsonCache.get(cacheKey);
  }

  const pending = (async () => {
    const first = await queryArcgisPage(layerId, where, 0, PAGE_SIZE);
    const features = [...first.features];

    if (first.exceeded && first.features.length > 0) {
      const totalCount = await fetchArcgisFeatureCount(layerId, where);
      const offsets = [];
      for (let offset = PAGE_SIZE; offset < totalCount; offset += PAGE_SIZE) {
        offsets.push(offset);
      }
      for (let i = 0; i < offsets.length; i += PARALLEL_PAGE_CONCURRENCY) {
        const slice = offsets.slice(i, i + PARALLEL_PAGE_CONCURRENCY);
        const pages = await Promise.all(
          slice.map((offset) => queryArcgisPage(layerId, where, offset, PAGE_SIZE)),
        );
        pages.forEach((page) => features.push(...page.features));
      }
    }

    return { type: "FeatureCollection", features };
  })();

  geojsonCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (err) {
    geojsonCache.delete(cacheKey);
    throw err;
  }
}

/** @param {number[]} rgba [r,g,b,a] 0–255 */
export function esriRgbaToCss(rgba) {
  if (!Array.isArray(rgba) || rgba.length < 3) return "rgba(0,0,0,1)";
  const [r, g, b, a = 255] = rgba;
  const alpha = a > 1 ? a / 255 : a;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Approximate Mapbox minzoom from Esri minScale at a latitude.
 * @param {number} minScale Esri scale denominator (0 = always on)
 * @param {number} lat
 */
export function esriMinScaleToMinZoom(minScale, lat = 42.3) {
  if (!minScale || minScale <= 0) return 0;
  const latRad = (lat * Math.PI) / 180;
  const worldScale = (591657550.5 * Math.cos(latRad)) / minScale;
  const zoom = Math.log2(worldScale);
  return Math.max(0, Math.min(22, Math.ceil(zoom)));
}

/**
 * @param {object} tsSymbol esriTS from labelingInfo
 */
export function mapboxTextPaintFromEsri(tsSymbol) {
  const color = esriRgbaToCss(tsSymbol?.color);
  const haloColor = esriRgbaToCss(tsSymbol?.haloColor || [255, 255, 255, 127]);
  const haloWidth = Number(tsSymbol?.haloSize) || 1;
  const size = Number(tsSymbol?.font?.size) || 10;
  const weight = String(tsSymbol?.font?.weight || "").toLowerCase();
  const family = String(tsSymbol?.font?.family || "");
  const isBold = weight === "bold" || family.toLowerCase().includes("bold");

  return {
    "text-color": color,
    "text-halo-color": haloColor,
    "text-halo-width": haloWidth,
    "text-size": size,
    textFont: isBold
      ? ["Open Sans Bold", "Arial Unicode MS Bold"]
      : ["Open Sans Regular", "Arial Unicode MS Regular"],
  };
}

/**
 * Build Mapbox match keys for LEGEND (value + human label).
 * @param {object} renderer
 */
export function uniqueValueLegendEntries(renderer) {
  const field = renderer?.field1 || renderer?.field || "LEGEND";
  const infos = renderer?.uniqueValueInfos || [];
  return infos.map((info) => ({
    field,
    value: info.value,
    label: info.label || String(info.value),
    symbol: info.symbol,
  }));
}

/** @param {object} sfs esriSFS */
export function polygonPaintFromSfs(sfs) {
  const fill = esriRgbaToCss(sfs?.color);
  const outline = sfs?.outline || {};
  const lineColor = esriRgbaToCss(outline.color);
  const lineWidth = Number(outline.width) || 1;
  return { fill, lineColor, lineWidth };
}

function dataUrlFromPms(symbol) {
  if (!symbol?.imageData) return null;
  const ct = symbol.contentType || "image/png";
  return `data:${ct};base64,${symbol.imageData}`;
}

const iconLoadPromises = new Map();

const MHC_FALLBACK_IMAGE_ID = "mhc-legend-default";

/** Minimal placeholder so symbol layers do not fail before PMS icons load. */
export function ensureMhcFallbackImages(map) {
  if (!map || map.hasImage(MHC_FALLBACK_IMAGE_ID)) return;
  const size = 8;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const o = i * 4;
    data[o] = 31;
    data[o + 1] = 78;
    data[o + 2] = 70;
    data[o + 3] = 220;
  }
  map.addImage(
    MHC_FALLBACK_IMAGE_ID,
    { width: size, height: size, data },
    { pixelRatio: 1 },
  );
}

export const POLYGON_GEOMETRY_FILTER = [
  "match",
  ["geometry-type"],
  ["Polygon", "MultiPolygon"],
  true,
  false,
];

const POINT_CIRCLE_COLORS = {
  NRHP: "#f6c61e",
  PR: "#7b2cbf",
  "MA/HL": "#2a9d8f",
  LHD: "#e76f51",
  "NRHP and LHD": "#f4a261",
  "Inventoried Property": "#6c757d",
};

/**
 * Circle color match for point fallback / underlay layer.
 * @param {object} renderer
 */
export function buildPointCircleColorExpression(renderer) {
  const entries = uniqueValueLegendEntries(renderer);
  const pairs = [];
  entries.forEach((entry) => {
    const color = POINT_CIRCLE_COLORS[entry.value] || "#1f4e46";
    pairs.push(String(entry.value), color);
    if (entry.label && entry.label !== entry.value) {
      pairs.push(String(entry.label), color);
    }
  });
  return ["match", ["get", "LEGEND"], ...pairs, "#1f4e46"];
}

/**
 * Register unique-value PMS icons on a Mapbox map (id: mhc-legend-{sanitized}).
 * @returns {Promise<string[]>} image ids added
 */
export async function loadMhcPointIcons(map, renderer) {
  const entries = uniqueValueLegendEntries(renderer);
  const added = [];

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.symbol?.type !== "esriPMS") return;
      const imageId = mhcIconIdForValue(entry.value);
      if (map.hasImage(imageId)) {
        added.push(imageId);
        return;
      }
      if (iconLoadPromises.has(imageId)) {
        await iconLoadPromises.get(imageId);
        added.push(imageId);
        return;
      }

      const dataUrl = dataUrlFromPms(entry.symbol);
      if (!dataUrl) return;

      const pending = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            if (!map.hasImage(imageId)) {
              map.addImage(imageId, img, { pixelRatio: 1 });
            }
            resolve(imageId);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = dataUrl;
      });

      iconLoadPromises.set(imageId, pending);
      try {
        await pending;
        added.push(imageId);
      } catch (err) {
        console.warn("MHC icon load failed", entry.value, err);
        iconLoadPromises.delete(imageId);
      }
    }),
  );

  ensureMhcFallbackImages(map);
  return added;
}

export function mhcIconIdForValue(value) {
  const safe = String(value || "default")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return `mhc-legend-${safe || "default"}`;
}

/**
 * Mapbox icon-image expression matching LEGEND attribute to loaded PMS icons.
 * @param {object} renderer
 */
export function buildLegendIconImageExpression(renderer) {
  const entries = uniqueValueLegendEntries(renderer);
  const pairs = [];
  entries.forEach((entry) => {
    const id = mhcIconIdForValue(entry.value);
    pairs.push(String(entry.value), id);
    if (entry.label && entry.label !== entry.value) {
      pairs.push(String(entry.label), id);
    }
  });
  const fallback = mhcIconIdForValue(entries[entries.length - 1]?.value);
  return ["match", ["get", "LEGEND"], ...pairs, fallback];
}

/**
 * Mapbox fill / line paint for polygon unique-value renderer.
 */
export function buildPolygonLegendPaint(renderer) {
  const entries = uniqueValueLegendEntries(renderer);
  const fillPairs = [];
  const linePairs = [];
  const widthPairs = [];

  entries.forEach((entry) => {
    const paint = polygonPaintFromSfs(entry.symbol);
    const val = String(entry.value);
    fillPairs.push(val, paint.fill);
    linePairs.push(val, paint.lineColor);
    widthPairs.push(val, paint.lineWidth);
    if (entry.label && entry.label !== entry.value) {
      fillPairs.push(String(entry.label), paint.fill);
      linePairs.push(String(entry.label), paint.lineColor);
      widthPairs.push(String(entry.label), paint.lineWidth);
    }
  });

  const fallback = polygonPaintFromSfs(entries[0]?.symbol);

  return {
    "fill-color": ["match", ["get", "LEGEND"], ...fillPairs, fallback.fill || "#cccccc"],
    "fill-opacity": 0.65,
    "line-color": ["match", ["get", "LEGEND"], ...linePairs, fallback.lineColor || "#333"],
    "line-width": ["match", ["get", "LEGEND"], ...widthPairs, fallback.lineWidth || 1],
  };
}

const LABEL_FIELD = "HISTORIC_N";

export function labelLayerLayout(labelingInfo, minZoom = 0) {
  return {
    "text-field": [
      "case",
      ["all", ["has", LABEL_FIELD], ["!=", ["get", LABEL_FIELD], " "], ["!=", ["get", LABEL_FIELD], ""]],
      ["get", LABEL_FIELD],
      "",
    ],
    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
    "text-size": 8,
    "text-anchor": "center",
    "text-offset": [0, 0.6],
    "text-allow-overlap": false,
    "text-optional": true,
    minzoom: minZoom,
  };
}

export function labelLayerPaint(labelingInfo) {
  const sym = labelingInfo?.[0]?.symbol;
  const paint = mapboxTextPaintFromEsri(sym || {});
  return {
    "text-color": paint["text-color"],
    "text-halo-color": paint["text-halo-color"],
    "text-halo-width": paint["text-halo-width"],
  };
}

export function labelLayoutWithEsriFont(labelingInfo, minZoom) {
  const sym = labelingInfo?.[0]?.symbol;
  const paint = mapboxTextPaintFromEsri(sym || {});
  return {
    layout: {
      ...labelLayerLayout(labelingInfo, minZoom),
      "text-font": paint.textFont,
      "text-size": paint["text-size"],
    },
    paint: labelLayerPaint(labelingInfo),
  };
}
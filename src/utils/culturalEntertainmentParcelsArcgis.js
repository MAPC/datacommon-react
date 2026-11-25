export const MASS_LAND_PARCELS_FEATURE_SERVER =
  "https://geo.mapc.org/server/rest/services/gisdata/Massachusetts_Land_Parcels/FeatureServer";

export const CULTURAL_PARCELS_LAYER_ID = 0;

const PAGE_SIZE = 2000;
const PARALLEL_PAGE_CONCURRENCY = 5;

const OUT_FIELDS = ["loc_id", "muni_id", "luc_l", "luc_des_l","year_built","site_adr_m"].join(",");

const geojsonCache = new Map();

/**
 * 
 * @param {number} code
 */
function lucLClauseForCode(code) {
  return `(MIN_LUCA LIKE '${code}%')`;
}

/**
 * LUC_L codes 360–369 (cultural / entertainment).
 * @param {number|string} muniId
 */
export function buildCulturalEntertainmentParcelsWhere(muniId) {
  const id = Number(muniId);
  if (!Number.isFinite(id)) return null;
  const lucClauses = [];
  for (let code = 360; code <= 369; code += 1) {
    lucClauses.push(lucLClauseForCode(code));
  }
  return `muni_id=${id} AND (${lucClauses.join(" OR ")})`;
}

async function queryParcelsPage(where, offset, recordCount) {
  const search = new URLSearchParams({
    where: where || "1=1",
    outFields: OUT_FIELDS,
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultOffset: String(offset),
    resultRecordCount: String(recordCount),
  });
  const url = `${MASS_LAND_PARCELS_FEATURE_SERVER}/${CULTURAL_PARCELS_LAYER_ID}/query?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Parcel layer query HTTP ${res.status}`);
  }
  const fc = await res.json();
  if (fc?.error) {
    throw new Error(fc.error.message || "Parcel layer query failed");
  }
  const features = Array.isArray(fc.features) ? fc.features : [];
  const exceeded = Boolean(fc.exceededTransferLimit ?? fc.properties?.exceededTransferLimit);
  return { features, exceeded };
}

async function fetchParcelFeatureCount(where) {
  const search = new URLSearchParams({
    where: where || "1=1",
    returnCountOnly: "true",
    f: "json",
  });
  const url = `${MASS_LAND_PARCELS_FEATURE_SERVER}/${CULTURAL_PARCELS_LAYER_ID}/query?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Parcel count query HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json?.error) {
    throw new Error(json.error.message || "Parcel count query failed");
  }
  const count = Number(json.count);
  return Number.isFinite(count) ? count : 0;
}

/**
 * @param {number|string} muniId
 * @returns {Promise<import('geojson').FeatureCollection>}
 */
export async function fetchCulturalEntertainmentParcels(muniId) {
  const where = buildCulturalEntertainmentParcelsWhere(muniId);
  if (!where) {
    return { type: "FeatureCollection", features: [] };
  }

  const cacheKey = where;
  if (geojsonCache.has(cacheKey)) {
    return geojsonCache.get(cacheKey);
  }

  const pending = (async () => {
    const first = await queryParcelsPage(where, 0, PAGE_SIZE);
    const features = [...first.features];

    if (first.exceeded && first.features.length > 0) {
      const totalCount = await fetchParcelFeatureCount(where);
      const offsets = [];
      for (let offset = PAGE_SIZE; offset < totalCount; offset += PAGE_SIZE) {
        offsets.push(offset);
      }
      for (let i = 0; i < offsets.length; i += PARALLEL_PAGE_CONCURRENCY) {
        const slice = offsets.slice(i, i + PARALLEL_PAGE_CONCURRENCY);
        const pages = await Promise.all(slice.map((offset) => queryParcelsPage(where, offset, PAGE_SIZE)));
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
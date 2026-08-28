import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import PropTypes from "prop-types";
import { MAP_CONFIG } from "../../constants/mapConfig";
import locations from "../../constants/locations";
import colors from "../../constants/colors";

/**
 * Fetches column `name` -> `alias` from `/api/metadata`
 * @param {{ database?: string, schema: string, table: string }} params
 * @returns {Promise<Record<string, string>>}
 */
export async function fetchTableColumnAliases(params) {
  const { database = "ds", schema, table } = params || {};
  if (!schema || !table) return {};

  const res = await fetch(
    `/api/metadata?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${encodeURIComponent(database)}&schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}&useNewMetadata=true`,
  );
  if (!res.ok) {
    throw new Error(`Metadata HTTP error: ${res.status}`);
  }
  const json = await res.json();
  const metadataArray = json.muni_finance_m;

  const metadataMap = {};
  metadataArray.forEach((col) => {
    const name = col.name;
    metadataMap[name] = col.alias;
  });
  return metadataMap;
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

const INITIAL_MAP_PADDING = { top: 28, bottom: 28, left: 28, right: 28 };

const FILL_LAYER_ID = "muni-finance-overrides-fill";
const SOURCE_ID = "muni-finance-overrides";
const SELECTED_OUTLINE_SOURCE_ID = "muni-finance-overrides-selected-outline";
const SELECTED_LINE_LAYER_ID = "muni-finance-overrides-selected-line";

function normalizeTownName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isNullLikeAmt(v) {
  return v == null || v === "";
}

function classifyRow(row) {
  const winNull = isNullLikeAmt(row.ovr_winamt);
  const lossNull = isNullLikeAmt(row.ovr_losamt);
  const win = winNull ? NaN : Number(row.ovr_winamt);
  const loss = lossNull ? NaN : Number(row.ovr_losamt);
  const winPositive = Number.isFinite(win) && win > 0;
  const lossPositive = Number.isFinite(loss) && loss > 0;

  // success = at least one successful override (ovr_winamt > 0), including when ovr_losamt > 0 as well.
  if (winPositive) return "success";
  if (winNull && lossPositive) return "loss_only";
  if (winNull && lossNull) return "no_overrides_attempted";
  if (!winPositive && lossPositive) return "loss_only";
  return "no_overrides_attempted";
}

function formatUsd(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatFieldCell(column, value) {
  if (value == null || value === "") return "—";
  if (column === "fiscal_yr") return String(value);
  return formatUsd(value);
}

function getSidebarFields(properties = {}, columns = [], labels = {}) {
  return columns
    .filter((col) => col && col !== "municipal")
    .map((col) => ({
      key: col,
      label: labels[col] || col,
      value: formatFieldCell(col, properties[col]),
    }));
}

function muniProfileSlug(name) {
  return String(name)
    .trim()
    .toLowerCase()
}

function buildRowLookup(rows, yearColumn, mapFiscalYear) {
  const yc = yearColumn || "fiscal_yr";
  const raw = rows || [];
  const target = mapFiscalYear != null && mapFiscalYear !== "" ? Number(mapFiscalYear) : NaN;
  const useTarget = Number.isFinite(target);

  let candidates = raw;
  if (useTarget) {
    const filtered = raw.filter((row) => Number(row[yc]) === target);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  const map = new Map();
  candidates.forEach((row) => {
    const key = normalizeTownName(row.municipal);
    if (!key) return;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      return;
    }
    const ry = Number(row[yc]);
    const py = Number(prev[yc]);
    if (Number.isFinite(ry) && (!Number.isFinite(py) || ry > py)) {
      map.set(key, row);
    }
  });
  return map;
}

function legendKeyToColor(legend) {
  return Object.fromEntries((legend || []).filter((item) => item.key && item.color).map((item) => [item.key, item.color]));
}

/** @param {GeoJSON.Geometry | null | undefined} geometry */
function geometryToBounds(geometry) {
  if (!geometry) return null;
  const bounds = new mapboxgl.LngLatBounds();
  const extendCoords = (coords) => {
    if (!coords?.length) return;
    if (typeof coords[0] === "number") {
      bounds.extend(/** @type {[number, number]} */ (coords));
    } else {
      coords.forEach(extendCoords);
    }
  };
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(extendCoords);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((poly) => poly.forEach(extendCoords));
  } else {
    return null;
  }
  return bounds.isEmpty() ? null : bounds;
}

function enrichGeojson(baseGeojson, rowByTown, mapColumns, mapFiscalYear) {
  if (!baseGeojson?.features) return { type: "FeatureCollection", features: [] };
  const cols = mapColumns || [];
  const showMapYear =
    mapFiscalYear != null &&
    mapFiscalYear !== "" &&
    Number.isFinite(Number(mapFiscalYear)) &&
    cols.includes("fiscal_yr");

  return {
    type: "FeatureCollection",
    features: baseGeojson.features.map((f) => {
      const town = f.properties?.town;
      const key = normalizeTownName(town);
      const row = rowByTown.get(key);
      const category = row ? classifyRow(row) : "no_overrides_attempted";
      const props = {
        town,
        overrideCategory: category,
      };
      for (const col of cols) {
        props[col] = row?.[col];
      }
      if (showMapYear) {
        props.fiscal_yr = Number(mapFiscalYear);
      }
      return {
        ...f,
        properties: props,
      };
    }),
  };
}

export default function MunicipalFinanceOverridesMap({ config, municipalFeature }) {
  const baseGeojson = useSelector((state) => state.municipality.geojson);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layerHandlersRef = useRef({});
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [fiscalYear, setFiscalYear] = useState(null);
  const [outlineHighlightFeature, setOutlineHighlightFeature] = useState(null);
  const [selectedProperties, setSelectedProperties] = useState(null);
  const [metadataColumnLabels, setMetadataColumnLabels] = useState({});

  const profileTownKey = municipalFeature?.properties?.town;

  const outlineSetterRef = useRef(setOutlineHighlightFeature);
  outlineSetterRef.current = setOutlineHighlightFeature;

  const selectedSetterRef = useRef(setSelectedProperties);
  selectedSetterRef.current = setSelectedProperties;

  const profileSelectTimerRef = useRef(null);
  const suppressSelectionDuringPrintRef = useRef(false);

  const mapTitle = useMemo(() => {
    const tpl = config.mapTitleTemplate;
    const y = fiscalYear != null ? String(fiscalYear) : "…";
    return tpl.replace(/\{year\}/g, y);
  }, [config.mapTitleTemplate, fiscalYear]);

  const sidebarFields = useMemo(
    () =>
      selectedProperties
        ? getSidebarFields(selectedProperties, config.mapColumns, metadataColumnLabels)
        : [],
    [selectedProperties, config.mapColumns, metadataColumnLabels],
  );

  const selectedDisplayName = selectedProperties
    ? String(selectedProperties.town ?? "")
    : "";

  const selectedProfileUrl = selectedDisplayName
    ? `/profile/${muniProfileSlug(selectedDisplayName.toLowerCase().replace(/\s+/g, '-'))}/municipal-finance`
    : null;

  const latestDataRef = useRef({
    rows,
    baseGeojson,
    mapColumns: config.mapColumns,
    fiscalYear,
    yearColumn: config.yearColumn || "fiscal_yr",
    municipalFeature,
  });
  latestDataRef.current = {
    rows,
    baseGeojson,
    mapColumns: config.mapColumns,
    fiscalYear,
    yearColumn: config.yearColumn || "fiscal_yr",
    municipalFeature,
  };

  const clearSelection = useCallback(() => {
    if (profileSelectTimerRef.current != null) {
      window.clearTimeout(profileSelectTimerRef.current);
      profileSelectTimerRef.current = null;
    }
    selectedSetterRef.current(null);
    outlineSetterRef.current(null);
    const map = mapRef.current;
    const outlineSrc = map?.getSource(SELECTED_OUTLINE_SOURCE_ID);
    if (outlineSrc) {
      outlineSrc.setData({ type: "FeatureCollection", features: [] });
    }
    map?.resize();
  }, []);

  const fitMapToInitialView = useCallback((map) => {
    if (!map) return;
    map.resize();
    if (typeof map.triggerRepaint === "function") {
      map.triggerRepaint();
    }
  }, []);

  const prepareOverrideMapForPrint = useCallback(() => {
    suppressSelectionDuringPrintRef.current = true;
    clearSelection();
    outlineSetterRef.current(null);

    const map = mapRef.current;
    if (!map) {
      window.dispatchEvent(new Event("datacommon-override-map-print-ready"));
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.dispatchEvent(new Event("datacommon-override-map-print-ready"));
    };

    const applyInitialView = () => {
      fitMapToInitialView(map);
      map.once("idle", finish);
      window.setTimeout(finish, 1500);
    };

    if (map.isStyleLoaded()) {
      applyInitialView();
    } else {
      map.once("load", applyInitialView);
    }
  }, [clearSelection, fitMapToInitialView]);

  const restoreMapAfterPrint = useCallback(() => {
    suppressSelectionDuringPrintRef.current = false;
    const map = mapRef.current;
    const mf = latestDataRef.current.municipalFeature;
    if (!map?.isStyleLoaded() || !mf?.geometry) return;
    const bounds = geometryToBounds(mf.geometry);
    if (!bounds) return;
    map.resize();
    map.fitBounds(bounds, {
      padding: INITIAL_MAP_PADDING,
      maxZoom: 14,
      duration: 0,
    });
    if (mf.properties?.town) {
      outlineSetterRef.current({
        type: "Feature",
        properties: { town: mf.properties.town },
        geometry: mf.geometry,
      });
    }
  }, []);

  const selectProfileTownForCurrentData = useCallback(() => {
    if (suppressSelectionDuringPrintRef.current) return;
    const {
      rows: r,
      baseGeojson: bg,
      mapColumns: mc,
      fiscalYear: fy,
      yearColumn: yc,
      municipalFeature: mf,
    } = latestDataRef.current;
    if (!mf?.geometry) return;
    const rowByTown = buildRowLookup(r, yc, fy);
    const data = enrichGeojson(bg, rowByTown, mc, fy);
    const townName = mf.properties?.town;
    const key = normalizeTownName(townName);
    const match = data.features.find((f) => normalizeTownName(f.properties?.town) === key);
    selectedSetterRef.current(match?.properties || { town: townName });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const yearCol = config.yearColumn || "fiscal_yr";
      try {
        let yearsUrl = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&schema=tabular&table=muni_finance_m`;
        yearsUrl = `${yearsUrl}&columns=DISTINCT(fiscal_yr)&orderByColumn=fiscal_yr&orderByDirection=DESC`;
        yearsUrl = `${yearsUrl}&filters=ovr_winamt!!,ovr_losamt!!,rev_total!!,exp_total!!`;
        const yearResp = await fetch(yearsUrl);
        const yearPayload = (await yearResp.json()) || {};
        const latestYear = yearPayload.rows[0].fiscal_yr 
        const y = latestYear;

        if (!Number.isFinite(y)) {
          if (!cancelled) {
            setFiscalYear(null);
            setRows([]);
            setLoadError("Could not load override data. Please try again later.");
          }
          return;
        }
        if (!cancelled) setFiscalYear(y);

        const cols = config.mapColumns.join(",");
        let url = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&schema=${config.tableSchema}&table=${config.tableName}&columns=${cols}`;
        url = `${url}&filters=${yearCol}:${y}&limit=${config.fetchLimit || 500}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) || {};
        if (!cancelled) setRows(payload.rows || []);
      } catch (e) {
        console.error("MunicipalFinanceOverridesMap fetch failed", e);
        if (!cancelled) {
          setLoadError("Could not load override data. Please try again later.");
          setRows([]);
          setFiscalYear(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    const schema = config.tableSchema;
    const table = config.tableName;
    if (!schema || !table) {
      setMetadataColumnLabels({});
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const labels = await fetchTableColumnAliases({ database: "ds", schema, table });
        if (!cancelled) setMetadataColumnLabels(labels);
      } catch (e) {
        console.error("MunicipalFinanceOverridesMap metadata labels failed", e);
        if (!cancelled) setMetadataColumnLabels({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.tableSchema, config.tableName]);

  useEffect(() => {
    if (!municipalFeature?.geometry) {
      setOutlineHighlightFeature(null);
      return;
    }
    setOutlineHighlightFeature({
      type: "Feature",
      properties: { town: municipalFeature.properties?.town },
      geometry: municipalFeature.geometry,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by town string; geometry reference churn is noisy.
  }, [profileTownKey]);

  useEffect(() => {
    if (!mapContainerRef.current) return undefined;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      style: MAP_CONFIG.style,
      dragPan: true,
      dragRotate: false,
    });
    const navCfg = MAP_CONFIG.navigationControl || {};
    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: navCfg.showCompass ?? false,
        showZoom: true,
        visualizePitch: navCfg.visualizePitch ?? false,
      }),
      "top-right",
    );
    mapRef.current = map;

    const onMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    const onClick = (e) => {
      const f = e.features && e.features[0];
      if (!f?.geometry) return;
      if (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon") return;
      outlineSetterRef.current({
        type: "Feature",
        properties: { ...f.properties },
        geometry: f.geometry,
      });
      selectedSetterRef.current(f.properties || {});
    };

    const onLoad = () => {
      const lc = legendKeyToColor(config.legend);
      const fillDefault = lc.no_overrides_attempted || "#e2e8f0";
      const empty = { type: "FeatureCollection", features: [] };
      map.addSource(SOURCE_ID, { type: "geojson", data: empty });
      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": [
            "match",
            ["get", "overrideCategory"],
            "success",
            lc.success || fillDefault,
            "loss_only",
            lc.loss_only || fillDefault,
            "no_overrides_attempted",
            lc.no_overrides_attempted || fillDefault,
            fillDefault,
          ],
          "fill-opacity": 0.82,
          "fill-outline-color": "#1f2937",
        },
      });
      map.addSource(SELECTED_OUTLINE_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: SELECTED_LINE_LAYER_ID,
        type: "line",
        source: SELECTED_OUTLINE_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": colors.BRAND.BACKGROUND_DARK,
          "line-width": 3,
          "line-opacity": 1,
        },
      });
      layerHandlersRef.current = { onMouseEnter, onMouseLeave, onClick };
      map.on("mouseenter", FILL_LAYER_ID, onMouseEnter);
      map.on("mouseleave", FILL_LAYER_ID, onMouseLeave);
      map.on("click", FILL_LAYER_ID, onClick);
      setMapReady(true);
      requestAnimationFrame(() => {
        map.resize();
      });
    };
    map.on("load", onLoad);

    return () => {
      map.off("load", onLoad);
      const h = layerHandlersRef.current;
      if (h.onClick) {
        map.off("click", FILL_LAYER_ID, h.onClick);
        map.off("mouseenter", FILL_LAYER_ID, h.onMouseEnter);
        map.off("mouseleave", FILL_LAYER_ID, h.onMouseLeave);
      }
      layerHandlersRef.current = {};
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- single map mount; legend colors from charts.js are static for this view.
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const yearCol = config.yearColumn || "fiscal_yr";
    const rowByTown = buildRowLookup(rows, yearCol, fiscalYear);
    const data = enrichGeojson(baseGeojson, rowByTown, config.mapColumns, fiscalYear);
    const fillSrc = map.getSource(SOURCE_ID);
    if (fillSrc) fillSrc.setData(data);

    const outlineSrc = map.getSource(SELECTED_OUTLINE_SOURCE_ID);
    if (outlineSrc) {
      if (!outlineHighlightFeature?.geometry) {
        outlineSrc.setData({ type: "FeatureCollection", features: [] });
      } else {
        outlineSrc.setData({
          type: "FeatureCollection",
          features: [outlineHighlightFeature],
        });
      }
    }
    map.resize();
  }, [
    mapReady,
    rows,
    baseGeojson,
    config.mapColumns,
    config.yearColumn,
    fiscalYear,
    outlineHighlightFeature,
  ]);

  useEffect(() => {
    if (!mapReady || !outlineHighlightFeature?.geometry) return undefined;
    const mf = municipalFeature;
    if (!mf?.properties?.town) return undefined;
    const outlineTown = normalizeTownName(outlineHighlightFeature.properties?.town);
    const profileNorm = normalizeTownName(mf.properties.town);
    if (outlineTown !== profileNorm) return undefined;

    profileSelectTimerRef.current = window.setTimeout(() => {
      profileSelectTimerRef.current = null;
      if (suppressSelectionDuringPrintRef.current) return;
      selectProfileTownForCurrentData();
    }, 500);

    return () => {
      if (profileSelectTimerRef.current != null) {
        window.clearTimeout(profileSelectTimerRef.current);
        profileSelectTimerRef.current = null;
      }
    };
  }, [
    mapReady,
    outlineHighlightFeature,
    rows.length,
    municipalFeature,
    selectProfileTownForCurrentData,
  ]);

  useEffect(() => {
    const onBeforePrint = () => prepareOverrideMapForPrint();
    const onAfterPrint = () => {
      restoreMapAfterPrint();
    };
    const onPrepareForPrint = () => prepareOverrideMapForPrint();
    // Legacy event name used by Print charts button
    const onClearMapSelection = () => prepareOverrideMapForPrint();

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("datacommon-prepare-override-map-for-print", onPrepareForPrint);
    window.addEventListener("datacommon-close-map-popups", onClearMapSelection);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("datacommon-prepare-override-map-for-print", onPrepareForPrint);
      window.removeEventListener("datacommon-close-map-popups", onClearMapSelection);
    };
  }, [prepareOverrideMapForPrint, restoreMapAfterPrint]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapContainerRef.current) return undefined;
    const map = mapRef.current;
    const el = mapContainerRef.current;
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);
    map.resize();
    return () => ro.disconnect();
  }, [mapReady]);

  useEffect(() => {
    if (suppressSelectionDuringPrintRef.current) return undefined;
    if (!mapReady || !municipalFeature?.geometry || !mapRef.current) {
      return undefined;
    }
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return undefined;

    const bounds = geometryToBounds(municipalFeature.geometry);
    if (!bounds) return undefined;

    map.resize();

    map.fitBounds(bounds, {
      padding: INITIAL_MAP_PADDING,
      maxZoom: 14,
      duration: 0,
    });
  }, [mapReady, profileTownKey, municipalFeature]);

  const makeDatasetLink = (datasetId, useTimeframe, timeframe) => {
    const timeframeParam = useTimeframe ? `?year=${timeframe}` : '';
    return `${window.location.origin}/browser/datasets/${datasetId}${timeframeParam}`;
  };

  return (
    <section className="municipal-finance-overrides-map" aria-labelledby="municipal-overrides-map-title">
      <h4 id="municipal-overrides-map-title" className="chart__title" style={{ marginBottom: "0.75rem" }}>
        {mapTitle}
      </h4>
      {loadError ? (
        <p className="metadata" style={{ color: "#b45309" }}>
          {loadError}
        </p>
      ) : null}
      <div className="municipal-finance-overrides-map__layout">
        <div
          ref={mapContainerRef}
          className="municipal-finance-overrides-map__canvas"
          style={{
            width: "100%",
            height: 400,
            maxWidth: "100%",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 4,
            background: "#f8fafc",
          }}
        />
        <aside
          className="municipal-finance-overrides-map__sidebar"
          aria-live="polite"
          aria-label="Municipality override details"
        >
          <div className="municipal-finance-overrides-map__sidebar-body">
            {selectedProperties ? (
              <>
                <strong className="municipal-finance-overrides-map__sidebar-title">{selectedDisplayName}</strong>
                <dl className="municipal-finance-overrides-map__sidebar-fields">
                  {sidebarFields.map((field) => (
                    <div key={field.key} className="municipal-finance-overrides-map__sidebar-row">
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
                {selectedProfileUrl ? (
                  <a
                    className="municipal-finance-overrides-map__sidebar-link"
                    href={selectedProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View community profile
                  </a>
                ) : null}
              </>
            ) : (
              <p className="municipal-finance-overrides-map__sidebar-empty">
                Click a municipality on the map to see total revenue, expenditures, and override amounts.
              </p>
            )}
          </div>
          <div className="metadata municipal-finance-overrides-map__source">
            <div className="source-timeframe">
              <div className="source">
                Source:
                {" "}
                {config.source || "Unknown"}
              </div>
              <div className="timeframe">
                Years:
                {" "}
                {fiscalYear != null ? String(fiscalYear) : "…"}
              </div>
            </div>
            {config.datasetLinks ? (
              <div className="link">
                <span>Link to: </span>
                {Object.keys(config.datasetLinks).map((label) => (
                  <a
                    key={label}
                    href={makeDatasetLink(config.datasetLinks[label], config.useTimeframeInDatasetLink, fiscalYear)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      {loading ? (
        <p className="metadata" style={{ marginTop: "0.5rem" }}>
          Loading map…
        </p>
      ) : null}
      <div
        className="municipal-finance-overrides-map__legend"
        style={{
          marginTop: "0.75rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem 1.25rem",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "#4a4a4a",
        }}
      >
        {(config.legend || []).map((item) => (
          <span
            key={item.key}
            className={`municipal-finance-overrides-map__legend-item municipal-finance-overrides-map__legend-item--${item.key}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span
              aria-hidden
              className="municipal-finance-overrides-map__legend-swatch"
              style={{
                width: 14,
                height: 14,
                borderRadius: 2,
                backgroundColor: item.color,
                border: "1px solid rgba(0,0,0,0.15)",
              }}
            />
            <span>{item.label}</span>
          </span>
        ))}
      </div>
      <p className="metadata municipal-finance-overrides-map__hint">
        Click a municipality for total revenue, expenditures, and override amounts.
      </p>
    </section>
  );
}

MunicipalFinanceOverridesMap.propTypes = {
  municipalFeature: PropTypes.shape({
    properties: PropTypes.object,
    geometry: PropTypes.object,
  }),
  config: PropTypes.shape({
    mapTitleTemplate: PropTypes.string.isRequired,
    yearColumn: PropTypes.string,
    tableSchema: PropTypes.string.isRequired,
    tableName: PropTypes.string.isRequired,
    mapColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
    fetchLimit: PropTypes.number,
    source: PropTypes.string,
    datasetLinks: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    legend: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired,
      }),
    ),
  }).isRequired,
};

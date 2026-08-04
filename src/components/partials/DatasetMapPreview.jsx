import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import mapboxgl from "mapbox-gl";
import MoonLoader from "react-spinners/MoonLoader";
import "mapbox-gl/dist/mapbox-gl.css";

import { MAP_CONFIG } from "../../constants/mapConfig";
import {
  MAP_VIEW_GEOGRAPHY_TYPES,
  buildChoroplethScale,
  buildValueByGeography,
  buildValueByGeographyFromFeatures,
  enrichBoundariesWithValues,
  fetchDatasetGeometry,
  fetchGisBoundaryLayer,
  filterRowsForMapPreview,
  formatMapValue,
  getMappableColumns,
  resolveMapGeographyColumn,
  downloadMapGeojson,
} from "../../utils/datasetMapPreview";

mapboxgl.accessToken = MAP_CONFIG.accessToken;

const SOURCE_ID = "dataset-map-preview";
const FILL_LAYER_ID = "dataset-map-preview-fill";
const LINE_LAYER_ID = "dataset-map-preview-line";
const SELECTED_LINE_LAYER_ID = "dataset-map-preview-selected";
const MUNI_SOURCE_ID = "dataset-map-preview-muni";
const MUNI_LINE_LAYER_ID = "dataset-map-preview-muni-line";
const MAPC_SOURCE_ID = "dataset-map-preview-mapc";
const MAPC_LINE_LAYER_ID = "dataset-map-preview-mapc-line";
const EMPTY_FC = { type: "FeatureCollection", features: [] };

function DatasetMapPreview({
  rows = [],
  columnKeys = [],
  queryYearColumn = "",
  selectedYears = [],
  geographyColumn: geographyColumnProp = null,
  selectedGeographies = [],
  availableGeographies = [],
  columnFilters = [],
  geographyType = null,
  mapVariable = null,
  onMapVariableChange,
  database = "ds",
  schema = "tabular",
  table = "",
}) {
  const municipalGeojson = useSelector((state) => state.municipality.geojson);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [apiBoundaryGeojson, setApiBoundaryGeojson] = useState(null);
  const [geometryJoinKey, setGeometryJoinKey] = useState(null);
  const [boundariesError, setBoundariesError] = useState("");
  const [boundariesLoading, setBoundariesLoading] = useState(false);
  const [overlaysLoading, setOverlaysLoading] = useState(true);
  const [showMunicipalLayer, setShowMunicipalLayer] = useState(false);
  const [showMapcRegionLayer, setShowMapcRegionLayer] = useState(false);
  const [muniOverlayGeojson, setMuniOverlayGeojson] = useState(EMPTY_FC);
  const [mapcOverlayGeojson, setMapcOverlayGeojson] = useState(EMPTY_FC);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState(null);

  const filteredRows = useMemo(
    () =>
      filterRowsForMapPreview({
        rows,
        queryYearColumn,
        selectedYears,
        geographyColumn: geographyColumnProp,
        selectedGeographies,
        availableGeographies,
        columnFilters,
      }),
    [
      rows,
      queryYearColumn,
      selectedYears,
      geographyColumnProp,
      selectedGeographies,
      availableGeographies,
      columnFilters,
    ],
  );

  // Join key for choropleth (muni_id / tract id). Do not reuse geographyColumnProp —
  // that is the tabular filter column (municipal / muni_name).
  const geographyColumn = useMemo(
    () =>
      resolveMapGeographyColumn(
        filteredRows[0] ||
          apiBoundaryGeojson?.features?.[0]?.properties ||
          rows[0],
        geographyType,
        geometryJoinKey || null,
      ),
    [filteredRows, rows, geographyType, geometryJoinKey, apiBoundaryGeojson],
  );

  const mappableColumns = useMemo(() => {
    // Prefer geometry-joined properties when the 15k table preview is missing this year.
    const geometryRows =
      apiBoundaryGeojson?.features?.map((feature) => feature.properties).filter(Boolean) || [];
    const sampleRows = filteredRows.length ? filteredRows : geometryRows.length ? geometryRows : rows;
    return getMappableColumns(columnKeys, sampleRows, geographyColumn, queryYearColumn);
  }, [columnKeys, filteredRows, rows, apiBoundaryGeojson, geographyColumn, queryYearColumn]);

  const activeVariable =
    mapVariable && mappableColumns.some((col) => col.name === mapVariable)
      ? mapVariable
      : mappableColumns[0]?.name || null;

  const activeVariableLabel =
    mappableColumns.find((col) => col.name === activeVariable)?.label || activeVariable || "";

  useEffect(() => {
    if (!activeVariable) return;
    if (mapVariable !== activeVariable) {
      onMapVariableChange?.(activeVariable);
    }
  }, [activeVariable, mapVariable, onMapVariableChange]);

  const mapYear = selectedYears?.[0] ?? null;

  useEffect(() => {
    let cancelled = false;

    const loadOverlays = async () => {
      setOverlaysLoading(true);
      try {
        const [muniFc, mapcFc] = await Promise.all([
          fetchGisBoundaryLayer("municipal"),
          fetchGisBoundaryLayer("mapcRegion"),
        ]);
        if (cancelled) return;
        setMuniOverlayGeojson(muniFc);
        setMapcOverlayGeojson(mapcFc);
      } catch (err) {
        console.error("Failed to load map overlay boundaries from gisdata:", err);
      } finally {
        if (!cancelled) {
          setOverlaysLoading(false);
        }
      }
    };

    loadOverlays();
    return () => {
      cancelled = true;
    };
  }, []);

  const isBoundaryLoading = boundariesLoading || overlaysLoading;
  useEffect(() => {
    const usesGeometryApi =
      geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts ||
      geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal;

    if (!usesGeometryApi) {
      setApiBoundaryGeojson(null);
      setGeometryJoinKey(null);
      setBoundariesError("");
      setBoundariesLoading(false);
      return undefined;
    }

    if (!table) {
      setBoundariesError("Missing table name for geometry request");
      return undefined;
    }

    let cancelled = false;
    setBoundariesLoading(true);
    setBoundariesError("");

    const loadBoundaries = async () => {
      try {
        const years = mapYear != null ? [mapYear] : [];
        const result = await fetchDatasetGeometry({
          database,
          schema,
          table,
          years,
          yearColumn: queryYearColumn || null,
        });
        if (cancelled) return;
        setApiBoundaryGeojson(result.featureCollection);
        setGeometryJoinKey(result.joinKey);
        setBoundariesLoading(false);
      } catch (primaryError) {
        if (cancelled) return;
        setApiBoundaryGeojson(null);
        setGeometryJoinKey(null);
        if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal) {
          // Fall back to Redux municipal polygons + client-side join
          setBoundariesError(
            primaryError?.message
              ? `Geometry API unavailable (${primaryError.message}); using fallback boundaries`
              : "Geometry API unavailable; using fallback boundaries",
          );
        } else {
          setBoundariesError(
            primaryError?.message || "Unable to load census tract boundaries",
          );
        }
        setBoundariesLoading(false);
      }
    };

    loadBoundaries();

    return () => {
      cancelled = true;
    };
  }, [geographyType, database, schema, table, mapYear, queryYearColumn]);

  const baseGeojson =
    apiBoundaryGeojson ||
    (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal && !boundariesLoading
      ? municipalGeojson
      : null);

  const valueByGeography = useMemo(() => {
    if (!activeVariable) return new Map();

    // Geometry API features already include full table columns for the selected year
    // and are not subject to the browser's 15k-row preview limit.
    if (apiBoundaryGeojson?.features?.length) {
      const fromFeatures = buildValueByGeographyFromFeatures({
        features: apiBoundaryGeojson.features,
        valueColumn: activeVariable,
        geographyType,
      });
      if (fromFeatures.size) return fromFeatures;
    }

    if (!geographyColumn) return new Map();
    return buildValueByGeography({
      rows: filteredRows,
      geographyColumn,
      valueColumn: activeVariable,
      yearColumn: queryYearColumn,
      geographyType,
    });
  }, [
    filteredRows,
    geographyColumn,
    activeVariable,
    queryYearColumn,
    geographyType,
    apiBoundaryGeojson,
  ]);

  const { colorForValue, legend } = useMemo(
    () => buildChoroplethScale([...valueByGeography.values()]),
    [valueByGeography],
  );

  const paintedGeojson = useMemo(() => {
    if (!baseGeojson) return { type: "FeatureCollection", features: [] };
    return enrichBoundariesWithValues({
      baseGeojson,
      valueByGeography,
      geographyType,
      colorForValue,
    });
  }, [baseGeojson, valueByGeography, geographyType, colorForValue]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_CONFIG.style,
      dragRotate: false,
      bounds: MAP_CONFIG.bounds,
      fitBoundsOptions: { padding: { top: 24, bottom: 24, left: 24, right: 24 }, animate: false },
    });

    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: false,
        showZoom: true,
        visualizePitch: false,
      }),
      "bottom-right",
    );

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": ["coalesce", ["get", "__mapColor"], "#E0E0E0"],
          "fill-opacity": 0.88,
        },
      });

      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#334155",
          "line-width": 0.7,
          "line-opacity": 0.55,
        },
      });

      map.addLayer({
        id: SELECTED_LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#0f172a",
          "line-width": 2.4,
          "line-opacity": 1,
        },
        filter: ["==", ["get", "__mapKey"], ""],
      });

      map.addSource(MUNI_SOURCE_ID, {
        type: "geojson",
        data: EMPTY_FC,
      });
      map.addLayer({
        id: MUNI_LINE_LAYER_ID,
        type: "line",
        source: MUNI_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#094A72",
          "line-width": 0.9,
          "line-opacity": 0.9,
        },
      });

      map.addSource(MAPC_SOURCE_ID, {
        type: "geojson",
        data: EMPTY_FC,
      });
      map.addLayer({
        id: MAPC_LINE_LAYER_ID,
        type: "line",
        source: MAPC_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#ED948D",
          "line-width": 2,
          "line-opacity": 1,
        },
      });

      map.on("mouseenter", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.resize();
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // Mount once; overlay visibility updates via dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(MUNI_SOURCE_ID);
    if (source) {
      source.setData(muniOverlayGeojson || EMPTY_FC);
    }
  }, [muniOverlayGeojson, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(MAPC_SOURCE_ID);
    if (source) {
      source.setData(mapcOverlayGeojson || EMPTY_FC);
    }
  }, [mapcOverlayGeojson, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = showMunicipalLayer ? "visible" : "none";
    if (map.getLayer(MUNI_LINE_LAYER_ID)) {
      map.setLayoutProperty(MUNI_LINE_LAYER_ID, "visibility", visibility);
    }
  }, [showMunicipalLayer, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = showMapcRegionLayer ? "visible" : "none";
    if (map.getLayer(MAPC_LINE_LAYER_ID)) {
      map.setLayoutProperty(MAPC_LINE_LAYER_ID, "visibility", visibility);
    }
  }, [showMapcRegionLayer, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(SOURCE_ID);
    if (source) {
      source.setData(paintedGeojson);
    }
    if (map.getLayer(LINE_LAYER_ID)) {
      map.setPaintProperty(
        LINE_LAYER_ID,
        "line-width",
        geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts ? 0.4 : 0.7,
      );
    }
  }, [paintedGeojson, mapReady, geographyType]);

  useEffect(() => {
    setSelectedFeatureKey(null);
  }, [table, geographyType, mapYear]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(SELECTED_LINE_LAYER_ID)) return;
    map.setFilter(SELECTED_LINE_LAYER_ID, [
      "==",
      ["to-string", ["get", "__mapKey"]],
      selectedFeatureKey != null ? String(selectedFeatureKey) : "",
    ]);
  }, [selectedFeatureKey, mapReady, paintedGeojson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return undefined;

    const onFeatureClick = (e) => {
      const feature = e.features?.[0];
      const key = feature?.properties?.__mapKey;
      setSelectedFeatureKey(key != null && key !== "" ? String(key) : null);
    };

    const onMapClick = (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER_ID] });
      if (!hits.length) {
        setSelectedFeatureKey(null);
      }
    };

    map.on("click", FILL_LAYER_ID, onFeatureClick);
    map.on("click", onMapClick);
    return () => {
      map.off("click", FILL_LAYER_ID, onFeatureClick);
      map.off("click", onMapClick);
    };
  }, [mapReady]);

  const selectedFeature = useMemo(() => {
    if (selectedFeatureKey == null) return null;
    const key = String(selectedFeatureKey);
    return (
      paintedGeojson.features.find((feature) => String(feature.properties?.__mapKey ?? "") === key) ||
      null
    );
  }, [selectedFeatureKey, paintedGeojson]);

  const selectedDetails = useMemo(() => {
    if (!selectedFeature?.properties) return null;
    const props = selectedFeature.properties;
    const rawValue = props.__mapValue;
    const value = rawValue == null || rawValue === "" ? null : Number(rawValue);

    const municipalName = props.municipal || props.town || props.NAME || null;
    const formattedMunicipalName = municipalName
      ? String(municipalName)
          .toLowerCase()
          .replace(/\b\w/g, (s) => s.toUpperCase())
      : null;

    const isMunicipal =
      geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal ||
      props.__joinKey === "muni_id" ||
      props.__joinKey === "municipal" ||
      props.muni_id != null;

    const label =
      (isMunicipal && formattedMunicipalName) ||
      props.__mapLabel ||
      formattedMunicipalName ||
      "Area";

    return {
      label,
      value: Number.isFinite(value) ? value : null,
      year: mapYear != null ? String(mapYear) : null,
    };
  }, [selectedFeature, mapYear, geographyType]);

  const canDownloadGeojson = (paintedGeojson?.features?.length || 0) > 0 && !isBoundaryLoading;

  const handleDownloadGeojson = () => {
    if (!canDownloadGeojson) return;
    const parts = [table || "dataset", mapYear != null ? String(mapYear) : null].filter(Boolean);
    downloadMapGeojson(paintedGeojson, `${parts.join("_")}.geojson`);
  };

  if (!geographyType) {
    return (
      <div className="dataset-map-preview dataset-map-preview--empty">
        <p>Map preview is available for municipal and census tract tables.</p>
      </div>
    );
  }

  // Don't block the whole map on missing geography while geometry is still loading
  // (older years may be absent from the 15k table preview until the geometry API returns).
  if (!geographyColumn && !isBoundaryLoading && !apiBoundaryGeojson) {
    return (
      <div className="dataset-map-preview dataset-map-preview--empty">
        <p>This table does not include a recognizable geography column for mapping.</p>
      </div>
    );
  }

  if (!mappableColumns.length && !isBoundaryLoading && !apiBoundaryGeojson) {
    return (
      <div className="dataset-map-preview dataset-map-preview--empty">
        <p>Select at least one numeric column to preview on the map.</p>
      </div>
    );
  }

  if (!geographyColumn || !mappableColumns.length) {
    return (
      <div className="dataset-map-preview dataset-map-preview--empty">
        <div className="dataset-map-preview__loading" role="status" aria-live="polite" aria-label="Loading map">
          <MoonLoader size={42} color="#767676" />
        </div>
      </div>
    );
  }

  return (
    <div className="dataset-map-preview">
      <aside className="dataset-map-preview__sidebar" aria-label="Map variables">
        <h2 className="dataset-map-preview__sidebar-title">Variables</h2>
        <p className="dataset-map-preview__sidebar-hint">
          Choose a column to color the map. Values use the selected year and any active column filters.
        </p>
        <ul className="dataset-map-preview__variable-list">
          {mappableColumns.map((col) => {
            const selected = col.name === activeVariable;
            return (
              <li key={col.name}>
                <button
                  type="button"
                  className={`dataset-map-preview__variable${selected ? " dataset-map-preview__variable--selected" : ""}`}
                  onClick={() => onMapVariableChange?.(col.name)}
                  aria-pressed={selected}
                >
                  <span className="dataset-map-preview__variable-label">{col.label}</span>
                  <span className="dataset-map-preview__variable-name">{col.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="dataset-map-preview__map-panel">
        <div className="dataset-map-preview__map-header">
          <h2>{activeVariableLabel}</h2>
          {boundariesError && <span className="dataset-map-preview__status dataset-map-preview__status--error">{boundariesError}</span>}
        </div>
        <div className="dataset-map-preview__map-body">
          <div className="dataset-map-preview__map-shell">
            <div className="dataset-map-preview__layer-toggles" role="group" aria-label="Map overlay layers">
              <label className={`dataset-map-preview__layer-toggle${overlaysLoading ? " dataset-map-preview__layer-toggle--disabled" : ""}`}>
                <input
                  type="checkbox"
                  checked={showMunicipalLayer}
                  disabled={overlaysLoading}
                  onChange={(e) => setShowMunicipalLayer(e.target.checked)}
                />
                <span>Municipal boundaries</span>
              </label>
              <label className={`dataset-map-preview__layer-toggle${overlaysLoading ? " dataset-map-preview__layer-toggle--disabled" : ""}`}>
                <input
                  type="checkbox"
                  checked={showMapcRegionLayer}
                  disabled={overlaysLoading}
                  onChange={(e) => setShowMapcRegionLayer(e.target.checked)}
                />
                <span>MAPC region</span>
              </label>
            </div>
            <div ref={mapContainerRef} className="dataset-map-preview__map" role="img" aria-label={`Choropleth map of ${activeVariableLabel}`} />
            {isBoundaryLoading && (
              <div className="dataset-map-preview__loading" role="status" aria-live="polite" aria-label="Loading boundaries">
                <MoonLoader size={42} color="#767676" />
              </div>
            )}
            <div className="dataset-map-preview__legend" aria-label="Map legend">
              {legend.map((item) => (
                <div key={`${item.color}-${item.label}`} className="dataset-map-preview__legend-item">
                  <span className="dataset-map-preview__legend-swatch" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="dataset-map-preview__detail" aria-label="Selected area details">
            <div className="dataset-map-preview__detail-header">
              <h2 className="dataset-map-preview__detail-title">Details</h2>
              {selectedDetails && (
                <button
                  type="button"
                  className="dataset-map-preview__detail-close"
                  onClick={() => setSelectedFeatureKey(null)}
                  aria-label="Clear selection"
                >
                  Clear
                </button>
              )}
            </div>
            {!selectedDetails ? (
              <p className="dataset-map-preview__detail-empty">
                Click a{" "}
                {geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts
                  ? "census tract"
                  : "municipality"}{" "}
                on the map to view its values.
              </p>
            ) : (
              <dl className="dataset-map-preview__detail-list">
                <div className="dataset-map-preview__detail-row">
                  <dt>
                    {geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts
                      ? "Census tract"
                      : "Municipality"}
                  </dt>
                  <dd>{selectedDetails.label}</dd>
                </div>
                {selectedDetails.year && (
                  <div className="dataset-map-preview__detail-row">
                    <dt>Year</dt>
                    <dd>{selectedDetails.year}</dd>
                  </div>
                )}
                <div className="dataset-map-preview__detail-row dataset-map-preview__detail-row--emphasis">
                  <dt>{activeVariableLabel}</dt>
                  <dd>{formatMapValue(selectedDetails.value)}</dd>
                </div>
              </dl>
            )}
            <div className="dataset-map-preview__download-wrap">
              <button
                type="button"
                className="dataset-map-preview__download-geojson"
                onClick={handleDownloadGeojson}
                disabled={!canDownloadGeojson}
                aria-describedby="dataset-map-geojson-download-tip"
              >
                Download as GeoJSON
              </button>
              <span
                id="dataset-map-geojson-download-tip"
                role="tooltip"
                className="dataset-map-preview__download-tooltip"
              >
                Download the map in GeoJSON format with geometries and all table columns as
                properties.
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

DatasetMapPreview.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  columnKeys: PropTypes.arrayOf(PropTypes.object),
  queryYearColumn: PropTypes.string,
  selectedYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  geographyColumn: PropTypes.string,
  selectedGeographies: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  availableGeographies: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  columnFilters: PropTypes.arrayOf(PropTypes.object),
  geographyType: PropTypes.oneOf([
    MAP_VIEW_GEOGRAPHY_TYPES.municipal,
    MAP_VIEW_GEOGRAPHY_TYPES.census_tracts,
    null,
  ]),
  mapVariable: PropTypes.string,
  onMapVariableChange: PropTypes.func,
  database: PropTypes.string,
  schema: PropTypes.string,
  table: PropTypes.string,
};

export default DatasetMapPreview;

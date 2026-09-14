import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
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
  fetchNativeBoundaryGeojson,
  filterRowsForMapPreview,
  filterRowsByMapDimensions,
  detectMapExtraDimensions,
  areMapDimensionsSelected,
  formatMapValue,
  getColumnHeaderLabel,
  getColumnUnit,
  getMarginColumnForBase,
  getMappableColumns,
  isBoundariesCategory,
  adaptMunicipalBoundaryGeojson,
  resolveMapGeographyColumn,
  supportsTabularGeojsonExport,
} from "../../utils/datasetMapPreview";
import { ExportLoadingMask, useExportFileDownload } from "./ExportLoadingMask";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

const SOURCE_ID = "dataset-map-preview";
const FILL_LAYER_ID = "dataset-map-preview-fill";
const LINE_LAYER_ID = "dataset-map-preview-line";
const SELECTED_FILL_LAYER_ID = "dataset-map-preview-selected-fill";
const SELECTED_LINE_LAYER_ID = "dataset-map-preview-selected";
const CIRCLE_LAYER_ID = "dataset-map-preview-circle";
const SELECTED_CIRCLE_LAYER_ID = "dataset-map-preview-circle-selected";
const MUNI_SOURCE_ID = "dataset-map-preview-muni";
const MUNI_LINE_LAYER_ID = "dataset-map-preview-muni-line";
const MAPC_SOURCE_ID = "dataset-map-preview-mapc";
const MAPC_LINE_LAYER_ID = "dataset-map-preview-mapc-line";
const EMPTY_FC = { type: "FeatureCollection", features: [] };

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function geographyEntityLabel(geographyType, { plural = false } = {}) {
  switch (geographyType) {
    case MAP_VIEW_GEOGRAPHY_TYPES.census_tracts:
      return plural ? "census tracts" : "census tract";
    case MAP_VIEW_GEOGRAPHY_TYPES.boundary:
      return plural ? "features" : "feature";
    case MAP_VIEW_GEOGRAPHY_TYPES.school_districts:
      return plural ? "school districts" : "school district";
    case MAP_VIEW_GEOGRAPHY_TYPES.schools:
      return plural ? "schools" : "school";
    default:
      return plural ? "municipalities" : "municipality";
  }
}

function truncateMapLabel(text, maxLength = 48) {
  const value = String(text ?? "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function formatLegendFilterLine(items = []) {
  return items
    .map((item) => truncateMapLabel(item.value))
    .filter(Boolean)
    .join(", ");
}

function buildFeatureDetails(props, {
  mapYear,
  geographyType,
  geometryJoinKey,
  marginColumn,
  extraDimensionLabels = [],
} = {}) {
  if (!props) return null;
  const rawValue = props.__mapValue;
  const value = rawValue == null || rawValue === "" ? null : Number(rawValue);

  const municipalName = props.municipal || props.town || props.NAME || null;
  const formattedMunicipalName = municipalName
    ? String(municipalName)
        .toLowerCase()
        .replace(/\b\w/g, (s) => s.toUpperCase())
    : null;

  const joinKey = String(props.__joinKey || geometryJoinKey || "").toLowerCase();
  const isMunicipal =
    geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal ||
    ((joinKey === "muni_id" || joinKey === "municipal" || props.muni_id != null) &&
      geographyType !== MAP_VIEW_GEOGRAPHY_TYPES.school_districts &&
      geographyType !== MAP_VIEW_GEOGRAPHY_TYPES.schools);

  const label =
    (isMunicipal && formattedMunicipalName) ||
    props.__mapLabel ||
    formattedMunicipalName ||
    "Area";

  let tractBoundary = null;
  if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts) {
    if (joinKey === "ct20_id" || (props.ct20_id && !props.ct10_id)) {
      tractBoundary = "2020 Census tracts";
    } else if (joinKey === "ct10_id" || (props.ct10_id && !props.ct20_id)) {
      tractBoundary = "2010 Census tracts";
    } else if (props.ct20_id) {
      tractBoundary = "2020 Census tracts";
    } else if (props.ct10_id) {
      tractBoundary = "2010 Census tracts";
    }
  }

  let marginOfError = null;
  if (marginColumn) {
    const rawMoe =
      props.__mapMoe ??
      props[marginColumn] ??
      Object.entries(props).find(([key]) => key.toLowerCase() === marginColumn.toLowerCase())?.[1];
    const moeNum = rawMoe == null || rawMoe === "" ? null : Number(rawMoe);
    marginOfError = Number.isFinite(moeNum) ? moeNum : null;
  }

  return {
    label,
    value: Number.isFinite(value) ? value : null,
    marginOfError,
    year: mapYear != null ? String(mapYear) : null,
    tractBoundary,
    extraDimensionLabels,
  };
}

function featureDetailsToPopupHtml(details, {
  geographyType,
  activeVariableLabel,
  activeVariableUnit,
} = {}) {
  if (!details) return "";
  const placeLabel = geographyEntityLabel(geographyType).replace(/^./, (s) => s.toUpperCase());
  const valueText = formatMapValue(details.value, activeVariableUnit);
  const moeText =
    details.marginOfError != null
      ? ` ± ${formatMapValue(details.marginOfError, activeVariableUnit)}`
      : "";

  const rows = [
    `<div class="dataset-map-preview__hover-tooltip-row"><strong>${escapeHtml(placeLabel)}</strong> <span>${escapeHtml(details.label)}</span></div>`,
  ];
  if (details.year) {
    rows.push(
      `<div class="dataset-map-preview__hover-tooltip-row"><strong>Year</strong> <span>${escapeHtml(details.year)}</span></div>`,
    );
  }
  if (details.tractBoundary) {
    rows.push(
      `<div class="dataset-map-preview__hover-tooltip-row"><strong>Boundary</strong> <span>${escapeHtml(details.tractBoundary)}</span></div>`,
    );
  }
  (details.extraDimensionLabels || []).forEach((item) => {
    rows.push(
      `<div class="dataset-map-preview__hover-tooltip-row dataset-map-preview__hover-tooltip-row--stacked"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div>`,
    );
  });
  if (activeVariableLabel) {
    rows.push(
      `<div class="dataset-map-preview__hover-tooltip-row dataset-map-preview__hover-tooltip-row--metric"><strong>${escapeHtml(activeVariableLabel)}</strong> <span>${escapeHtml(valueText)}${escapeHtml(moeText)}</span></div>`,
    );
  }
  return `<div class="dataset-map-preview__hover-tooltip">${rows.join("")}</div>`;
}

function polygonGeometryFilter() {
  return ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false];
}

function selectedKeyFilter(selectedFeatureKey) {
  return selectedFeatureKey != null && selectedFeatureKey !== ""
    ? ["==", ["to-string", ["get", "__mapKey"]], String(selectedFeatureKey)]
    : ["==", ["get", "__mapKey"], "__none__"];
}

function syncMapLayerOrder(map) {
  if (!map) return;
  // Bottom → top: fill, outlines, boundary overlays, selected fill/outline.
  [
    FILL_LAYER_ID,
    LINE_LAYER_ID,
    CIRCLE_LAYER_ID,
    MUNI_LINE_LAYER_ID,
    MAPC_LINE_LAYER_ID,
    SELECTED_FILL_LAYER_ID,
    SELECTED_LINE_LAYER_ID,
    SELECTED_CIRCLE_LAYER_ID,
  ].forEach((layerId) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  });
}

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
  menu1 = null,
  title = "",
  source = "",
  datasetId = null,
  database = "ds",
  schema = "tabular",
  table = "",
}) {
  const location = useLocation();
  const isEmbedView = new URLSearchParams(location.search).get("embed") === "1";
  const municipalGeojson = useSelector((state) => state.municipality.geojson);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [apiBoundaryGeojson, setApiBoundaryGeojson] = useState(null);
  const [geometryJoinKey, setGeometryJoinKey] = useState(null);
  const [geometryYear, setGeometryYear] = useState(null);
  const [boundariesError, setBoundariesError] = useState("");
  const [boundariesLoading, setBoundariesLoading] = useState(false);
  const [overlaysLoading, setOverlaysLoading] = useState(true);
  const [showMunicipalLayer, setShowMunicipalLayer] = useState(false);
  const [showMapcRegionLayer, setShowMapcRegionLayer] = useState(false);
  const [muniOverlayGeojson, setMuniOverlayGeojson] = useState(EMPTY_FC);
  const [mapcOverlayGeojson, setMapcOverlayGeojson] = useState(EMPTY_FC);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState(null);
  const [dimensionSelections, setDimensionSelections] = useState({});
  const hoverPopupRef = useRef(null);
  const { isExporting, exportError, runExportDownload, clearExportError } = useExportFileDownload();

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

  const extraDimensions = useMemo(() => {
    if (isBoundariesCategory(menu1) || geographyType === MAP_VIEW_GEOGRAPHY_TYPES.boundary) {
      return { hasDuplicates: false, dimensions: [] };
    }
    return detectMapExtraDimensions({
      rows,
      geographyColumn,
      yearColumn: queryYearColumn,
      columnKeys,
    });
  }, [rows, geographyColumn, queryYearColumn, columnKeys, menu1, geographyType]);

  const extraDimensionNames = useMemo(
    () => new Set(extraDimensions.dimensions.map((dimension) => dimension.name)),
    [extraDimensions],
  );

  const mappableColumns = useMemo(() => {
    // Prefer geometry-joined properties when the 15k table preview is missing this year.
    const geometryRows =
      apiBoundaryGeojson?.features?.map((feature) => feature.properties).filter(Boolean) || [];
    const sampleRows = filteredRows.length ? filteredRows : geometryRows.length ? geometryRows : rows;
    return getMappableColumns(columnKeys, sampleRows, geographyColumn, queryYearColumn).filter(
      (col) => !extraDimensionNames.has(col.name),
    );
  }, [columnKeys, filteredRows, rows, apiBoundaryGeojson, geographyColumn, queryYearColumn, extraDimensionNames]);

  const activeVariable =
    mapVariable && mappableColumns.some((col) => col.name === mapVariable)
      ? mapVariable
      : mappableColumns[0]?.name || null;

  const activeVariableLabel =
    getColumnHeaderLabel(columnKeys, activeVariable) ||
    mappableColumns.find((col) => col.name === activeVariable)?.label ||
    activeVariable ||
    "";

  const activeVariableUnit = useMemo(() => {
    const column =
      columnKeys.find((col) => col.name === activeVariable) ||
      mappableColumns.find((col) => col.name === activeVariable);
    return getColumnUnit(column);
  }, [activeVariable, columnKeys, mappableColumns]);

  const marginColumn = useMemo(
    () => getMarginColumnForBase(columnKeys, activeVariable),
    [columnKeys, activeVariable],
  );

  useEffect(() => {
    if (!activeVariable) return;
    if (mapVariable !== activeVariable) {
      onMapVariableChange?.(activeVariable);
    }
  }, [activeVariable, mapVariable, onMapVariableChange]);

  const mapYear = selectedYears?.[0] ?? null;
  const extraDimensionKey = extraDimensions.dimensions.map((dimension) => dimension.name).join("|");

  useEffect(() => {
    setDimensionSelections({});
  }, [extraDimensionKey, table]);

  const needsDimensionPicker = extraDimensions.hasDuplicates && extraDimensions.dimensions.length > 0;
  const dimensionsReady = areMapDimensionsSelected(extraDimensions.dimensions, dimensionSelections);

  const extraDimensionLabels = useMemo(() => {
    if (!needsDimensionPicker || !dimensionsReady) return [];
    return extraDimensions.dimensions.map((dimension) => ({
      label: getColumnHeaderLabel(columnKeys, dimension.name),
      value: String(dimensionSelections[dimension.name] ?? ""),
    }));
  }, [needsDimensionPicker, dimensionsReady, extraDimensions.dimensions, dimensionSelections, columnKeys]);

  const choroplethRows = useMemo(() => {
    if (!needsDimensionPicker) return filteredRows;
    if (!dimensionsReady) return [];
    return filterRowsByMapDimensions(filteredRows, dimensionSelections);
  }, [needsDimensionPicker, dimensionsReady, filteredRows, dimensionSelections]);

  useEffect(() => {
    let cancelled = false;

    const loadOverlays = async () => {
      setOverlaysLoading(true);
      try {
        // Load independently so one failure (e.g. unauthorized MAPC table) does not block both.
        const [muniResult, mapcResult] = await Promise.allSettled([
          fetchGisBoundaryLayer("municipal"),
          fetchGisBoundaryLayer("mapcRegion"),
        ]);
        if (cancelled) return;
        if (muniResult.status === "fulfilled") {
          setMuniOverlayGeojson(muniResult.value);
        } else {
          console.error("Failed to load municipal overlay boundaries:", muniResult.reason);
        }
        if (mapcResult.status === "fulfilled") {
          setMapcOverlayGeojson(mapcResult.value);
        } else {
          console.error("Failed to load MAPC region overlay boundaries:", mapcResult.reason);
        }
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
  // Boundaries category tables already have polygons in `shape` — no geometry-API join.
  const isBoundariesDataset = isBoundariesCategory(menu1);
  const shapeAttributeColumns = useMemo(
    () => (columnKeys || []).map((col) => col?.name).filter(Boolean),
    [columnKeys],
  );
  const boundaryLayerLabel = title || "Boundaries";

  useEffect(() => {
    const usesGeometryApi =
      !isBoundariesDataset &&
      (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.census_tracts ||
        geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal);

    if (!usesGeometryApi && !isBoundariesDataset) {
      setApiBoundaryGeojson(null);
      setGeometryJoinKey(null);
      setGeometryYear(null);
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
        let result;
        if (table === "ma_municipalities" && municipalGeojson?.features?.length) {
          // Static Redux polygons are already WGS84 — avoid a multi‑MB ST_AsText round-trip.
          result = {
            featureCollection: adaptMunicipalBoundaryGeojson(municipalGeojson),
            joinKey: "muni_id",
            boundaryLabel: boundaryLayerLabel,
          };
        } else if (isBoundariesDataset) {
          // Load this table’s own `shape` column.
          result = await fetchNativeBoundaryGeojson({
            database,
            schema,
            table,
            columnNames: shapeAttributeColumns,
            boundaryLabel: boundaryLayerLabel,
          });
        } else {
          const years = mapYear != null ? [mapYear] : [];
          result = await fetchDatasetGeometry({
            database,
            schema,
            table,
            years,
            yearColumn: queryYearColumn || null,
          });
        }
        if (cancelled) return;
        setApiBoundaryGeojson(result.featureCollection);
        setGeometryJoinKey(result.joinKey);
        setGeometryYear(mapYear);
        setBoundariesLoading(false);
      } catch (primaryError) {
        if (cancelled) return;
        setApiBoundaryGeojson(null);
        setGeometryJoinKey(null);
        setGeometryYear(null);
        if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal && !isBoundariesDataset) {
          setBoundariesError(
            primaryError?.message
              ? `Geometry API unavailable (${primaryError.message}); using fallback boundaries`
              : "Geometry API unavailable; using fallback boundaries",
          );
        } else {
          setBoundariesError(
            primaryError?.message || "Unable to load map boundaries",
          );
        }
        setBoundariesLoading(false);
      }
    };

    loadBoundaries();

    return () => {
      cancelled = true;
    };
  }, [
    geographyType,
    database,
    schema,
    table,
    mapYear,
    queryYearColumn,
    municipalGeojson,
    isBoundariesDataset,
    shapeAttributeColumns,
    boundaryLayerLabel,
  ]);

  const baseGeojson = useMemo(() => {
    if (apiBoundaryGeojson) return apiBoundaryGeojson;
    if (geographyType === MAP_VIEW_GEOGRAPHY_TYPES.municipal && !boundariesLoading && municipalGeojson) {
      return adaptMunicipalBoundaryGeojson(municipalGeojson);
    }
    return null;
  }, [apiBoundaryGeojson, geographyType, boundariesLoading, municipalGeojson]);

  const tractBoundaryLabel = useMemo(() => {
    if (isBoundariesDataset) return null;

    if (geographyType !== MAP_VIEW_GEOGRAPHY_TYPES.census_tracts) return null;
    const joinKey = String(geometryJoinKey || "").toLowerCase();
    const props = baseGeojson?.features?.[0]?.properties || {};
    const featureJoinKey = String(props.__joinKey || "").toLowerCase();
    const key = joinKey || featureJoinKey;

    if (key === "ct20_id" || (props.ct20_id && !props.ct10_id)) {
      return "2020 Census tracts";
    }
    if (key === "ct10_id" || (props.ct10_id && !props.ct20_id)) {
      return "2010 Census tracts";
    }
    if (props.ct20_id) return "2020 Census tracts";
    if (props.ct10_id) return "2010 Census tracts";
    return null;
  }, [isBoundariesDataset, geographyType, geometryJoinKey, baseGeojson]);

  const geometryReadyForSelectedYear =
    Boolean(apiBoundaryGeojson?.features?.length) &&
    (mapYear == null || String(geometryYear) === String(mapYear));

  const valueByGeography = useMemo(() => {
    if (!activeVariable) return new Map();

    if (needsDimensionPicker) {
      if (!dimensionsReady) return new Map();
      // Geometry API has the full selected year (not the 15k table preview).
      if (geometryReadyForSelectedYear) {
        const fromFeatures = buildValueByGeographyFromFeatures({
          features: apiBoundaryGeojson.features,
          valueColumn: activeVariable,
          geographyType,
          selections: dimensionSelections,
        });
        if (fromFeatures.size) return fromFeatures;
      }
      if (!geographyColumn || !choroplethRows.length) return new Map();
      return buildValueByGeography({
        rows: choroplethRows,
        geographyColumn,
        valueColumn: activeVariable,
        yearColumn: queryYearColumn,
        geographyType,
      });
    }

    // Geometry API features already include full table columns for the selected year
    // and are not subject to the browser's 15k-row preview limit.
    if (geometryReadyForSelectedYear) {
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
    needsDimensionPicker,
    dimensionsReady,
    dimensionSelections,
    choroplethRows,
    filteredRows,
    geographyColumn,
    activeVariable,
    queryYearColumn,
    geographyType,
    apiBoundaryGeojson,
    geometryReadyForSelectedYear,
  ]);

  const moeByGeography = useMemo(() => {
    if (!marginColumn) return null;

    if (needsDimensionPicker) {
      if (!dimensionsReady) return null;
      if (geometryReadyForSelectedYear) {
        const fromFeatures = buildValueByGeographyFromFeatures({
          features: apiBoundaryGeojson.features,
          valueColumn: marginColumn,
          geographyType,
          selections: dimensionSelections,
        });
        if (fromFeatures.size) return fromFeatures;
      }
      if (!geographyColumn || !choroplethRows.length) return null;
      return buildValueByGeography({
        rows: choroplethRows,
        geographyColumn,
        valueColumn: marginColumn,
        yearColumn: queryYearColumn,
        geographyType,
      });
    }

    if (geometryReadyForSelectedYear) {
      const fromFeatures = buildValueByGeographyFromFeatures({
        features: apiBoundaryGeojson.features,
        valueColumn: marginColumn,
        geographyType,
      });
      if (fromFeatures.size) return fromFeatures;
    }

    if (!geographyColumn) return null;
    return buildValueByGeography({
      rows: filteredRows,
      geographyColumn,
      valueColumn: marginColumn,
      yearColumn: queryYearColumn,
      geographyType,
    });
  }, [
    marginColumn,
    needsDimensionPicker,
    dimensionsReady,
    dimensionSelections,
    choroplethRows,
    apiBoundaryGeojson,
    geographyType,
    geographyColumn,
    filteredRows,
    queryYearColumn,
    geometryReadyForSelectedYear,
  ]);

  const { colorForValue, legend, binningDescription } = useMemo(() => {
    const values = [...valueByGeography.values()];
    if (!values.length && isBoundariesDataset) {
      const boundaryColor = "#7eb8c9";
      return {
        colorForValue: () => boundaryColor,
        legend: [{ label: boundaryLayerLabel, color: boundaryColor }],
        binningDescription: "Classification: Boundary outline",
      };
    }
    return buildChoroplethScale(values, { unit: activeVariableUnit });
  }, [valueByGeography, activeVariableUnit, boundaryLayerLabel, isBoundariesDataset]);

  const paintedGeojson = useMemo(() => {
    if (!baseGeojson) return { type: "FeatureCollection", features: [] };
    return enrichBoundariesWithValues({
      baseGeojson,
      valueByGeography,
      moeByGeography,
      geographyType,
      colorForValue,
    });
  }, [baseGeojson, valueByGeography, moeByGeography, geographyType, colorForValue]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_CONFIG.style,
      dragRotate: true,
      touchPitch: false,
      pitchWithRotate: false,
      bounds: MAP_CONFIG.bounds,
      fitBoundsOptions: { padding: { top: 24, bottom: 24, left: 24, right: 24 }, animate: false },
    });

    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
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
        filter: polygonGeometryFilter(),
        paint: {
          "fill-color": ["coalesce", ["get", "__mapColor"], "#E0E0E0"],
          "fill-opacity": 0.92,
        },
      });

      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: polygonGeometryFilter(),
        paint: {
          "line-color": "#334155",
          "line-width": 0.7,
          "line-opacity": 0.55,
        },
      });

      map.addLayer({
        id: CIRCLE_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": ["coalesce", ["get", "__mapColor"], "#E0E0E0"],
          "circle-radius": 7,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#334155",
          "circle-opacity": 0.92,
        },
      });

      map.addLayer({
        id: SELECTED_FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": ["coalesce", ["get", "__mapColor"], "#E0E0E0"],
          "fill-opacity": 0.94,
        },
        filter: ["all", polygonGeometryFilter(), ["==", ["get", "__mapKey"], "__none__"]],
      });

      map.addLayer({
        id: SELECTED_LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#0f172a",
          "line-width": 2.2,
          "line-opacity": 1,
        },
        filter: [
          "all",
          polygonGeometryFilter(),
          ["==", ["get", "__mapKey"], "__none__"],
        ],
      });

      map.addLayer({
        id: SELECTED_CIRCLE_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 10,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-width": 2.2,
          "circle-stroke-color": "#0f172a",
        },
        filter: [
          "all",
          ["==", ["geometry-type"], "Point"],
          ["==", ["get", "__mapKey"], "__none__"],
        ],
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
          "line-color": "#5a5a5a",
          "line-width": 1.6,
          "line-opacity": 1,
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
          "line-color": "#000000",
          "line-width": 3.5,
          "line-opacity": 1,
        },
      });

      syncMapLayerOrder(map);

      map.on("mouseenter", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", CIRCLE_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CIRCLE_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.resize();
      setMapReady(true);
    });

    mapRef.current = map;

    const resizeObserver =
      typeof ResizeObserver !== "undefined" && mapContainerRef.current
        ? new ResizeObserver(() => {
            map.resize();
          })
        : null;
    if (resizeObserver && mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
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
    syncMapLayerOrder(map);
  }, [muniOverlayGeojson, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(MAPC_SOURCE_ID);
    if (source) {
      source.setData(mapcOverlayGeojson || EMPTY_FC);
    }
    syncMapLayerOrder(map);
  }, [mapcOverlayGeojson, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = showMunicipalLayer ? "visible" : "none";
    if (map.getLayer(MUNI_LINE_LAYER_ID)) {
      map.setLayoutProperty(MUNI_LINE_LAYER_ID, "visibility", visibility);
      if (showMunicipalLayer) syncMapLayerOrder(map);
    }
  }, [showMunicipalLayer, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = showMapcRegionLayer ? "visible" : "none";
    if (map.getLayer(MAPC_LINE_LAYER_ID)) {
      map.setLayoutProperty(MAPC_LINE_LAYER_ID, "visibility", visibility);
      if (showMapcRegionLayer) syncMapLayerOrder(map);
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
    if (isBoundariesDataset && paintedGeojson?.features?.length) {
      const bounds = new mapboxgl.LngLatBounds();
      let hasCoord = false;
      const extendCoords = (coords) => {
        if (!Array.isArray(coords) || !coords.length) return;
        if (typeof coords[0] === "number") {
          if (Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
            bounds.extend([coords[0], coords[1]]);
            hasCoord = true;
          }
          return;
        }
        coords.forEach(extendCoords);
      };
      paintedGeojson.features.forEach((feature) => extendCoords(feature?.geometry?.coordinates));
      if (hasCoord && !bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: { top: 28, bottom: 28, left: 28, right: 28 },
          animate: false,
          maxZoom: 12,
        });
      }
    }
    // Keep layer stack: boundaries under selected highlight.
    syncMapLayerOrder(map);
  }, [paintedGeojson, mapReady, geographyType, isBoundariesDataset]);

  useEffect(() => {
    setSelectedFeatureKey(null);
  }, [table, geographyType, mapYear]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(SELECTED_LINE_LAYER_ID)) return;
    // Use a non-matching sentinel when nothing is selected — matching "" would
    // highlight every feature whose __mapKey is missing/empty.
    const keyFilter = selectedKeyFilter(selectedFeatureKey);
    if (map.getLayer(SELECTED_FILL_LAYER_ID)) {
      map.setFilter(SELECTED_FILL_LAYER_ID, ["all", polygonGeometryFilter(), keyFilter]);
    }
    map.setFilter(SELECTED_LINE_LAYER_ID, [
      "all",
      polygonGeometryFilter(),
      keyFilter,
    ]);
    if (map.getLayer(SELECTED_CIRCLE_LAYER_ID)) {
      map.setFilter(SELECTED_CIRCLE_LAYER_ID, [
        "all",
        ["==", ["geometry-type"], "Point"],
        keyFilter,
      ]);
    }
    syncMapLayerOrder(map);
  }, [selectedFeatureKey, mapReady, paintedGeojson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return undefined;

    if (isEmbedView) {
      if (!hoverPopupRef.current) {
        hoverPopupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          maxWidth: "260px",
          className: "dataset-map-preview__mapbox-popup",
        });
      }
      const popup = hoverPopupRef.current;

      const onMouseMove = (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        map.getCanvas().style.cursor = "pointer";
        const details = buildFeatureDetails(feature.properties, {
          mapYear,
          geographyType,
          geometryJoinKey,
          marginColumn,
          extraDimensionLabels,
        });
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            featureDetailsToPopupHtml(details, {
              geographyType,
              activeVariableLabel,
              activeVariableUnit,
            }),
          )
          .addTo(map);
      };

      const onMouseLeave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };

      map.on("mousemove", FILL_LAYER_ID, onMouseMove);
      map.on("mouseleave", FILL_LAYER_ID, onMouseLeave);
      map.on("mousemove", CIRCLE_LAYER_ID, onMouseMove);
      map.on("mouseleave", CIRCLE_LAYER_ID, onMouseLeave);
      return () => {
        map.off("mousemove", FILL_LAYER_ID, onMouseMove);
        map.off("mouseleave", FILL_LAYER_ID, onMouseLeave);
        map.off("mousemove", CIRCLE_LAYER_ID, onMouseMove);
        map.off("mouseleave", CIRCLE_LAYER_ID, onMouseLeave);
        popup.remove();
      };
    }

    const interactiveLayers = [FILL_LAYER_ID, CIRCLE_LAYER_ID].filter((id) => map.getLayer(id));

    const onMapClick = (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: interactiveLayers });
      if (!hits.length) {
        setSelectedFeatureKey(null);
        return;
      }
      const key = hits[0]?.properties?.__mapKey;
      setSelectedFeatureKey(key != null && key !== "" ? String(key) : null);
    };

    map.on("click", onMapClick);
    return () => {
      map.off("click", onMapClick);
    };
  }, [
    mapReady,
    isEmbedView,
    mapYear,
    geographyType,
    geometryJoinKey,
    marginColumn,
    extraDimensionLabels,
    activeVariableLabel,
    activeVariableUnit,
  ]);

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
    return buildFeatureDetails(selectedFeature.properties, {
      mapYear,
      geographyType,
      geometryJoinKey,
      marginColumn,
      extraDimensionLabels,
    });
  }, [selectedFeature, mapYear, geographyType, geometryJoinKey, marginColumn, extraDimensionLabels]);

  const canDownloadGeojson =
    Boolean(table) &&
    !isBoundaryLoading &&
    !isExporting &&
    supportsTabularGeojsonExport(table, geographyType, { menu1 });

  const handleDownloadGeojson = async () => {
    if (!canDownloadGeojson) return;

    const params = new URLSearchParams({
      token: import.meta.env.VITE_MAPC_API_TOKEN,
      database: database || "ds",
      schema: schema || "tabular",
      table,
      format: "geojson",
      useMetadataColumns: "true",
    });
    if (mapYear != null && queryYearColumn) {
      params.set("years", String(mapYear));
    }

    clearExportError();
    const yearSuffix = mapYear != null ? `_${mapYear}` : "";
    await runExportDownload(
      `/api/export?${params.toString()}`,
      `${table || "export"}${yearSuffix}.geojson`,
    );
  };

  if (!geographyType) {
    return (
      <div className="dataset-map-preview dataset-map-preview--empty">
        <p>Map preview is available for municipal, census tract, and Boundaries datasets.</p>
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

  // Boundary-only layers (e.g. Boundaries category / ma_municipalities) have no numeric choropleth columns.
  const isBoundaryOnlyMap = isBoundariesDataset || Boolean(apiBoundaryGeojson);
  if (!mappableColumns.length && !isBoundaryLoading && !isBoundaryOnlyMap) {
    return (
      <div className="dataset-map-preview dataset-map-preview--empty">
        <p>Select at least one numeric column to preview on the map.</p>
      </div>
    );
  }

  return (
    <div className={`dataset-map-preview${isEmbedView ? " dataset-map-preview--embed" : ""}`}>
      <div className="dataset-map-preview__map-panel">
        {boundariesError && (
          <span className="dataset-map-preview__status dataset-map-preview__status--error">{boundariesError}</span>
        )}
        <div className="dataset-map-preview__map-body">
          <div className="dataset-map-preview__map-column">
          <div className="dataset-map-preview__map-shell">
            {!isEmbedView && <ExportLoadingMask active={isExporting} />}
            <div className="dataset-map-preview__map-controls">
              <div className="dataset-map-preview__north-arrow" aria-hidden="true" title="North">
                <span className="dataset-map-preview__north-arrow-pointer" />
                <span className="dataset-map-preview__north-arrow-label">N</span>
              </div>
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
            </div>
            <div ref={mapContainerRef} className="dataset-map-preview__map" role="img" aria-label={`Choropleth map of ${activeVariableLabel}`} />
            {isBoundaryLoading && (
              <div className="dataset-map-preview__loading" role="status" aria-live="polite" aria-label="Loading boundaries">
                <MoonLoader size={42} color="#767676" />
              </div>
            )}
            <div className="dataset-map-preview__legend" aria-label="Map legend">
              {(activeVariableLabel || tractBoundaryLabel) && (
                <div className="dataset-map-preview__legend-header">
                  {activeVariableLabel && (
                    <h3 className="dataset-map-preview__legend-title">
                      {activeVariableLabel}
                    </h3>
                  )}
                  {extraDimensionLabels.length > 0 && (
                    <p className="dataset-map-preview__legend-filters">
                      {formatLegendFilterLine(extraDimensionLabels)}
                    </p>
                  )}
                  {tractBoundaryLabel && (
                    <p className="dataset-map-preview__legend-boundary">{tractBoundaryLabel}</p>
                  )}
                  {needsDimensionPicker && !dimensionsReady && (
                    <p className="dataset-map-preview__legend-boundary">
                      Select a category in the Variable panel to color the map
                    </p>
                  )}
                </div>
              )}
              {legend.map((item) => (
                <div key={`${item.color}-${item.label}`} className="dataset-map-preview__legend-item">
                  <span className="dataset-map-preview__legend-swatch" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="metadata dataset-map-preview__metadata">
            {binningDescription && (
              <span className="dataset-map-preview__metadata-item">{binningDescription}</span>
            )}
            <span className="dataset-map-preview__metadata-item">
              Source:
              {" "}
              {source || "Unknown"}
            </span>
            <span className="dataset-map-preview__metadata-item">
              Years:
              {" "}
              {mapYear != null
                ? String(mapYear)
                : selectedYears?.length
                  ? selectedYears.map(String).join(", ")
                  : "N/A"}
            </span>
            {datasetId != null && datasetId !== "" && title && (
              <span className="dataset-map-preview__metadata-item link">
                Link to:
                {" "}
                <a
                  href={`/browser/datasets/${datasetId}/map${(() => {
                    const params = new URLSearchParams(location.search || "");
                    params.delete("embed");
                    const qs = params.toString();
                    return qs ? `?${qs}` : "";
                  })()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {title}
                </a>
              </span>
            )}
          </div>
          </div>

          {!isEmbedView && (
            <div className="dataset-map-preview__side-panels">
              <aside className="dataset-map-preview__detail" aria-label="Map variable">
                <div className="dataset-map-preview__detail-header">
                  <h2 className="dataset-map-preview__detail-title">Variable</h2>
                </div>
                {mappableColumns.length ? (
                  <>
                    <label className="dataset-map-preview__variable-field">
                      <span className="dataset-map-preview__variable-field-label">Choose a column to color the map</span>
                        <select
                        className="dataset-map-preview__variable-select"
                        value={activeVariable || ""}
                        disabled={boundariesLoading}
                        onChange={(e) => {
                          if (boundariesLoading) return;
                          onMapVariableChange?.(e.target.value);
                        }}
                        aria-label="Map variable"
                        aria-busy={boundariesLoading || undefined}
                        title={boundariesLoading ? "Loading year data" : (activeVariableLabel || undefined)}
                      >
                        {mappableColumns.map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {needsDimensionPicker && (
                      <div className="dataset-map-preview__dimension-fields">
                        <p className="dataset-map-preview__dimension-hint">
                          This dataset reports more than one category for each{" "}
                          {geographyEntityLabel(geographyType)}{" "}
                          in the selected year. Choose a category below so the map compares one value per place.
                        </p>
                        {extraDimensions.dimensions.map((dimension) => {
                          const dimensionTitle = getColumnHeaderLabel(columnKeys, dimension.name);
                          return (
                            <label key={dimension.name} className="dataset-map-preview__variable-field">
                              <span className="dataset-map-preview__variable-field-label">{dimensionTitle}</span>
                              <select
                                className={`dataset-map-preview__variable-select${!dimensionSelections[dimension.name] ? " dataset-map-preview__variable-select--required" : ""}`}
                                value={dimensionSelections[dimension.name] ?? ""}
                                disabled={boundariesLoading}
                                onChange={(e) => {
                                  if (boundariesLoading) return;
                                  const value = e.target.value;
                                  setDimensionSelections((prev) => ({ ...prev, [dimension.name]: value }));
                                }}
                                aria-label={dimensionTitle}
                                aria-busy={boundariesLoading || undefined}
                                title={boundariesLoading ? "Loading year data" : (dimensionSelections[dimension.name] || undefined)}
                              >
                                <option value="">Select {dimensionTitle}</option>
                                {dimension.values.map((value) => (
                                  <option key={String(value)} value={String(value)}>
                                    {String(value)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="dataset-map-preview__variable-field-label">
                    This boundary layer has no numeric columns to choropleth. Click a feature for details.
                  </p>
                )}
              </aside>

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
                    Click a {geographyEntityLabel(geographyType)} on the map to view its values.
                  </p>
                ) : (
                  <dl className="dataset-map-preview__detail-list">
                    <div className="dataset-map-preview__detail-row dataset-map-preview__detail-row--inline">
                      <dt>
                        {geographyEntityLabel(geographyType).replace(/^./, (s) => s.toUpperCase())}
                      </dt>
                      <dd>{selectedDetails.label}</dd>
                    </div>
                    {selectedDetails.year && (
                      <div className="dataset-map-preview__detail-row dataset-map-preview__detail-row--inline">
                        <dt>Year</dt>
                        <dd>{selectedDetails.year}</dd>
                      </div>
                    )}
                    {selectedDetails.tractBoundary && (
                      <div className="dataset-map-preview__detail-row dataset-map-preview__detail-row--inline">
                        <dt>Boundary</dt>
                        <dd>{selectedDetails.tractBoundary}</dd>
                      </div>
                    )}
                    {(selectedDetails.extraDimensionLabels || []).map((item) => (
                      <div
                        key={item.label}
                        className="dataset-map-preview__detail-row"
                      >
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                    <div className="dataset-map-preview__detail-row dataset-map-preview__detail-row--inline dataset-map-preview__detail-row--metric">
                      <dt>{activeVariableLabel}</dt>
                      <dd>
                        {formatMapValue(selectedDetails.value, activeVariableUnit)}
                        {selectedDetails.marginOfError != null && (
                          <span className="dataset-map-preview__detail-metric-moe">
                            {" "}
                            ± {formatMapValue(selectedDetails.marginOfError, activeVariableUnit)}
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
                <div className="dataset-map-preview__download-wrap">
                  <button
                    type="button"
                    className="dataset-map-preview__download-geojson"
                    onClick={handleDownloadGeojson}
                    disabled={!canDownloadGeojson}
                    aria-busy={isExporting}
                    aria-describedby="dataset-map-geojson-download-tip"
                  >
                    {isExporting ? "Preparing…" : "Download as GeoJSON"}
                  </button>
                  <span
                    id="dataset-map-geojson-download-tip"
                    role="tooltip"
                    className="dataset-map-preview__download-tooltip"
                  >
                    {!supportsTabularGeojsonExport(table, geographyType, { menu1 })
                      ? "GeoJSON export is not available for this geography type."
                      : mapYear != null
                        ? `Download the current map with selected year ${mapYear} as GeoJSON, with all table properties.`
                        : "Download the current map as GeoJSON, with all table properties."}
                  </span>
                  {exportError && (
                    <p className="dataset-map-preview__download-error" role="alert">
                      {exportError}
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}
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
    MAP_VIEW_GEOGRAPHY_TYPES.boundary,
    null,
  ]),
  mapVariable: PropTypes.string,
  onMapVariableChange: PropTypes.func,
  menu1: PropTypes.string,
  title: PropTypes.string,
  source: PropTypes.string,
  datasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  database: PropTypes.string,
  schema: PropTypes.string,
  table: PropTypes.string,
};

export default DatasetMapPreview;

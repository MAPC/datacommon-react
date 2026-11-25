import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import mapboxgl from "mapbox-gl";
import PropTypes from "prop-types";
import MoonLoader from "react-spinners/MoonLoader";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAP_CONFIG } from "../../constants/mapConfig";
import {
  fetchGisBoundaryLayer,
  fetchMassgisDistrictOverlay,
} from "../../utils/datasetMapPreview";
import {
  MHC_LAYER_IDS,
  POLYGON_GEOMETRY_FILTER,
  buildLegendIconImageExpression,
  buildPointCircleColorExpression,
  buildPolygonLegendPaint,
  buildTownWhereClause,
  ensureMhcFallbackImages,
  esriMinScaleToMinZoom,
  fetchArcgisLayerGeojson,
  fetchArcgisLayerMetadata,
  fetchMhcInventoryPoints,
  labelLayoutWithEsriFont,
  loadMhcPointIcons,
  normalizeTownName,
  resolveProfileTownName,
  townNameToProfileSlug,
  uniqueValueLegendEntries,
} from "../../utils/mhcInventoryArcgis";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

const EMPTY_FC = { type: "FeatureCollection", features: [] };
const INITIAL_MAP_PADDING = { top: 28, bottom: 28, left: 28, right: 28 };

const INVENTORY_SOURCE = "mhc-inventory-src";
const POINT_CIRCLE_LAYER = "mhc-inventory-point-circle";
const POINT_LAYER = "mhc-inventory-point";
const FILL_LAYER = "mhc-inventory-fill";
const LINE_LAYER = "mhc-inventory-line";
const LABEL_LAYER = "mhc-inventory-label";
const TOWN_OUTLINE_SOURCE = "mhc-inventory-town-outline";
const TOWN_OUTLINE_LAYER = "mhc-inventory-town-outline-line";
const SELECTED_SOURCE = "mhc-inventory-selected";
const SELECTED_POINT_LAYER = "mhc-inventory-selected-point";
const SELECTED_FILL_LAYER = "mhc-inventory-selected-fill";
const SELECTED_LINE_LAYER = "mhc-inventory-selected-line";

const MUNI_SOURCE = "mhc-inventory-muni";
const MUNI_LINE = "mhc-inventory-muni-line";
const HOUSE_SOURCE = "mhc-inventory-house";
const HOUSE_LINE = "mhc-inventory-house-line";
const SENATE_SOURCE = "mhc-inventory-senate";
const SENATE_LINE = "mhc-inventory-senate-line";
const MAPC_SOURCE = "mhc-inventory-mapc";
const MAPC_LINE = "mhc-inventory-mapc-line";

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
  } else if (geometry.type === "Point") {
    extendCoords(geometry.coordinates);
  } else if (geometry.type === "MultiPoint") {
    geometry.coordinates.forEach(extendCoords);
  } else if (geometry.type === "LineString") {
    extendCoords(geometry.coordinates);
  } else if (geometry.type === "MultiLineString") {
    geometry.coordinates.forEach(extendCoords);
  } else {
    return null;
  }
  return bounds.isEmpty() ? null : bounds;
}

function boundsFromFeatureCollection(fc) {
  const bounds = new mapboxgl.LngLatBounds();
  let hasGeometry = false;
  (fc?.features || []).forEach((feature) => {
    const featureBounds = geometryToBounds(feature?.geometry);
    if (!featureBounds) return;
    bounds.extend(featureBounds.getNorthEast());
    bounds.extend(featureBounds.getSouthWest());
    hasGeometry = true;
  });
  return hasGeometry && !bounds.isEmpty() ? bounds : null;
}

function waitForMapStyle(map, timeoutMs = 4000) {
  if (!map) return Promise.resolve();
  if (map.isStyleLoaded()) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      map.off("load", finish);
      map.off("idle", finish);
      resolve();
    };
    map.once("load", finish);
    map.once("idle", finish);
    window.setTimeout(finish, timeoutMs);
  });
}

function fitMapToTown(map, townFeature, { duration = 450, maxZoom = 13 } = {}) {
  if (!map?.isStyleLoaded()) return;
  const bounds = townFeature?.geometry ? geometryToBounds(townFeature.geometry) : null;
  if (!bounds) return;
  map.resize();
  map.fitBounds(bounds, {
    padding: INITIAL_MAP_PADDING,
    maxZoom,
    duration,
    essential: true,
  });
}

function fitMapToInventory(map, fc, inventoryLayerMode, townFeature) {
  if (!map?.isStyleLoaded()) return;
  const hasInventoryFeatures = (fc?.features?.length ?? 0) > 0;
  const inventoryBounds = hasInventoryFeatures ? boundsFromFeatureCollection(fc) : null;
  const townBounds = townFeature?.geometry ? geometryToBounds(townFeature.geometry) : null;
  const target = inventoryBounds || townBounds;
  if (!target) return;

  map.resize();
  const maxZoom = inventoryLayerMode === "points" ? 16 : 15;
  const ne = target.getNorthEast();
  const sw = target.getSouthWest();
  const isPointLike =
    Math.abs(ne.lng - sw.lng) < 1e-6 && Math.abs(ne.lat - sw.lat) < 1e-6;

  if (isPointLike) {
    map.flyTo({
      center: target.getCenter(),
      zoom: maxZoom,
      duration: 450,
      essential: true,
    });
    return;
  }

  map.fitBounds(target, {
    padding: INITIAL_MAP_PADDING,
    maxZoom,
    duration: 450,
    essential: true,
  });
}

function syncOverlayOrder(map) {
  if (!map) return;
  [
    FILL_LAYER,
    LINE_LAYER,
    POINT_CIRCLE_LAYER,
    POINT_LAYER,
    LABEL_LAYER,
    MUNI_LINE,
    HOUSE_LINE,
    SENATE_LINE,
    MAPC_LINE,
    SELECTED_FILL_LAYER,
    SELECTED_LINE_LAYER,
    SELECTED_POINT_LAYER,
    TOWN_OUTLINE_LAYER,
  ].forEach((id) => {
    if (map.getLayer(id)) map.moveLayer(id);
  });
}

function setSelectedHighlight(map, feature) {
  const src = map?.getSource(SELECTED_SOURCE);
  if (!src) return;
  if (!feature?.geometry) {
    src.setData(EMPTY_FC);
    return;
  }
  src.setData({ type: "FeatureCollection", features: [feature] });
}

function hasDistrictPolygons(geojson, layerKey) {
  const feature = geojson?.features?.[0];
  const geomType = feature?.geometry?.type || "";
  if (!/Polygon$/.test(geomType)) return false;
  const props = feature.properties || {};
  return layerKey === "house"
    ? Boolean(props.REP_DIST || props.DIST_CODE)
    : Boolean(props.SEN_DIST);
}

const SIDEBAR_FIELDS = [
  { keys: ["HISTORIC_N", "historic_n"], label: "Historic name" },
  { keys: ["LEGEND", "legend"], label: "Legend" },
  { keys: ["DESIGNATIO", "designatio"], label: "Designation" },
  { keys: ["USE_TYPE", "use_type"], label: "use_type" },
  { keys: ["SIGNIFICAN", "significan"], label: "Significance" },
  { keys: ["CONSTRUCTI", "constructi"], label: "Construction" },
  { keys: ["TOWN_NAME", "town_name"], label: "Municipality" },
  { keys: ["ADDRESS", "address"], label: "Address" },
  { keys: ["BUILDER", "BUILDER", "MAKER"], label: "Builder" },
  { keys: ["DATE_CONST", "DATE_CONST"], label: "Date constructed" },
];

function formatPropValue(value) {
  if (value == null || value === "" || value === " ") return null;
  return String(value);
}

export default function MhcInventoryMap({ defaultMunicipalityName, defaultMunicipalFeature }) {
  const municipalityCache = useSelector((state) => state.municipality.cache);
  const geojson = useSelector((state) => state.municipality.geojson);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const inventoryHandlersRef = useRef({});
  const loadGenerationRef = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const profileTownName = useMemo(
    () => resolveProfileTownName(defaultMunicipalityName, defaultMunicipalFeature, geojson),
    [defaultMunicipalityName, defaultMunicipalFeature, geojson],
  );

  const [selectedTown, setSelectedTown] = useState(profileTownName);
  const [inventoryLayer, setInventoryLayer] = useState("points");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [featureCount, setFeatureCount] = useState(null);
  const [legendEntries, setLegendEntries] = useState([]);
  const [labelMinZoom, setLabelMinZoom] = useState(12);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const [showMunicipalLayer, setShowMunicipalLayer] = useState(true);
  const [showMapcRegionLayer, setShowMapcRegionLayer] = useState(false);
  const [showHouseDistricts, setShowHouseDistricts] = useState(false);
  const [showSenateDistricts, setShowSenateDistricts] = useState(false);
  const [boundariesMenuOpen, setBoundariesMenuOpen] = useState(false);
  const [overlaysLoading, setOverlaysLoading] = useState(false);

  const [muniOverlayGeojson, setMuniOverlayGeojson] = useState(EMPTY_FC);
  const allMunicipalBoundariesFc = useMemo(() => {
    const base = muniOverlayGeojson?.features?.length ? muniOverlayGeojson : geojson;
    if (!base?.features?.length) return EMPTY_FC;
    const normSelected = normalizeTownName(selectedTown);
    return {
      type: "FeatureCollection",
      features: base.features
        .filter((f) => f?.geometry)
        .map((f) => ({
          type: "Feature",
          properties: {
            ...(f.properties || {}),
            mhcSelected:
              Boolean(normSelected) &&
              normalizeTownName(f.properties?.town) === normSelected,
          },
          geometry: f.geometry,
        })),
    };
  }, [muniOverlayGeojson, geojson, selectedTown]);
  const [mapcOverlayGeojson, setMapcOverlayGeojson] = useState(EMPTY_FC);
  const [houseDistricts, setHouseDistricts] = useState(EMPTY_FC);
  const [senateDistricts, setSenateDistricts] = useState(EMPTY_FC);
  const [houseDistrictsLoading, setHouseDistrictsLoading] = useState(false);
  const [senateDistrictsLoading, setSenateDistrictsLoading] = useState(false);

  const townOptions = useMemo(() => {
    const towns = (geojson?.features || [])
      .map((f) => f.properties?.town)
      .filter(Boolean);
    return [...new Set(towns)].sort((a, b) => a.localeCompare(b));
  }, [geojson]);

  const selectedTownFeature = useMemo(() => {
    const slug = townNameToProfileSlug(selectedTown);
    const normSelected = normalizeTownName(selectedTown);
    const fromCache = municipalityCache?.[slug] || null;
    const fromGeojson =
      (geojson?.features || []).find(
        (f) => normalizeTownName(f.properties?.town) === normSelected,
      ) || null;
    const fromDefault =
      defaultMunicipalFeature &&
      normalizeTownName(defaultMunicipalFeature.properties?.town) === normSelected
        ? defaultMunicipalFeature
        : null;

    const withGeometry = (feat) => (feat?.geometry ? feat : null);
    return (
      withGeometry(fromCache) ||
      withGeometry(fromGeojson) ||
      withGeometry(fromDefault) ||
      fromCache ||
      fromGeojson ||
      fromDefault ||
      null
    );
  }, [selectedTown, municipalityCache, defaultMunicipalFeature, geojson]);

  const profileUrl = selectedTown
    ? `/profile/${townNameToProfileSlug(selectedTown)}/arts-culture`
    : null;

  useEffect(() => {
    if (profileTownName) {
      setSelectedTown(profileTownName);
    }
  }, [profileTownName]);

  const inventoryFcRef = useRef(EMPTY_FC);

  const updateTownOutline = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyOutline = () => {
      const src = map.getSource(TOWN_OUTLINE_SOURCE);
      if (!src) return;
      if (allMunicipalBoundariesFc.features?.length) {
        src.setData(allMunicipalBoundariesFc);
        return;
      }
      const feat = selectedTownFeature;
      if (feat?.geometry) {
        src.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { mhcSelected: true },
              geometry: feat.geometry,
            },
          ],
        });
      } else {
        src.setData(EMPTY_FC);
      }
    };

    if (!map.isStyleLoaded()) {
      map.once("idle", applyOutline);
      return;
    }
    applyOutline();
  }, [allMunicipalBoundariesFc, selectedTownFeature]);

  const applyInventoryVisibility = useCallback(
    (layerMode) => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      const isPoints = layerMode === "points";
      if (map.getLayer(POINT_CIRCLE_LAYER)) {
        map.setLayoutProperty(POINT_CIRCLE_LAYER, "visibility", isPoints ? "visible" : "none");
      }
      if (map.getLayer(POINT_LAYER)) {
        map.setLayoutProperty(POINT_LAYER, "visibility", isPoints ? "visible" : "none");
      }
      if (map.getLayer(FILL_LAYER)) {
        map.setLayoutProperty(FILL_LAYER, "visibility", isPoints ? "none" : "visible");
      }
      if (map.getLayer(LINE_LAYER)) {
        map.setLayoutProperty(LINE_LAYER, "visibility", isPoints ? "none" : "visible");
      }
      syncOverlayOrder(map);
    },
    [],
  );

  const selectedTownFeatureRef = useRef(selectedTownFeature);
  selectedTownFeatureRef.current = selectedTownFeature;
  const updateTownOutlineRef = useRef(updateTownOutline);
  updateTownOutlineRef.current = updateTownOutline;

  const loadInventoryData = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !selectedTown) return;

    await waitForMapStyle(map);
    if (!mapRef.current) return;

    const loadGeneration = loadGenerationRef.current + 1;
    loadGenerationRef.current = loadGeneration;

    const where = buildTownWhereClause(selectedTown);
    setLoading(true);
    setLoadError(null);
    setSelectedFeature(null);
  const mapForHighlight = mapRef.current;
  if (mapForHighlight) setSelectedHighlight(mapForHighlight, null);

    try {
      const isPointsLayer = inventoryLayer === "points";
      const [meta, fc] = await Promise.all([
        fetchArcgisLayerMetadata(isPointsLayer ? MHC_LAYER_IDS.points : MHC_LAYER_IDS.areas),
        isPointsLayer
          ? fetchMhcInventoryPoints(selectedTown)
          : fetchArcgisLayerGeojson(MHC_LAYER_IDS.areas, where),
      ]);

      const liveMap = mapRef.current;
      if (loadGeneration !== loadGenerationRef.current || !liveMap) {
        return;
      }

      const drawingInfo = meta.drawingInfo || {};
      const renderer = drawingInfo.renderer || {};
      const labelingInfo = drawingInfo.labelingInfo || [];
      const entries = uniqueValueLegendEntries(renderer);
      setLegendEntries(entries);

      const townFeature = selectedTownFeatureRef.current;
      const centerLat =
        townFeature?.geometry?.coordinates?.[0]?.[0]?.[1] ??
        MAP_CONFIG.center[1];
      const minScale = labelingInfo[0]?.minScale;
      const minZoom = esriMinScaleToMinZoom(minScale, centerLat);
      setLabelMinZoom(minZoom);

      ensureMhcFallbackImages(liveMap);

      if (inventoryLayer === "points") {
        await loadMhcPointIcons(liveMap, renderer);
        if (loadGeneration !== loadGenerationRef.current) {
          return;
        }
        const iconExpr = buildLegendIconImageExpression(renderer);
        const circleColors = buildPointCircleColorExpression(renderer);
        if (liveMap.getLayer(POINT_CIRCLE_LAYER)) {
          liveMap.setPaintProperty(POINT_CIRCLE_LAYER, "circle-color", circleColors);
        }
        if (liveMap.getLayer(POINT_LAYER)) {
          liveMap.setLayoutProperty(POINT_LAYER, "icon-image", iconExpr);
          liveMap.setLayoutProperty(POINT_LAYER, "icon-size", [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            0.75,
            14,
            1.1,
            17,
            1.45,
          ]);
        }
      } else {
        const polygonPaint = buildPolygonLegendPaint(renderer);
        if (liveMap.getLayer(FILL_LAYER)) {
          liveMap.setPaintProperty(FILL_LAYER, "fill-color", polygonPaint["fill-color"]);
          liveMap.setPaintProperty(FILL_LAYER, "fill-opacity", polygonPaint["fill-opacity"]);
        }
        if (liveMap.getLayer(LINE_LAYER)) {
          liveMap.setPaintProperty(LINE_LAYER, "line-color", polygonPaint["line-color"]);
          liveMap.setPaintProperty(LINE_LAYER, "line-width", polygonPaint["line-width"]);
        }
      }

      if (loadGeneration !== loadGenerationRef.current || mapRef.current !== liveMap) {
        return;
      }

      const src = liveMap.getSource(INVENTORY_SOURCE);
      if (src) src.setData(fc);
      inventoryFcRef.current = fc;
      setFeatureCount(fc.features?.length ?? 0);

      const { layout, paint } = labelLayoutWithEsriFont(labelingInfo, minZoom);
      if (liveMap.getLayer(LABEL_LAYER)) {
        Object.entries(layout).forEach(([k, v]) => {
          if (k === "minzoom") {
            liveMap.setLayerZoomRange(LABEL_LAYER, minZoom, 24);
          } else {
            liveMap.setLayoutProperty(LABEL_LAYER, k, v);
          }
        });
        Object.entries(paint).forEach(([k, v]) => {
          if (v != null && v !== "") {
            liveMap.setPaintProperty(LABEL_LAYER, k, v);
          }
        });
      }

      applyInventoryVisibility(inventoryLayer);
      updateTownOutlineRef.current();
      fitMapToInventory(liveMap, fc, inventoryLayer, townFeature);
      syncOverlayOrder(liveMap);
    } catch (err) {
      console.error("MhcInventoryMap load failed", err);
      setLoadError(err.message || "Could not load historic inventory.");
      const src = mapRef.current?.getSource(INVENTORY_SOURCE);
      if (src) src.setData(EMPTY_FC);
      setFeatureCount(0);
    } finally {
      if (loadGeneration === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [inventoryLayer, selectedTown, applyInventoryVisibility]);

  useEffect(() => {
    if (!mapContainerRef.current) return undefined;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      style: MAP_CONFIG.style,
      dragRotate: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const onInventoryClick = (e) => {
      const f = e.features?.[0];
      if (!f?.properties) return;
      setSelectedFeature({ ...f.properties });
      setSelectedHighlight(map, f);
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const onLoad = () => {
      ensureMhcFallbackImages(map);
      map.addSource(INVENTORY_SOURCE, { type: "geojson", data: EMPTY_FC });

      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: INVENTORY_SOURCE,
        filter: POLYGON_GEOMETRY_FILTER,
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#e2e8f0",
          "fill-opacity": 0.65,
        },
      });
      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: INVENTORY_SOURCE,
        filter: POLYGON_GEOMETRY_FILTER,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#333",
          "line-width": 1,
        },
      });
      map.addLayer({
        id: POINT_CIRCLE_LAYER,
        type: "circle",
        source: INVENTORY_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            2.5,
            14,
            4,
            17,
            6,
          ],
          "circle-color": "#1f4e46",
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: POINT_LAYER,
        type: "symbol",
        source: INVENTORY_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        layout: {
          "icon-image": "mhc-legend-default",
          "icon-size": 1,
          "icon-allow-overlap": true,
        },
      });
      map.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: INVENTORY_SOURCE,
        layout: {
          "text-field": ["coalesce", ["get", "HISTORIC_N"], ["get", "historic_n"], ""],
          "text-size": 8,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-optional": true,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#000000",
          "text-halo-color": "rgba(255,255,255,0.5)",
          "text-halo-width": 1,
        },
      });

      map.addSource(TOWN_OUTLINE_SOURCE, { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: TOWN_OUTLINE_LAYER,
        type: "line",
        source: TOWN_OUTLINE_SOURCE,
        paint: {
          "line-color": [
            "case",
            ["boolean", ["get", "mhcSelected"], false],
            "#1f4e46",
            "#5a5a5a",
          ],
          "line-width": [
            "case",
            ["boolean", ["get", "mhcSelected"], false],
            2.5,
            1.2,
          ],
          "line-opacity": 1,
        },
      });

      map.addSource(MUNI_SOURCE, { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: MUNI_LINE,
        type: "line",
        source: MUNI_SOURCE,
        layout: { visibility: "none" },
        paint: { "line-color": "#5a5a5a", "line-width": 1.6 },
      });
      map.addSource(HOUSE_SOURCE, { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: HOUSE_LINE,
        type: "line",
        source: HOUSE_SOURCE,
        layout: { visibility: "none" },
        paint: { "line-color": "#b45309", "line-width": 1.5 },
      });
      map.addSource(SENATE_SOURCE, { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: SENATE_LINE,
        type: "line",
        source: SENATE_SOURCE,
        layout: { visibility: "none" },
        paint: { "line-color": "#1d4ed8", "line-width": 2 },
      });
      map.addSource(MAPC_SOURCE, { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: MAPC_LINE,
        type: "line",
        source: MAPC_SOURCE,
        layout: { visibility: "none" },
        paint: { "line-color": "#000000", "line-width": 3.5 },
      });

      inventoryHandlersRef.current = { onInventoryClick, onEnter, onLeave };
      [POINT_LAYER, POINT_CIRCLE_LAYER, FILL_LAYER, LINE_LAYER].forEach((layerId) => {
        map.on("click", layerId, onInventoryClick);
        map.on("mouseenter", layerId, onEnter);
        map.on("mouseleave", layerId, onLeave);
      });

      syncOverlayOrder(map);
      setMapReady(true);
      requestAnimationFrame(() => map.resize());
    };

    map.on("load", onLoad);

    return () => {
      map.off("load", onLoad);
      const h = inventoryHandlersRef.current;
      loadGenerationRef.current += 1;
      [POINT_LAYER, POINT_CIRCLE_LAYER, FILL_LAYER, LINE_LAYER].forEach((layerId) => {
        if (h.onInventoryClick) map.off("click", layerId, h.onInventoryClick);
        if (h.onEnter) map.off("mouseenter", layerId, h.onEnter);
        if (h.onLeave) map.off("mouseleave", layerId, h.onLeave);
      });
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !selectedTown) return undefined;
    void loadInventoryData();
  }, [mapReady, selectedTown, inventoryLayer, loadInventoryData]);

  useEffect(() => {
    if (!mapReady) return undefined;
    updateTownOutline();
    const map = mapRef.current;
    if (map?.getLayer(TOWN_OUTLINE_LAYER)) {
      map.setLayoutProperty(
        TOWN_OUTLINE_LAYER,
        "visibility",
        showMunicipalLayer ? "visible" : "none",
      );
    }
  }, [mapReady, showMunicipalLayer, allMunicipalBoundariesFc, selectedTownFeature, updateTownOutline]);

  useEffect(() => {
    if (!mapReady || !selectedTown || !mapRef.current) return undefined;
    const map = mapRef.current;
    const townFeature = selectedTownFeature;
    const frame = window.requestAnimationFrame(() => {
      if (!townFeature?.geometry) return;
      fitMapToTown(map, townFeature, { duration: 450, maxZoom: 13 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mapReady, selectedTown, selectedTownFeature]);

  useEffect(() => {
    applyInventoryVisibility(inventoryLayer);
  }, [inventoryLayer, mapReady, applyInventoryVisibility]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setOverlaysLoading(true);
      try {
        const [mapcResult, muniResult] = await Promise.allSettled([
          fetchGisBoundaryLayer("mapcRegion"),
          fetchGisBoundaryLayer("municipal"),
        ]);
        if (cancelled) return;
        if (mapcResult.status === "fulfilled") setMapcOverlayGeojson(mapcResult.value);
        if (muniResult.status === "fulfilled") setMuniOverlayGeojson(muniResult.value);
      } catch (err) {
        console.error("MHC map boundary overlay prefetch", err);
      } finally {
        if (!cancelled) setOverlaysLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showMunicipalLayer) return undefined;
    if (muniOverlayGeojson?.features?.length) return undefined;
    let cancelled = false;
    fetchGisBoundaryLayer("municipal")
      .then((fc) => {
        if (!cancelled) setMuniOverlayGeojson(fc);
      })
      .catch((err) => console.error("MHC map municipal overlay", err));
    return () => {
      cancelled = true;
    };
  }, [showMunicipalLayer, muniOverlayGeojson]);

  useEffect(() => {
    if (!showHouseDistricts || hasDistrictPolygons(houseDistricts, "house")) return undefined;
    let cancelled = false;
    setHouseDistrictsLoading(true);
    fetchMassgisDistrictOverlay("house")
      .then((fc) => {
        if (!cancelled) setHouseDistricts(fc);
      })
      .catch((err) => console.error("MHC map house districts", err))
      .finally(() => {
        if (!cancelled) setHouseDistrictsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showHouseDistricts, houseDistricts]);

  useEffect(() => {
    if (!showSenateDistricts || hasDistrictPolygons(senateDistricts, "senate")) return undefined;
    let cancelled = false;
    setSenateDistrictsLoading(true);
    fetchMassgisDistrictOverlay("senate")
      .then((fc) => {
        if (!cancelled) setSenateDistricts(fc);
      })
      .catch((err) => console.error("MHC map senate districts", err))
      .finally(() => {
        if (!cancelled) setSenateDistrictsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showSenateDistricts, senateDistricts]);

  const setOverlayData = useCallback((sourceId, data) => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const src = map.getSource(sourceId);
    if (src) src.setData(data || EMPTY_FC);
    syncOverlayOrder(map);
  }, []);

  const setOverlayVisibility = useCallback((layerId, visible) => {
    const map = mapRef.current;
    if (!map?.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    if (visible) syncOverlayOrder(map);
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    setOverlayData(MUNI_SOURCE, EMPTY_FC);
    setOverlayVisibility(MUNI_LINE, false);
  }, [mapReady, setOverlayData, setOverlayVisibility]);

  useEffect(() => {
    if (!mapReady) return;
    setOverlayData(MAPC_SOURCE, mapcOverlayGeojson);
    setOverlayVisibility(MAPC_LINE, showMapcRegionLayer);
  }, [mapReady, mapcOverlayGeojson, showMapcRegionLayer, setOverlayData, setOverlayVisibility]);

  useEffect(() => {
    if (!mapReady) return;
    setOverlayData(HOUSE_SOURCE, houseDistricts);
    setOverlayVisibility(HOUSE_LINE, showHouseDistricts);
  }, [mapReady, houseDistricts, showHouseDistricts, setOverlayData, setOverlayVisibility]);

  useEffect(() => {
    if (!mapReady) return;
    setOverlayData(SENATE_SOURCE, senateDistricts);
    setOverlayVisibility(SENATE_LINE, showSenateDistricts);
  }, [mapReady, senateDistricts, showSenateDistricts, setOverlayData, setOverlayVisibility]);

  useEffect(() => {
    if (!mapReady) return undefined;
    const map = mapRef.current;
    const el = mapContainerRef.current;
    if (!map || !el) return undefined;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  const sidebarRows = useMemo(() => {
    if (!selectedFeature) return [];
    return SIDEBAR_FIELDS.map(({ keys, label }) => {
      const key = keys.find((k) => formatPropValue(selectedFeature[k]));
      const value = key ? formatPropValue(selectedFeature[key]) : null;
      if (!value) return null;
      return { key: key || keys[0], label, value };
    }).filter(Boolean);
  }, [selectedFeature]);

  return (
    <section className="mhc-inventory-map" aria-labelledby="mhc-inventory-map-title">
      <h4 id="mhc-inventory-map-title" className="chart__title" style={{ marginBottom: "0.75rem" }}>
        Massachusetts Historical Commission Inventory Map
      </h4>
      {loadError ? (
        <p className="metadata" style={{ color: "#b45309" }}>
          {loadError}
        </p>
      ) : null}
      <div className="mhc-inventory-map__layout">
        <div className="mhc-inventory-map__map-wrap">
          <div className="mhc-inventory-map__map-controls">
            <div
              className={`mhc-inventory-map__layer-toggles${boundariesMenuOpen ? " is-open" : ""}`}
            >
              <button
                type="button"
                className="mhc-inventory-map__layer-toggles-header"
                aria-expanded={boundariesMenuOpen}
                aria-label="Boundaries"
                title="Boundaries"
                onClick={() => setBoundariesMenuOpen((o) => !o)}
              >
                <svg className="mhc-inventory-map__layer-toggles-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <polygon points="12 3 3 8 12 13 21 8 12 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <polyline points="3 12.5 12 17.5 21 12.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <polyline points="3 17 12 22 21 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
              </button>
              {boundariesMenuOpen && (
                <div className="mhc-inventory-map__layer-toggles-list" role="group" aria-label="Boundary overlay layers">
                  <label className={`mhc-inventory-map__layer-toggle${overlaysLoading ? " mhc-inventory-map__layer-toggle--disabled" : ""}`}>
                    <input
                      type="checkbox"
                      checked={showMunicipalLayer}
                      disabled={overlaysLoading}
                      onChange={(e) => setShowMunicipalLayer(e.target.checked)}
                    />
                    <span>Municipal boundaries</span>
                  </label>
                  <label className={`mhc-inventory-map__layer-toggle${overlaysLoading ? " mhc-inventory-map__layer-toggle--disabled" : ""}`}>
                    <input
                      type="checkbox"
                      checked={showMapcRegionLayer}
                      disabled={overlaysLoading}
                      onChange={(e) => setShowMapcRegionLayer(e.target.checked)}
                    />
                    <span>MAPC region</span>
                  </label>
                  <label className="mhc-inventory-map__layer-toggle">
                    <input
                      type="checkbox"
                      checked={showHouseDistricts}
                      aria-busy={houseDistrictsLoading || undefined}
                      onChange={(e) => setShowHouseDistricts(e.target.checked)}
                    />
                    <span>MA House districts</span>
                  </label>
                  <label className="mhc-inventory-map__layer-toggle">
                    <input
                      type="checkbox"
                      checked={showSenateDistricts}
                      aria-busy={senateDistrictsLoading || undefined}
                      onChange={(e) => setShowSenateDistricts(e.target.checked)}
                    />
                    <span>MA Senate districts</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <div
            ref={mapContainerRef}
            className="mhc-inventory-map__canvas"
            role="img"
            aria-label={`Historic inventory map for ${selectedTown}`}
          />
          {loading || !mapReady ? (
            <div
              className="mhc-inventory-map__loading-mask"
              role="status"
              aria-live="polite"
              aria-label="Loading historic inventory map"
            >
              <MoonLoader size={42} color="#767676" aria-hidden="true" />
              <span className="mhc-inventory-map__loading-title">Loading inventory…</span>
              <span className="mhc-inventory-map__loading-info">
                {selectedTown
                  ? `Fetching historic sites for ${selectedTown}. Large datasets may take a moment.`
                  : "Preparing map…"}
              </span>
            </div>
          ) : null}
        </div>
        <aside className="mhc-inventory-map__sidebar" aria-live="polite">
          <div className="mhc-inventory-map__sidebar-body">
            <label className="mhc-inventory-map__field-label" htmlFor="mhc-inventory-muni-select">
              Municipality
            </label>
            <select
              id="mhc-inventory-muni-select"
              className="mhc-inventory-map__muni-select"
              value={selectedTown}
              onChange={(e) => setSelectedTown(e.target.value)}
            >
              {townOptions.map((town) => (
                <option key={town} value={town}>
                  {town}
                </option>
              ))}
            </select>

            <fieldset className="mhc-inventory-map__layer-fieldset">
              <legend className="mhc-inventory-map__field-label">Inventory layer</legend>
              <div className="mhc-inventory-map__layer-row">
                <div className="mhc-inventory-map__layer-options">
                  <label className="mhc-inventory-map__radio">
                    <input
                      type="radio"
                      name="mhc-inventory-layer"
                      checked={inventoryLayer === "points"}
                      onChange={() => setInventoryLayer("points")}
                    />
                    <span>Points</span>
                  </label>
                  <label className="mhc-inventory-map__radio">
                    <input
                      type="radio"
                      name="mhc-inventory-layer"
                      checked={inventoryLayer === "areas"}
                      onChange={() => setInventoryLayer("areas")}
                    />
                    <span>Areas</span>
                  </label>
                </div>
                {featureCount != null && !loading ? (
                  <span className="mhc-inventory-map__count metadata">
                    {featureCount.toLocaleString()} feature{featureCount === 1 ? "" : "s"} in {selectedTown}
                  </span>
                ) : null}
              </div>
            </fieldset>

            {sidebarRows.length > 0 ? (
              <>
                <strong className="mhc-inventory-map__sidebar-title">Selected site</strong>
                <dl className="mhc-inventory-map__sidebar-fields">
                  {sidebarRows.map((row) => (
                    <div key={row.key} className="mhc-inventory-map__sidebar-row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="mhc-inventory-map__sidebar-empty">
                Click a point or area on the map for details. Labels appear when zoomed in
                {labelMinZoom > 0 ? ` (zoom ${labelMinZoom}+).` : "."}
              </p>
            )}

            {profileUrl && normalizeTownName(selectedTown) !== normalizeTownName(defaultMunicipalityName) ? (
              <a
                className="mhc-inventory-map__sidebar-link"
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View {selectedTown} community profile
              </a>
            ) : null}
          </div>
        </aside>
      </div>
      {legendEntries.length > 0 ? (
        <div className="mhc-inventory-map__legend" aria-label="Map legend">
          {legendEntries.map((entry) => (
            <span key={entry.value} className="mhc-inventory-map__legend-item">
              {inventoryLayer === "points" && entry.symbol?.imageData ? (
                <img
                  className="mhc-inventory-map__legend-icon"
                  src={`data:${entry.symbol.contentType || "image/png"};base64,${entry.symbol.imageData}`}
                  alt=""
                  aria-hidden
                />
              ) : (
                <span
                  className="mhc-inventory-map__legend-swatch"
                  style={{
                    background: entry.symbol?.color
                      ? `rgba(${entry.symbol.color.slice(0, 3).join(",")}, ${(entry.symbol.color[3] ?? 255) / 255})`
                      : "#ccc",
                  }}
                  aria-hidden
                />
              )}
              <span>{entry.label}</span>
            </span>
          ))}
        </div>
      ) : null}
      <div className="metadata mhc-inventory-map__source">
        <div className="source">Source: Massachusetts Historical Commission (MassGIS)</div>
      </div>
    </section>
  );
}

MhcInventoryMap.propTypes = {
  defaultMunicipalityName: PropTypes.string,
  defaultMunicipalFeature: PropTypes.shape({
    properties: PropTypes.object,
    geometry: PropTypes.object,
  }),
};
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
import { normalizeTownName, townNameToProfileSlug } from "../../utils/mhcInventoryArcgis";
import { fetchCulturalEntertainmentParcels } from "../../utils/culturalEntertainmentParcelsArcgis";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

const EMPTY_FC = { type: "FeatureCollection", features: [] };
const INITIAL_MAP_PADDING = { top: 28, bottom: 28, left: 28, right: 28 };

const PARCELS_SOURCE = "cultural-parcels-src";
const FILL_LAYER = "cultural-parcels-fill";
const LINE_LAYER = "cultural-parcels-line";
const SELECTED_SOURCE = "cultural-parcels-selected";
const SELECTED_FILL = "cultural-parcels-selected-fill";
const SELECTED_LINE = "cultural-parcels-selected-line";
const TOWN_SOURCE = "cultural-parcels-town-outline";
const TOWN_LINE = "cultural-parcels-town-outline-line";
const MUNI_SOURCE = "cultural-parcels-muni";
const MUNI_LINE = "cultural-parcels-muni-line";
const HOUSE_SOURCE = "cultural-parcels-house";
const HOUSE_LINE = "cultural-parcels-house-line";
const SENATE_SOURCE = "cultural-parcels-senate";
const SENATE_LINE = "cultural-parcels-senate-line";
const MAPC_SOURCE = "cultural-parcels-mapc";
const MAPC_LINE = "cultural-parcels-mapc-line";

const SIDEBAR_FIELDS = [
  
  { keys: ["year_built"], label: "Year built" },
  { keys: ["site_adr_m"], label: "Site address" },
];

function formatPropValue(value) {
  if (value == null || value === "" || value === " ") return null;
  return String(value);
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

function fitMapToTown(map, townFeature, { duration = 450, maxZoom = 14 } = {}) {
  if (!map || !townFeature?.geometry) return;
  const runFit = () => {
    const bounds = geometryToBounds(townFeature.geometry);
  // #region agent log
    fetch("http://127.0.0.1:7409/ingest/58c56e26-075b-4fb7-bb80-86f235efee2a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "aaf54d" },
      body: JSON.stringify({
        sessionId: "aaf54d",
        runId: "pre-fix",
        hypothesisId: "D",
        location: "CulturalEntertainmentParcelsMap.jsx:fitMapToTown",
        message: "fitMapToTown run",
        data: {
          hasBounds: Boolean(bounds),
          styleLoaded: map.isStyleLoaded(),
          geomType: townFeature.geometry?.type,
          zoomBefore: map.getZoom(),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  // #endregion
    if (!bounds) return;
    map.resize();
    map.fitBounds(bounds, {
      padding: INITIAL_MAP_PADDING,
      maxZoom,
      duration,
      essential: true,
    });
  };
  if (!map.isStyleLoaded()) {
    map.once("idle", runFit);
    return;
  }
  runFit();
}

function syncOverlayOrder(map) {
  if (!map) return;
  [
    FILL_LAYER,
    LINE_LAYER,
    SELECTED_FILL,
    SELECTED_LINE,
    MAPC_LINE,
    HOUSE_LINE,
    SENATE_LINE,
    MUNI_LINE,
    TOWN_LINE,
  ].forEach((id) => {
    if (map.getLayer(id)) map.moveLayer(id);
  });
}

function toPlainProperties(properties) {
  if (!properties) return {};
  if (typeof properties.toJSON === "function") {
    return properties.toJSON();
  }
  return { ...properties };
}

function setSelectedHighlight(map, feature) {
  const src = map?.getSource(SELECTED_SOURCE);
  if (!src) return;
  if (!feature?.geometry) {
    src.setData(EMPTY_FC);
    return;
  }
  try {
    src.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: toPlainProperties(feature.properties),
          geometry: feature.geometry,
        },
      ],
    });
  // #region agent log
    fetch("http://127.0.0.1:7409/ingest/58c56e26-075b-4fb7-bb80-86f235efee2a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "aaf54d" },
      body: JSON.stringify({
        sessionId: "aaf54d",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "CulturalEntertainmentParcelsMap.jsx:setSelectedHighlight",
        message: "highlight setData ok",
        data: { hasLayerKey: Boolean(feature.layer), geomType: feature.geometry?.type },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  // #endregion
  } catch (err) {
  // #region agent log
    fetch("http://127.0.0.1:7409/ingest/58c56e26-075b-4fb7-bb80-86f235efee2a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "aaf54d" },
      body: JSON.stringify({
        sessionId: "aaf54d",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "CulturalEntertainmentParcelsMap.jsx:setSelectedHighlight",
        message: "highlight setData error",
        data: { error: String(err) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  // #endregion
    console.error("Cultural parcels highlight failed", err);
  }
}

export default function CulturalEntertainmentParcelsMap({
  muniId,
  municipalityName,
  defaultMunicipalFeature,
}) {
  const municipalityCache = useSelector((state) => state.municipality.cache);
  const geojson = useSelector((state) => state.municipality.geojson);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const loadGenerationRef = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [featureCount, setFeatureCount] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const [showMunicipalLayer, setShowMunicipalLayer] = useState(true);
  const [showMapcRegionLayer, setShowMapcRegionLayer] = useState(false);
  const [showHouseDistricts, setShowHouseDistricts] = useState(false);
  const [showSenateDistricts, setShowSenateDistricts] = useState(false);
  const [boundariesMenuOpen, setBoundariesMenuOpen] = useState(false);
  const [overlaysLoading, setOverlaysLoading] = useState(false);

  const [muniOverlayGeojson, setMuniOverlayGeojson] = useState(EMPTY_FC);
  const [mapcOverlayGeojson, setMapcOverlayGeojson] = useState(EMPTY_FC);
  const [houseDistricts, setHouseDistricts] = useState(EMPTY_FC);
  const [senateDistricts, setSenateDistricts] = useState(EMPTY_FC);
  const [houseDistrictsLoading, setHouseDistrictsLoading] = useState(false);
  const [senateDistrictsLoading, setSenateDistrictsLoading] = useState(false);

  const profileTownName = municipalityName || "";

  const selectedTownFeature = useMemo(() => {
    const normSelected = normalizeTownName(profileTownName);
    const slug = townNameToProfileSlug(profileTownName);
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
      withGeometry(fromDefault) ||
      withGeometry(defaultMunicipalFeature) ||
      withGeometry(fromCache) ||
      withGeometry(fromGeojson) ||
      null
    );
  }, [profileTownName, municipalityCache, defaultMunicipalFeature, geojson]);

  const selectedTownFeatureRef = useRef(selectedTownFeature);
  selectedTownFeatureRef.current = selectedTownFeature;

  const townFeatureForFit = useMemo(() => {
    if (selectedTownFeature?.geometry) return selectedTownFeature;
    if (defaultMunicipalFeature?.geometry) return defaultMunicipalFeature;
    return selectedTownFeature;
  }, [selectedTownFeature, defaultMunicipalFeature]);

  const allMunicipalBoundariesFc = useMemo(() => {
    const base = muniOverlayGeojson?.features?.length ? muniOverlayGeojson : geojson;
    if (!base?.features?.length) return EMPTY_FC;
    const normSelected = normalizeTownName(profileTownName);
    return {
      type: "FeatureCollection",
      features: base.features
        .filter((f) => f?.geometry)
        .map((f) => ({
          type: "Feature",
          properties: {
            ...(f.properties || {}),
            parcelTownSelected:
              Boolean(normSelected) &&
              normalizeTownName(f.properties?.town) === normSelected,
          },
          geometry: f.geometry,
        })),
    };
  }, [muniOverlayGeojson, geojson, profileTownName]);

  const updateTownOutline = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyOutline = () => {
      const src = map.getSource(TOWN_SOURCE);
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
              properties: { parcelTownSelected: true },
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

  const loadParcels = useCallback(async () => {
    const loadGeneration = (loadGenerationRef.current += 1);
    setLoading(true);
    setLoadError(null);
    setSelectedFeature(null);
    const map = mapRef.current;
    if (map) setSelectedHighlight(map, null);

    try {
      const fc = await fetchCulturalEntertainmentParcels(muniId);
      const liveMap = mapRef.current;
      if (loadGeneration !== loadGenerationRef.current || !liveMap) return;

      await waitForMapStyle(liveMap);

      const src = liveMap.getSource(PARCELS_SOURCE);
      if (src) src.setData(fc);
      setFeatureCount(fc.features?.length ?? 0);
      const townFeature = selectedTownFeatureRef.current?.geometry
        ? selectedTownFeatureRef.current
        : defaultMunicipalFeature;
      fitMapToTown(liveMap, townFeature, { maxZoom: 14 });
      syncOverlayOrder(liveMap);
    } catch (err) {
      console.error("CulturalEntertainmentParcelsMap load failed", err);
      setLoadError(err.message || "Could not load cultural and entertainment parcels.");
      const src = mapRef.current?.getSource(PARCELS_SOURCE);
      if (src) src.setData(EMPTY_FC);
      setFeatureCount(0);
      if (mapRef.current && townFeatureForFit?.geometry) {
        fitMapToTown(mapRef.current, townFeatureForFit);
      }
    } finally {
      if (loadGeneration === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [muniId, defaultMunicipalFeature, townFeatureForFit]);

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

    const onClick = (e) => {
      const f = e.features?.[0];
  // #region agent log
      fetch("http://127.0.0.1:7409/ingest/58c56e26-075b-4fb7-bb80-86f235efee2a", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "aaf54d" },
        body: JSON.stringify({
          sessionId: "aaf54d",
          runId: "pre-fix",
          hypothesisId: "A",
          location: "CulturalEntertainmentParcelsMap.jsx:onClick",
          message: "parcel layer click",
          data: {
            featureCount: e.features?.length ?? 0,
            hasProps: Boolean(f?.properties),
            propKeys: f?.properties ? Object.keys(toPlainProperties(f.properties)).slice(0, 8) : [],
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
  // #endregion
      if (!f?.properties) return;
      try {
        setSelectedFeature(toPlainProperties(f.properties));
        setSelectedHighlight(map, f);
      } catch (err) {
  // #region agent log
        fetch("http://127.0.0.1:7409/ingest/58c56e26-075b-4fb7-bb80-86f235efee2a", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "aaf54d" },
          body: JSON.stringify({
            sessionId: "aaf54d",
            runId: "pre-fix",
            hypothesisId: "A",
            location: "CulturalEntertainmentParcelsMap.jsx:onClick",
            message: "parcel click handler error",
            data: { error: String(err) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
  // #endregion
        console.error("Cultural parcels selection failed", err);
      }
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const onLoad = () => {
      map.addSource(PARCELS_SOURCE, { type: "geojson", data: EMPTY_FC });
      map.addSource(SELECTED_SOURCE, { type: "geojson", data: EMPTY_FC });
      map.addSource(TOWN_SOURCE, { type: "geojson", data: EMPTY_FC });

      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: PARCELS_SOURCE,
        paint: {
          "fill-color": "#9b5de5",
          "fill-opacity": 0.45,
        },
      });
      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: PARCELS_SOURCE,
        paint: {
          "line-color": "#5a189a",
          "line-width": 1.2,
        },
      });
      map.addLayer({
        id: SELECTED_FILL,
        type: "fill",
        source: SELECTED_SOURCE,
        paint: {
          "fill-color": "#ffd166",
          "fill-opacity": 0.55,
        },
      });
      map.addLayer({
        id: SELECTED_LINE,
        type: "line",
        source: SELECTED_SOURCE,
        paint: {
          "line-color": "#e85d04",
          "line-width": 2.5,
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

      map.addLayer({
        id: TOWN_LINE,
        type: "line",
        source: TOWN_SOURCE,
        layout: { visibility: "visible" },
        paint: {
          "line-color": [
            "case",
            ["boolean", ["get", "parcelTownSelected"], false],
            "#1f4e46",
            "#5a5a5a",
          ],
          "line-width": [
            "case",
            ["boolean", ["get", "parcelTownSelected"], false],
            2.5,
            1.2,
          ],
          "line-opacity": 1,
        },
      });

      map.on("click", FILL_LAYER, onClick);
      map.on("mouseenter", FILL_LAYER, onEnter);
      map.on("mouseleave", FILL_LAYER, onLeave);
      map.on("click", LINE_LAYER, onClick);
      map.on("mouseenter", LINE_LAYER, onEnter);
      map.on("mouseleave", LINE_LAYER, onLeave);

      syncOverlayOrder(map);
      setMapReady(true);
      requestAnimationFrame(() => map.resize());
    };

    map.on("load", onLoad);

    return () => {
      map.off("load", onLoad);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || muniId == null) return;
    loadParcels();
  }, [mapReady, muniId, loadParcels]);

  useEffect(() => {
    if (!mapReady || !townFeatureForFit?.geometry) return undefined;
    const map = mapRef.current;
    if (!map) return undefined;
    const frame = window.requestAnimationFrame(() => {
      fitMapToTown(map, townFeatureForFit, { maxZoom: 14 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mapReady, townFeatureForFit, muniId]);

  useEffect(() => {
    if (!mapReady) return undefined;
    updateTownOutline();
    const map = mapRef.current;
    if (map?.getLayer(TOWN_LINE)) {
      map.setLayoutProperty(
        TOWN_LINE,
        "visibility",
        showMunicipalLayer ? "visible" : "none",
      );
    }
    syncOverlayOrder(map);
  }, [mapReady, showMunicipalLayer, allMunicipalBoundariesFc, selectedTownFeature, updateTownOutline]);

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
        console.error("Cultural parcels map boundary prefetch", err);
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
      .catch((err) => console.error("Cultural parcels municipal overlay", err));
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
      .catch((err) => console.error("Cultural parcels house districts", err))
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
      .catch((err) => console.error("Cultural parcels senate districts", err))
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
    <section className="mhc-inventory-map cultural-parcels-map" aria-labelledby="cultural-parcels-map-title">
      <h4 id="cultural-parcels-map-title" className="chart__title" style={{ marginBottom: "0.75rem" }}>
        Cultural and Entertainment Properties
      </h4>
    {/*   <p className="metadata" style={{ marginBottom: "0.65rem" }}>
        Parcels in {municipalityName}
      </p> */}
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
            aria-label="Map of cultural and entertainment parcels"
          />
          {loading ? (
            <div className="mhc-inventory-map__loading-mask" aria-live="polite" aria-busy="true">
              <MoonLoader color="#1f4e46" size={40} />
              <span className="mhc-inventory-map__loading-title">Loading parcels…</span>
            </div>
          ) : null}
        </div>
        <aside className="mhc-inventory-map__sidebar" aria-live="polite">
          <div className="mhc-inventory-map__sidebar-body">
            <span className="mhc-inventory-map__count metadata">
              {featureCount == null ? "—" : `${featureCount} parcel${featureCount === 1 ? "" : "s"}`}
            </span>
            {sidebarRows.length > 0 ? (
              <>
                <strong className="mhc-inventory-map__sidebar-title">Selected parcel</strong>
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
              <p className="mhc-inventory-map__sidebar-empty">Click a parcel on the map to view details.</p>
            )}
          </div>
        </aside>
      </div>
      <div className="metadata mhc-inventory-map__source">
        <div className="source-timeframe">
          <div className="source">Source: MassGIS / MAPC Massachusetts Land Parcels</div>
        </div>
        <div className="link">
          <a
            href="https://geo.mapc.org/server/rest/services/gisdata/Massachusetts_Land_Parcels/FeatureServer"
            target="_blank"
            rel="noopener noreferrer"
          >
            Massachusetts Land Parcels (Feature Service)
          </a>
        </div>
      </div>
    </section>
  );
}

CulturalEntertainmentParcelsMap.propTypes = {
  muniId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  municipalityName: PropTypes.string,
  defaultMunicipalFeature: PropTypes.shape({
    type: PropTypes.string,
    properties: PropTypes.object,
    geometry: PropTypes.object,
  }),
};
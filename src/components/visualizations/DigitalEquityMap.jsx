import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAP_CONFIG } from '../../constants/mapConfig';
import { MAPC_MUNICIPALITIES } from '../../constants/municipalities';
import Dropdown from '../field/Dropdown';
import MassachusettsGeoJSON from '../../assets/data/Massachusetts.geojson?url';

// Color scale (green scale from template)
const COLOR_SCALE = ['#f0f9f0', '#a8d4aa', '#689968', '#2d5a2f', '#1a3d1a'];
const NO_DATA_COLOR = '#cccccc';

const CHOROPLETH_BIN_PROP = '__choroplethBin';
const NO_DATA_BIN = -1;

function calculateQuantiles(values, numBins = 5) {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const quantiles = [];
  for (let i = 1; i < numBins; i++) {
    const index = Math.floor((sorted.length * i) / numBins);
    quantiles.push(sorted[index]);
  }
  return quantiles;
}

/** Assign bin index 0..4 (or NO_DATA_BIN) from numeric value and quantile thresholds. */
function getBinIndex(value, quantiles) {
  if (value == null || value !== value || quantiles.length < 4) return NO_DATA_BIN;
  const n = Number(value);
  if (n < quantiles[0]) return 0;
  if (n < quantiles[1]) return 1;
  if (n < quantiles[2]) return 2;
  if (n < quantiles[3]) return 3;
  return 4;
}

/** Mapbox expression: color from precomputed __choroplethBin (0-4 or -1). */
function getChoroplethFillColorExpression() {
  return [
    'match',
    ['get', CHOROPLETH_BIN_PROP],
    0, COLOR_SCALE[0],
    1, COLOR_SCALE[1],
    2, COLOR_SCALE[2],
    3, COLOR_SCALE[3],
    4, COLOR_SCALE[4],
    NO_DATA_COLOR
  ];
}

/** Bounding box [[minLng, minLat], [maxLng, maxLat]] from a GeoJSON feature. */
function getFeatureBounds(feature) {
  const coords = feature?.geometry?.coordinates;
  if (!coords) return null;
  const flat = coords.flat(3);
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (let i = 0; i < flat.length; i += 2) {
    const lng = flat[i], lat = flat[i + 1];
    if (typeof lng === 'number' && typeof lat === 'number') {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }
  if (minLng === Infinity) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

const VARIABLES = [
  "Percent Internet Subscription with Broadband such as cable - fiber optic - or DSL",
  "Percent Internet Subscription with Broadband of any type",
  "Percent Internet Subscription with Broadband of any type & Cellular data plan",
  "Percent Internet Subscription with Cellular data plan only",
  "Percent Has one or more types of computing devices",
  "Percent Internet Subscription with dial-up only",
  "Percent Has one or more types of computing devices: Desktop or Laptop",
  "Percent Has one or more types of computing devices: Desktop or Laptop only",
  "Percent Households with Internet Subscription of any type",
  "Percent Has one or more types of computing devices: Smartphone",
  "Percent Has one or more types of computing devices: Smartphone Only",
  "Percent Household has no computer devices",
  "Percent Household has no internet",
  "Percent Household has other kind of computer devices",
  "Percent Household has other kind of computer devices only",
  "Percent Internet Subscription with other type"
];
const YEARS = ["2013-17", "2014-18", "2015-19", "2016-20", "2017-21", "2018-22", "2019-23", "2020-24"];

const DigitalEquityMap = ({ geojsonData, baseLayerData, highlightMunicipalityName, loadingEquityData }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);

  const [selectedVariable, setSelectedVariable] = useState(VARIABLES[0]);
  const [selectedYear, setSelectedYear] = useState(YEARS[YEARS.length - 1]);
  const [selectedMunicipality, setSelectedMunicipality] = useState('none');
  const [showMAPCOnly, setShowMAPCOnly] = useState(false);
  const [quantiles, setQuantiles] = useState([]);
  const [dataMin, setDataMin] = useState(null);
  const [dataMax, setDataMax] = useState(null);
  const [municipalityHistory, setMunicipalityHistory] = useState([]);
  const [municipalityNamesFromFile, setMunicipalityNamesFromFile] = useState([]);

  const selectedVariableRef = useRef(selectedVariable);
  selectedVariableRef.current = selectedVariable;

  // Read municipality list from Massachusetts.geojson for dropdown
  useEffect(() => {
    let cancelled = false;
    fetch(MassachusettsGeoJSON)
      .then(res => res.ok ? res.json() : Promise.reject(new Error(res.statusText)))
      .then(geojson => {
        if (cancelled || !geojson?.features?.length) return;
        const names = [...new Set(geojson.features.map(f => {
          const p = f.properties || {};
          const town = p.town || p.TOWN || p.NAME || p.municipal || p.name;
          return town ? String(town).toUpperCase() : null;
        }).filter(Boolean))].sort();
        setMunicipalityNamesFromFile(names);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const variables = VARIABLES;
  const years = YEARS;

  // Municipality list: from Massachusetts.geojson (dropdown), fallback to geojsonData if file not loaded yet
  const municipalities = React.useMemo(() => {
    if (municipalityNamesFromFile.length) return municipalityNamesFromFile;
    if (!geojsonData?.features) return [];
    const muniSet = new Set();
    geojsonData.features.forEach(feature => {
      const muni = feature.properties['TOWN'] || feature.properties['Municipality name'];
      if (muni) muniSet.add(muni);
    });
    return Array.from(muniSet).sort();
  }, [geojsonData, municipalityNamesFromFile]);

  useEffect(() => {
    if (variables.length > 0 && !selectedVariable) setSelectedVariable(variables[0]);
    if (years.length > 0 && !selectedYear) setSelectedYear(years[years.length - 1]);
  }, [variables, years, selectedVariable, selectedYear]);

  const filteredGeoJSON = React.useMemo(() => {
    if (!geojsonData?.features) return null;
    const features = geojsonData.features.filter(f => {
      const municipalityName = f.properties['TOWN'] || f.properties['Municipality name'];
      if (showMAPCOnly && !MAPC_MUNICIPALITIES.includes(municipalityName)) return false;
      if (selectedYear && f.properties['ACS year of publication'] !== selectedYear) return false;
      return true;
    });
    return { type: 'FeatureCollection', features };
  }, [geojsonData, selectedYear, showMAPCOnly]);

  useEffect(() => {
    if (!filteredGeoJSON?.features?.length || !selectedVariable) return;
    const values = filteredGeoJSON.features
      .map(f => f.properties[selectedVariable])
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    if (values.length === 0) {
      setQuantiles([]);
      setDataMin(null);
      setDataMax(null);
      return;
    }
    setDataMin(Math.min(...values));
    setDataMax(Math.max(...values));
    setQuantiles(calculateQuantiles(values, 5));
  }, [filteredGeoJSON, selectedVariable]);

  // Choropleth data: same features with __choroplethBin (0-4 or -1) so Mapbox only does a simple match
  const choroplethData = React.useMemo(() => {
    if (!filteredGeoJSON?.features?.length || !selectedVariable || quantiles.length < 4) {
      return { type: 'FeatureCollection', features: [] };
    }
    const features = filteredGeoJSON.features.map(feature => {
      const raw = feature.properties[selectedVariable];
      const bin = getBinIndex(raw, quantiles);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          [CHOROPLETH_BIN_PROP]: bin,
        },
      };
    });
    return { type: 'FeatureCollection', features };
  }, [filteredGeoJSON, selectedVariable, quantiles]);

  // Initialize Mapbox map (same style as community profile homepage)
  useEffect(() => {
    if (!mapContainerRef.current || !MAP_CONFIG.accessToken) return;

    mapboxgl.accessToken = MAP_CONFIG.accessToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_CONFIG.style,
      bounds: MAP_CONFIG.bounds,
      fitBoundsOptions: { padding: MAP_CONFIG.padding, animate: false },
    });

    map.addControl(new mapboxgl.NavigationControl(MAP_CONFIG.navigationControl), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Base layer (Massachusetts)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !baseLayerData?.features?.length) return;

    const onLoad = () => {
      if (map.getSource('digital-equity-base')) return;
      map.addSource('digital-equity-base', { type: 'geojson', data: baseLayerData });
      map.addLayer({
        id: 'digital-equity-base',
        type: 'fill',
        source: 'digital-equity-base',
        paint: {
          'fill-color': '#f5f5f5',
          'fill-opacity': 0.6,
          'fill-outline-color': '#999',
        },
      });
    };

    if (map.isStyleLoaded()) onLoad();
    else map.once('load', onLoad);

    return () => {
      try {
        if (map.getStyle() && map.getLayer('digital-equity-base')) map.removeLayer('digital-equity-base');
        if (map.getStyle() && map.getSource('digital-equity-base')) map.removeSource('digital-equity-base');
      } catch (_) { /* map may already be destroyed */ }
    };
  }, [baseLayerData]);

  // Choropleth layer: data has __choroplethBin (0-4 or -1), paint is a simple match on that
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'digital-equity-choropleth';
    const layerId = 'digital-equity-choropleth';
    const fillColorExpr = getChoroplethFillColorExpression();

    const applyChoropleth = () => {
      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(choroplethData);
        if (map.getLayer(layerId)) {
          map.setPaintProperty(layerId, 'fill-color', fillColorExpr);
        }
      } else {
        map.addSource(sourceId, { type: 'geojson', data: choroplethData, generateId: true });
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': fillColorExpr,
            'fill-opacity': 1,
            'fill-outline-color': '#fff',
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      applyChoropleth();
    } else {
      map.once('load', applyChoropleth);
    }

    return () => {
      try {
        if (map.getStyle() && map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getStyle() && map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (_) { /* map may already be destroyed */ }
    };
  }, [choroplethData]);

  // Zoom to and highlight municipality when viewing from community profile
  const highlightSourceId = 'digital-equity-highlight';
  const highlightLayerId = 'digital-equity-highlight-line';
  const highlightFeature = React.useMemo(() => {
    if (!highlightMunicipalityName || !baseLayerData?.features?.length) return null;
    const key = String(highlightMunicipalityName).toUpperCase().trim();
    return baseLayerData.features.find(
      f => (f.properties?.TOWN || f.properties?.['Municipality name'] || '').toUpperCase() === key
    ) || null;
  }, [highlightMunicipalityName, baseLayerData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      try {
        if (map.getLayer(highlightLayerId)) map.removeLayer(highlightLayerId);
        if (map.getSource(highlightSourceId)) map.removeSource(highlightSourceId);
      } catch (_) { /* ignore */ }

      if (!highlightFeature) return;

      const collection = { type: 'FeatureCollection', features: [highlightFeature] };
      const bbox = getFeatureBounds(highlightFeature);

      map.addSource(highlightSourceId, { type: 'geojson', data: collection });
      map.addLayer({
        id: highlightLayerId,
        type: 'line',
        source: highlightSourceId,
        paint: {
          'line-color': '#dc2626',
          'line-width': 3,
          'line-opacity': 1,
        },
      });

      if (bbox) {
        map.fitBounds(bbox, { padding: 60, maxZoom: 12, duration: 800 });
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('load', apply);
    }

    return () => {
      try {
        if (map.getStyle() && map.getLayer(highlightLayerId)) map.removeLayer(highlightLayerId);
        if (map.getStyle() && map.getSource(highlightSourceId)) map.removeSource(highlightSourceId);
      } catch (_) { /* map may already be destroyed */ }
    };
  }, [highlightFeature]);

  // Popup on click (single listener, reads current variable from ref)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const formatLabel = (v) => {
      if (v == null || v === '') return '—';
      const s = String(v).trim();
      return s.toUpperCase() === 'UNKNOWN' ? '—' : s;
    };

    const onClick = (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['digital-equity-choropleth'] });
      if (!features.length) return;

      const props = features[0].properties;
      const name = formatLabel(props['TOWN'] || props['Municipality name']);
      const variable = selectedVariableRef.current;
      const value = props[variable];
      const moeKey = variable ? `${variable} (margin of error)` : null;
      const moe = moeKey ? props[moeKey] : null;
      const year = formatLabel(props['ACS year of publication']);

      const valueLine = value != null && !isNaN(value) ? `${Number(value).toFixed(1)}%` : '—';
      const moeLine = moe != null && !isNaN(moe) ? ` (±${Number(moe).toFixed(1)}%)` : '';

      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div>
            ${name !== '—' ? `<h3 style="margin:0 0 8px 0;font-size:14px;">${name}</h3>` : ''}
            <strong>${variable || 'Value'}:</strong> ${valueLine}${moeLine}<br/>
            ${year !== '—' ? `<strong>Year:</strong> ${year}<br/>` : ''}
          </div>
        `)
        .addTo(map);
    };

    map.on('click', 'digital-equity-choropleth', onClick);
    return () => {
      map.off('click', 'digital-equity-choropleth', onClick);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, []);

  // Fit bounds when filtered data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !filteredGeoJSON?.features?.length) return;

    const getBounds = () => {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      filteredGeoJSON.features.forEach(f => {
        const coords = f.geometry?.coordinates;
        if (!coords) return;
        const flat = coords.flat(3);
        for (let i = 0; i < flat.length; i += 2) {
          const lng = flat[i], lat = flat[i + 1];
          if (typeof lng === 'number' && typeof lat === 'number') {
            minLng = Math.min(minLng, lng);
            minLat = Math.min(minLat, lat);
            maxLng = Math.max(maxLng, lng);
            maxLat = Math.max(maxLat, lat);
          }
        }
      });
      if (minLng === Infinity) return null;
      return [[minLng, minLat], [maxLng, maxLat]];
    };

    const b = getBounds();
    if (b) map.fitBounds(b, { padding: 40, maxZoom: 12 });
  }, [filteredGeoJSON]);

  const handleMunicipalityChange = (e) => {
    const newMuni = e.target.value;
    if (newMuni !== 'none') {
      setSelectedMunicipality(newMuni);
      setMunicipalityHistory(prev => {
        const updated = prev.includes(newMuni) ? prev : [...prev, newMuni];
        return updated.slice(-2);
      });
    } else {
      setSelectedMunicipality('none');
    }
  };

  const filteredMunicipalities = React.useMemo(() => {
    return showMAPCOnly ? municipalities.filter(m => MAPC_MUNICIPALITIES.includes(m)) : municipalities;
  }, [municipalities, showMAPCOnly]);

  const minVal = dataMin != null ? dataMin : 0;
  const maxVal = dataMax != null ? dataMax : (quantiles[quantiles.length - 1] || 100);

  if (!geojsonData) {
    return <div>Loading map data...</div>;
  }

  return (
    <div className="digital-equity-map">
      <div className="map-controls" style={{
        background: '#2c3e50',
        color: 'white',
        padding: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'center'
      }}>
        <div className="control-item control-item--variable">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Variable to Visualize:</label>
          <Dropdown
            value={selectedVariable}
            options={variables.map(v => ({ value: v, label: v }))}
            onChange={(e) => setSelectedVariable(e.target.value)}
          />
        </div>
        <div className="control-item">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Year:</label>
          <Dropdown value={selectedYear} options={years.map(y => ({ value: y, label: y }))} onChange={(e) => setSelectedYear(e.target.value)} />
        </div>
        <div className="control-item">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Compare Municipality:</label>
          <Dropdown
            value={selectedMunicipality}
            options={[{ value: 'none', label: 'Select a municipality...' }, ...filteredMunicipalities.map(m => ({ value: m, label: m }))]}
            onChange={handleMunicipalityChange}
          />
        </div>
        <div className="control-item">
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={showMAPCOnly} onChange={(e) => setShowMAPCOnly(e.target.checked)} style={{ marginRight: '5px', cursor: 'pointer' }} />
            Show MAPC Region Only
          </label>
        </div>
      </div>
      <div style={{ position: 'relative', height: '600px', width: '100%' }}>
        <div ref={mapContainerRef} className="map-layer" style={{ height: '100%', width: '100%' }} />
        {loadingEquityData && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.85)',
            zIndex: 10,
          }}>
            <div style={{ width: '60%', maxWidth: 320 }}>
              <div style={{ fontSize: 14, marginBottom: 8, textAlign: 'center', color: '#333' }}>Loading digital equity data...</div>
              <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '40%', background: '#2563eb', borderRadius: 3, animation: 'digital-equity-loading 1.2s ease-in-out infinite' }} />
              </div>
            </div>
          </div>
        )}
        {quantiles.length > 0 && (
          <div className="custom-legend" style={{
            position: 'absolute',
            bottom: 30,
            right: 30,
            background: 'white',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 0 15px rgba(0,0,0,0.2)',
            fontSize: '12px',
            maxWidth: '200px',
            zIndex: 1
          }}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>{selectedVariable || 'Variable'}</div>
            {quantiles.map((q, i) => {
              const prevQ = i === 0 ? minVal : quantiles[i - 1];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
                  <div style={{ width: 20, height: 15, backgroundColor: COLOR_SCALE[i], marginRight: 5, border: '1px solid #999' }} />
                  <span>{prevQ.toFixed(1)}% - {q.toFixed(1)}%</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '3px' }}>
              <div style={{ width: 20, height: 15, backgroundColor: COLOR_SCALE[4], marginRight: 5, border: '1px solid #999' }} />
              <span>{quantiles[quantiles.length - 1].toFixed(1)}% - {maxVal.toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #ccc' }}>
              <div style={{ width: 20, height: 15, backgroundColor: NO_DATA_COLOR, marginRight: 5, border: '1px solid #999' }} />
              <span>No data</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalEquityMap;

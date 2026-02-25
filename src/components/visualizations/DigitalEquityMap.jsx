import React, { useEffect, useState, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { MapContainer, TileLayer, GeoJSON, Pane, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MAPC_MUNICIPALITIES } from '../../constants/municipalities';
import { VARIABLE_TO_FIELD, FIELD_TO_MOE } from '../../constants/digitalEquityMap';
import locations from '../../constants/locations';
import Dropdown from '../field/Dropdown';

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingCard = styled.div`
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 14px 16px;
  width: min(360px, calc(100% - 32px));
`;

const LoadingTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 10px;
`;

const ProgressTrack = styled.div`
  height: 10px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.$pct}%;
  background: #2d5a2f;
  border-radius: 999px;
  transition: width 180ms ease-out;
`;

const IndeterminateFill = styled.div`
  height: 100%;
  width: 40%;
  background: #2d5a2f;
  border-radius: 999px;
  animation: slide 1.2s ease-in-out infinite;

  @keyframes slide {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(280%); }
  }
`;

const LegendWrapper = styled.div`
  position: absolute;
  top: auto;
  bottom: 30px;
  right: 30px;
  background: white;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
  font-size: 12px;
  max-width: 200px;
  z-index: 1000;
`;

const LegendTitle = styled.div`
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 13px;
`;

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 3px;
`;

const LegendColor = styled.div`
  width: 20px;
  height: 15px;
  margin-right: 5px;
  border: 1px solid #999;
  background-color: ${props => props.$bg};
`;

const LegendPolygonOutline = styled.div`
  width: 20px;
  height: 15px;
  margin-right: 5px;
  border: 2px solid ${props => props.$color || '#dc2626'};
  background-color: transparent;
  box-sizing: border-box;
`;

const LegendTopRange = styled(LegendRow)`
  margin-top: 3px;
`;

const LegendNoDataRow = styled(LegendRow)`
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid #ccc;
`;

const MapControlsStyled = styled.div`
  background: #2c3e50;
  color: white;
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;

  @media (max-width: 640px) {
    padding: 12px 16px;
    gap: 8px;
    align-items: flex-start;

    .control-item {
      min-width: 0;
      width: 100%;
      flex:0; 
    }
  }
`;

const MapWrapper = styled.div`
  position: relative;
  width: 100%;

  /* Pin Leaflet text legend (attribution) to the bottom */
  .leaflet-bottom {
    bottom: -222px !important;
  }
`;

const MapFooter = styled.footer`
  margin-top: 0;
  padding: 12px 16px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
  color: #475569;
  width: 100%;
  box-sizing: border-box;

  a {
    color: #2563eb;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  ul {
    margin: 0;
    padding-left: 20px;
  }
  li {
    margin-bottom: 4px;
  }
`;

// Color scale (green scale from template)
const COLOR_SCALE = ['#f0f9f0', '#a8d4aa', '#689968', '#2d5a2f', '#1a3d1a'];
const NO_DATA_COLOR = '#cccccc';

const CHOROPLETH_BIN_PROP = '__choroplethBin';
const NO_DATA_BIN = -1;

// Massachusetts extent from munimap_template (Leaflet: [[south, west], [north, east]])
// Bounds: [[south, west], [north, east]] (Leaflet latLng order)
const MASSACHUSETTS_BOUNDS = [
  [40.85537053192496, -74.20166015625001],   // southwest
  [43.33316939281735, -69.19738769531251],   // northeast
];
// Center and zoom from munimap_template (higher zoom = more zoomed in)
const MASSACHUSETTS_CENTER = [42.4072, -71.3824];
const MASSACHUSETTS_ZOOM = 10;
// CARTO basemap from munimap_template (light, no labels)
const BASEMAP_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
const BASEMAP_ATTRIBUTION = '© OpenStreetMap contributors © CARTO';

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

function getBinIndex(value, quantiles) {
  if (value == null || value !== value || quantiles.length < 4) return NO_DATA_BIN;
  const n = Number(value);
  if (n < quantiles[0]) return 0;
  if (n < quantiles[1]) return 1;
  if (n < quantiles[2]) return 2;
  if (n < quantiles[3]) return 3;
  return 4;
}

/** Center [lat, lng] of a GeoJSON feature (from bounding box). */
function getFeatureCenter(feature) {
  const coords = feature?.geometry?.coordinates;
  if (!coords) return null;
  const flat = coords.flat(3);
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (let i = 0; i < flat.length; i += 2) {
    const lng = flat[i], lat = flat[i + 1];
    if (typeof lng === 'number' && typeof lat === 'number') {
      minLat = Math.min(minLat, lat);
      minLng = Math.min(minLng, lng);
      maxLat = Math.max(maxLat, lat);
      maxLng = Math.max(maxLng, lng);
    }
  }
  if (minLat === Infinity) return null;
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}

const ZOOM_TO_HIGHLIGHT = 10;

function ZoomToHighlight({ feature, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!feature || !map) return;
    const center = getFeatureCenter(feature);
    if (center) map.setView(center, zoom ?? ZOOM_TO_HIGHLIGHT);
  }, [map, feature, zoom]);
  return null;
}

const VARIABLES = [
  "Percent Has one or more types of computing devices: Smartphone Only",
  "Percent Household has no computer devices",
  "Percent Household has no internet"
];
const YEARS = ["2013-17", "2014-18", "2015-19", "2016-20", "2017-21", "2018-22", "2019-23", "2020-24"];

const DigitalEquityMap = ({ geojsonData, baseLayerData, highlightMunicipalityName, selectedYear: selectedYearProp, onYearChange, choroplethLoading, choroplethProgress = null }) => {
  const [selectedVariable, setSelectedVariable] = useState(VARIABLES[0]);
  const [internalYear, setInternalYear] = useState(YEARS[YEARS.length - 1]);
  const selectedYear = selectedYearProp !== undefined ? selectedYearProp : internalYear;
  const setSelectedYear = onYearChange ? (y) => onYearChange(y) : setInternalYear;
  const [showMAPCOnly, setShowMAPCOnly] = useState(false);
  const [quantiles, setQuantiles] = useState([]);
  const [dataMin, setDataMin] = useState(null);
  const [dataMax, setDataMax] = useState(null);
  const [clickedChoroplethIndex, setClickedChoroplethIndex] = useState(null);
  const [dropdownMunicipality, setDropdownMunicipality] = useState(highlightMunicipalityName || '');
  const [comparisonStats, setComparisonStats] = useState([]);
  const [comparisonDropdownOpen, setComparisonDropdownOpen] = useState(false);
  const comparisonDropdownRef = useRef(null);

  const variables = VARIABLES;
  const years = YEARS;

  useEffect(() => {
    if (variables.length > 0 && !selectedVariable) setSelectedVariable(variables[0]);
    if (years.length > 0 && selectedYearProp === undefined && !internalYear) setInternalYear(years[years.length - 1]);
  }, [variables, years, selectedVariable, selectedYearProp, internalYear]);

  useEffect(() => {
    if (highlightMunicipalityName) {
      setDropdownMunicipality(highlightMunicipalityName);
    }
  }, [highlightMunicipalityName]);

  const filteredGeoJSON = useMemo(() => {
    if (!geojsonData?.features) return null;
    const features = geojsonData.features.filter(f => {
      const municipalityName = (f.properties?.['TOWN'] || f.properties?.['Municipality name'] || f.properties?.TOWN || '').toUpperCase?.() || '';
      if (showMAPCOnly && MAPC_MUNICIPALITIES.length && !MAPC_MUNICIPALITIES.includes(municipalityName)) return false;
      if (selectedYearProp === undefined) {
        const yearRaw = f.properties?.['acs_year'];
        const year = yearRaw != null ? String(yearRaw).trim() : '';
        if (selectedYear && year !== selectedYear) return false;
      }
      return true;
    });
    return { type: 'FeatureCollection', features };
  }, [geojsonData, selectedYear, showMAPCOnly, selectedYearProp]);

  useEffect(() => {
    if (!filteredGeoJSON?.features?.length || !selectedVariable) return;
    const field = VARIABLE_TO_FIELD[selectedVariable];
    const values = filteredGeoJSON.features
      .map(f => field != null ? f.properties?.[field] : f.properties?.[selectedVariable])
      .filter(val => val !== null && val !== undefined && !isNaN(Number(val)));
    if (values.length === 0) {
      setQuantiles([]);
      setDataMin(null);
      setDataMax(null);
      return;
    }
    const nums = values.map(Number);
    setDataMin(Math.min(...nums));
    setDataMax(Math.max(...nums));
    setQuantiles(calculateQuantiles(nums, 5));
  }, [filteredGeoJSON, selectedVariable]);

  const choroplethData = useMemo(() => {
    if (!filteredGeoJSON?.features?.length || !selectedVariable || quantiles.length < 4) {
      return { type: 'FeatureCollection', features: [] };
    }
    const field = VARIABLE_TO_FIELD[selectedVariable];
    const features = filteredGeoJSON.features.map((feature, i) => {
      const raw = field != null ? feature.properties?.[field] : feature.properties?.[selectedVariable];
      const bin = getBinIndex(raw, quantiles);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          [CHOROPLETH_BIN_PROP]: bin,
          __featureIndex: i,
        },
      };
    });
    return { type: 'FeatureCollection', features };
  }, [filteredGeoJSON, selectedVariable, quantiles]);

  useEffect(() => {
    setClickedChoroplethIndex(null);
  }, [selectedYear, selectedVariable, showMAPCOnly]);
  
  const municipalityOptions = useMemo(() => {
    if (!baseLayerData?.features) return [];
    const names = new Set();
    baseLayerData.features.forEach((f) => {
      const raw =
        f.properties?.['Municipality name'] ??
        f.properties?.TOWN ??
        f.properties?.town ??
        '';
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      if (trimmed) names.add(trimmed);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [baseLayerData]);

  const effectiveHighlightName = dropdownMunicipality || highlightMunicipalityName || null;

  const normalizeMunicipality = (v) =>
    String(v || '').toLowerCase().trim();

  const highlightFeature = useMemo(() => {
    if (!effectiveHighlightName || !baseLayerData?.features?.length) return null;
    const key = normalizeMunicipality(effectiveHighlightName);
    return (
      baseLayerData.features.find((f) => {
        const raw =
          f.properties?.municipal ??
          f.properties?.['Municipality name'] ??
          f.properties?.TOWN ??
          f.properties?.town ??
          '';
        return normalizeMunicipality(raw) === key;
      }) || null
    );
  }, [effectiveHighlightName, baseLayerData]);

  const highlightCollection = useMemo(
    () => (highlightFeature ? { type: 'FeatureCollection', features: [highlightFeature] } : null),
    [highlightFeature]
  );

  const formatLabel = (v) => {
    if (v == null || v === '') return '—';
    const s = String(v).trim();
    return s.toUpperCase() === 'UNKNOWN' ? '—' : s;
  };

  const headerMunicipality = useMemo(
    () => (effectiveHighlightName ? formatLabel(effectiveHighlightName) : null),
    [effectiveHighlightName]
  );

  /** Data is already in %; only format to 2 decimal places (e.g. 85.123 → "85.12"). No calculation. */
  const formatPct = (v) => {
    if (v == null || v === '' || Number.isNaN(Number(v))) return null;
    return Number(v).toFixed(2);
  };

  const getPopupContent = (props) => {
    const variable = selectedVariable;
    const field = VARIABLE_TO_FIELD[variable];
    const value = field != null ? props[field] : props[variable];
    const moeField = field ? FIELD_TO_MOE[field] : null;
    const moe = moeField ? props[moeField] : (props[`${variable} (margin of error)`]);
    const year = formatLabel(props['acs_year']);
    const tractIdRaw = props['ct20_id'];
    const tractId = tractIdRaw != null && String(tractIdRaw).trim() !== ''
      ? String(tractIdRaw).trim()
      : null;
    const valueLine = formatPct(value) != null ? `${formatPct(value)}%` : '—';
    const moeLine = formatPct(moe) != null ? `±${formatPct(moe)}%` : '—';
    const baseStyle = 'min-width:220px;padding:10px 12px;font-size:13px;line-height:1.5;font-family:system-ui,sans-serif;color:#1f2937;';
    const rowStyle = 'margin:6px 0 0 0;padding:0;';
    const labelStyle = 'color:#6b7280;font-weight:600;';
    const header = tractId
      ? `<div style="margin:0 0 8px 0;padding:0 0 6px 0;border-bottom:1px solid #e5e7eb;">
           <div style="font-size:14px;font-weight:700;color:#111827;">Census tract ${tractId}</div>
         </div>`
      : '';
    const rows = [
      year !== '—' ? `<div style="${rowStyle}"><span style="${labelStyle}">Year</span><br/>${year}</div>` : '',
      variable ? `<div style="${rowStyle}"><span style="${labelStyle}">${variable}</span><br/>${valueLine}</div>` : '',
      `<div style="${rowStyle}"><span style="${labelStyle}">Margin of error</span><br/>${moeLine}</div>`,
    ].filter(Boolean);
    return `<div style="${baseStyle}">${header}${rows.join('')}</div>`;
  };

  useEffect(() => {
    const muni = dropdownMunicipality;
    if (!muni || !selectedYear) return;

    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
        const municipalityFormatted = muni.replace("-", " ");
        const queryString = `
          SELECT acs_year, municipal, moblo_p, nocmp_p, noint_p
          FROM tabular.s2801_computer_internet_acs_m
          WHERE municipal ilike '${municipalityFormatted}%'
            AND acs_year = '${selectedYear}'
        `;
        const response = await fetch(`${tabular_api}${encodeURIComponent(queryString)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) || {};
        const rows = payload.rows || [];
        if (!rows.length) return;
        const row = rows[0];

        const parse = (v) => {
          if (v == null || v === '' || v === undefined) return null;
          const num = Number(v);
          return Number.isNaN(num) ? null : num;
        };

        const nextEntry = {
          name: row.municipal || muni,
          year: row.acs_year || selectedYear,
          moblo: parse(row.moblo_p),
          nocmp: parse(row.nocmp_p),
          noint: parse(row.noint_p),
        };

        setComparisonStats((prev) => {
          const key = normalizeMunicipality(muni);
          const others = prev.filter(
            (e) => normalizeMunicipality(e.name) !== key
          );
          const next = [nextEntry, ...others];
          return next.slice(0, 3);
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    };

    fetchStats();

    return () => controller.abort();
  }, [dropdownMunicipality]);

  // Keep list of comparison names in a ref so we can refresh values when year changes without clearing.
  const comparisonNamesRef = useRef([]);
  useEffect(() => {
    comparisonNamesRef.current = comparisonStats.map((s) => s.name);
  }, [comparisonStats]);

  // When year changes, refresh stats for all current comparison municipalities (keep selection, update values).
  useEffect(() => {
    if (!selectedYear || !dropdownMunicipality) return;
    const names = [...new Set(comparisonNamesRef.current)];
    if (names.length === 0) return;

    const controller = new AbortController();
    const parse = (v) => {
      if (v == null || v === '' || v === undefined) return null;
      const num = Number(v);
      return Number.isNaN(num) ? null : num;
    };
    const fetchOne = async (name) => {
      try {
        const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
        const municipalityFormatted = name.replace('-', ' ');
        const queryString = `
          SELECT acs_year, municipal, moblo_p, nocmp_p, noint_p
          FROM tabular.s2801_computer_internet_acs_m
          WHERE municipal ilike '${municipalityFormatted}%'
            AND acs_year = '${selectedYear}'
        `;
        const response = await fetch(`${tabular_api}${encodeURIComponent(queryString)}`, { signal: controller.signal });
        if (!response.ok) return null;
        const payload = (await response.json()) || {};
        const rows = payload.rows || [];
        if (!rows.length) return null;
        const row = rows[0];
        return {
          name: row.municipal || name,
          year: row.acs_year || selectedYear,
          moblo: parse(row.moblo_p),
          nocmp: parse(row.nocmp_p),
          noint: parse(row.noint_p),
        };
      } catch (err) {
        if (err.name === 'AbortError') return null;
        return null;
      }
    };

    (async () => {
      const primaryKey = normalizeMunicipality(dropdownMunicipality);
      const entries = (await Promise.all(names.map((name) => fetchOne(name)))).filter(Boolean);
      const primary = entries.find((e) => normalizeMunicipality(e.name) === primaryKey);
      const others = entries.filter((e) => normalizeMunicipality(e.name) !== primaryKey);
      setComparisonStats(primary ? [primary, ...others].slice(0, 3) : others.slice(0, 3));
    })();

    return () => controller.abort();
  }, [selectedYear]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (comparisonDropdownRef.current && !comparisonDropdownRef.current.contains(e.target)) {
        setComparisonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddComparisonMunicipality = async (name) => {
    if (!name || !selectedYear) return;
    try {
      const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
      const municipalityFormatted = name.replace("-", " ");
      const queryString = `
        SELECT acs_year, municipal, moblo_p, nocmp_p, noint_p
        FROM tabular.s2801_computer_internet_acs_m
        WHERE municipal ilike '${municipalityFormatted}%'
          AND acs_year = '${selectedYear}'
      `;
      const response = await fetch(`${tabular_api}${encodeURIComponent(queryString)}`);
      if (!response.ok) return;
      const payload = (await response.json()) || {};
      const rows = payload.rows || [];
      if (!rows.length) return;
      const row = rows[0];

      const parse = (v) => {
        if (v == null || v === '' || v === undefined) return null;
        const num = Number(v);
        return Number.isNaN(num) ? null : num;
      };

      const nextEntry = {
        name: row.municipal || name,
        year: row.acs_year || selectedYear,
        moblo: parse(row.moblo_p),
        nocmp: parse(row.nocmp_p),
        noint: parse(row.noint_p),
      };

      setComparisonStats((prev) => {
        const filtered = prev.filter(
          (e) => !(e.name === nextEntry.name && e.year === nextEntry.year)
        );
        const next = [nextEntry, ...filtered];
        return next.slice(0, 3);
      });
    } catch (err) {
      // ignore fetch errors for comparison add
    }
  };

  const handleRemoveComparisonMunicipality = (name) => {
    if (!name) return;
    const key = normalizeMunicipality(name);
    setComparisonStats((prev) => prev.filter((e) => normalizeMunicipality(e.name) !== key));
  };

  const minVal = dataMin != null ? dataMin : 0;
  const maxVal = dataMax != null ? dataMax : (quantiles[quantiles.length - 1] || 100);

  if (!baseLayerData?.features?.length && !geojsonData?.features?.length && !choroplethLoading) {
    return <div>Loading map data...</div>;
  }

  return (
    <MapWrapper className="digital-equity-map">
      <MapControlsStyled className="map-controls">
        <div className="control-item control-item--variable">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select a Digital Equity Measure
          </label>
          <Dropdown
            value={selectedVariable}
            options={variables.map(v => ({ value: v, label: v }))}
            onChange={(e) => setSelectedVariable(e.target.value)}
          />
        </div>
        <div className="control-item">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select Year
          </label>
          <Dropdown value={selectedYear} options={years.map(y => ({ value: y, label: y }))} onChange={(e) => setSelectedYear(e.target.value)} />
        </div>
        <div className="control-item">
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select Municipality
          </label>
          <Dropdown
            value={dropdownMunicipality || ''}
            options={municipalityOptions.map(name => ({ value: name, label: name }))}
            onChange={(e) => setDropdownMunicipality(e.target.value)}
          />
        </div>
      </MapControlsStyled>
      <div style={{ position: 'relative', height: '720px', width: '100%' }}>
        <MapContainer
          center={MASSACHUSETTS_CENTER}
          zoom={MASSACHUSETTS_ZOOM}
          minZoom={7}
          maxZoom={18}
          maxBounds={MASSACHUSETTS_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          {highlightFeature && <ZoomToHighlight feature={highlightFeature} zoom={ZOOM_TO_HIGHLIGHT} />}
          <TileLayer
            url={BASEMAP_URL}
            attribution={BASEMAP_ATTRIBUTION}
            maxZoom={18}
          />
          {choroplethData?.features?.length > 0 && (
            <GeoJSON
              key={`choropleth-${selectedYear}-${selectedVariable}-${showMAPCOnly}`}
              data={choroplethData}
              style={(feature) => {
                const bin = feature?.properties?.[CHOROPLETH_BIN_PROP];
                const baseFillColor = bin >= 0 && bin <= 4 ? COLOR_SCALE[bin] : NO_DATA_COLOR;
                const isClicked = feature?.properties?.__featureIndex === clickedChoroplethIndex;
                const fillColor = isClicked ? '#bae6fd' : baseFillColor;
                return {
                  color: isClicked ? '#0ea5e9' : '#e5e7eb',
                  weight: isClicked ? 3 : 1,
                  fillColor,
                  fillOpacity: isClicked ? 0.7 : 1,
                };
              }}
              onEachFeature={(feature, layer) => {
                layer.bindPopup(getPopupContent(feature.properties || {}));
                layer.on('click', () => {
                  setClickedChoroplethIndex(feature.properties?.__featureIndex ?? null);
                  layer.bringToFront();
                });
                layer.on('popupclose', () => {
                  setClickedChoroplethIndex(null);
                });
              }}
            />
          )}
          {baseLayerData?.features?.length > 0 && (
            <Pane name="municipality-outline-pane" style={{ zIndex: 640 }}>
              <GeoJSON
                key="base-outline"
                data={baseLayerData}
                pathOptions={{ interactive: false }}
                style={{
                  color: '#111827',
                  weight: 1,
                  fillOpacity: 0,
                }}
              />
            </Pane>
          )}
          {highlightCollection && (
            <Pane name="highlight-pane" style={{ zIndex: 650 }}>
              <GeoJSON
                key={`highlight-${headerMunicipality || 'none'}`}
                data={highlightCollection}
                pathOptions={{ interactive: false }}
                style={{
                  color: '#dc2626',
                  weight: 3,
                  fillColor: '#dc2626',
                  fillOpacity: 0.15,
                }}
              />
            </Pane>
          )}
        </MapContainer>
        {choroplethLoading && (
          <LoadingOverlay>
            <LoadingCard>
              <LoadingTitle>
                Loading data{typeof choroplethProgress === 'number' ? `… ${Math.round(choroplethProgress * 100)}%` : '…'}
              </LoadingTitle>
              <ProgressTrack>
                {typeof choroplethProgress === 'number'
                  ? <ProgressFill $pct={Math.max(0, Math.min(100, choroplethProgress * 100))} />
                  : <IndeterminateFill />}
              </ProgressTrack>
            </LoadingCard>
          </LoadingOverlay>
        )}
        {quantiles.length > 0 && (
          <LegendWrapper>
            <LegendTitle>{selectedVariable || 'Variable'}</LegendTitle>
            {quantiles.map((q, i) => {
              const prevQ = i === 0 ? minVal : quantiles[i - 1];
              return (
                <LegendRow key={i}>
                  <LegendColor $bg={COLOR_SCALE[i]} />
                  <span>{formatPct(prevQ)}% - {formatPct(q)}%</span>
                </LegendRow>
              );
            })}
            <LegendTopRange>
              <LegendColor $bg={COLOR_SCALE[4]} />
              <span>{formatPct(quantiles[quantiles.length - 1])}% - {formatPct(maxVal)}%</span>
            </LegendTopRange>
            <LegendNoDataRow>
              <LegendColor $bg={NO_DATA_COLOR} />
              <span>No data</span>
            </LegendNoDataRow>
            <LegendRow>
              <LegendPolygonOutline $color="#dc2626" />
              <span>Selected municipality</span>
            </LegendRow>
          </LegendWrapper>
        )}
        {comparisonStats.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              zIndex: 1200,
              maxWidth: 320,
            }}
          >
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                Municipality comparison
              </div>
              <div style={{ fontSize: 12, color: '#cbd5f5' }}>
                Compare values for the selected Digital Equity measure.
              </div>
              {municipalityOptions.length > 1 && (() => {
                const primaryKey = dropdownMunicipality ? normalizeMunicipality(dropdownMunicipality) : '';
                const others = comparisonStats.filter((s) => !primaryKey || normalizeMunicipality(s.name) !== primaryKey);
                const maxOthers = 2;
                const optionsToShow = municipalityOptions.filter((name) => !primaryKey || normalizeMunicipality(name) !== primaryKey);
                const triggerLabel = others.length === 0
                  ? 'Select municipalities to compare'
                  : `Compare with (${others.length}/${maxOthers})`;
                return (
                  <div ref={comparisonDropdownRef} style={{ position: 'relative', marginTop: 8 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11, color: '#e5e7eb' }}>
                      Add municipality to compare (up to two municipalities)
                    </label>
                    <button
                      type="button"
                      onClick={() => setComparisonDropdownOpen((o) => !o)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(248,250,252,0.3)',
                        borderRadius: 6,
                        color: '#e5e7eb',
                        fontSize: 12,
                        cursor: 'pointer',
                        appearance: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{triggerLabel}</span>
                      <span style={{ marginLeft: 8, opacity: 0.8 }}>{comparisonDropdownOpen ? '▲' : '▼'}</span>
                    </button>
                    {comparisonDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: 4,
                          background: '#1e293b',
                          border: '1px solid rgba(248,250,252,0.2)',
                          borderRadius: 8,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                          maxHeight: 220,
                          overflowY: 'auto',
                          zIndex: 1300,
                        }}
                      >
                        {others.length > 0 && (
                          <button
                            type="button"
                            onClick={() => others.forEach((s) => handleRemoveComparisonMunicipality(s.name))}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              textAlign: 'left',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px solid rgba(248,250,252,0.2)',
                              color: '#94a3b8',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            Clear all
                          </button>
                        )}
                        {optionsToShow.map((name) => {
                          const isChecked = others.some((s) => normalizeMunicipality(s.name) === normalizeMunicipality(name));
                          const atMax = others.length >= maxOthers;
                          const disabled = !isChecked && atMax;
                          return (
                            <label
                              key={name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 12px',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                opacity: disabled ? 0.6 : 1,
                                fontSize: 12,
                                color: '#e5e7eb',
                                borderBottom: '1px solid rgba(248,250,252,0.08)',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={disabled}
                                onChange={() => {
                                  if (isChecked) handleRemoveComparisonMunicipality(name);
                                  else handleAddComparisonMunicipality(name);
                                }}
                                style={{ margin: 0, cursor: disabled ? 'not-allowed' : 'pointer', accentColor: '#38bdf8' }}
                              />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>
                                {name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {(() => {
              const key = dropdownMunicipality ? normalizeMunicipality(dropdownMunicipality) : '';
              const primaryStat = comparisonStats.find((s) => key && normalizeMunicipality(s.name) === key);
              const otherStats = comparisonStats
                .filter((s) => !key || normalizeMunicipality(s.name) !== key)
                .slice(0, 2);

              const renderCard = (stat, isPrimary) => {
                let value = null;
                if (selectedVariable === 'Percent Has one or more types of computing devices: Smartphone Only') value = stat.moblo;
                else if (selectedVariable === 'Percent Household has no computer devices') value = stat.nocmp;
                else if (selectedVariable === 'Percent Household has no internet') value = stat.noint;
                return (
                  <div
                    key={`${stat.name}-${stat.year}`}
                    style={{
                      background: isPrimary ? '#ffffff' : '#f9fafb',
                      borderRadius: 12,
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.22)',
                      padding: '12px 16px 14px',
                      border: isPrimary ? '1px solid #e5e7eb' : '1px solid #cbd5f5',
                      fontSize: 15,
                      color: '#0f172a',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.name}>
                        {stat.name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 24 }}>
                        {formatPct(value) != null ? `${formatPct(value)}%` : '—'}
                      </span>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {primaryStat && (
                    <div style={{ marginTop: 2 }}>
                      {renderCard(primaryStat, true)}
                    </div>
                  )}
                  {otherStats.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                        Compare with
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: 10,
                        }}
                      >
                        {otherStats.map((stat) => renderCard(stat, false))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
      <MapFooter>
        <strong>Additional information:</strong>
        <ul>
          <li>
            <a href="https://broadband.masstech.org/internetforall" target="_blank" rel="noopener noreferrer">
              MBI Internet for All MA Digital Equity Plan
            </a>
          </li>
          <li>
            <a href="https://broadbandmap.fcc.gov/data-download/nationwide-data?version=jun2025&pubDataVer=jun2025" target="_blank" rel="noopener noreferrer">
              FCC National Broadband Map Data Download
            </a>
          </li>
        </ul>
      </MapFooter>
    </MapWrapper>
  );
};

export default DigitalEquityMap;

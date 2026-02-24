import React, { useEffect, useState, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { MapContainer, TileLayer, GeoJSON, Pane, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MAPC_MUNICIPALITIES } from '../../constants/municipalities';
import { VARIABLE_TO_FIELD, FIELD_TO_MOE } from '../../constants/digitalEquityMap';
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

const LegendTopRange = styled(LegendRow)`
  margin-top: 3px;
`;

const LegendNoDataRow = styled(LegendRow)`
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid #ccc;
`;

const MapWrapper = styled.div`
  position: relative;
  width: 100%;
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

const ZOOM_TO_HIGHLIGHT = 12;

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

  const variables = VARIABLES;
  const years = YEARS;

  useEffect(() => {
    if (variables.length > 0 && !selectedVariable) setSelectedVariable(variables[0]);
    if (years.length > 0 && selectedYearProp === undefined && !internalYear) setInternalYear(years[years.length - 1]);
  }, [variables, years, selectedVariable, selectedYearProp, internalYear]);

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

  const highlightFeature = useMemo(() => {
    if (!highlightMunicipalityName || !baseLayerData?.features?.length) return null;
    const key = String(highlightMunicipalityName).toUpperCase().trim();
    return baseLayerData.features.find(
      f => (f.properties?.TOWN || f.properties?.['Municipality name'] || '').toUpperCase() === key
    ) || null;
  }, [highlightMunicipalityName, baseLayerData]);

  const highlightCollection = useMemo(
    () => (highlightFeature ? { type: 'FeatureCollection', features: [highlightFeature] } : null),
    [highlightFeature]
  );

  const formatLabel = (v) => {
    if (v == null || v === '') return '—';
    const s = String(v).trim();
    return s.toUpperCase() === 'UNKNOWN' ? '—' : s;
  };

  /** Data is already in %; only format to 2 decimal places (e.g. 85.123 → "85.12"). No calculation. */
  const formatPct = (v) => {
    if (v == null || v === '' || Number.isNaN(Number(v))) return null;
    return Number(v).toFixed(2);
  };

  const getPopupContent = (props) => {
    const variable = selectedVariable;
    const field = VARIABLE_TO_FIELD[variable];
    const municipality = formatLabel(props['TOWN'] || props['Municipality name'] || props['town'] || props['municipal']);
    const value = field != null ? props[field] : props[variable];
    const moeField = field ? FIELD_TO_MOE[field] : null;
    const moe = moeField ? props[moeField] : (props[`${variable} (margin of error)`]);
    const year = formatLabel(props['acs_year'] ?? props['ACS year of publication']);
    const valueLine = formatPct(value) != null ? `${formatPct(value)}%` : '—';
    const moeLine = formatPct(moe) != null ? `±${formatPct(moe)}%` : '—';
    const baseStyle = 'min-width:200px;padding:10px 12px;font-size:13px;line-height:1.5;font-family:system-ui,sans-serif;color:#1f2937;';
    const rowStyle = 'margin:6px 0 0 0;padding:0;';
    const labelStyle = 'color:#6b7280;font-weight:600;';
    const municipalityBlock =
      municipality !== '—'
        ? `<div style="margin:0 0 10px 0;padding:0 0 8px 0;border-bottom:1px solid #e5e7eb;"><div style="font-size:14px;font-weight:700;color:#111827;">${municipality}</div><div style="font-size:11px;color:#6b7280;">Municipality</div></div>`
        : '';
    const rows = [
      variable ? `<div style="${rowStyle}"><span style="${labelStyle}">${variable}</span><br/><span style="font-size:15px;font-weight:600;">${valueLine}</span></div>` : '',
      `<div style="${rowStyle}"><span style="${labelStyle}">Margin of error</span><br/>${moeLine}</div>`,
      year !== '—' ? `<div style="${rowStyle}"><span style="${labelStyle}">Year</span><br/>${year}</div>` : '',
    ].filter(Boolean);
    return `<div style="${baseStyle}">${municipalityBlock}${rows.join('')}</div>`;
  };

  const minVal = dataMin != null ? dataMin : 0;
  const maxVal = dataMax != null ? dataMax : (quantiles[quantiles.length - 1] || 100);

  if (!baseLayerData?.features?.length && !geojsonData?.features?.length && !choroplethLoading) {
    return <div>Loading map data...</div>;
  }

  return (
    <MapWrapper className="digital-equity-map">
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
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={showMAPCOnly} onChange={(e) => setShowMAPCOnly(e.target.checked)} style={{ marginRight: '5px', cursor: 'pointer' }} />
            Show MAPC Region Only
          </label>
        </div>
      </div>
      <div style={{ position: 'relative', height: '600px', width: '100%' }}>
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
          {baseLayerData?.features?.length > 0 && (
            <GeoJSON
              key="base"
              data={baseLayerData}
              style={{
                color: '#999',
                weight: 1,
                fillColor: '#f5f5f5',
                fillOpacity: 0.6,
              }}
            />
          )}
          {choroplethData?.features?.length > 0 && (
            <GeoJSON
              key={`choropleth-${selectedYear}-${selectedVariable}-${showMAPCOnly}`}
              data={choroplethData}
              style={(feature) => {
                const bin = feature?.properties?.[CHOROPLETH_BIN_PROP];
                const fillColor = bin >= 0 && bin <= 4 ? COLOR_SCALE[bin] : NO_DATA_COLOR;
                const isClicked = feature?.properties?.__featureIndex === clickedChoroplethIndex;
                return {
                  color: isClicked ? '#ea580c' : '#e5e7eb',
                  weight: isClicked ? 2 : 1,
                  fillColor,
                  fillOpacity: 1,
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
          {highlightCollection && (
            <Pane name="highlight-pane" style={{ zIndex: 650 }}>
              <GeoJSON
                key="highlight"
                data={highlightCollection}
                pathOptions={{ interactive: false }}
                style={{
                  color: '#dc2626',
                  weight: 3,
                  fillColor: '#dc2626',
                  fillOpacity: 0,
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
          </LegendWrapper>
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

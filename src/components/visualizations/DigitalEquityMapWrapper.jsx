import React, { useEffect, useState } from 'react';
import DigitalEquityMap from './DigitalEquityMap';
import MassachusettsGeoJSON from '../../assets/data/Massachusetts.geojson?url';
import {
  DIGITAL_EQUITY_FEATURE_SERVER,
  ARCGIS_TOKEN,
} from '../../constants/digitalEquityMap';

const DEFAULT_YEAR = '2020-24';

const DigitalEquityMapWrapper = ({ geojsonData: propGeoJSONData, highlightMunicipalityName }) => {
  const [geojsonData, setGeojsonData] = useState(propGeoJSONData);
  const [baseLayerData, setBaseLayerData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [loadingBase, setLoadingBase] = useState(!propGeoJSONData);
  const [choroplethLoading, setChoroplethLoading] = useState(false);
  const [choroplethProgress, setChoroplethProgress] = useState(null); // 0..1 or null (unknown)
  const [error, setError] = useState(null);

  useEffect(() => {
    if (propGeoJSONData) {
      setGeojsonData(propGeoJSONData);
      setBaseLayerData(propGeoJSONData?.features?.length ? { type: 'FeatureCollection', features: propGeoJSONData.features } : null);
      setLoadingBase(false);
      setChoroplethLoading(false);
      setChoroplethProgress(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      let baseFeatures = [];
      try {
        setError(null);

        if (!baseLayerData?.features?.length) {
          setLoadingBase(true);
          const massResponse = await fetch(MassachusettsGeoJSON, { signal });
          if (!massResponse.ok) {
            throw new Error(`Failed to load Massachusetts.geojson: ${massResponse.status}`);
          }
          const massGeoJSON = await massResponse.json();
          if (!massGeoJSON?.features?.length) {
            throw new Error('Massachusetts.geojson is empty or invalid');
          }

          baseFeatures = massGeoJSON.features.map(feature => {
            const townName = feature.properties?.town ||
              feature.properties?.TOWN ||
              feature.properties?.NAME ||
              feature.properties?.municipal ||
              feature.properties?.name ||
              'Unknown';
            return {
              type: 'Feature',
              properties: {
                'TOWN': townName.toUpperCase(),
                'TOWN_ID': feature.properties?.town_id || feature.properties?.TOWN_ID || feature.properties?.id || null,
                'Municipality name': townName.toUpperCase(),
                'ACS year of publication': null,
              },
              geometry: feature.geometry,
            };
          });
          setBaseLayerData({ type: 'FeatureCollection', features: baseFeatures });
          setLoadingBase(false);
        } else {
          baseFeatures = baseLayerData.features;
        }

        setGeojsonData({ type: 'FeatureCollection', features: [] });
        setChoroplethLoading(true);
        setChoroplethProgress(0);
        const token = ARCGIS_TOKEN ? `&token=${ARCGIS_TOKEN}` : '';
        const batchSize = 2000;
        const allFeatures = [];
        let offset = 0;
        let hasMore = true;
        const whereClause = encodeURIComponent(`acs_year = '${selectedYear}'`);

        // Get total count (for progress bar)
        let totalCount = null;
        try {
          const countUrl = `${DIGITAL_EQUITY_FEATURE_SERVER}/query?where=${whereClause}&returnCountOnly=true&f=json${token}`;
          const countResponse = await fetch(countUrl, { signal });
          if (countResponse.ok) {
            const countJson = await countResponse.json();
            if (typeof countJson?.count === 'number') totalCount = countJson.count;
          }
        } catch (e) {
          // If count fails, we’ll still fetch data; progress will be indeterminate.
          totalCount = null;
        }
        if (totalCount == null || totalCount <= 0) {
          setChoroplethProgress(null);
        } else {
          setChoroplethProgress(0);
        }

        let loadedCount = 0;
        while (hasMore) {
          const queryUrl = `${DIGITAL_EQUITY_FEATURE_SERVER}/query?where=${whereClause}&outFields=*&returnGeometry=true&outSR=4326&resultOffset=${offset}&resultRecordCount=${batchSize}&f=geojson${token}`;
          const fsResponse = await fetch(queryUrl, { signal });
          if (!fsResponse.ok) {
            throw new Error(`Feature Server query failed: ${fsResponse.status}`);
          }
          const fsGeoJSON = await fsResponse.json();
          const features = fsGeoJSON?.features ?? [];
          allFeatures.push(...features);
          loadedCount += features.length;
          if (totalCount != null && totalCount > 0) {
            setChoroplethProgress(Math.min(loadedCount / totalCount, 1));
          }
          hasMore = features.length === batchSize;
          offset += features.length;
        }
        if (allFeatures.length === 0) {
          setGeojsonData({ type: 'FeatureCollection', features: [] });
        } else {
          setGeojsonData({ type: 'FeatureCollection', features: allFeatures });
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
        console.error('Error loading map data:', err);
        setError(`Failed to load map data: ${err.message}. You may provide GeoJSON as a prop.`);
        setGeojsonData(baseFeatures?.length ? { type: 'FeatureCollection', features: baseFeatures } : { type: 'FeatureCollection', features: [] });
      } finally {
        setChoroplethLoading(false);
        setChoroplethProgress(null);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [propGeoJSONData, selectedYear]);

  if (loadingBase) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Massachusetts municipalities...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', maxWidth: '800px', margin: '0 auto' }}>
        <p><strong>Error loading map data:</strong></p>
        <p>{error}</p>
        <p style={{ marginTop: '10px', fontSize: '14px' }}>
          To use the map, you can pass GeoJSON data as a prop: <code>&lt;DigitalEquityMapWrapper geojsonData={'{geoJSONData}'} /&gt;</code>
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <DigitalEquityMap
        geojsonData={geojsonData ?? { type: 'FeatureCollection', features: [] }}
        baseLayerData={baseLayerData}
        highlightMunicipalityName={highlightMunicipalityName}
        selectedYear={propGeoJSONData == null ? selectedYear : undefined}
        onYearChange={propGeoJSONData == null ? setSelectedYear : undefined}
        choroplethLoading={propGeoJSONData == null ? choroplethLoading : false}
        choroplethProgress={propGeoJSONData == null ? choroplethProgress : null}
      />
    </div>
  );
};

export default DigitalEquityMapWrapper;

import React, { useEffect, useState } from 'react';
import DigitalEquityMap from './DigitalEquityMap';
import MassachusettsGeoJSON from '../../assets/data/Massachusetts.geojson?url';

const DigitalEquityMapWrapper = ({ geojsonData: propGeoJSONData, highlightMunicipalityName }) => {
  const [geojsonData, setGeojsonData] = useState(propGeoJSONData);
  const [baseLayerData, setBaseLayerData] = useState(null); // Massachusetts map as base layer
  const [loading, setLoading] = useState(!propGeoJSONData);
  const [loadingEquityData, setLoadingEquityData] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If data is provided as prop, use it
    if (propGeoJSONData) {
      setGeojsonData(propGeoJSONData);
      setLoading(false);
      return;
    }

    // Fetch GeoJSON data in two stages:
    // 1. First, load Massachusetts.geojson to show polygons immediately
    // 2. Then, fetch and merge digital equity data
    const fetchGeoJSONData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Load Massachusetts.geojson file (show polygons immediately)
        const massResponse = await fetch(MassachusettsGeoJSON);
        
        if (!massResponse.ok) {
          throw new Error(`Failed to load Massachusetts.geojson: ${massResponse.status}`);
        }

        const massGeoJSON = await massResponse.json();
        
        if (!massGeoJSON || !massGeoJSON.features || massGeoJSON.features.length === 0) {
          throw new Error('Massachusetts.geojson is empty or invalid');
        }

        // Transform Massachusetts GeoJSON to match expected format
        const initialFeatures = massGeoJSON.features.map(feature => {
          // Extract municipality name from properties (Massachusetts.geojson uses 'town' property)
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
            geometry: feature.geometry
          };
        });

        const initialGeoJSON = {
          type: 'FeatureCollection',
          features: initialFeatures
        };

        // Store Massachusetts as base layer (drawn underneath choropleth)
        setBaseLayerData(initialGeoJSON);
        // Show polygons immediately
        setGeojsonData(initialGeoJSON);
        setLoading(false);

        // Step 2: Fetch digital equity data from ArcGIS Feature Service
        // Handle pagination to get ALL records (ArcGIS limits to 1000 per request)
        setLoadingEquityData(true);
        const ARCGIS_TOKEN = "AAPTxy8BH1VEsoebNVZXo8HurFEryhzMUuo6HFsZYNxtvAILm5qQYklTujgW8rejiSVEA_kTru4Y7QuNe5-QWMtEpK-_L9TLSHlHV4h_oeYUONaR40fn8mVNBCPvWBSuheHtx9FPMu5xWNxz4gqnZ-TPnErmJVpoN7thS4Zj2QiLg12SqmtHyaMnnYJH5AwdRA1VAFZLZrfwWTLw4zLogHqqonCw58CKKRJS4rqd-UgsAO8.AT1_U0702ST1";
        const FEATURE_SERVICE_URL = "https://services.arcgis.com/c5WwApDsDjRhIVkH/arcgis/rest/services/digital_equity/FeatureServer/0";
        
        // Fetch all records with pagination
        let allFeatures = [];
        let hasMore = true;
        let offset = 0;
        const pageSize = 1000; // ArcGIS default limit
        
        while (hasMore) {
          const queryUrl = `${FEATURE_SERVICE_URL}/query?where=1=1&outFields=*&f=geojson&token=${ARCGIS_TOKEN}&returnGeometry=true&resultOffset=${offset}&resultRecordCount=${pageSize}`;
          
          const equityResponse = await fetch(queryUrl);
          
          if (!equityResponse.ok) {
            console.warn(`Could not fetch equity data from ArcGIS Feature Service (offset ${offset}): ${equityResponse.status}`);
            break;
          }

          const equityGeoJSON = await equityResponse.json();
          
          if (!equityGeoJSON || !equityGeoJSON.features || equityGeoJSON.features.length === 0) {
            hasMore = false;
            break;
          }

          allFeatures = allFeatures.concat(equityGeoJSON.features);
          
          // Check if there are more records
          hasMore = equityGeoJSON.features.length === pageSize && 
                   (equityGeoJSON.exceededTransferLimit === true || equityGeoJSON.features.length >= pageSize);
          offset += pageSize;
        }

        console.log(`Fetched ${allFeatures.length} total features from ArcGIS Feature Service`);
        
        if (allFeatures.length === 0) {
          console.warn('No features returned from ArcGIS Feature Service');
          setLoadingEquityData(false);
          return;
        }

        // Create GeoJSON from all features
        const equityGeoJSON = {
          type: 'FeatureCollection',
          features: allFeatures
        };

        // Create a map of municipality -> array of year data (to support multiple years)
        // Match by municipality name from the Feature Service
        const equityMapByYear = {};
        equityGeoJSON.features.forEach(feature => {
          // Extract municipality name - may need to check what field name is used
          const muniName = feature.properties?.municipal || 
                          feature.properties?.municipality || 
                          feature.properties?.town ||
                          feature.properties?.TOWN ||
                          feature.properties?.NAME ||
                          null;
          
          if (muniName) {
            const key = muniName.toUpperCase();
            if (!equityMapByYear[key]) {
              equityMapByYear[key] = [];
            }
            equityMapByYear[key].push(feature);
          }
        });

        // Transform ArcGIS Feature Service features to match expected format
        // Use shape/geometry from Feature Service to draw polygons (choropleth)
        const featuresWithEquity = equityGeoJSON.features.map(equityFeature => {
          const props = equityFeature.properties;
          
          // Use shape column or geometry for drawing - ArcGIS may return as geometry or properties.shape
          let geometry = equityFeature.geometry;
          if (!geometry && props.shape) {
            try {
              geometry = typeof props.shape === 'string' ? JSON.parse(props.shape) : props.shape;
            } catch (_) {
              geometry = null;
            }
          }
          
          // Extract municipality name from various possible field names (omit "Unknown")
          const rawMuni = props.municipal || props.municipality || props.town || props.TOWN || props.NAME || null;
          const muniName = rawMuni && String(rawMuni).toUpperCase() !== 'UNKNOWN' ? rawMuni : null;

          const parseNum = (v) => (v != null && !isNaN(v) ? parseFloat(v) : null);

          return {
            type: 'Feature',
            geometry: geometry || undefined,
            properties: {
              'ACS year of publication': props.acs_year && String(props.acs_year).toUpperCase() !== 'UNKNOWN' ? props.acs_year : null,
              'TOWN': muniName ? muniName.toUpperCase() : null,
              'TOWN_ID': props.town_id || props.TOWN_ID || props.id || props.seq_id || null,
              'Municipality name': muniName ? muniName.toUpperCase() : null,

              // Percentage variables and margin of error (_moe in ArcGIS)
              'Percent Internet Subscription with Broadband such as cable - fiber optic - or DSL': parseNum(props.bbfib_p),
              'Percent Internet Subscription with Broadband such as cable - fiber optic - or DSL (margin of error)': parseNum(props.bbfib_moe),
              'Percent Internet Subscription with Broadband of any type': parseNum(props.bbint_p),
              'Percent Internet Subscription with Broadband of any type (margin of error)': parseNum(props.bbint_moe),
              'Percent Internet Subscription with Broadband of any type & Cellular data plan': parseNum(props.cdpint_p),
              'Percent Internet Subscription with Broadband of any type & Cellular data plan (margin of error)': parseNum(props.cdpint_moe),
              'Percent Internet Subscription with Cellular data plan only': parseNum(props.cdpinto_p),
              'Percent Internet Subscription with Cellular data plan only (margin of error)': parseNum(props.cdpinto_moe),
              'Percent Has one or more types of computing devices': parseNum(props.cmp_p),
              'Percent Has one or more types of computing devices (margin of error)': parseNum(props.cmp_moe),
              'Percent Internet Subscription with dial-up only': parseNum(props.dialo_p),
              'Percent Internet Subscription with dial-up only (margin of error)': parseNum(props.dialo_moe),
              'Percent Has one or more types of computing devices: Desktop or Laptop': parseNum(props.dplp_p),
              'Percent Has one or more types of computing devices: Desktop or Laptop (margin of error)': parseNum(props.dplp_moe),
              'Percent Has one or more types of computing devices: Desktop or Laptop only': parseNum(props.dplpo_p),
              'Percent Has one or more types of computing devices: Desktop or Laptop only (margin of error)': parseNum(props.dplpo_moe),
              'Percent Households with Internet Subscription of any type': parseNum(props.int_p),
              'Percent Households with Internet Subscription of any type (margin of error)': parseNum(props.int_moe),
              'Percent Has one or more types of computing devices: Smartphone': parseNum(props.mobl_p),
              'Percent Has one or more types of computing devices: Smartphone (margin of error)': parseNum(props.mobl_moe),
              'Percent Has one or more types of computing devices: Smartphone Only': parseNum(props.moblo_p),
              'Percent Has one or more types of computing devices: Smartphone Only (margin of error)': parseNum(props.moblo_moe),
              'Percent Household has no computer devices': parseNum(props.nocmp_p),
              'Percent Household has no computer devices (margin of error)': parseNum(props.nocmp_moe),
              'Percent Household has no internet': parseNum(props.noint_p),
              'Percent Household has no internet (margin of error)': parseNum(props.noint_moe),
              'Percent Household has other kind of computer devices': parseNum(props.othcmp_p),
              'Percent Household has other kind of computer devices (margin of error)': parseNum(props.othcmp_moe),
              'Percent Household has other kind of computer devices only': parseNum(props.othcmpo_p),
              'Percent Household has other kind of computer devices only (margin of error)': parseNum(props.othcmpo_moe),
              'Percent Internet Subscription with other type': parseNum(props.satint_p),
              'Percent Internet Subscription with other type (margin of error)': parseNum(props.satint_moe),
            }
          };
        });

        // Only include features that have valid geometry (shape) to draw
        const featuresWithGeometry = featuresWithEquity.filter(f => f.geometry);

        const geoJSONWithEquity = {
          type: 'FeatureCollection',
          features: featuresWithGeometry
        };

        // Update with equity data
        setGeojsonData(geoJSONWithEquity);
        setLoadingEquityData(false);
      } catch (err) {
        console.error('Error fetching GeoJSON data:', err);
        setError(`Failed to load map data: ${err.message}. You may need to provide GeoJSON data as a prop.`);
        setLoading(false);
        setLoadingEquityData(false);
      }
    };

    fetchGeoJSONData();
  }, [propGeoJSONData]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Massachusetts municipalities...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', maxWidth: '800px', margin: '0 auto' }}>
        <p><strong>Error loading map data:</strong></p>
        <p>{error}</p>
        <p style={{ marginTop: '10px', fontSize: '14px' }}>
          To use the map, you need to provide GeoJSON data. The template file has embedded GeoJSON data 
          that includes municipality boundaries and digital equity statistics. You can:
        </p>
        <ul style={{ marginTop: '10px', fontSize: '14px', textAlign: 'left' }}>
          <li>Pass GeoJSON data as a prop: <code>&lt;DigitalEquityMapWrapper geojsonData={geoJSONData} /&gt;</code></li>
          <li>Load it from a static JSON file</li>
          <li>Fetch it from an API endpoint that returns GeoJSON with digital equity data</li>
        </ul>
      </div>
    );
  }

  if (!geojsonData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        No map data available. Please provide GeoJSON data.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <DigitalEquityMap
        geojsonData={geojsonData}
        baseLayerData={baseLayerData}
        highlightMunicipalityName={highlightMunicipalityName}
        loadingEquityData={loadingEquityData}
      />
    </div>
  );
};

export default DigitalEquityMapWrapper;

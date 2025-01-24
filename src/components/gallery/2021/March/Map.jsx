import React, { useState, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { participation, scale } from './colors';

function respondentsChoropleth(data) {
  const choropleth = ['match', ['get', 'town']];
  data.forEach((row) => {
    choropleth.push(row.municipality, row.answers ? '#4DC1B9' : '#F0F8F3');
  });
  choropleth.push('#B6B6B6');
  return choropleth;
}

function impactChoropleth(data) {
  const colorFunc = (value) => {
    if (value === 'More people participate') {
      return participation[0];
    } if (value === 'No difference') {
      return participation[1];
    }
    return participation[2];
  };

  const choropleth = ['match', ['get', 'town']];
  data.forEach((row) => {
    choropleth.push(row.municipality, row.impact ? colorFunc(row.impact) : '#F0F8F3');
  });
  choropleth.push('#B6B6B6');
  return choropleth;
}

function scaleChoropleth(data, column) {
  const colorFunc = (value) => {
    if (value === 1) {
      return scale[0];
    } if (value === 2) {
      return scale[1];
    } if (value === 3) {
      return scale[2];
    } if (value === 4) {
      return scale[3];
    }
    return scale[4];
  };

  const choropleth = ['match', ['get', 'town']];
  data.forEach((row) => {
    choropleth.push(row.municipality, +row[column] ? colorFunc(+row[column]) : '#F0F8F3');
  });
  choropleth.push('#B6B6B6');
  return choropleth;
}

const MapComponent = ({ data, slide }) => {
  const [choropleth, setChoropleth] = useState('#00613F');
  const [viewState, setViewState] = useState({
    latitude: 42.111491576125616,
    longitude: -71.18796001765833,
    zoom: 7.62,
  });

  useEffect(() => {
    if (data.length > 0) {
      switch (slide) {
        case 1:
          setChoropleth(respondentsChoropleth(data));
          break;
        case 2:
          setChoropleth(impactChoropleth(data));
          break;
        case 3:
          setChoropleth(impactChoropleth(data));
          break;
        case 4:
          setChoropleth(impactChoropleth(data));
          break;
        case 5:
          setChoropleth(impactChoropleth(data));
          break;
        case 6:
          setChoropleth(scaleChoropleth(data, 'board sentiment'));
          break;
        case 7:
          setChoropleth(scaleChoropleth(data, 'board sentiment'));
          break;
        case 8:
          setChoropleth('#4DC1B9');
          break;
        default:
          setChoropleth('#00613F');
          break;
      }
    }
  }, [data, slide]);

  return (
    <Map
      {...viewState}
      style={{ height: 700 }}
      onMove={evt => setViewState(evt.viewState)}
      mapboxAccessToken="pk.eyJ1IjoiaWhpbGwiLCJhIjoiY2plZzUwMTRzMW45NjJxb2R2Z2thOWF1YiJ9.szIAeMS4c9YTgNsJeG36gg"
      mapStyle="mapbox://styles/ihill/cki9ablq87wb01apa878hhbj8"
      scrollZoom={false}
    >
      <Layer 
        type="background" 
        paint={{ 'background-color': '#F0F8F3' }} 
      />
      <Source 
        id="MA municipalities" 
        type="vector" 
        url="mapbox://ihill.1akk89mh"
      >
        <Layer
          id="municipalities-layer"
          type="fill"
          source-layer="MA_Munis"
          paint={{ 
            'fill-color': choropleth, 
            'fill-outline-color': '#231F20' 
          }}
        />
      </Source>
      <NavigationControl
        position="bottom-right"
        showCompass={false}
        showZoom={true}
        visualizePitch={false}
        style={{
          marginRight: '10px',
          marginBottom: '10px'
        }}
      />
    </Map>
  );
};

export default MapComponent;

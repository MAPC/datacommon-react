import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import NewEngland from '../../assets/data/NewEngland.geojson?url';
import Massachusetts from '../../assets/data/Massachusetts.geojson?url';
import MAPC from '../../assets/data/MAPC.geojson?url';

const D3Map = (props) => {
  const mapRef = useRef(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Skip if already rendered or no ref
    if (isRendered || !mapRef.current) return;

    const drawMap = async () => {
      // Set up projection
      const projection = d3.geoAlbers()
        .scale(37000)
        .rotate([71.057, 0])
        .center([0.4, 42.37])
        .translate([960 / 2, 500 / 2]);

      const path = d3.geoPath().projection(projection);

      // Clear existing content
      const svg = d3.select(mapRef.current);
      svg.selectAll('*').remove();

      // Create the base map
      const d3Map = svg.style('background', props.oceanFill);

      try {
        // Load all data concurrently
        const [newEngland, massachusetts, mapc] = await Promise.all([
          d3.json(NewEngland),
          d3.json(Massachusetts),
          d3.json(MAPC),
        ]);

        // Draw New England
        d3Map.append('g')
          .attr('class', 'd3-map__new-england')
          .selectAll('path')
          .data(newEngland.features)
          .join('path')
          .attr('fill', props.newEngFill)
          .attr('stroke', props.newEngLine)
          .attr('stroke-width', '1')
          .attr('stroke-opacity', 0.6)
          .attr('d', path);

        // Draw Massachusetts
        d3Map.append('g')
          .attr('class', 'd3-map__massachusetts')
          .selectAll('path')
          .data(massachusetts.features)
          .join('path')
          .attr('fill', props.maFill)
          .attr('stroke', props.maLine)
          .attr('stroke-width', '1')
          .attr('stroke-opacity', 0.6)
          .attr('d', path);

        // Draw MAPC region if enabled
        if (props.displayMapc) {
          d3Map.append('g')
            .attr('class', 'd3-map__mapc')
            .selectAll('path')
            .data(mapc.features)
            .join('path')
            .attr('fill', props.mapcFill)
            .attr('stroke', props.mapcLine)
            .attr('stroke-width', '1')
            .attr('stroke-opacity', 0.6)
            .attr('d', path);
        }

        setIsRendered(true);
      } catch (error) {
        console.error('Error loading map data:', error);
      }
    };

    drawMap();

    // Cleanup function
    return () => {
      if (mapRef.current) {
        d3.select(mapRef.current).selectAll('*').remove();
        setIsRendered(false);
      }
    };
  }, [props, isRendered]); // Added isRendered to dependencies

  return (
    <svg 
      ref={mapRef}
      className="d3-map" 
      width="700" 
      height="500" 
      viewBox="0 0 700 500"
    />
  );
};

D3Map.defaultProps = {
  oceanFill: '#F4F6FB',
  newEngFill: '#F0EFE7',
  newEngLine: '#5a5a5a',
  maFill: '#CDE6F6',
  maLine: '#5a5a5a',
  mapcFill: '#1d6a9d',
  mapcLine: '#ffffff',
  displayMapc: true,
};

export default D3Map;

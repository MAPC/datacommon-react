import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import MoonLoader from "react-spinners/MoonLoader";

import colors from "../../constants/colors";
import { chartSourceIsAcs } from "../../constants/charts";
import { drawLegend, sortKeys } from "../../utils/charts";


const primaryColors = Array.from(colors.CHART.PRIMARY.values());

const container = {
  width: 500,
  height: 500,
};

const defaultMargin = {
  top: 20,
  left: 20,
  right: 20,
  bottom: -5, 
};

const MultiGaugeChart = (props) => {
  const chartRef = useRef(null);
  const svgRef = useRef(null);
  const chartGroupRef = useRef(null);
  const tooltipRef = useRef(null);

  const legendContainerRef = useRef(null);
  const colorRef = useRef(null);
  

  useEffect(() => {
    // Create tooltip
    tooltipRef.current = d3
      .select("body")
      .append("div")
      .attr("class", "chart-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "white")
      .style("padding", "5px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "3px")
      .style("z-index", 1000);

    // Create SVG with responsive sizing and fixed gauge viewBox (matches CodePen example)
    svgRef.current = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("viewBox", "0 0 80 40");

    // Create chart group
    chartGroupRef.current = svgRef.current.append("g");

    return () => {
      if (tooltipRef.current) tooltipRef.current.remove();
      if (svgRef.current) svgRef.current.remove();
    };
  }, []);

  const renderChart = () => {
    const chart = chartGroupRef.current;
    const tooltip = tooltipRef.current;

    // Process colors
    const keys = props.legend.map(d => d.label);
    const colors = props.legend.reduce((obj, d) => (d.color ? Object.assign(obj, { [d.label]: d.color }) : obj), {});
    colorRef.current = d3
      .scaleOrdinal()
      .range(Object.keys(colors).length ? keys.map((key) => colors[key]) : keys.length > primaryColors.length ? extendedColors : primaryColors)
      .domain(keys);

    // Get the data (expects array of values that sum to 100)
    const dataItems = props.data || [];

    // Clear existing content
    chart.selectAll("*").remove();
    svgRef.current.selectAll(".axis-label").remove();

    // Geometry matching the CodePen SVG
    const cx = 40;
    const cy = 40;
    const radius = 31.8309886184;
    const fullCirc = 2 * Math.PI * radius; // ≈ 200
    const halfCirc = fullCirc / 2;
    
    // Background ring (full donut ring; only top half is visible due to viewBox)
    const trackColor = props.backgroundColor || "#d2d3d4";
    chart
      .append("circle")
      .attr("class", "donut-ring")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", radius)
      .attr("fill", "transparent")
      .attr("stroke", trackColor)
      .attr("stroke-width", 15);

    // Value segments
    let offset = 0;
    const minValue = props.minValue || 0;
    const maxValue = props.maxValue || 100;
    dataItems.forEach((dataItem, idx) => {
      const value = dataItem.value || 0;
      const clampedPct = Math.max(minValue, Math.min(maxValue, value));
      const dashValue = (clampedPct / 100) * halfCirc;
      const dashGap = fullCirc - dashValue;
      const valueColor = colorRef.current(dataItem.label);
      chart
        .append("circle")
        .attr("class", "donut-segment")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", radius)
        .attr("fill", "transparent")
        .attr("stroke", valueColor)
        .attr("stroke-width", 15)
        .attr("stroke-dasharray", `${dashValue} ${dashGap}`)
        .attr("stroke-dashoffset", - halfCirc + offset)
        .on("mouseover", (event) => {
          const tooltipItems = dataItems.map(dataItem => {
            const value = dataItem.value || 0;
            const clampedPct = Math.max(minValue, Math.min(maxValue, value));
            const labelColor = colorRef.current(dataItem.label);
            const formattedPercentage = props.valueFormat ? `${props.valueFormat(clampedPct)}%` : `${clampedPct.toFixed(1)}%`;
            const labelIcon = `<span style="color: ${labelColor};">●</span>`
            return `<div>${labelIcon}${dataItem.label}: ${formattedPercentage}</div>`
          });
          tooltip
            .style("opacity", 1)
            .html(
              `
              <div style="padding: 4px;">
                <div style="font-weight: bold;">${props.title || "Value"}</div>
                ${tooltipItems.join('')}               
              </div>
            `,
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 10}px`)
        })
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        });
      
      offset += dashGap;
    });

    // Center label
    const percentagesByLabels = dataItems.map(dataItem => {
      const value = dataItem.value || 0;
      const mappedValue = Math.max(minValue, Math.min(maxValue, value));
      const percent = ((value - minValue) / (maxValue - minValue)) * 100;
      return { percent, label: dataItem.label };
    });
    const firstValue = percentagesByLabels[0];
    const displayLabel = `${firstValue.percent.toFixed(1)}%`;
    // leaving out the main-label for now
    // const valueText = chart
    //   .append("text")
    //   .attr("x", cx)
    //   .attr("y", 35.5)
    //   .attr("text-anchor", "middle")
    //   .attr("class", "gauge-text")
    //   .attr("font-size", "10")
    //   .attr("font-weight", "400")
    //   .attr("fill", "black")
    //   .text(displayLabel);

    // leaving out the sub-label for now
    // const displaySubLabel = firstValue.label;
    // const labelText = chart
    //   .append("text")
    //   .attr("x", cx)
    //   .attr("y", 36.5)
    //   .attr("text-anchor", "middle")
    //   .attr("class", "gauge-text")
    //   .attr("font-size", "2.4")
    //   .attr("font-weight", "400")
    //   .attr("fill", "black")
    //   .text(displaySubLabel);

    // Add legend
    const legend = d3.select(legendContainerRef.current);
    legend.selectAll("*").remove();
    drawLegend(legend, colorRef.current, keys);
  };

  const renderBlankChart = () => {
    const chart = chartGroupRef.current;
    if (!chart) return;
    chart.selectAll("*").remove();

    chart
      .append("text")
      .attr("class", "missing-data")
      .attr("x", 40)
      .attr("y", 20)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "5")
      .style("fill", "currentColor")
      .text("Data not available.");
  };

  useEffect(() => {
    if (!svgRef.current) return;

    // While loading, clear any previous content so only the spinner is visible
    if (props.isLoading && !props.hasData) {
      const chart = chartGroupRef.current;
      if (chart) {
        chart.selectAll("*").remove();
      }
      return;
    }

    if (props.hasData) {
      renderChart();
    } else {
      // Not loading and no data -> show "Data not available."
      renderBlankChart();
    }
  }, [props.data, props.hasData, props.isLoading]);

  return (
    <div className="component chart GaugeChart">
      <div
        className="svg-wrapper"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          minHeight: props.hasData ? undefined : 120,
        }}
      >
        {props.isLoading && !props.hasData && (
          <div className="gauge-loader">
            <MoonLoader size={24} color="#767676" />
          </div>
        )}
        <div ref={chartRef} className="chart-container" style={{ width: '100%', maxWidth: `${props.width || container.width}px`, margin: '0 auto' }} />
      </div>
      <div ref={legendContainerRef} className="legend" />
    </div>
  );
};

MultiGaugeChart.propTypes = {
  chart: PropTypes.object,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number.isRequired,
    }),
  ).isRequired,
  minValue: PropTypes.number,
  maxValue: PropTypes.number,
  valueColor: PropTypes.string,
  backgroundColor: PropTypes.string,
  showCenterCircle: PropTypes.bool,
  showUnit: PropTypes.bool,
  showLabels: PropTypes.bool,
  unit: PropTypes.string,
  minLabel: PropTypes.string,
  maxLabel: PropTypes.string,
  valueFormat: PropTypes.func,
  title: PropTypes.string,
  hasData: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
  isLoading: PropTypes.bool,
  legend: PropTypes.array,
};

export default MultiGaugeChart;
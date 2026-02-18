import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";

import colors from "../../constants/colors";

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

const GaugeChart = (props) => {
  const chartRef = useRef(null);
  const svgRef = useRef(null);
  const chartGroupRef = useRef(null);
  const tooltipRef = useRef(null);

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

    // Create SVG with responsive sizing
    svgRef.current = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("viewBox", `0 0 ${props.width || container.width} ${props.height || container.height}`);

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

    const margin = defaultMargin;
    const width = (props.width || container.width) - margin.left - margin.right;
    const height = (props.height || container.height) - margin.top - margin.bottom;

    // Get the value and margin of error from data (expects single value or array with one value)
    const dataItem = props.data && props.data.length > 0 ? props.data[0] : { value: 0, marginOfError: null };
    const dataValue = dataItem.value || 0;
    const marginOfError = dataItem.marginOfError !== null && dataItem.marginOfError !== undefined ? dataItem.marginOfError : null;
    const minValue = props.minValue || 0;
    const maxValue = props.maxValue || 100;
    const value = Math.max(minValue, Math.min(maxValue, dataValue));

    // Calculate percentage
    const percentage = ((value - minValue) / (maxValue - minValue)) * 100;

    // Gauge configuration
    const radius = Math.min(width, height) / 2.5;
    const centerX = width / 2 + margin.left;
    // Position arc lower to avoid being hidden by title text
    const centerY = margin.top + radius * 1.5;

    // Arc angles (horizontal semicircle from left to right, top half)
    // Math.PI = 180° (left), 0 = 0° (right) - goes counter-clockwise
    // Start from top center (-Math.PI/2) and fill symmetrically
    const startAngle = -Math.PI / 2;
    const endAngle = Math.PI / 2;
    const angleRange = Math.abs(endAngle - startAngle);

    // Clear existing content
    chart.selectAll("*").remove();
    svgRef.current.selectAll(".axis-label").remove();

    // Create chart group
    const g = chart.append("g").attr("transform", `translate(${centerX},${centerY})`);

    // Define arc generator for background (full semicircle)
    const arcBackground = d3
      .arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(endAngle);

    // Define arc generator for value (only the percentage portion, centered at top)
    const arcValue = d3
      .arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius)
      .startAngle((d) => {
        // Calculate start angle based on percentage (0-100)
        // Fill symmetrically from top center outward
        // For 7%, fill 7% of the arc centered at the top
        const percentageAngle = (d / 100) * angleRange;
        const halfAngle = percentageAngle / 2;
        return startAngle - halfAngle;
      })
      .endAngle((d) => {
        // Calculate end angle based on percentage (0-100)
        const percentageAngle = (d / 100) * angleRange;
        const halfAngle = percentageAngle / 2;
        return startAngle + halfAngle;
      });

    // Draw background arc (full semicircle in white/gray)
    g.append("path")
      .datum(100)
      .attr("d", arcBackground)
      .attr("fill", props.backgroundColor || "#e0e0e0")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Draw value arc (only the percentage portion in color, on top of background)
    const valueColor = props.valueColor || primaryColors[0];
    g.append("path")
      .datum(percentage)
      .attr("d", arcValue)
      .attr("fill", valueColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("mouseover", (event) => {
        const formattedPercentage = props.valueFormat ? `${props.valueFormat(value)}%` : `${value.toFixed(1)}%`;
        const formattedME = marginOfError !== null ? (marginOfError % 1 === 0 ? marginOfError.toFixed(0) : marginOfError.toFixed(1)) : null;
        tooltip
          .style("opacity", 1)
          .html(
            `
            <div style="padding: 4px;">
              <div style="font-weight: bold;">${props.title || "Value"}</div>
              <div>Value: ${formattedPercentage}</div>
              ${formattedME !== null ? `<div>Margin of Error: ±${formattedME}%</div>` : '<div>Margin of Error: Not Available</div>'}
            </div>
          `,
          )
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Center semicircle removed - not needed

    // Add value text in center with % symbol
    const formattedValue = props.valueFormat ? props.valueFormat(value) : value.toFixed(1);
    g.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "32px")
      .attr("font-weight", "bold")
      .attr("fill", valueColor)
      .text(`${formattedValue}%`);

    // Unit text removed - not needed

    // Min/max labels removed - not needed

    // Title removed - shown in ChartDetails instead
  };

  const renderBlankChart = () => {
    const chart = chartGroupRef.current;
    const width = (props.width || container.width) - defaultMargin.left - defaultMargin.right;
    const height = (props.height || container.height) - defaultMargin.top - defaultMargin.bottom;

    chart.selectAll("*").remove();

    chart
      .append("text")
      .attr("class", "missing-data")
      .attr("x", width / 2)
      .attr("y", height / 2 - 12)
      .attr("dy", "12")
      .style("text-anchor", "middle")
      .text("Data not available.");
  };

  useEffect(() => {
    if (!svgRef.current) return;

    if (props.hasData) {
      renderChart();
    } else {
      renderBlankChart();
    }
  }, [props.data, props.hasData]);

  return (
    <div className="component chart GaugeChart">
      <div className="svg-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <div ref={chartRef} className="chart-container" style={{ width: '100%', maxWidth: `${props.width || container.width}px`, margin: '0 auto' }} />
      </div>
    </div>
  );
};

GaugeChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number.isRequired,
    }),
  ).isRequired,
  minValue: PropTypes.number,
  maxValue: PropTypes.number,
  valueColor: PropTypes.string,
  backgroundColor: PropTypes.string,
  zones: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired, // percentage start (0-100)
      end: PropTypes.number.isRequired, // percentage end (0-100)
      color: PropTypes.string,
      opacity: PropTypes.number,
    }),
  ),
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
};

export default GaugeChart;

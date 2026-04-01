import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import MoonLoader from "react-spinners/MoonLoader";

import colors from "../../constants/colors";
import { chartSourceIsAcs } from "../../constants/charts";

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

    // Get the value and margin of error from data (expects single value or array with one value)
    const dataItem = props.data && props.data.length > 0 ? props.data[0] : { value: 0, marginOfError: null };
    const dataValue = dataItem.value || 0;
    const marginOfError = dataItem.marginOfError !== null && dataItem.marginOfError !== undefined ? dataItem.marginOfError : null;
    const count = dataItem.count !== null && dataItem.count !== undefined ? dataItem.count : null;
    const countMarginOfError =
      dataItem.countMarginOfError !== null && dataItem.countMarginOfError !== undefined
        ? dataItem.countMarginOfError
        : null;
    const minValue = props.minValue || 0;
    const maxValue = props.maxValue || 100;
    const value = Math.max(minValue, Math.min(maxValue, dataValue));

    // Calculate percentage
    const percentage = ((value - minValue) / (maxValue - minValue)) * 100;

    // Clear existing content
    chart.selectAll("*").remove();
    svgRef.current.selectAll(".axis-label").remove();

    // Geometry matching the CodePen SVG
    const cx = 40;
    const cy = 40;
    const radius = 31.8309886184;
    const fullCirc = 2 * Math.PI * radius; // ≈ 200
    const halfCirc = fullCirc / 2;
    const clampedPct = Math.max(0, Math.min(100, percentage));
    const dashValue = (clampedPct / 100) * halfCirc;
    const dashGap = fullCirc - dashValue;

    const valueColor = props.valueColor || primaryColors[0];

    const trackColor = props.backgroundColor || "#d2d3d4";

    // Background ring (full donut ring; only top half is visible due to viewBox)
    chart
      .append("circle")
      .attr("class", "donut-ring")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", radius)
      .attr("fill", "transparent")
      .attr("stroke", trackColor)
      .attr("stroke-width", 15);

    // Value segment for print: static circle (no animation). Browsers don't run SVG animate when printing.
    chart
      .append("circle")
      .attr("class", "donut-segment donut-segment--print")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", radius)
      .attr("fill", "transparent")
      .attr("stroke", valueColor)
      .attr("stroke-width", 15)
      .attr("stroke-dasharray", `${dashValue} ${dashGap}`)
      .attr("stroke-dashoffset", -halfCirc);

    // Value segment (animated) for screen — start empty, then draw to final value
    const segment = chart
      .append("circle")
      .attr("class", "donut-segment donut-segment--animated")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", radius)
      .attr("fill", "transparent")
      .attr("stroke", valueColor)
      .attr("stroke-width", 15)
      .attr("stroke-dasharray", `0 ${fullCirc}`)
      .attr("stroke-dashoffset", -halfCirc)
      .on("mouseover", (event) => {
        const isAcs = chartSourceIsAcs(props.chart);
        const countLabel = isAcs ? "Estimate" : "Count";
        const countMeLabel = isAcs ? "Margin of Error (Estimate)" : "Margin of Error (Count)";

        const formattedPercentage = props.valueFormat ? `${props.valueFormat(value)}%` : `${value.toFixed(1)}%`;
        const formattedME = marginOfError !== null ? (marginOfError % 1 === 0 ? marginOfError.toFixed(0) : marginOfError.toFixed(1)) : null;
        const formattedCount = count !== null ? d3.format(",")(count) : null;
        const formattedCountME =
          countMarginOfError !== null
            ? countMarginOfError % 1 === 0
              ? countMarginOfError.toFixed(0)
              : countMarginOfError.toFixed(1)
            : null;

        const valueMeLine =
          formattedME !== null
            ? `<div>Margin of Error (Percent): ±${formattedME}%</div>`
            : isAcs
              ? `<div>Margin of Error (Percent): Not Available</div>`
              : "";
        const countMeLine =
          formattedCountME !== null
            ? `<div>${countMeLabel}: ±${formattedCountME}</div>`
            : isAcs && formattedCount !== null
              ? `<div>${countMeLabel}: Not Available</div>`
              : "";
        const countBlock =
          formattedCount !== null
            ? `<div style="margin-top: 4px;"><div>${countLabel}: ${formattedCount}</div>${countMeLine}</div>`
            : "";

        tooltip
          .style("opacity", 1)
          .html(
            `
            <div style="padding: 4px;">
              <div style="font-weight: bold;">${props.title || "Value"}</div>
              <div>Value: ${formattedPercentage}</div>
              ${valueMeLine}
              ${countBlock}
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

    // Animate the value arc drawing from 0 to final (smooth ease-out)
    segment
      .transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attrTween("stroke-dasharray", function () {
        const interp = d3.interpolateNumber(0, dashValue);
        return function (t) {
          const v = interp(t);
          return `${v} ${fullCirc - v}`;
        };
      });

    // Center label: final value set immediately so print / PDF never snapshots a counting "0%" mid-animation.
    // (Arc uses a static print layer; text must match.)
    const displayLabel = props.valueFormat ? `${props.valueFormat(value)}%` : `${value.toFixed(1)}%`;
    const valueText = chart
      .append("text")
      .attr("x", cx)
      .attr("y", 39.5)
      .attr("text-anchor", "middle")
      .attr("class", "gauge-text")
      .attr("font-size", "10")
      .attr("font-weight", "400")
      .attr("fill", valueColor)
      .attr("opacity", 0)
      .text(displayLabel);

    valueText.transition().delay(200).duration(400).ease(d3.easeCubicOut).attr("opacity", 1);
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
    </div>
  );
};

GaugeChart.propTypes = {
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
  isLoading: PropTypes.bool,
};

export default GaugeChart;

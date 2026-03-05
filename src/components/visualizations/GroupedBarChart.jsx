import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";

import colors from "../../constants/colors";
import { drawLegend, maxTextToMargin, sortKeys, splitPhrase } from "../../utils/charts";

const primaryColors = Array.from(colors.CHART.PRIMARY.values());
const extendedColors = Array.from(colors.CHART.EXTENDED.values());

const LEFT_LABEL_MAX = 20;

const container = {
  width: 500,
  height: 500,
};

const defaultMargin = {
  top: 20,
  left: 40,
  right: 20,
  bottom: 50,
};

const GroupedBarChart = (props) => {
  const chartRef = useRef(null);
  const legendContainerRef = useRef(null);
  const svgRef = useRef(null);
  const chartGroupRef = useRef(null);
  const tooltipRef = useRef(null);
  const colorRef = useRef(null);
  const [xAxisLabel, setXAxisLabel] = useState(typeof props.xAxis.label === "string" ? props.xAxis.label : "");

  useEffect(() => {
    const loadXAxisLabel = async () => {
      if (typeof props.xAxis.label === "function") {
        try {
          const label = await props.xAxis.label();
          setXAxisLabel(label);
        } catch (error) {
          console.error("Error loading xAxis label:", error);
          setXAxisLabel("");
        }
      } else {
        setXAxisLabel(props.xAxis.label || "");
      }
    };

    loadXAxisLabel();
  }, [props.xAxis.label]);

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

    // Create SVG
    svgRef.current = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
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

    // Guard: ensure we have data
    if (!props.data || !Array.isArray(props.data) || props.data.length === 0) {
      renderBlankChart();
      return;
    }

    // Measure data and calculate size and margins
    const maxLeftLabel = props.data.reduce((acc, d) => Math.max(acc, props.yAxis.format ? props.yAxis.format(d.y).length : String(d.y).length), 0);

    const clippedMaxLeftLabel = maxLeftLabel > LEFT_LABEL_MAX ? LEFT_LABEL_MAX : maxLeftLabel;
    const bonusLeftMargin = maxTextToMargin(clippedMaxLeftLabel, 12);

    const margin = Object.assign({}, defaultMargin, {
      left: defaultMargin.left + bonusLeftMargin,
    });
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    // Get unique x values (categories) and z values (groups)
    const xValues = [...new Set(props.data.map((d) => d.x))].sort((a, b) => {
      if (props.xAxis.sort) {
        return props.xAxis.sort(a, b);
      }
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a > b ? 1 : -1;
    });

    const zValues = sortKeys(props.data);
    const colors = props.data.reduce((obj, d) => (d.color ? Object.assign(obj, { [d.z]: d.color }) : obj), {});

    colorRef.current = d3
      .scaleOrdinal()
      .range(Object.keys(colors).length ? zValues.map((key) => colors[key]) : zValues.length > primaryColors.length ? extendedColors : primaryColors)
      .domain(zValues);

    // Create nested data structure: group by x, then by z
    const nestedData = xValues.map((x) => {
      const xData = props.data.filter((d) => d.x === x);
      const zData = zValues.map((z) => {
        const zItem = xData.find((d) => d.z === z);
        return zItem
          ? {
              x,
              z,
              y: zItem.y,
              me: zItem.me,
              totpop: zItem.totpop,
              totpop_me: zItem.totpop_me,
            }
          : { x, z, y: 0 };
      });
      return { x, values: zData };
    });

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(xValues)
      .range([0, width])
      .paddingInner(0.2)
      .paddingOuter(0.1);

    const zScale = d3
      .scaleBand()
      .domain(zValues)
      .range([0, xScale.bandwidth()])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max([1, d3.max(props.data, (d) => d.y)])])
      .range([height, 0]);

    // Clear existing content
    chart.selectAll("*").remove();
    svgRef.current.selectAll(".axis-label").remove();

    // Create chart group
    const g = chart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Add bars
    nestedData.forEach((group) => {
      group.values.forEach((d) => {
        const bar = g
          .append("rect")
          .attr("x", xScale(d.x) + zScale(d.z))
          .attr("y", yScale(d.y))
          .attr("width", zScale.bandwidth())
          .attr("height", height - yScale(d.y))
          .attr("fill", colorRef.current(d.z))
          .on("mouseover", (event) => {
            const value = d.y;
            const me = d.me;
            const totpop = d.totpop;
            const totpop_me = d.totpop_me;

            const isPercentChart = props.chart?.title === "Internet Subscription Types";
            
            // For Internet Subscription Types, values are already percentages (0.2 = 0.2%), so don't multiply by 100
            const formattedValue = typeof value === "number"
              ? (isPercentChart 
                  ? value.toFixed(1) + "%"  // Already a percentage, just format with 1 decimal
                  : value < 1 ? (value * 100).toFixed(1) + "%"
                    : value % 1 === 0 ? value.toFixed(0) : value.toFixed(2))
              : value;
            
            const formattedME = typeof me === "number"
              ? (isPercentChart 
                  ? me.toFixed(1)  // Already a percentage, format with 1 decimal
                  : me % 1 === 0 ? me.toFixed(0) : me.toFixed(2))
              : null;
            const formattedTotpop = typeof totpop === "number" ? d3.format(",")(totpop) : null;
            const formattedTotpopME = typeof totpop_me === "number" ? d3.format(",")(totpop_me) : null;

            const valueDisplay = formattedValue;
            const meDisplay = formattedME === null ? "Not Available" : (isPercentChart ? `±${formattedME}%` : `±${formattedME}`);

            tooltip
              .style("opacity", 1)
              .html(
                `
                <div style="padding: 4px;">
                  <div style="font-weight: bold;">${d.z}</div>
                  <div>Value: ${valueDisplay}</div>
                  <div>Margin of Error: ${meDisplay}</div>
                  ${
                    formattedTotpop
                      ? `
                    <div style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 8px;">
                      <div>Total Population: ${formattedTotpop}</div>
                      <div>Total Margin of Error: ${formattedTotpopME === null ? "Not Available" : "±" + formattedTotpopME}</div>
                    </div>
                  `
                      : ""
                  }
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
      });
    });

    // Add axes
    const xAxis = d3.axisBottom(xScale).tickFormat(props.xAxis.format);
    const yAxis = d3.axisLeft(yScale).tickFormat(props.yAxis.format || ((d) => (d <= 1 ? d3.format(".0%")(d) : d)));

    const xAxisG = g.append("g").attr("class", "axis axis-x").attr("transform", `translate(0,${height})`).call(xAxis.tickSize(0));

    // Apply text rotation if needed
    if (xValues.length > 4) {
      xAxisG.selectAll("text").attr("transform", "translate(7, 0) rotate(45)").style("text-anchor", "start");
    }

    const yAxisG = g.append("g").attr("class", "axis axis-y").call(yAxis.tickSize(0));

    // Add axis labels
    const svg = d3.select(chartRef.current).select("svg");

    svg
      .append("text")
      .attr("class", "axis-label y-axis-label")
      .attr("x", height / -2)
      .attr("y", 0)
      .attr("transform", "rotate(-90)")
      .attr("dy", "1em")
      .attr("font-size", "12px")
      .style("text-anchor", "middle")
      .text(props.yAxis.label);

    svg
      .append("text")
      .attr("class", "axis-label x-axis-label")
      .attr("x", width / 2 + margin.left)
      .attr("y", height + margin.top + 45)
      .attr("font-size", "12px")
      .style("text-anchor", "middle")
      .text(xAxisLabel);

    // Add legend
    const legend = d3.select(legendContainerRef.current);
    legend.selectAll("*").remove();
    drawLegend(legend, colorRef.current, zValues);
  };

  const renderBlankChart = () => {
    const chart = chartGroupRef.current;
    const width = container.width - defaultMargin.left - defaultMargin.right;
    const height = container.height - defaultMargin.top - defaultMargin.bottom;

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

    const hasDataToRender = props.data && Array.isArray(props.data) && props.data.length > 0;

    if (hasDataToRender) {
      renderChart();
    } else {
      renderBlankChart();
    }
  }, [props.data, props.hasData]);

  return (
    <div className="component chart GroupedBarChart">
      <div className="svg-wrapper">
        <div ref={chartRef} className="chart-container" />
      </div>
      <div ref={legendContainerRef} className="legend" />
    </div>
  );
};

GroupedBarChart.propTypes = {
  xAxis: PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
    format: PropTypes.func,
    sort: PropTypes.func,
  }).isRequired,
  yAxis: PropTypes.shape({
    label: PropTypes.string.isRequired,
    format: PropTypes.func,
  }).isRequired,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.string.isRequired,
      y: PropTypes.number.isRequired,
      z: PropTypes.string.isRequired,
      color: PropTypes.string,
      order: PropTypes.number,
      me: PropTypes.number,
    }),
  ).isRequired,
  hasData: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
  chart: PropTypes.object,
};

export default GroupedBarChart;

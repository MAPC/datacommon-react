import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";

import colors from "../../constants/colors";
import { chartSourceIsAcs } from "../../constants/charts";
import { drawLegend, maxTextToMargin, MIN_BAR_POINTER_TARGET, sortKeys, splitPhrase } from "../../utils/charts";
import { isArray } from "vega";

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

const StackedBarChart = (props) => {
  const chartRef = useRef(null);
  const legendContainerRef = useRef(null);
  const svgRef = useRef(null);
  const chartGroupRef = useRef(null);
  const tooltipRef = useRef(null);
  const stackRef = useRef(d3.stack());
  const colorRef = useRef(null);
  const [xAxisLabel, setXAxisLabel] = useState(typeof props.xAxis.label === "string" ? props.xAxis.label : "");

  const showPercentTooltip = ({
    event,
    tooltip,
    seriesLabel,
    valueLabel,
    valueDisplay,
    meLabel,
    meDisplay,
    pctLabel,
    pctMeLabel,
    pctRaw,
    pctMeRaw,
    extraHtml = "",
    isAcs,
  }) => {
    const pct = pctRaw == null || pctRaw === "" ? NaN : Number(pctRaw);
    const pctMe = pctMeRaw == null || pctMeRaw === "" ? NaN : Number(pctMeRaw);

    const pctLine = Number.isFinite(pct)
      ? `<div>${pctLabel}: ${pct.toFixed(1)}%</div>`
      : isAcs
        ? `<div>${pctLabel}: Not Available</div>`
        : "";
    const pctMeLine = Number.isFinite(pctMe)
      ? `<div>${pctMeLabel}: ±${pctMe.toFixed(1)}%</div>`
      : isAcs
        ? `<div>${pctMeLabel}: Not Available</div>`
        : "";
    const primaryMeLine = meDisplay != null ? `<div>${meLabel}: ${meDisplay}</div>` : "";

    tooltip
      .style("opacity", 1)
      .html(
        `
        <div style="padding: 4px;">
          <div style="font-weight: bold;">${seriesLabel}</div>
          <div>${valueLabel}: ${valueDisplay}</div>
          ${primaryMeLine}
          ${pctLine}
          ${pctMeLine}
          ${extraHtml}
        </div>
      `,
      )
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY - 10}px`);
  };

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
    const stack = stackRef.current;

    // Guard: ensure we have data
    if (!props.data || !Array.isArray(props.data) || props.data.length === 0) {
      renderBlankChart();
      return;
    }

    // Measure data and calculate size and margins
    const maxLeftLabel = props.horizontal
      ? props.data.reduce((acc, d) => Math.max(acc, props.xAxis.format ? props.xAxis.format(d.x).length : String(d.x).length), 0)
      : props.data.reduce((acc, d) => Math.max(acc, props.yAxis.format ? props.yAxis.format(d.y).length : String(d.y).length), 0);

    const clippedMaxLeftLabel = props.horizontal && maxLeftLabel > LEFT_LABEL_MAX ? LEFT_LABEL_MAX : maxLeftLabel;
    const bonusLeftMargin = maxTextToMargin(clippedMaxLeftLabel, 12);

    const margin = Object.assign({}, defaultMargin, {
      left: defaultMargin.left + bonusLeftMargin,
    });
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    // Process data
    const keys = sortKeys(props.data);
    const colors = props.data.reduce((obj, d) => (d.color ? Object.assign(obj, { [d.z]: d.color }) : obj), {});

    colorRef.current = d3
      .scaleOrdinal()
      .range(Object.keys(colors).length ? keys.map((key) => colors[key]) : keys.length > primaryColors.length ? extendedColors : primaryColors)
      .domain(keys);

    stack.keys(keys);

    // Group data by x value
    const groupedData = props.data.reduce((acc, row) => {
      if (!acc[row.x]) {
        acc[row.x] = {
          totpop: row.totpop,
          totpop_me: row.totpop_me,
        };
      }
      acc[row.x][row.z] = row.y;
      // Store margin of error if it exists
      if (row.me !== undefined) {
        acc[row.x][`${row.z}_me`] = row.me;
      }
      // Store percentage and its margin of error if present (for charts that provide them)
      if (row.pct !== undefined) {
        acc[row.x][`${row.z}_pct`] = row.pct;
      }
      if (row.pct_me !== undefined) {
        acc[row.x][`${row.z}_pct_me`] = row.pct_me;
      }
      // Store count and its margin of error per series when provided (e.g. Lack of Access to Internet by Income Level)
      if (row.count !== undefined) {
        acc[row.x][`${row.z}_count`] = row.count;
      }
      if (row.countMarginOfError !== undefined) {
        acc[row.x][`${row.z}_count_me`] = row.countMarginOfError;
      }
      return acc;
    }, {});

    // Convert to array format needed for d3
    const data = Object.entries(groupedData).map(([x, values]) => ({
      x,
      ...values,
    }));

    // Create scales
    const xScale = props.horizontal
      ? d3
          .scaleLinear()
          .domain([0, d3.max([1, d3.max(stack(data).flat(1), (d) => d[1])])])
          .range([0, width])
      : d3
          .scaleBand()
          .domain(
            data
              .map((d) => d.x)
              .sort((a, b) => {
                // If both values can be parsed as numbers (e.g. years), sort numerically
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                  return numA - numB;
                }
                // Otherwise use the provided sort function or default string comparison
                return props.xAxis.sort ? props.xAxis.sort(a, b) : a > b ? 1 : -1;
              }),
          )
          .range([0, width])
          .paddingInner(0.2);

    const yScale = props.horizontal
      ? d3
          .scaleBand()
          .domain(data.map((d) => d.x))
          .range([0, height])
          .padding(0.5)
      : d3
          .scaleLinear()
          .domain([0, d3.max([1, d3.max(stack(data).flat(1), (d) => d[1])])])
          .range([height, 0]);

    // Calculate optimal bar width and alignment
    const [rangeMin, rangeMax] = [0, width];
    const columnWidth = data.length < 3 ? (rangeMax - rangeMin) / 3 : props.horizontal ? xScale(1) : xScale.bandwidth();

    const realignment = data.length < 3 ? (props.horizontal ? 0 : (xScale.bandwidth() - (rangeMax - rangeMin) / 3) / 2) : 0;

    // Clear existing content
    chart.selectAll("*").remove();
    svgRef.current.selectAll(".axis-label").remove();

    // Create chart group
    const g = chart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const stackedBarPointer = (event, d) => {
        const value = d.data[d.series];
        const me = d.data[`${d.series}_me`];
        const totpop = d.data.totpop;
        const totpop_me = d.data.totpop_me;
        const isAcs = chartSourceIsAcs(props.chart);

        const isPercentChart = props.chart?.title === "Lack of Access to Internet by Income Level";
        
        // For Lack of Access to Internet by Income Level, values are already percentages (0-100 range), so format directly
        const formattedValue = typeof value === "number" ? 
          (isPercentChart 
            ? value.toFixed(1) + "%"  // Already a percentage, format with 1 decimal
            : value < 1 ? (value * 100).toFixed(1) + "%" 
              : value % 1 === 0 ? d3.format(",")(value) : d3.format(",.2f")(value)) 
          : value;
        
        const formattedME = typeof me === "number" ? 
          (isPercentChart 
            ? me.toFixed(1)  // Already a percentage, format with 1 decimal
            : me % 1 === 0 ? d3.format(",")(me) : d3.format(",.2f")(me)) 
          : null;
        const formattedTotpop = typeof totpop === "number" ? d3.format(",")(totpop) : null;
        const formattedTotpopME = typeof totpop_me === "number" ? d3.format(",")(totpop_me) : null;
        
        const valueDisplay = formattedValue;
        const meDisplay =
          formattedME === null
            ? isAcs
              ? "Not Available"
              : null
            : isPercentChart
              ? `±${formattedME}%`
              : `±${formattedME}`;

        const tooltipType = props.chart?.tooltip?.type;
        const showTotalsInTooltip = !!props.chart?.tooltip?.showTotals;
        const resolvedTooltipType =
          tooltipType ||
          (props.chart.title === "Educational Attainment by Race" || props.chart.title === "Race and Ethnicity"
            ? "countAndPercent"
            : props.chart.title === "Employment of Residents"
              ? "countAndPercent"
              : props.chart.title === "Housing Cost Burden" || props.chart.title === "Lack of Access to Internet by Income Level"
                ? "percentAndCount"
                : "default");

        if (resolvedTooltipType === "countAndPercent") {
          const totalPopulationLabel = isAcs ? "Total Population (estimate)" : "Total Population";
          const totalMeHtml =
            formattedTotpopME != null
              ? `<div>Margin of Error: ±${formattedTotpopME}</div>`
              : isAcs
                ? `<div>Margin of Error: Not Available</div>`
                : "";
          const extraHtml =
            (showTotalsInTooltip || props.chart.title === "Employment of Residents") && formattedTotpop
              ? `
                <div style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 8px;">
                  <div>${totalPopulationLabel}: ${formattedTotpop}</div>
                  ${totalMeHtml}
                </div>
              `
              : "";

          // Match Race and Ethnicity tooltip style: count + MOE and percent + percent MOE
          showPercentTooltip({
            event,
            tooltip,
            seriesLabel: d.series,
            valueLabel: isAcs ? "Estimate" : "Count",
            valueDisplay,
            meLabel: isAcs ? "Margin of Error (Estimate)" : "Margin of Error (Count)",
            meDisplay,
            pctLabel: "Percent (%)",
            pctMeLabel: "Margin of Error (Percent)",
            pctRaw: d.data[`${d.series}_pct`] ?? d.data.pct,
            pctMeRaw: d.data[`${d.series}_pct_me`] ?? d.data.pct_me,
            extraHtml,
            isAcs,
          });
        } else if (resolvedTooltipType === "percentAndCount") {
          // Percent + percent MOE primary value and count + count MOE secondary metrics.
          const pct = typeof value === "number" ? value : parseFloat(value);
          const pctMe = typeof me === "number" ? me : NaN;
          const pctDisplay = !isNaN(pct) ? `${pct.toFixed(1)}%` : isAcs ? "Not Available" : null;
          const pctMeLine = !isNaN(pctMe)
            ? `<div>Margin of Error (Percent): ±${pctMe.toFixed(1)}%</div>`
            : isAcs
              ? `<div>Margin of Error (Percent): Not Available</div>`
              : "";

          const seriesCount = d.data[`${d.series}_count`];
          const seriesCountMe = d.data[`${d.series}_count_me`];
          const formattedCount = typeof seriesCount === "number" ? d3.format(",")(seriesCount) : null;
          const formattedCountME =
            typeof seriesCountMe === "number"
              ? seriesCountMe % 1 === 0
                ? d3.format(",")(seriesCountMe)
                : d3.format(",.1f")(seriesCountMe)
              : null;
          const countLabel = isAcs ? "Estimate" : "Count";
          const countMeLabel = isAcs ? "Margin of Error (Estimate)" : "Margin of Error (Count)";
          const countMeLine =
            formattedCountME !== null
              ? `<div>${countMeLabel}: ±${formattedCountME}</div>`
              : isAcs
                ? `<div>${countMeLabel}: Not Available</div>`
                : "";

          tooltip
            .style("opacity", 1)
            .html(
              `
            <div style="padding: 4px;">
              <div style="font-weight: bold;">${d.series}</div>
              ${pctDisplay != null ? `<div>Percent (%): ${pctDisplay}</div>` : ""}
              ${pctMeLine}
              ${
                formattedCount !== null
                  ? `<div style="margin-top: 4px;"><div>${countLabel}: ${formattedCount}</div>
                     ${countMeLine}</div>`
                  : ""
              }
            </div>
          `,
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
        } else {
          const count = d.data.count;
          const countMe = d.data.countMarginOfError;
          const formattedCount = typeof count === "number" ? d3.format(",")(count) : null;
          const formattedCountME =
            typeof countMe === "number"
              ? countMe % 1 === 0
                ? d3.format(",")(countMe)
                : d3.format(",.1f")(countMe)
              : null;
          const valueIsPercent = typeof valueDisplay === "string" && valueDisplay.includes("%");
          const countOrEstimate = isAcs ? "Estimate" : "Count";
          const valueLabel = valueIsPercent ? "Percent (%)" : countOrEstimate;
          const meLabel = valueIsPercent
            ? "Margin of Error (Percent)"
            : isAcs
              ? "Margin of Error (Estimate)"
              : "Margin of Error (Count)";
          const primaryMeLine = meDisplay != null ? `<div>${meLabel}: ${meDisplay}</div>` : "";
          const countMeLabel = isAcs ? "Margin of Error (Estimate)" : "Margin of Error (Count)";
          const countMeLine =
            formattedCountME !== null
              ? `<div>${countMeLabel}: ±${formattedCountME}</div>`
              : isAcs
                ? `<div>${countMeLabel}: Not Available</div>`
                : "";
          const totalPopulationLabel = isAcs ? "Total Population (estimate)" : "Total Population";
          const totalMeLine =
            formattedTotpopME != null
              ? `<div>Total Margin of Error: ±${formattedTotpopME}</div>`
              : isAcs
                ? `<div>Total Margin of Error: Not Available</div>`
                : "";

          tooltip
            .style("opacity", 1)
            .html(
              `
            <div style="padding: 4px;">
              <div style="font-weight: bold;">${d.series}</div>
              <div>${valueLabel}: ${valueDisplay}</div>
              ${primaryMeLine}
              ${
                formattedCount !== null
                  ? `<div style="margin-top: 4px;"><div>${countOrEstimate}: ${formattedCount}</div>
                     ${countMeLine}</div>`
                  : ""
              }
              ${
                formattedTotpop
                  ? `
                <div style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 8px;">
                  <div>${totalPopulationLabel}: ${formattedTotpop}</div>
                  ${totalMeLine}
                </div>
              `
                  : ""
              }
            </div>
          `,
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
        }
    };

    const stackedBarMove = (event) => {
      tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 10}px`);
    };

    const stackedBarLeave = () => {
      tooltip.style("opacity", 0);
    };

    // Add bars (visible + transparent hit target so tiny segments stay easy to hover)
    const layers = g
      .selectAll("g.layer")
      .data(stack(data))
      .join("g")
      .attr("class", "layer")
      .attr("fill", (d) => colorRef.current(d.key));

    layers.each(function (layerRows) {
      const layerG = d3.select(this);
      const cells = layerRows.map((item) => ({ ...item, series: layerRows.key }));

      layerG
        .selectAll("rect.bar-visible")
        .data(cells)
        .join("rect")
        .attr("class", "bar-visible")
        .attr("pointer-events", "none")
        .attr("x", (d) => {
          if (props.horizontal) {
            return xScale(d[0]);
          }
          return xScale(d.data.x) + realignment;
        })
        .attr("y", (d) => (props.horizontal ? yScale(d.data.x) : isNaN(yScale(d[1])) ? yScale(0) : yScale(d[1])))
        .attr("height", (d) =>
          props.horizontal ? yScale.bandwidth() : isNaN(yScale(d[0]) - yScale(d[1])) ? 0 : Math.max(0, yScale(d[0]) - yScale(d[1])),
        )
        .attr("width", (d) => {
          if (props.horizontal) {
            return Math.max(0, xScale(d[1]) - xScale(d[0]));
          }
          return columnWidth;
        });

      layerG
        .selectAll("rect.bar-hit")
        .data(cells)
        .join("rect")
        .attr("class", "bar-hit")
        .attr("fill", "transparent")
        .attr("pointer-events", "all")
        .style("cursor", "default")
        .attr("x", (d) => {
          if (props.horizontal) {
            const xL = xScale(d[0]);
            const xR = xScale(d[1]);
            const visualW = Math.max(0, xR - xL);
            const hitW = Math.max(visualW, MIN_BAR_POINTER_TARGET);
            return xR - hitW;
          }
          return xScale(d.data.x) + realignment;
        })
        .attr("y", (d) => {
          if (props.horizontal) {
            const band = yScale.bandwidth();
            const hitBand = Math.max(band, MIN_BAR_POINTER_TARGET);
            const y0 = yScale(d.data.x);
            return y0 + (band - hitBand) / 2;
          }
          const yTop = isNaN(yScale(d[1])) ? yScale(0) : yScale(d[1]);
          const yBottom = isNaN(yScale(d[0])) ? yScale(0) : yScale(d[0]);
          const visualH = Math.max(0, yBottom - yTop);
          const hitH = Math.max(visualH, MIN_BAR_POINTER_TARGET);
          return yBottom - hitH;
        })
        .attr("height", (d) => {
          if (props.horizontal) {
            return Math.max(yScale.bandwidth(), MIN_BAR_POINTER_TARGET);
          }
          const yTop = isNaN(yScale(d[1])) ? yScale(0) : yScale(d[1]);
          const yBottom = isNaN(yScale(d[0])) ? yScale(0) : yScale(d[0]);
          const visualH = Math.max(0, yBottom - yTop);
          return Math.max(visualH, MIN_BAR_POINTER_TARGET);
        })
        .attr("width", (d) => {
          if (props.horizontal) {
            const xL = xScale(d[0]);
            const xR = xScale(d[1]);
            const visualW = Math.max(0, xR - xL);
            return Math.max(visualW, MIN_BAR_POINTER_TARGET);
          }
          return columnWidth;
        })
        .on("mouseover", stackedBarPointer)
        .on("mousemove", stackedBarMove)
        .on("mouseout", stackedBarLeave);
    });

    // Add axes with proper formatting
    const xAxis = props.horizontal
      ? d3.axisBottom(xScale).tickFormat(props.xAxis.format || ((d) => (d <= 1 ? d3.format(".0%")(d) : d)))
      : d3.axisBottom(xScale).tickFormat(props.xAxis.format);

    const yAxis = props.horizontal ? d3.axisLeft(yScale) : d3.axisLeft(yScale).tickFormat(props.yAxis.format || ((d) => (d <= 1 ? d3.format(".0%")(d) : d)));

    // Add axes
    const xAxisG = g.append("g").attr("class", "axis axis-x").attr("transform", `translate(0,${height})`).call(xAxis.tickSize(0));

    // Apply text rotation based on data characteristics
    if (props.horizontal || data.length > 4) {
      xAxisG.selectAll("text").attr("transform", "translate(7, 0) rotate(45)").style("text-anchor", "start");
    }

    const yAxisG = g.append("g").attr("class", "axis axis-y").call(yAxis.tickSize(0));
    if (props.wrapLeftLabel && props.horizontal && clippedMaxLeftLabel == LEFT_LABEL_MAX) {
      yAxisG.selectAll("text").each(function (x) {
        const text = d3.select(this);
        const rows = splitPhrase(text.text(), LEFT_LABEL_MAX);
        text.text(null);
        rows.forEach((row, i) => {
          const tspan = text.append("tspan");
          tspan
            .text(row)
            .attr("x", -10)
            .attr("y", (i - rows.length / 2) * 15)
            .attr("dy", "1em");
        });
      });
    }

    // Add axis labels with adjusted positioning
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
      .text(props.horizontal ? xAxisLabel : props.yAxis.label);

    svg
      .append("text")
      .attr("class", "axis-label x-axis-label")
      .attr("x", width / 2 + margin.left)
      .attr("y", height + margin.top + 45)
      .attr("font-size", "12px")
      .style("text-anchor", "middle")
      .text(props.horizontal ? props.yAxis.label : xAxisLabel);

    // Add a no data message if there's no data
    if (isArray(props.data) && props.data.length > 0 && props.data.every(d => !d.y)) {
      const noDataMessage = props.chart?.noDataMessage || "No data was found for this timeframe.";
      const valueText = chart
        .append("text")
        .attr("x", 280)
        .attr("y", 250)
        .attr("text-anchor", "middle")
        .attr("class", "gauge-text")
        .attr("font-size", "18")
        .attr("font-weight", "400")
        .attr("fill", "black")
        .text(noDataMessage);
    }

    // Add legend
    const legend = d3.select(legendContainerRef.current);
    legend.selectAll("*").remove();
    drawLegend(legend, colorRef.current, keys);
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
  }, [props.data, props.hasData, props.horizontal]);

  return (
    <div className="component chart StackedBarChart">
      <div className="svg-wrapper">
        <div ref={chartRef} className="chart-container" />
      </div>
      <div ref={legendContainerRef} className="legend" />
    </div>
  );
};

StackedBarChart.propTypes = {
  xAxis: PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
    format: PropTypes.func,
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
    }),
  ).isRequired,
  horizontal: PropTypes.bool,
  hasData: PropTypes.bool,
  wrapLeftLabel: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
  isSubregion: PropTypes.bool,
  isRPAregion: PropTypes.bool,
};

export default StackedBarChart;

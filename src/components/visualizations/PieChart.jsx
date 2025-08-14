import React from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";

import colors from "../../constants/colors";
import { maxTextToMargin, drawLegend } from "../../utils/charts";

const primaryColors = Array.from(colors.CHART.PRIMARY.values());
const extendedColors = Array.from(colors.CHART.EXTENDED.values());

const container = {
  width: 500,
  height: 500,
};

const defaultMargin = {
  top: 80,
  left: 10,
  right: 10,
  bottom: 80,
};

class PieChart extends React.Component {
  constructor(props) {
    super(props);
    this.chartRef = React.createRef();
    this.legendRef = React.createRef();

    this.renderChart = this.renderChart.bind(this);
    this.renderBlankChart = this.renderBlankChart.bind(this);

    this.pie = d3
      .pie()
      .sort((a, b) => d3.ascending(a.value, b.value))
      .value((d) => d.value);
  }

  componentDidMount() {
    const { width, height } = container;

    // Create chart
    this.chart = d3
      .select(this.chartRef.current)
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width)
      .attr("height", height);

    // Create tooltip
    this.tooltip = d3
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

    this.legend = d3.select(this.legendRef.current);
    this.renderChart();
  }

  componentDidUpdate(prevProps) {
    if (JSON.stringify(prevProps.data) !== JSON.stringify(this.props.data)) {
      this.renderChart();
    }
  }

  componentWillUnmount() {
    if (this.tooltip) {
      this.tooltip.remove();
    }
    if (this.chart) {
      this.chart.selectAll("*").remove();
    }
  }

  renderChart() {
    const keys = [...new Set(this.props.data.map((slice) => slice.label))];
    const keyValue = this.props.data.reduce((map, d) => Object.assign(map, { [d.label]: d.value }), {});
    const sum = this.props.data.reduce((acc, slice) => slice.value + acc, 0);
    const formatter = (key) => `${key} ${((keyValue[key] * 100) / sum).toFixed(1)}%`;

    const bonusSideMargin = maxTextToMargin(
      keys.reduce((acc, k) => Math.max(acc, k.length), 0),
      12,
    );
    const margin = {
      ...defaultMargin,
      left: defaultMargin.left + bonusSideMargin,
      right: defaultMargin.right + bonusSideMargin,
    };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    this.chart.attr("viewBox", `0 0 ${container.width} ${height}`);

    const radius = Math.min(height, width) / 1.5;

    const arc = d3
      .arc()
      .outerRadius(radius * 0.9)
      .innerRadius(0);

    this.color = d3
      .scaleOrdinal()
      .domain(keys)
      .range(this.props.colors || (keys.length > primaryColors.length ? extendedColors : primaryColors));

    this.chart.selectAll("*").remove();

    const gChart = this.chart.append("g").attr("transform", `translate(${width / 2 + margin.left},${height / 2})`);

    const pieData = this.pie(this.props.data.sort((a, b) => a.value - b.value));

    // Create pie slices
    const arcs = gChart.selectAll(".arc").data(pieData).join("g").attr("class", "arc");

    // Add paths
    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => this.color(d.data.label))
      .attr("stroke", "white")
      .attr("stroke-width", "1")
      .on("mouseover", (event, d) => {
        const percentage = ((d.data.value * 100) / sum).toFixed(1);
        this.tooltip
          .html(
            `
            <div>
              ${d.data.label}: ${percentage}%
            </div>
            `,
          )
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mousemove", (event) => {
        this.tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", () => {
        this.tooltip.style("opacity", 0);
      });

    // Update legend
    this.legend.selectAll("*").remove();
    drawLegend(this.legend, this.color, keys, formatter);
  }

  renderBlankChart() {
    const bonusSideMargin = maxTextToMargin(
      this.props.data.reduce((acc, d) => Math.max(acc, d.label.length), 0),
      12,
    );
    const margin = {
      ...defaultMargin,
      left: defaultMargin.left + bonusSideMargin,
      right: defaultMargin.right + bonusSideMargin,
    };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    this.chart.selectAll("*").remove();
    this.chart
      .append("text")
      .attr("class", "missing-data")
      .attr("x", width / 2)
      .attr("y", height / 2 - 12)
      .attr("dy", "12")
      .style("text-anchor", "middle")
      .text("Data not available.");
  }

  render() {
    return (
      <div className="component chart PieChart">
        <div className="svg-wrapper">
          <svg ref={this.chartRef} />
          <div ref={this.legendRef} className="legend" />
        </div>
      </div>
    );
  }
}

PieChart.propTypes = {
  colors: PropTypes.arrayOf(PropTypes.string),
  data: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

export default PieChart;

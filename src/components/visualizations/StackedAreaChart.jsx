import React from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";

import colors from "../../constants/colors";
import { maxToMargin, drawLegend } from "../../utils/charts";

const primaryColors = Array.from(colors.CHART.PRIMARY.values());
const extendedColors = Array.from(colors.CHART.EXTENDED.values());

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

class StackedAreaChart extends React.Component {
  constructor(props) {
    super(props);
    this.chartRef = React.createRef();
    this.legendRef = React.createRef();

    this.renderChart = this.renderChart.bind(this);
    this.renderBlankChart = this.renderBlankChart.bind(this);
    this.stack = d3.stack();
  }

  componentDidMount() {
    // Create chart with proper sizing
    this.chart = d3
      .select(this.chartRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", `0 0 ${this.props.width || container.width} ${
        this.props.height || container.height
      }`);

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
    
    if (this.props.hasData) {
      this.renderChart();
    } else {
      this.renderBlankChart();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.hasData !== prevProps.hasData || 
        JSON.stringify(prevProps.data) !== JSON.stringify(this.props.data)) {
      if (this.props.hasData) {
        this.renderChart();
      } else {
        this.renderBlankChart();
      }
    }
  }

  componentWillUnmount() {
    if (this.tooltip) {
      this.tooltip.remove();
    }
    if (this.chart) {
      this.chart.remove();
    }
  }

  renderChart() {
    const bonusLeftMargin = maxToMargin(d3.max(this.props.data, (d) => d.y));
    const margin = {
      ...defaultMargin,
      left: defaultMargin.left + bonusLeftMargin,
    };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    // Clear existing content
    this.chart.selectAll("*").remove();

    // Create chart group
    const g = this.chart
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Process data
    const keys = [...new Set(this.props.data.map((d) => d.z))].sort();

    // Set up color scale to match original ordinal colors
    this.color = d3
      .scaleOrdinal()
      .domain(keys)
      .range(
        this.props.colors ||
        (keys.length > primaryColors.length ? extendedColors : primaryColors).slice(0, keys.length)
      );

    // Prepare data for stacking
    let data = this.props.data.reduce((acc, row) => {
      acc[row.x] = { ...(acc[row.x] || {}), ...{ [row.z]: row.y } };
      return acc;
    }, {});

    data = Object.keys(data)
      .sort()
      .map((xVal) => ({ x: +xVal, ...data[xVal] }));

    // Ensure stack order matches color order
    this.stack
      .keys(keys)
      .order(d3.stackOrderNone)  // Maintain original order
      .offset(d3.stackOffsetNone);  // No normalization

    const stackedData = this.stack(data);

    // Create scales
    const x = d3
      .scaleLinear()
      .domain(d3.extent(this.props.data, (d) => d.x))
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(stackedData, (layer) => d3.max(layer, (d) => d[1]))])
      .range([height, 0]);

    // Create area generator
    const area = d3
      .area()
      .x((d) => x(d.data.x))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]));

    // Add areas
    g.selectAll(".area")
      .data(stackedData)
      .join("path")
      .attr("class", "area")
      .attr("fill", (d) => this.color(d.key))
      .attr("d", area)
      .on("mouseover", (event, d) => {
        this.tooltip
          .style("opacity", 1)
          .html(`${d.key}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mousemove", (event) => {
        this.tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", () => {
        this.tooltip.style("opacity", 0);
      });

    // Add axes
    const xAxis = d3
      .axisBottom(x)
      .tickFormat(this.props.xAxis.format || d3.format("d"));

    const yAxis = d3
      .axisLeft(y)
      .tickFormat(this.props.yAxis.format);

    g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    g.append("g")
      .attr("class", "axis axis-y")
      .call(yAxis);

    // Add axis labels
    this.chart
      .append("text")
      .attr("class", "axis-label y-axis-label")
      .attr("x", -height / 2 - margin.top)
      .attr("y", margin.left / 3)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text(this.props.yAxis.label);

    this.chart
      .append("text")
      .attr("class", "axis-label x-axis-label")
      .attr("x", width / 2 + margin.left)
      .attr("y", height + margin.top + margin.bottom - 10)
      .attr("text-anchor", "middle")
      .text(this.props.xAxis.label);

    // Update legend
    this.legend.selectAll("*").remove();
    drawLegend(this.legend, this.color, keys);
  }

  renderBlankChart() {
    const bonusLeftMargin = maxToMargin(d3.max(this.props.data, (d) => d.y));
    const margin = {
      ...defaultMargin,
      left: defaultMargin.left + bonusLeftMargin,
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
      .text("Oops! We can't find this data right now.");
  }

  render() {
    return (
      <div className="component chart StackedAreaChart">
        <div className="svg-wrapper">
          <div ref={this.chartRef} className="chart-container" />
        </div>
        <div ref={this.legendRef} className="legend" />
      </div>
    );
  }
}

StackedAreaChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      z: PropTypes.string.isRequired,
    })
  ).isRequired,
  xAxis: PropTypes.shape({
    label: PropTypes.string.isRequired,
    format: PropTypes.func,
  }).isRequired,
  yAxis: PropTypes.shape({
    label: PropTypes.string.isRequired,
    format: PropTypes.func,
  }).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string),
  hasData: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
};

StackedAreaChart.defaultProps = {
  hasData: true,
  width: container.width,
  height: container.height,
  xAxis: {
    format: (d) => d,
  },
  yAxis: {
    format: (d) => d,
  },
};

export default StackedAreaChart;

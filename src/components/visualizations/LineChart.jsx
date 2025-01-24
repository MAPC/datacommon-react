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
  top: 20,
  left: 40,
  right: 20,
  bottom: 50,
};

class LineChart extends React.Component {
  constructor(props) {
    super(props);
    this.renderChart = this.renderChart.bind(this);
    this.renderBlankChart = this.renderBlankChart.bind(this);
    this.chartRef = React.createRef();
  }

  componentDidMount() {
    // Create the SVG container
    this.svg = d3
      .select(this.chartRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr(
        "viewBox",
        `0 0 ${this.props.width || container.width} ${
          this.props.height || container.height
        }`
      );

    // Create the chart group
    this.chart = this.svg.append("g");

    // Create legend group
    this.legend = this.svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${container.width - 100}, 20)`);

    // Create tooltip
    this.tooltip = d3
      .select(document.body)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "white")
      .style("padding", "5px")
      .style("border", "1px solid #ccc")
      .style("z-index", 1000);

    // Render chart if we have data
    if (this.props.hasData) {
      this.renderChart();
    } else {
      this.renderBlankChart();
    }
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.hasData !== prevProps.hasData ||
      this.props.data !== prevProps.data
    ) {
      if (this.props.hasData) {
        this.renderChart();
      } else {
        this.renderBlankChart();
      }
    }
  }

  componentWillUnmount() {
    // Cleanup
    if (this.tooltip) {
      this.tooltip.remove();
    }
    if (this.svg) {
      this.svg.remove();
    }
  }

  getBounds() {
    const bounds = this.props.data.reduce(
      (lBounds, line) =>
        line.values.reduce(
          (pBounds, point) => ({
            xMin: pBounds.xMin ? Math.min(pBounds.xMin, point[0]) : point[0],
            xMax: pBounds.xMax ? Math.max(pBounds.xMax, point[0]) : point[0],
            yMin: pBounds.yMin ? Math.min(pBounds.yMin, point[1]) : point[1],
            yMax: pBounds.yMax ? Math.max(pBounds.yMax, point[1]) : point[1],
          }),
          lBounds
        ),
      {
        xMin: null,
        xMax: null,
        yMin: null,
        yMax: null,
      }
    );
    return {
      xMin:
        this.props.xAxis.min != null ? this.props.xAxis.min : bounds.xMin,
      xMax:
        this.props.xAxis.max != null ? this.props.xAxis.max : bounds.xMax,
      yMin:
        this.props.yAxis.min != null ? this.props.yAxis.min : bounds.yMin,
      yMax:
        this.props.yAxis.max != null ? this.props.yAxis.max : bounds.yMax,
    };
  }

  renderChart() {
    // Measure and scale
    const { xMin, xMax, yMin, yMax } = this.getBounds();
    const yFormattedMax = this.props.data.reduce(
      (max, line) =>
        Math.max(
          max,
          line.values.reduce(
            (lineMax, point) =>
              Math.max(
                lineMax,
                this.props.yAxis.format
                  ? this.props.yAxis.format(point[1]).length
                  : String(point[1]).length
              ),
            0
          )
        ),
      0
    );
    const bonusLeftMargin = maxTextToMargin(yFormattedMax, 12);
    const margin = {
      ...defaultMargin,
      left: defaultMargin.left + bonusLeftMargin,
    };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    const keys = this.props.data.map((d) => d.label);
    const colors = this.props.data.reduce(
      (acc, d) => (d.color ? acc.concat([d.color]) : acc),
      []
    );

    this.color = d3
      .scaleOrdinal()
      .range(
        colors.length
          ? colors
          : keys.length > primaryColors.length
          ? extendedColors
          : primaryColors
      )
      .domain(keys);

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);

    // Draw chart
    this.chart.selectAll("*").remove(); // Clear chart before drawing lines

    this.gChart = this.chart
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(this.props.xAxis.ticks)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(this.props.xAxis.format);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(this.props.yAxis.ticks)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(this.props.yAxis.format);

    this.gChart
      .append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0, ${height})`)
      .call(xAxis);

    this.gChart.append("g").attr("class", "axis axis-y").call(yAxis);

    // Create line generator
    const lineGenerator = d3
      .line()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    // Draw lines and points
    this.props.data.forEach((line, i) => {
      this.gChart
        .append("path")
        .datum(line.values)
        .attr("class", "line")
        .attr("stroke", this.color(line.label))
        .attr("stroke-width", 1.5)
        .attr("fill", "none")
        .attr("d", lineGenerator);

      this.gChart
        .selectAll(`.dots-for-line-${i}`)
        .data(line.values)
        .join("circle")
        .attr("class", `dot dots-for-line-${i}`)
        .attr("cx", (d) => xScale(d[0]))
        .attr("cy", (d) => yScale(d[1]))
        .attr("fill", this.color(line.label))
        .attr("r", 4)
        .on("mouseover", (event, d) => {
          const [year, value] = d;
          
          this.tooltip
            .html(
              `
              <div>
                ${year}: ${value}
              </div>
              `
            )
            .style("opacity", 1)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
        })
        .on("mouseout", () => {
          this.tooltip.style("opacity", 0);
        });
    });

    // Add axis labels
    this.chart
      .append("text")
      .attr("class", "axis-label")
      .attr("x", height / -2 - margin.top)
      .attr("y", 2)
      .attr("transform", "rotate(-90)")
      .attr("dy", "12")
      .style("text-anchor", "middle")
      .text(this.props.yAxis.label);

    this.chart
      .append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2 + margin.left)
      .attr("y", height + margin.top + margin.bottom - 22)
      .attr("dy", "12")
      .style("text-anchor", "middle")
      .text(this.props.xAxis.label);

    // Update legend
    this.legend.selectAll("*").remove();
    drawLegend(this.legend, this.color, keys);
  }

  renderBlankChart() {
    const yFormattedMax = this.props.data.reduce(
      (max, line) =>
        Math.max(
          max,
          line.values.reduce(
            (lineMax, point) =>
              Math.max(
                lineMax,
                this.props.yAxis.format
                  ? this.props.yAxis.format(point[1]).length
                  : String(point[1]).length
              ),
            0
          )
        ),
      0
    );
    const bonusLeftMargin = maxTextToMargin(yFormattedMax, 12);
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
    return <div ref={this.chartRef} className="chart-container" />;
  }
}

LineChart.propTypes = {
  xAxis: PropTypes.shape({
    label: PropTypes.string.isRequired,
    min: PropTypes.number,
    max: PropTypes.number,
    ticks: PropTypes.number,
    format: PropTypes.func,
  }).isRequired,
  yAxis: PropTypes.shape({
    label: PropTypes.string.isRequired,
    min: PropTypes.number,
    max: PropTypes.number,
    ticks: PropTypes.number,
    format: PropTypes.func,
  }).isRequired,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      color: PropTypes.string,
      values: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    })
  ).isRequired,
  hasData: PropTypes.bool.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
};

export default LineChart;

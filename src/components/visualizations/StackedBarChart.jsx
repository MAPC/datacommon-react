import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';

import colors from '../../constants/colors';
import {
  maxToMargin,
  drawLegend,
  maxTextToMargin,
  sortKeys,
  splitPhrase,
} from '../../utils/charts';

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

  useEffect(() => {
    // Create tooltip
    tooltipRef.current = d3
      .select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', 'white')
      .style('padding', '5px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '3px')
      .style('z-index', 1000);

    // Create SVG
    svgRef.current = d3
      .select(chartRef.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr(
        'viewBox',
        `0 0 ${props.width || container.width} ${props.height || container.height}`
      );

    // Create chart group
    chartGroupRef.current = svgRef.current.append('g');

    return () => {
      if (tooltipRef.current) tooltipRef.current.remove();
      if (svgRef.current) svgRef.current.remove();
    };
  }, []);

  const renderChart = () => {
    const chart = chartGroupRef.current;
    const tooltip = tooltipRef.current;
    const stack = stackRef.current;

    // Measure data and calculate size and margins
    const maxLeftLabel = props.horizontal
      ? props.data.reduce(
          (acc, d) =>
            Math.max(
              acc,
              props.xAxis.format
                ? props.xAxis.format(d.x).length
                : String(d.x).length
            ),
          0
        )
      : props.data.reduce(
          (acc, d) =>
            Math.max(
              acc,
              props.yAxis.format
                ? props.yAxis.format(d.y).length
                : String(d.y).length
            ),
          0
        );

    const clippedMaxLeftLabel =
      props.horizontal && maxLeftLabel > LEFT_LABEL_MAX
        ? LEFT_LABEL_MAX
        : maxLeftLabel;
    const bonusLeftMargin = maxTextToMargin(clippedMaxLeftLabel, 12);

    const margin = Object.assign({}, defaultMargin, {
      left: defaultMargin.left + bonusLeftMargin,
    });
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    // Prepare data and adjust scales
    const keys = sortKeys(props.data);
    const colors = props.data.reduce(
      (obj, d) => (d.color ? Object.assign(obj, { [d.z]: d.color }) : obj),
      {}
    );

    colorRef.current = d3
      .scaleOrdinal(
        Object.keys(colors).length
          ? keys.map((key) => colors[key])
          : keys.length > primaryColors.length
          ? extendedColors
          : primaryColors
      )
      .domain(keys);

    stack.keys(keys);

    const data = props.data.reduce((acc, row) => {
      acc[row.x] = { ...(acc[row.x] || {}), ...{ [row.z]: row.y } };
      return acc;
    }, {});
    const groups = Object.keys(data).sort();

    const stackedData = stack(
      groups.map((yVal) => ({ y: yVal, ...data[yVal] }))
    );

    // Setup scales and axes
    const valScale = d3
      .scaleLinear()
      .range(props.horizontal ? [0, width] : [height, 0])
      .domain(
        d3.extent(
          stackedData.reduce((a, b) => a.concat(b.map((t) => t[1])), [0]),
          (d) => d
        )
      );

    const catScale = d3
      .scaleBand()
      .domain(groups)
      .range(props.horizontal ? [0, height] : [0, width])
      .paddingInner(0.2);

    const valAxis = (
      props.horizontal ? d3.axisBottom(valScale) : d3.axisLeft(valScale)
    )
      .ticks(10)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(props.yAxis.format);

    const catAxis = (
      props.horizontal ? d3.axisLeft(catScale) : d3.axisBottom(catScale)
    )
      .tickSize(0)
      .tickPadding(10)
      .ticks(10)
      .tickFormat(props.xAxis.format);

    const [xAxis, yAxis] = props.horizontal
      ? [valAxis, catAxis]
      : [catAxis, valAxis];

    // Clear previous content
    chart.selectAll('*').remove();
    
    // Remove ALL existing axis labels from the SVG
    d3.select(chartRef.current).selectAll('.axis-label').remove();

    // Position chart
    chart.attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw bars
    const layer = chart
      .selectAll('.layer')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'layer')
      .attr('fill', (d) => colorRef.current(d.key));

    // For charts with less than 3 bars, limit the width
    const [catMin, catMax] = catScale.range();
    const columnWidth =
      catScale.domain().length < 3
        ? (catMax - catMin) / 3 + catMin
        : catScale.bandwidth();
    const realignment =
      catScale.domain().length < 3
        ? (catScale.bandwidth() - (catMax - catMin) / 3) / 2
        : 0;

    const replaceNaN = (x) => (String(x) === 'NaN' ? null : x);

    layer
      .selectAll('rect')
      .data((d) =>
        d.map((item) => ({
          ...item,
          series: d.key,
        }))
      )
      .enter()
      .append('rect')
      .attr(props.horizontal ? 'y' : 'x', (d) =>
        replaceNaN(catScale(d.data.y) + realignment)
      )
      .attr(props.horizontal ? 'x' : 'y', (d) =>
        replaceNaN(props.horizontal ? valScale(d[0]) : valScale(d[1]))
      )
      .attr(props.horizontal ? 'width' : 'height', (d) =>
        replaceNaN(
          props.horizontal
            ? valScale(d[1]) - valScale(d[0])
            : valScale(d[0]) - valScale(d[1])
        )
      )
      .attr(props.horizontal ? 'height' : 'width', columnWidth)
      .on('mouseover', (d) => {
        const series = d.series;
        const value = parseFloat(d.data[series]) < 1
          ? d.data[series].toFixed(3)
          : d.data[series];
        
        tooltip
          .html(`
            <div>
                ${series}: ${value}
            </div>
          `)
          .style('opacity', 1)
          .style('left', d3.event.pageX + 10 + 'px')
          .style('top', d3.event.pageY - 10 + 'px');
      })
      .on('mousemove', () => {
        tooltip
          .style('left', d3.event.pageX + 10 + 'px')
          .style('top', d3.event.pageY - 10 + 'px');
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    // Add axes with labels
    const xAxisG = chart
      .append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);

    if (props.horizontal || groups.length > 4) {
      xAxisG
        .selectAll('text')
        .attr('transform', `translate(7, 0) rotate(45)`)
        .style('text-anchor', 'start');
    }

    const yAxisG = chart
      .append('g')
      .attr('class', 'axis axis-y')
      .call(yAxis);

    if (
      props.wrapLeftLabel &&
      props.horizontal &&
      clippedMaxLeftLabel == LEFT_LABEL_MAX
    ) {
      yAxisG.selectAll('text').each(function(x) {
        const text = d3.select(this);
        const rows = splitPhrase(text.text(), LEFT_LABEL_MAX);
        text.text(null);
        rows.forEach((row, i) => {
          const tspan = text.append('tspan');
          tspan
            .text(row)
            .attr('x', -10)
            .attr('y', (i - rows.length / 2) * 15)
            .attr('dy', '1em');
        });
      });
    }

    // Add ONLY ONE axis label for each axis
    const svg = d3.select(chartRef.current).select('svg');
    
    // Y-axis label
    svg.append('text')
      .attr('class', 'axis-label y-axis-label')
      .attr('x', height / -2)
      .attr('y', margin.left / 3 -15)
      .attr('transform', 'rotate(-90)')
      .attr('dy', '1em')
      .attr('font-size', '12px')
      .style('text-anchor', 'middle')
      .text(
        props.horizontal ? props.xAxis.label : props.yAxis.label
      );

    // X-axis label
    svg.append('text')
      .attr('class', 'axis-label x-axis-label')
      .attr('x', container.width / 2)
      .attr('y', container.height - margin.bottom / 2)
      .attr('dy', '1em')
      .attr('font-size', '12px')
      .style('text-anchor', 'middle')
      .text(
        props.horizontal ? props.yAxis.label : props.xAxis.label
      );

    // Add legend
    const legend = d3.select(legendContainerRef.current);
    legend.selectAll('*').remove();
    drawLegend(legend, colorRef.current, keys);
  };

  const renderBlankChart = () => {
    const chart = chartGroupRef.current;
    const width = container.width - defaultMargin.left - defaultMargin.right;
    const height = container.height - defaultMargin.top - defaultMargin.bottom;

    chart.selectAll('*').remove();
    
    chart
      .append('text')
      .attr('class', 'missing-data')
      .attr('x', width / 2)
      .attr('y', height / 2 - 12)
      .attr('dy', '12')
      .style('text-anchor', 'middle')
      .text("Oops! We can't find this data right now.");
  };

  useEffect(() => {
    if (!svgRef.current) return;

    if (props.hasData) {
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
    label: PropTypes.string.isRequired,
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
    })
  ).isRequired,
  horizontal: PropTypes.bool,
  hasData: PropTypes.bool,
  wrapLeftLabel: PropTypes.bool,
};

export default StackedBarChart;

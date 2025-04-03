import React, { useRef, useEffect, useState } from 'react';
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
  const [xAxisLabel, setXAxisLabel] = useState(
    typeof props.xAxis.label === 'string' ? props.xAxis.label : ''
  );

  useEffect(() => {
    const loadXAxisLabel = async () => {
      if (typeof props.xAxis.label === 'function') {
        try {
          const label = await props.xAxis.label();
          setXAxisLabel(label);
        } catch (error) {
          console.error('Error loading xAxis label:', error);
          setXAxisLabel('');
        }
      } else {
        setXAxisLabel(props.xAxis.label || '');
      }
    };

    loadXAxisLabel();
  }, [props.xAxis.label]);

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

    // Process data
    const keys = sortKeys(props.data);
    const colors = props.data.reduce(
      (obj, d) => (d.color ? Object.assign(obj, { [d.z]: d.color }) : obj),
      {}
    );

    colorRef.current = d3
      .scaleOrdinal()
      .range(
        Object.keys(colors).length
          ? keys.map((key) => colors[key])
          : keys.length > primaryColors.length
          ? extendedColors
          : primaryColors
      )
      .domain(keys);

    stack.keys(keys);

    // Group data by x value
    const groupedData = props.data.reduce((acc, row) => {
      if (!acc[row.x]) {
        acc[row.x] = {};
      }
      acc[row.x][row.z] = row.y;
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
          .domain([0, d3.max([1, d3.max(stack(data).flat(1), d => d[1])])])
          .range([0, width])
      : d3
          .scaleBand()
          .domain(data.map(d => d.x))
          .range([0, width])
          .paddingInner(0.2);

    const yScale = props.horizontal
      ? d3
          .scaleBand()
          .domain(data.map(d => d.x))
          .range([0, height])
          .padding(0.5)
      : d3
          .scaleLinear()
          .domain([0, d3.max([1, d3.max(stack(data).flat(1), d => d[1])])])
          .range([height, 0]);

    // Calculate optimal bar width and alignment
    const [rangeMin, rangeMax] = [0, width];
    const columnWidth = data.length < 3 
      ? ((rangeMax - rangeMin) / 3) 
      : (props.horizontal ? xScale(1) : xScale.bandwidth());
    
    const realignment = data.length < 3
      ? (props.horizontal 
          ? 0 
          : (xScale.bandwidth() - ((rangeMax - rangeMin) / 3)) / 2)
      : 0;

    // Clear existing content
    chart.selectAll('*').remove();
    svgRef.current.selectAll('.axis-label').remove();

    // Create chart group
    const g = chart
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add bars
    const layers = g
      .selectAll('g.layer')
      .data(stack(data))
      .join('g')
      .attr('class', 'layer')
      .attr('fill', d => colorRef.current(d.key));

    layers
      .selectAll('rect')
      .data(d => d.map(item => ({...item, series: d.key})))
      .join('rect')
      .attr('x', d => {
        if (props.horizontal) {
          return xScale(d[0]);
        }
        return xScale(d.data.x) + realignment;
      })
      .attr('y', d => props.horizontal 
        ? yScale(d.data.x) 
        : (isNaN(yScale(d[1])) ? yScale(0) : yScale(d[1])))
      .attr('height', d => props.horizontal
        ? yScale.bandwidth()
        : (isNaN(yScale(d[0]) - yScale(d[1])) 
          ? 0 
          : Math.max(0, yScale(d[0]) - yScale(d[1]))))
      .attr('width', d => {
        if (props.horizontal) {
          return Math.max(0, xScale(d[1]) - xScale(d[0]));
        }
        return columnWidth;
      })
      .on('mouseover', (event, d) => {
        const value = d.data[d.series];
        tooltip
          .style('opacity', 1)
          .html(`${d.series}: ${typeof value === 'number' && value < 1 ? (value * 100).toFixed(1) + '%' : value}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    // Add axes with proper formatting
    const xAxis = props.horizontal
      ? d3.axisBottom(xScale).tickFormat(props.xAxis.format || (d => d < 1 ? d3.format('.0%')(d) : d))
      : d3.axisBottom(xScale).tickFormat(props.xAxis.format);

    const yAxis = props.horizontal
      ? d3.axisLeft(yScale)
      : d3.axisLeft(yScale).tickFormat(props.yAxis.format || (d => d < 1 ? d3.format('.0%')(d) : d));

    // Add axes
    const xAxisG = g
      .append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis.tickSize(0));

    // Apply text rotation based on data characteristics
    if (props.horizontal || data.length > 4) {
      xAxisG
        .selectAll('text')
        .attr('transform', 'translate(7, 0) rotate(45)')
        .style('text-anchor', 'start');
    }

    const yAxisG = g.append('g')
      .attr('class', 'axis axis-y')
      .call(yAxis.tickSize(0));
      if (props.wrapLeftLabel
        && props.horizontal
        && clippedMaxLeftLabel == LEFT_LABEL_MAX) {
          
      yAxisG.selectAll("text")
        .each(function (x) {
          const text = d3.select(this);
          const rows = splitPhrase(text.text(), LEFT_LABEL_MAX);
          text.text(null);
          rows.forEach((row, i) => {
            const tspan = text.append('tspan');
            tspan.text(row).attr("x", -10).attr("y", (i - (rows.length / 2)) * 15).attr("dy", "1em");
          });
        });
    }

    // Add axis labels with adjusted positioning
    const svg = d3.select(chartRef.current).select('svg');
    
    svg.append('text')
      .attr('class', 'axis-label y-axis-label')
      .attr('x', height / -2)
      .attr('y', 0)
      .attr('transform', 'rotate(-90)')
      .attr('dy', '1em')
      .attr('font-size', '12px')
      .style('text-anchor', 'middle')
      .text(props.horizontal ? xAxisLabel : props.yAxis.label);

    svg.append('text')
      .attr('class', 'axis-label x-axis-label')
      .attr('x', width / 2 + margin.left)
      .attr('y', height + margin.top + 45)
      .attr('font-size', '12px')
      .style('text-anchor', 'middle')
      .text(props.horizontal ? props.yAxis.label : xAxisLabel);

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
    label: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.func
    ]).isRequired,
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
  width: PropTypes.number,
  height: PropTypes.number,
  isSubregion: PropTypes.bool,
};

export default StackedBarChart;
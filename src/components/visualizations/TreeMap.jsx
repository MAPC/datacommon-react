import React from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import colors from "../../constants/colors";

const container = {
  width: 760,
  height: 350,
};

const defaultMargin = {
  top: 20,
  right: 20,
  bottom: 4,
  left: 20,
};

/**
 * Utility for chart transformers:
 * - metricDefs: [{ key, label, group }]
 * - row: object with numeric values for each key (e.g. row.tot_rev)
 */
export function buildTreeMapDataFromRow(metricDefs, row) {
  if (!Array.isArray(metricDefs) || !row) return [];
  return metricDefs
    .map((metric) => ({
      key: metric.key,
      label: metric.label || metric.key,
      group: metric.group || "Value",
      value: row[metric.key],
    }))
    .filter((d) => d.value != null);
}

function normalizeTreeData(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((d) => {
      const rawValue = d.value ?? d.y;
      const parsedValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
      return {
        key: d.key || d.id || d.label,
        label: d.label || d.key || d.id || "Unknown",
        group: d.group || "Value",
        value: parsedValue,
      };
    })
    .filter((d) => d.key && Number.isFinite(d.value) && d.value >= 0);
}

function createColorHelpers(data) {
  const parentColor = colors.CHART.PRIMARY.get("DARK_GREEN");
  const childColor = colors.BRAND.SECONDARY;
  const isParentNode = (datum) => /total revenues?/i.test(String(datum?.label || ""));

  const getFillColor = (datum) => {
    return isParentNode(datum) ? parentColor : childColor;
  };

  const getTextColor = () => "#ffffff";

  return { parentColor, childColor, getFillColor, getTextColor };
}

class TreeMap extends React.Component {
  constructor(props) {
    super(props);
    this.chartRef = React.createRef();
  }

  componentDidMount() {
    const { width, height } = container;
    this.chart = d3
      .select(this.chartRef.current)
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width)
      .attr("height", height);

    this.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "chart-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "white")
      .style("padding", "6px 8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "3px")
      .style("z-index", 1000);

    this.renderChart();
  }

  componentDidUpdate(prevProps) {
    if (JSON.stringify(prevProps.data) !== JSON.stringify(this.props.data) || prevProps.hasData !== this.props.hasData) {
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

  renderBlankChart(width, height) {
    this.chart.selectAll("*").remove();
    this.chart
      .append("text")
      .attr("class", "missing-data")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .style("text-anchor", "middle")
      .text("Data not available.");
  }

  renderChart() {
    const margin = defaultMargin;
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;
    const data = normalizeTreeData(this.props.data);

    if (!this.props.hasData || data.length === 0) {
      this.renderBlankChart(container.width, container.height);
      return;
    }

    // Visual-only sizing tweaks for readability balance:
    // compress big-value dominance so smaller categories remain visible in print and screen.
    const layoutData = data.map((d) => ({
      ...d,
      layoutValue: (() => {
        const label = String(d.label || "");
        const compressed = Math.pow(Math.max(d.value, 0), 0.65);
        if (/total revenues?/i.test(label)) {
          // Parent node should remain visually dominant.
          return Math.max(compressed * 1.35, 20);
        }
        // Keep non-parent categories visible even when values are small or zero.
        const boosted = /all other/i.test(label) ? compressed * 1.35 : compressed;
        return Math.max(boosted, 10);
      })(),
    }));

    const root = d3
      .hierarchy({ children: layoutData })
      .sum((d) => d.layoutValue || d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap().size([width, height]).paddingInner(4).paddingOuter(2)(root);

    const { getFillColor, getTextColor } = createColorHelpers(data);

    const formatValue = this.props.valueFormatter || d3.format(",");

    this.chart.selectAll("*").remove();
    const g = this.chart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const leaves = g.selectAll("g.node").data(root.leaves()).join("g").attr("class", "node").attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    leaves
      .append("rect")
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("fill", (d) => getFillColor(d.data))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        this.tooltip
          .html(`<div><strong>${d.data.label}</strong><br/>${formatValue(d.data.value)}</div>`)
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

    leaves
      .filter((d) => d.x1 - d.x0 >= 22 && d.y1 - d.y0 >= 14)
      .append("text")
      .attr("x", 8)
      .attr("y", 14)
      .style("font-size", "10px")
      .style("font-weight", 600)
      .style("fill", (d) => getTextColor(d.data))
      .style("pointer-events", "none")
      .text((d) => {
        const maxChars = Math.max(3, Math.floor((d.x1 - d.x0 - 12) / 6));
        return d.data.label.length > maxChars ? `${d.data.label.slice(0, maxChars - 1)}…` : d.data.label;
      });

    leaves
      .filter((d) => d.x1 - d.x0 >= 70 && d.y1 - d.y0 >= 42)
      .append("text")
      .attr("x", 8)
      .attr("y", 34)
      .style("font-size", "11px")
      .style("fill", (d) => getTextColor(d.data))
      .style("pointer-events", "none")
      .text((d) => formatValue(d.data.value));
  }

  render() {
    const data = normalizeTreeData(this.props.data);
    const { getFillColor } = createColorHelpers(data);
    return (
      <div className="component chart TreeMap">
        <div className="svg-wrapper" style={{ display: "flex", justifyContent: "center", marginBottom: 0 }}>
          <svg ref={this.chartRef} style={{ display: "block", width: "100%", maxWidth: "100%", height: "300px" }} />
        </div>
        {data.length > 0 ? (
          <div style={{ marginTop: "0.05rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {data.map((node) => (
              <div key={node.key || node.label} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#4a4a4a", fontSize: "0.85rem" }}>
                <span
                  aria-hidden
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    display: "inline-block",
                    background: getFillColor(node),
                  }}
                />
                <span>{node.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
}

TreeMap.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.string,
      group: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      y: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
  ).isRequired,
  hasData: PropTypes.bool,
  valueFormatter: PropTypes.func,
};

TreeMap.defaultProps = {
  hasData: true,
  valueFormatter: null,
};

export default TreeMap;

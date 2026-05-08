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

function partitionTreeData(data) {
  if (!Array.isArray(data)) return { tiles: [], summary: null };
  const normalized = data
    .map((d) => {
      const rawValue = d.value ?? d.y;
      const parsedValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
      return {
        key: d.key || d.id || d.label,
        label: d.label || d.key || d.id || "Unknown",
        group: d.group || "Value",
        value: parsedValue,
        summaryOnly: Boolean(d.summaryOnly),
      };
    })
    .filter((d) => {
      if (d.summaryOnly) {
        return Boolean(d.key) && Number.isFinite(d.value);
      }
      return Boolean(d.key) && Number.isFinite(d.value) && d.value >= 0;
    });
  const summary = normalized.find((d) => d.summaryOnly) || null;
  const tiles = normalized.filter((d) => !d.summaryOnly);
  return { tiles, summary };
}

function createColorHelpers(tileData, chart) {
  const primaryColors = Array.from(colors.CHART.PRIMARY.values());
  const fromConfig =
    chart && Array.isArray(chart.colors) && chart.colors.length > 0 ? chart.colors : null;
  const palette = fromConfig
    ? fromConfig
    : primaryColors.length >= 4
      ? primaryColors.slice(-4)
      : primaryColors.length > 0
        ? primaryColors
        : [colors.BRAND.SECONDARY];
  const colorScale = d3
    .scaleOrdinal()
    .domain((tileData || []).map((d) => String(d.key || d.label || "")))
    .range(palette);

  const getFillColor = (datum) => {
    return colorScale(String(datum?.key || datum?.label || ""));
  };

  const getTextColor = () => "#ffffff";

  return { getFillColor, getTextColor };
}

class TreeMap extends React.Component {
  constructor(props) {
    super(props);
    this.chartRef = React.createRef();
  }

  resolveValueFormatter() {
    const { valueFormatter, chart } = this.props;
    if (typeof valueFormatter === "function") return valueFormatter;
    if (chart && typeof chart.valueFormatter === "function") return chart.valueFormatter;
    return d3.format(",");
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
    const { tiles } = partitionTreeData(this.props.data);

    if (!this.props.hasData || tiles.length === 0) {
      this.renderBlankChart(container.width, container.height);
      return;
    }

    // Visual-only sizing tweaks for readability balance:
    // compress big-value dominance so smaller categories remain visible in print and screen.
    const layoutData = tiles.map((d) => ({
      ...d,
      layoutValue: (() => {
        const label = String(d.label || "");
        const compressed = Math.pow(Math.max(d.value, 0), 0.65);
        // Keep categories visible even when values are small or zero.
        const boosted = /all other/i.test(label) ? compressed * 1.35 : compressed;
        return Math.max(boosted, 10);
      })(),
    }));

    const root = d3
      .hierarchy({ children: layoutData })
      .sum((d) => d.layoutValue || d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap().size([width, height]).paddingInner(4).paddingOuter(2)(root);

    const { getFillColor, getTextColor } = createColorHelpers(tiles);

    const formatValue = this.resolveValueFormatter();

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
          .html(
            `<div style="font-size:13px;line-height:1.35"><strong>${d.data.label}</strong><br/>${formatValue(d.data.value)}</div>`,
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

    leaves
      .filter((d) => d.x1 - d.x0 >= 28 && d.y1 - d.y0 >= 18)
      .append("text")
      .attr("x", 8)
      .attr("y", 18)
      .style("font-size", "13px")
      .style("font-weight", 600)
      .style("fill", (d) => getTextColor(d.data))
      .style("pointer-events", "none")
      .text((d) => {
        const maxChars = Math.max(3, Math.floor((d.x1 - d.x0 - 14) / 7));
        return d.data.label.length > maxChars ? `${d.data.label.slice(0, maxChars - 1)}…` : d.data.label;
      });

    leaves
      .filter((d) => d.x1 - d.x0 >= 88 && d.y1 - d.y0 >= 50)
      .append("text")
      .attr("x", 8)
      .attr("y", 42)
      .style("font-size", "15px")
      .style("font-weight", 500)
      .style("fill", (d) => getTextColor(d.data))
      .style("pointer-events", "none")
      .text((d) => formatValue(d.data.value));
  }

  render() {
    const { tiles, summary } = partitionTreeData(this.props.data);
    const { getFillColor } = createColorHelpers(tiles, this.props.chart);
    const formatBig = this.resolveValueFormatter();
    return (
      <div className="component chart TreeMap">
        <div
          className="treemap-layout"
          dir="ltr"
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "stretch",
            gap: "1.25rem",
            width: "100%",
            marginBottom: 0,
          }}
        >
          {summary ? (
            <div
              className="treemap-summary"
              style={{
                order: 1,
                flex: "0 0 300px",
                maxWidth: "48%",
                minWidth: "220px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "8px 1rem 8px 0",
                margin: 0,
                borderLeft: "none",
                borderRight: "1px solid rgba(0, 0, 0, 0.12)",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#555",
                  marginBottom: "6px",
                }}
              >
                {summary.label}
              </div>
              <div
                style={{
                  fontSize: "clamp(1.5rem, 3.6vw, 2.25rem)",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color: colors.BRAND.BACKGROUND_DARK,
                  wordBreak: "break-word",
                }}
              >
                {formatBig(summary.value)}
              </div>
            </div>
          ) : null}
          <div
            className="svg-wrapper"
            style={{
              order: 2,
              flex: "1 1 0%",
              minWidth: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "stretch",
            }}
          >
            <svg ref={this.chartRef} style={{ display: "block", width: "100%", maxWidth: "100%", height: "320px" }} />
          </div>
        </div>
        {tiles.length > 0 ? (
          <div style={{ marginTop: "0.05rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {tiles.map((node) => (
              <div
                key={node.key || node.label}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#4a4a4a" }}
              >
                <span
                  aria-hidden
                  style={{
                    width: "12px",
                    height: "12px",
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
  chart: null,
};

export default TreeMap;
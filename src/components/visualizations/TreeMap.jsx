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
      const rawValue = d.value;
      const parsedValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
      return {
        key: d.key,
        label: d.label,
        group: d.group,
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

/** Area ∝ value^exponent; 1 = true proportion, lower = more compression for readability. */
export const TREEMAP_LAYOUT_VALUE_EXPONENT = 0.88;

const TILE_LABEL_FONT = 13;
const TILE_VALUE_FONT = 14;
const TILE_EDGE_PADDING = 16;
const TAX_LEVY_TILE_KEY = "tax_levy";
/** Leave room for side tiles' labels; fund revenue only. */
const DEFAULT_TAX_LEVY_MAX_LAYOUT_SHARE = 0.56;
const TEXT_AWARE_SVG_HEIGHT = 400;

/** Pixel size needed to render full category label + exact value at standard tile fonts. */
export function measureTileTextMinimums(label, value, formatValue) {
  const categoryLabel = String(label || "");
  const valueText = formatTileValueLabel(value, formatValue);
  let valueLines = [valueText];

  const labelWidth = lineWidth(categoryLabel, TILE_LABEL_FONT);
  let valueWidth = lineWidth(valueText, TILE_VALUE_FONT);
  if (valueWidth > 320) {
    valueLines = splitValueIntoLines(valueText);
    valueWidth = Math.max(...valueLines.map((line) => lineWidth(line, TILE_VALUE_FONT)));
  }

  const minWidth = Math.ceil(Math.max(labelWidth, valueWidth, 72));
  const labelBlock = Math.ceil(TILE_LABEL_FONT * 1.15); // 1.15 is the line height factor, so the lable won't be cut off
  const valueBlock = valueLines.length * Math.ceil(TILE_VALUE_FONT * 1.2); // 1.2 is the line height factor 
  const minHeight = Math.ceil(TILE_EDGE_PADDING + labelBlock + 6 + valueBlock + 8);

  return { minWidth, minHeight, minArea: minWidth * minHeight, valueLines };
}

/**
 * Fund revenue: smallest value sets the baseline; others scale by dollar ratio.
 * Tax levy is capped so side tiles stay tall enough for full labels and amounts.
 */
export function computeTextAwareLayoutValues(tiles, formatValue, options = {}) {
  if (!tiles?.length) return [];

  const measured = tiles.map((tile) => ({
    tile,
    text: measureTileTextMinimums(tile.label, tile.value, formatValue),
  }));

  const smallestValueTile = measured.reduce(
    (smallestSoFar, currentTile ) =>
      currentTile.tile.value < smallestSoFar.tile.value ? currentTile : smallestSoFar,
    measured[0],
  );
  const smallestValue = Math.max(smallestValueTile.tile.value, 0);
  const smallestTextArea = smallestValueTile.text.minArea;

  if (smallestValue === 0) {
    return measured.map(({ tile, text }) => ({
      ...tile,
      layoutValue: text.minArea,
      textMinWidth: text.minWidth,
      textMinHeight: text.minHeight,
      valueLines: text.valueLines,
    }));
  }

  const taxLevyMaxShare = options.taxLevyMaxLayoutShare ?? DEFAULT_TAX_LEVY_MAX_LAYOUT_SHARE;

  let layoutData = measured.map(({ tile, text }) => {
    const proportionalWeight = (tile.value / smallestValue) * smallestTextArea;
    const isSmallestValueTile = tile.value === smallestValueTile.tile.value;
    const isTaxLevy = tile.key === TAX_LEVY_TILE_KEY;

    let layoutValue = proportionalWeight;
    if (isSmallestValueTile || !isTaxLevy) {
      layoutValue = Math.max(proportionalWeight, text.minArea);
    }

    return {
      ...tile,
      layoutValue,
      textMinWidth: text.minWidth,
      textMinHeight: text.minHeight,
      valueLines: text.valueLines,
    };
  });

  const taxLevyTile = layoutData.find((tile) => tile.key === TAX_LEVY_TILE_KEY);
  if (taxLevyTile && taxLevyMaxShare < 1) {
    const totalLayoutWeight = layoutData.reduce((sum, tile) => sum + tile.layoutValue, 0);
    const maxTaxLevyWeight = totalLayoutWeight * taxLevyMaxShare;
    if (taxLevyTile.layoutValue > maxTaxLevyWeight) {
      taxLevyTile.layoutValue = maxTaxLevyWeight;
    }
  }

  if (options?.chartWidth > 0 && options?.chartHeight > 0) {
    layoutData = refineLayoutValuesForText(layoutData, options.chartWidth, options.chartHeight);
  }

  return layoutData;
}

/**
 * D3 only guarantees area, not width/height — a tile can be too skinny or too flat for its label.
 * Lay out once, check each box, and nudge up anything that would clip text until everything fits.
 */
export function refineLayoutValuesForText(layoutData, chartWidth, chartHeight) {
  const paddingInner = 4;
  const paddingOuter = 2;
  let next = layoutData.map((tile) => ({ ...tile }));

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const root = d3
      .hierarchy({ children: next })
      .sum((d) => d.layoutValue)
      .sort((a, b) => b.value - a.value);
    d3.treemap().size([chartWidth, chartHeight]).paddingInner(paddingInner).paddingOuter(paddingOuter)(root);

    let changed = false;
    const byKey = new Map(root.leaves().map((leaf) => [leaf.data.key, leaf]));

    next = next.map((tile) => {
      const leaf = byKey.get(tile.key);
      if (!leaf) return tile;

      const width = leaf.x1 - leaf.x0;
      const height = leaf.y1 - leaf.y0;
      if (width >= tile.textMinWidth && height >= tile.textMinHeight) return tile;

      const scaleW = tile.textMinWidth / Math.max(width, 1);
      const scaleH = tile.textMinHeight / Math.max(height, 1);
      const scale = Math.max(scaleW, scaleH, 1.05);
      changed = true;
      return { ...tile, layoutValue: tile.layoutValue * scale * scale };
    });

    if (!changed) break;
  }

  return next;
}

/**
 * Cap the largest tile's layout weight and redistribute so it renders shorter/wider.
 * This is to avoid one huge category (e.g. tax levy) from swallowing the whole chart.
 */
export function capDominantTileLayoutValues(layoutValues, maxShare = 0.52) {
  if (!layoutValues?.length || maxShare >= 1) return layoutValues;

  const sum = layoutValues.reduce((acc, v) => acc + v, 0);
  const maxVal = Math.max(...layoutValues);
  const maxIdx = layoutValues.indexOf(maxVal);
  const cap = sum * maxShare;
  if (maxVal <= cap) return layoutValues;

  const excess = maxVal - cap;
  const othersSum = sum - maxVal;
  const next = [...layoutValues];
  next[maxIdx] = cap;
  if (othersSum > 0) {
    const boost = 1 + excess / othersSum;
    for (let i = 0; i < next.length; i += 1) {
      if (i !== maxIdx) next[i] *= boost;
    }
  }
  return next;
}

/**
 * Turn each category's dollar amount into a layout weight for D3 treemap.
 * Fund revenue uses text-based sizing; other charts use the default path below.
 */
export function computeTreemapLayoutValues(tiles, options = {}) {
  const useTextBasedSizing =
    options.textAware && typeof options.formatValue === "function";

  if (useTextBasedSizing) {
    return computeTextAwareLayoutValues(tiles, options.formatValue, {
      chartWidth: options.chartWidth,
      chartHeight: options.chartHeight,
    });
  }

  // Default treemap sizing 
  // Slightly compress big vs small gaps so tiny categories still get a visible slice.
  const valueCompressionExponent = options.exponent ?? TREEMAP_LAYOUT_VALUE_EXPONENT;
  const smallestShareOfLargest = options.minShareOfMax ?? 0.022; // to avoid tiny categories being too small to see
  const largestCategoryMaxShare = options.maxTileShare ?? 1; // to avoid one huge category (e.g. tax levy) from swallowing the whole chart.

  const layoutWeightByTile = (tiles || []).map((tile) => {
    const dollars = Math.max(tile.value, 0);
    return Math.pow(dollars, valueCompressionExponent);
  });

  const largestLayoutWeight = Math.max(...layoutWeightByTile, 1);
  const minimumLayoutWeight = largestLayoutWeight * smallestShareOfLargest;

  let layoutWeights = layoutWeightByTile.map((weight) => Math.max(weight, minimumLayoutWeight));

  // prevent one large category from taking up too much space 
  layoutWeights = capDominantTileLayoutValues(layoutWeights, largestCategoryMaxShare);

  return (tiles || []).map((tile, index) => ({
    ...tile,
    layoutValue: layoutWeights[index],
  }));
}

function getTileSize(d) {
  return { width: Math.max(0, d.x1 - d.x0), height: Math.max(0, d.y1 - d.y0) };
}

export function formatTileValueLabel(value, formatValue) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return formatValue(n);
}

const TEXT_PADDING = 14;
const CHAR_WIDTH_RATIO = 0.43;

/** Shrink font so full text fits on one line; never truncate or abbreviate. */
export function fitFontSize(text, availableWidth, { base = 15, min = 8 } = {}) {
  const widthAt = (fontSize) => String(text).length * CHAR_WIDTH_RATIO * fontSize + TEXT_PADDING;
  if (availableWidth >= widthAt(base)) return base;
  const scaled = Math.floor(base * (availableWidth / widthAt(base)));
  return Math.max(min, scaled);
}

/** Break a long currency string across lines without dropping digits. */
export function splitValueIntoLines(valueText) {
  const text = String(valueText);
  const lastComma = text.lastIndexOf(",");
  if (lastComma > 0 && text.length - lastComma <= 5) {
    return [text.slice(0, lastComma + 1), text.slice(lastComma + 1)];
  }
  return [text];
}

function lineWidth(text, fontSize) {
  return String(text).length * CHAR_WIDTH_RATIO * fontSize + TEXT_PADDING;
}

function getValueDisplay(valueText, width, height, hasCategoryLabel) {
  const availableHeight = hasCategoryLabel ? height - 36 : height - 16;
  let fontSize = fitFontSize(valueText, width, { base: 15, min: 8 });
  let lines = [valueText];

  if (lineWidth(valueText, fontSize) > width) {
    const split = splitValueIntoLines(valueText);
    if (split.length > 1) {
      lines = split;
      const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b));
      fontSize = fitFontSize(longest, width, { base: 15, min: 8 });
    } else {
      fontSize = fitFontSize(valueText, width, { base: 15, min: 8 });
    }
  }

  const lineHeight = Math.ceil(fontSize * 1.2);
  const blockHeight = lineHeight * lines.length;
  if (blockHeight > availableHeight && availableHeight > 0) {
    fontSize = Math.max(8, Math.floor((fontSize * availableHeight) / blockHeight));
  }

  return { lines, fontSize, lineHeight };
}

/** Label + value layout for every tile; all strings stay complete (no … or compact $). */
export function getTileTextLayout(d, formatValue) {
  const { width, height } = getTileSize(d);
  const categoryLabel = String(d.data.label || "");
  const valueText = formatTileValueLabel(d.data.value, formatValue);
  const labelY = 15;
  const textMinWidth = d.data.textMinWidth;
  const textMinHeight = d.data.textMinHeight;
  const meetsTextMinimum =
    textMinWidth != null && textMinHeight != null && width >= textMinWidth && height >= textMinHeight;

  if (meetsTextMinimum) {
    const valueLines = Array.isArray(d.data.valueLines) ? d.data.valueLines : [valueText];
    const valueLineHeight = Math.ceil(TILE_VALUE_FONT * 1.2);
    return {
      showCategoryLabel: categoryLabel.length > 0,
      categoryLabel,
      categoryFontSize: `${TILE_LABEL_FONT}px`,
      labelY,
      valueLines,
      valueStartY: labelY + Math.ceil(TILE_LABEL_FONT * 1.15) + 4,
      valueFontSize: `${TILE_VALUE_FONT}px`,
      valueLineHeight,
    };
  }

  const showCategoryLabel = height >= 18 && width >= 16 && categoryLabel.length > 0;
  const categoryFontSize = fitFontSize(categoryLabel, width, { base: TILE_LABEL_FONT, min: 9 });
  const valueBlock = getValueDisplay(valueText, width, height, showCategoryLabel);
  const valueStartY = showCategoryLabel
    ? labelY + Math.ceil(categoryFontSize * 1.15) + 4
    : Math.max(14, (height - valueBlock.lineHeight * valueBlock.lines.length) / 2 + valueBlock.fontSize);

  return {
    showCategoryLabel,
    categoryLabel,
    categoryFontSize: `${categoryFontSize}px`,
    labelY,
    valueLines: valueBlock.lines,
    valueStartY,
    valueFontSize: `${valueBlock.fontSize}px`,
    valueLineHeight: valueBlock.lineHeight,
  };
}

function appendTileText(group, layout, fill) {
  if (layout.showCategoryLabel) {
    group
      .append("text")
      .attr("class", "tile-label")
      .attr("x", 8)
      .attr("y", layout.labelY)
      .style("font-size", layout.categoryFontSize)
      .style("font-weight", 600)
      .style("fill", fill)
      .style("pointer-events", "none")
      .text(layout.categoryLabel);
  }

  const valueText = group
    .append("text")
    .attr("class", "tile-value")
    .attr("x", 8)
    .attr("y", layout.valueStartY)
    .style("font-size", layout.valueFontSize)
    .style("font-weight", 500)
    .style("fill", fill)
    .style("pointer-events", "none");

  layout.valueLines.forEach((line, index) => {
    valueText
      .append("tspan")
      .attr("x", 8)
      .attr("dy", index === 0 ? 0 : layout.valueLineHeight)
      .text(line);
  });
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
    const { chart } = this.props;
    const textAware = Boolean(chart?.treemapTextAwareLayout);
    const svgHeight = textAware ? TEXT_AWARE_SVG_HEIGHT : container.height;
    const svgWidth = container.width;
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
    const { tiles } = partitionTreeData(this.props.data);

    this.chart
      .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
      .attr("width", svgWidth)
      .attr("height", svgHeight);

    if (!this.props.hasData || tiles.length === 0) {
      this.renderBlankChart(svgWidth, svgHeight);
      return;
    }

    const formatValue = this.resolveValueFormatter();
    const layoutExponent =
      chart && Number.isFinite(chart.treemapLayoutExponent) ? chart.treemapLayoutExponent : undefined;
    const maxTileShare =
      chart && Number.isFinite(chart.treemapMaxTileShare) ? chart.treemapMaxTileShare : undefined;
    const taxLevyMaxLayoutShare =
      chart && Number.isFinite(chart.treemapTaxLevyMaxLayoutShare)
        ? chart.treemapTaxLevyMaxLayoutShare
        : undefined;
    const layoutData = computeTreemapLayoutValues(tiles, {
      exponent: layoutExponent,
      maxTileShare: textAware ? 1 : maxTileShare,
      textAware,
      formatValue,
      chartWidth: width,
      chartHeight: height,
      taxLevyMaxLayoutShare,
    });

    const root = d3
      .hierarchy({ children: layoutData })
      .sum((d) => d.layoutValue || d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap().size([width, height]).paddingInner(4).paddingOuter(2)(root);

    const { getFillColor, getTextColor } = createColorHelpers(tiles);

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

    leaves.each(function (d) {
      appendTileText(d3.select(this), getTileTextLayout(d, formatValue), getTextColor(d.data));
    });
  }

  render() {
    const { tiles, summary } = partitionTreeData(this.props.data);
    const { getFillColor } = createColorHelpers(tiles, this.props.chart);
    const formatBig = this.resolveValueFormatter();
    const svgDisplayHeight = this.props.chart?.treemapTextAwareLayout
      ? `${TEXT_AWARE_SVG_HEIGHT}px`
      : "320px";
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
            <svg
              ref={this.chartRef}
              style={{ display: "block", width: "100%", maxWidth: "100%", height: svgDisplayHeight }}
            />
          </div>
        </div>
        {tiles.length > 0 ? (
          <div
            className="treemap-legend"
            style={{ marginTop: "0.05rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}
          >
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
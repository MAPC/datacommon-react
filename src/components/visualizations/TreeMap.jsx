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
  if (!Array.isArray(data)) return { tiles: [], zeroTiles: [], summary: null };
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
  const categoryTiles = normalized.filter((d) => !d.summaryOnly);
  // Zero-value categories cannot form a visible proportional tile; show them as a note instead.
  const tiles = categoryTiles.filter((d) => d.value > 0);
  const zeroTiles = categoryTiles.filter((d) => d.value === 0);
  return { tiles, zeroTiles, summary };
}

function createColorHelpers(tileData, chart) {
  const primaryColors = Array.from(colors.CHART.PRIMARY.values());
  const fromConfig =
    chart && Array.isArray(chart.colors) && chart.colors.length > 0 ? chart.colors : null;
  const tileCount = (tileData || []).length;
  let palette = fromConfig
    ? [...fromConfig]
    : primaryColors.length >= 4
      ? primaryColors.slice(-4)
      : primaryColors.length > 0
        ? [...primaryColors]
        : [colors.BRAND.SECONDARY];

  // Prevent ordinal wrap-around reuse when there are more tiles than configured colors.
  if (tileCount > palette.length) {
    const extras = primaryColors.filter((color) => !palette.includes(color));
    palette = [...palette, ...extras].slice(0, Math.max(tileCount, palette.length));
  }

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

const TILE_LABEL_FONT = 11;
const TILE_VALUE_FONT = 11;
const TILE_EDGE_PADDING = 16;
const TEXT_AWARE_SVG_HEIGHT = 400;
/**
 * Max layout ratio between largest and smallest tile in text-aware mode.
 * True dollar ratios above this are compressed so tiny categories stay readable
 * without letting a label-fit pass invert tile sizes.
 */
export const DEFAULT_TREEMAP_MAX_VALUE_RATIO = 12;

/** Pixel size needed to render full category label + exact value at standard tile fonts. */
export function measureTileTextMinimums(label, value, formatValue) {
  // Measure as a single-line label; wrapping is decided at render time only when needed.
  const labelLines = [String(label || "").trim()];
  const valueText = formatTileValueLabel(value, formatValue);
  let valueLines = [valueText];

  const labelWidth = lineWidth(labelLines[0] || "", TILE_LABEL_FONT);
  let valueWidth = lineWidth(valueText, TILE_VALUE_FONT);
  if (valueWidth > 320) {
    valueLines = splitValueIntoLines(valueText);
    valueWidth = Math.max(...valueLines.map((line) => lineWidth(line, TILE_VALUE_FONT)));
  }

  const minWidth = Math.ceil(Math.max(labelWidth, valueWidth, 72));
  const labelBlock = Math.ceil(TILE_LABEL_FONT * 1.15);
  const valueBlock = valueLines.length * Math.ceil(TILE_VALUE_FONT * 1.2);
  const minHeight = Math.ceil(TILE_EDGE_PADDING + labelBlock + 6 + valueBlock + 8);

  return { minWidth, minHeight, minArea: minWidth * minHeight, valueLines, labelLines };
}

/**
 * Fund revenue layout:
 * 1) smallest dollar amount sets a readable text baseline
 * 2) others scale by dollar ratio
 * 3) extreme ratios are compressed to maxValueRatio so order stays correct
 *    and the smallest tile is not crushed to ~0px (which previously triggered
 *    unbounded "fit text" boosts that made tiny values look largest)
 */
export function computeTextAwareLayoutValues(tiles, formatValue, options = {}) {
  if (!tiles?.length) return [];

  const measured = tiles.map((tile) => ({
    tile,
    text: measureTileTextMinimums(tile.label, tile.value, formatValue),
  }));

  const smallestValueTile = measured.reduce(
    (smallestSoFar, currentTile) =>
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
      labelLines: text.labelLines,
    }));
  }

  const maxValueRatio = options.maxValueRatio ?? DEFAULT_TREEMAP_MAX_VALUE_RATIO;
  const largestValue = Math.max(...measured.map(({ tile }) => tile.value));
  const actualMaxRatio = largestValue / smallestValue;
  // When the real gap exceeds maxValueRatio, compress so largest/smallest maps to maxValueRatio
  // while preserving value order. Mild gaps stay true to dollar proportions (exponent = 1).
  const compressionExponent =
    actualMaxRatio > maxValueRatio && actualMaxRatio > 1
      ? Math.log(maxValueRatio) / Math.log(actualMaxRatio)
      : 1;

  return measured.map(({ tile, text }) => {
    const valueRatio = tile.value / smallestValue;
    const scaledRatio = Math.pow(valueRatio, compressionExponent);
    // Do not floor each tile to its own text.minArea — long labels (e.g. Entreprise
    // and CPA) would inflate mid-size categories and can invert order vs neighbors.
    const layoutValue = scaledRatio * smallestTextArea;

    return {
      ...tile,
      layoutValue,
      textMinWidth: text.minWidth,
      textMinHeight: text.minHeight,
      valueLines: text.valueLines,
      labelLines: text.labelLines,
    };
  });
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
      maxValueRatio: options.maxValueRatio,
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

const TEXT_PADDING = 2;
const CHAR_WIDTH_RATIO = 0.56;

/** Shrink font so full text fits on one line; never truncate or abbreviate. */
export function fitFontSize(text, availableWidth, { base = 15, min = 8 } = {}) {
  const widthAt = (fontSize) => String(text).length * CHAR_WIDTH_RATIO * fontSize + TEXT_PADDING;
  let fontSize = base;
  while (fontSize > min && widthAt(fontSize) > availableWidth) {
    fontSize -= 1;
  }
  return fontSize;
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

function splitLabelAtMid(label) {
  const words = String(label || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 1) return [String(label || "").trim()];

  // Choose the break that minimizes the longest line (fits narrow tiles better).
  let best = [words[0], words.slice(1).join(" ")];
  let bestScore = Math.max(best[0].length, best[1].length);
  for (let i = 1; i < words.length; i += 1) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const score = Math.max(left.length, right.length);
    if (score < bestScore) {
      bestScore = score;
      best = [left, right];
    }
  }
  return best;
}

/**
 * Keep labels on one line by default. Wrap only when a single line cannot fit
 * at the minimum readable font size for the available width.
 */
export function splitLabelIntoLines(label, options = {}) {
  const text = String(label || "").trim();
  if (!text) return [""];

  const { availableWidth, minFontSize = 8 } = options;
  if (availableWidth == null) return [text];

  if (lineWidth(text, minFontSize) <= availableWidth) return [text];

  const wrapped = splitLabelAtMid(text);
  return wrapped.length > 1 ? wrapped : [text];
}

function lineWidth(text, fontSize) {
  return String(text).length * CHAR_WIDTH_RATIO * fontSize + TEXT_PADDING;
}

function getValueDisplay(valueText, width, height, labelLineCount, labelLineHeight) {
  const resolvedLabelLineHeight = labelLineHeight || Math.ceil(TILE_LABEL_FONT * 1.15);
  const labelBlock = labelLineCount > 0 ? labelLineCount * resolvedLabelLineHeight + 6 : 0;
  const availableHeight = Math.max(0, height - labelBlock - 8);
  let fontSize = fitFontSize(valueText, width, { base: TILE_VALUE_FONT, min: 7 });
  let lines = [valueText];

  if (lineWidth(valueText, fontSize) > width) {
    const split = splitValueIntoLines(valueText);
    if (split.length > 1) {
      lines = split;
      const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b));
      fontSize = fitFontSize(longest, width, { base: TILE_VALUE_FONT, min: 7 });
    } else {
      fontSize = fitFontSize(valueText, width, { base: TILE_VALUE_FONT, min: 7 });
    }
  }

  let lineHeight = Math.ceil(fontSize * 1.2);
  let blockHeight = lineHeight * lines.length;
  if (blockHeight > availableHeight && availableHeight > 0) {
    fontSize = Math.max(7, Math.floor((fontSize * availableHeight) / blockHeight));
    lineHeight = Math.ceil(fontSize * 1.2);
    blockHeight = lineHeight * lines.length;
  }

  return { lines, fontSize, lineHeight, blockHeight };
}

/** Label + value layout for every tile; all strings stay complete (no … or compact $). */
export function getTileTextLayout(d, formatValue) {
  const { width, height } = getTileSize(d);
  const categoryLabel = String(d.data.label || "");
  const valueText = formatTileValueLabel(d.data.value, formatValue);
  const labelY = 14;
  // Narrow tiles need less left padding so long words like "Entreprise" can fit.
  const textX = width < 80 ? 4 : 8;
  const textWidth = Math.max(0, width - textX * 2);
  // Always reserve room for the amount so wrapping a long title cannot hide the number.
  const minValueReserve = Math.ceil(TILE_VALUE_FONT * 1.2) + 6;
  const showCategoryLabel = height >= 24 && width >= 16 && categoryLabel.length > 0;
  const maxLabelBlockHeight = showCategoryLabel
    ? Math.max(0, height - labelY - minValueReserve)
    : 0;

  let categoryLines = [categoryLabel];
  let categoryFontSize = TILE_LABEL_FONT;
  let labelLineHeight = Math.ceil(TILE_LABEL_FONT * 1.15);

  if (showCategoryLabel) {
    categoryLines = splitLabelIntoLines(categoryLabel, {
      availableWidth: textWidth,
      minFontSize: 7,
    });
    const longestLabelLine = categoryLines.reduce((a, b) => (a.length >= b.length ? a : b), "");
    categoryFontSize = fitFontSize(longestLabelLine, textWidth, { base: TILE_LABEL_FONT, min: 6 });
    labelLineHeight = Math.ceil(categoryFontSize * 1.15);

    // If a wrap would crowd out the value, keep a single line instead (still shrunk to fit).
    if (categoryLines.length > 1 && categoryLines.length * labelLineHeight > maxLabelBlockHeight) {
      categoryLines = [categoryLabel];
      categoryFontSize = fitFontSize(categoryLabel, textWidth, { base: TILE_LABEL_FONT, min: 6 });
      labelLineHeight = Math.ceil(categoryFontSize * 1.15);
    }
  }

  const valueBlock = getValueDisplay(
    valueText,
    textWidth,
    height - labelY,
    showCategoryLabel ? categoryLines.length : 0,
    labelLineHeight,
  );
  const valueStartY = showCategoryLabel
    ? labelY + categoryLines.length * labelLineHeight + 2
    : Math.max(12, (height - valueBlock.blockHeight) / 2 + valueBlock.fontSize);

  return {
    showCategoryLabel,
    categoryLines,
    categoryFontSize: `${categoryFontSize}px`,
    labelY,
    labelLineHeight,
    textX,
    valueLines: valueBlock.lines,
    valueStartY,
    valueFontSize: `${valueBlock.fontSize}px`,
    valueLineHeight: valueBlock.lineHeight,
  };
}

function appendTileText(group, layout, fill) {
  const textX = layout.textX ?? 8;

  if (layout.showCategoryLabel) {
    const labelText = group
      .append("text")
      .attr("class", "tile-label")
      .attr("x", textX)
      .attr("y", layout.labelY)
      .style("font-size", layout.categoryFontSize)
      .style("font-weight", 600)
      .style("fill", fill)
      .style("pointer-events", "none");

    (layout.categoryLines || []).forEach((line, index) => {
      labelText
        .append("tspan")
        .attr("x", textX)
        .attr("dy", index === 0 ? 0 : layout.labelLineHeight)
        .text(line);
    });
  }

  const valueText = group
    .append("text")
    .attr("class", "tile-value")
    .attr("x", textX)
    .attr("y", layout.valueStartY)
    .style("font-size", layout.valueFontSize)
    .style("font-weight", 500)
    .style("fill", fill)
    .style("pointer-events", "none");

  layout.valueLines.forEach((line, index) => {
    valueText
      .append("tspan")
      .attr("x", textX)
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
    const maxValueRatio =
      chart && Number.isFinite(chart.treemapMaxValueRatio) ? chart.treemapMaxValueRatio : undefined;
    const layoutData = computeTreemapLayoutValues(tiles, {
      exponent: layoutExponent,
      maxTileShare: textAware ? 1 : maxTileShare,
      textAware,
      formatValue,
      maxValueRatio,
    });

    const root = d3
      .hierarchy({ children: layoutData })
      .sum((d) => d.layoutValue || d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap().size([width, height]).paddingInner(4).paddingOuter(2)(root);

    const { getFillColor, getTextColor } = createColorHelpers(tiles, chart);

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
    const { tiles, zeroTiles, summary } = partitionTreeData(this.props.data);
    const { getFillColor } = createColorHelpers(tiles, this.props.chart);
    const formatBig = this.resolveValueFormatter();
    const svgDisplayHeight = this.props.chart?.treemapTextAwareLayout
      ? `${TEXT_AWARE_SVG_HEIGHT}px`
      : "320px";
    const zeroNote =
      zeroTiles.length === 0
        ? null
        : zeroTiles.length === 1
          ? `${zeroTiles[0].label} is $0 and is not shown in the chart.`
          : `${zeroTiles.map((tile) => tile.label).join(", ")} are $0 and are not shown in the chart.`;
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
        {zeroNote ? (
          <p
            className="treemap-zero-note"
            style={{
              margin: "0.5rem 0 0",
              fontSize: "0.85rem",
              lineHeight: 1.4,
              color: "#555",
            }}
          >
            {zeroNote}
          </p>
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
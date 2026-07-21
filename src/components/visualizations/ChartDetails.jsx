import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import DownloadChartButton from "../field/DownloadChartButton";
import DownloadChartImageButton from "../field/DownloadChartImageButton";
import CopyChartImageButton from "../field/CopyChartImageButton";

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;

  &.gauge-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  &.chart-header--stat-toolbar {
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 0.65rem;
    gap: 0.5rem;
  }
`;

const ScreenReaderOnlyTitle = styled.h3`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const ChartTitle = styled.h3`
  margin: 0;
  flex: 3;
  ${props => props.hideButtons ? 'min-height: 60px;' : ''};
  ${props => props.isGauge ? 'min-height: 52px;' : ''};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  flex: ${({ $treemap }) => ($treemap ? "0 0 auto" : 3)};
`;

const ViewButton = styled.button`
  background: transparent;
  border: 1px solid #555555;
  border-radius: 4px;
  color: #555555;
  cursor: pointer;
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  font-size: 12px;
  padding: 4px 8px;

  &:hover {
    color: #6fc68e;
    border-color: #6fc68e;
  }

  i {
    color: inherit;
    font-size: 14px;
  }
`;

const makeSelectChartData = (tables, muni) =>
  createSelector([(state) => state.chart.cache], (cache) =>
    tables.reduce(
      (acc, table) => ({
        ...acc,
        [table]: cache[table]?.[muni] || [],
      }),
      {},
    ),
  );

// Some Digital Equity charts back their views with table variants like:
// `tabular.s2801_computer_internet_acs_m_noint`, but the column alias metadata
// we want to display lives under the base table `tabular.s2801_computer_internet_acs_m`.
const normalizeDigitalEquityTableKeyForMetadata = (tableKey) => {
  if (!tableKey || typeof tableKey !== "string") return tableKey;

  // Capture `schema` and the base `s2801_computer_internet_acs_m`, then drop any `_*` suffix.
  // Example:
  //   tabular.s2801_computer_internet_acs_m_no_internet -> tabular.s2801_computer_internet_acs_m
  const m = tableKey.match(/^([^.\s]+)\.(s2801_computer_internet_acs_m)(?:_.+)?$/);
  if (!m) return tableKey;

  const schema = m[1];
  const baseTable = m[2];
  return `${schema}.${baseTable}`;
};

const normalizeMuniFinanceTableKeyForMetadata = (tableKey) => {
  if (!tableKey || typeof tableKey !== "string") return tableKey;
  const m = tableKey.match(/^([^.\s]+)\.(muni_finance_m)(?:_.+)?$/);
  if (!m) return tableKey;
  return `${m[1]}.${m[2]}`;
};

const normalizeTableKeyForMetadata = (tableKey) => {
  const digitalEquity = normalizeDigitalEquityTableKeyForMetadata(tableKey);
  if (digitalEquity !== tableKey) return digitalEquity;
  return normalizeMuniFinanceTableKeyForMetadata(tableKey);
};

const ChartDetails = ({ chart, children, muni, onViewData, isSubregion, isRPAregion, displayName, hideButtons, wrapperClassName }) => {
  const [timeframe, setTimeframe] = useState(typeof chart.timeframe === 'string' ? chart.timeframe : 'Unknown');
  const chartWrapperRef = useRef(null);

  // Used by the "View data table" modal to fetch column alias metadata.
  // If the chart has multiple backing tables, we use the first one.
  const primaryTableKey = Object.keys(chart.tables || {})[0];
  const primaryTableKeyForMetadata = normalizeTableKeyForMetadata(primaryTableKey);

  const selectChartData = React.useMemo(
    () => makeSelectChartData(Object.keys(chart.tables), muni),
    [chart.tables, muni]
  );
  
  const chartData = useSelector(selectChartData);
  const tableName = Object.keys(chartData)[0];
  const data = chartData[tableName];

  // Add selector for subregion cache
  const selectSubregionCache = createSelector(
    [(state) => state.subregion.cache],
    (cache) => {
      if (isSubregion) {
        const tableName = Object.keys(chart.tables)[0];
        return cache[tableName]?.[muni] || [];
      }
      return [];
    }
  );

  const selectRPAregionCache = createSelector(
    [(state) => state.rparegion.cache],
    (cache) => {
      if (isRPAregion) {
        const tableName = Object.keys(chart.tables)[0];
        return cache[tableName]?.[muni] || [];
      }
      return [];
    }
  );

  const subregionCache = useSelector(selectSubregionCache);
  const rpaCache = useSelector(selectRPAregionCache);

  useEffect(() => {
    if (typeof chart.timeframe === "function") {
      chart.timeframe(muni).then(setTimeframe);
    }
  }, [chart.timeframe,muni]);

  const handleViewData = () => {
    if (isSubregion) {
      // Use the cached aggregated data from subregion state
      onViewData(subregionCache, chart.title, primaryTableKeyForMetadata);
    } else if (isRPAregion) {
      onViewData(rpaCache, chart.title, primaryTableKeyForMetadata);
    } else {
      onViewData(data, chart.title, primaryTableKeyForMetadata);
    }
  };

  const isGauge = chart.type === "gauge" || chart.type === "profile-metric";
  const hideOuterTitle = Boolean(chart.hideOuterTitle);
  const headerClassName = isGauge
    ? hideOuterTitle
      ? "chart-header--stat-toolbar"
      : "gauge-header"
    : "";

  return (
    <div className={["chart-wrapper", wrapperClassName].filter(Boolean).join(" ")} ref={chartWrapperRef}>
      <ChartHeader className={headerClassName}>
        {hideOuterTitle ? (
          <ScreenReaderOnlyTitle className="chart__title">
            {chart.title || "Chart Title"}
            {isSubregion ? " (Aggregated)" : ""}
          </ScreenReaderOnlyTitle>
        ) : (
          <ChartTitle
            className="chart__title"
            hideButtons={hideButtons}
            isGauge={isGauge}
          >
            {chart.title || "Chart Title"}
            {isSubregion && " (Aggregated)"}
          </ChartTitle>
        )}
        {!hideButtons && (
          <ButtonGroup className="chart-details-buttons" $treemap={chart.type === "tree-map"}>
            <ViewButton
              onClick={handleViewData}
              title={`View ${isSubregion ? 'aggregated ' : ''}chart data in table format`}
              aria-label={`View ${isSubregion ? 'aggregated ' : ''}chart data in table format`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <title>View chart data in table format</title>
                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm15 2h-4v3h4zm0 4h-4v3h4zm0 4h-4v3h3a1 1 0 0 0 1-1zm-5 3v-3H6v3zm-5 0v-3H1v2a1 1 0 0 0 1 1zm-4-4h4V8H1zm0-4h4V4H1zm5-3v3h4V4zm4 4H6v3h4z" />
              </svg>
            </ViewButton>
            <DownloadChartButton 
              chart={chart} 
              muni={muni} 
              isSubregion={isSubregion} 
              isRPAregion={isRPAregion}
              displayName={displayName}
            />
            <DownloadChartImageButton 
              chartRef={chartWrapperRef}
              chartTitle={chart.title || 'Chart'}
              muni={muni}
              isSubregion={isSubregion}
              isRPAregion={isRPAregion}
              displayName={displayName}
              hideTitle={hideOuterTitle}
            />
            <CopyChartImageButton
              chartRef={chartWrapperRef}
              chartTitle={chart.title || 'Chart'}
              hideTitle={hideOuterTitle}
            />
          </ButtonGroup>
        )}
      </ChartHeader>
      {children}
      {chart.caveat ? (
        <div className="caveat">
          Caveat:
          {' '}
          {chart.caveat}
        </div>
      ) : null}
      <div className="metadata">
        <div className="source-timeframe">
          <div className="source">
            Source:
            {' '}
            {chart.source || 'Unknown'}
          </div>
          <div className="timeframe">
            Years:
            {' '}
            {timeframe}
          </div>
        </div>
        {chart.datasetLinks ? (
          <div className="link">
            <span>Link to: </span>
            {Object.keys(chart.datasetLinks).map((label) => (
              <a
                key={label}
                href={`${window.location.origin}/browser/datasets/${chart.datasetLinks[label]}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

ChartDetails.propTypes = {
  chart: PropTypes.shape({
    title: PropTypes.string,
    hideOuterTitle: PropTypes.bool,
    source: PropTypes.string,
    timeframe: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.func
    ]),
    datasetLinks: PropTypes.object,
    tables: PropTypes.object.isRequired,
  }).isRequired,
  muni: PropTypes.string.isRequired,
  onViewData: PropTypes.func.isRequired,
  isSubregion: PropTypes.bool,
  isRPAregion: PropTypes.bool,
  displayName: PropTypes.string,
  hideButtons: PropTypes.bool,
  /** Extra class on the outer .chart-wrapper (e.g. layout overrides per chart). */
  wrapperClassName: PropTypes.string,
};

ChartDetails.defaultProps = {
  isSubregion: false,
  isRPAregion: false,
  wrapperClassName: "",
};

export default ChartDetails;

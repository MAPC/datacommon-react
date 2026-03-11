import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import DownloadChartButton from "../field/DownloadChartButton";
import DownloadChartImageButton from "../field/DownloadChartImageButton";

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
`;

const ChartTitle = styled.h3`
  margin: 0;
  flex: 2;
  ${props => props.hideButtons ? 'min-height: 60px;' : ''};
  ${props => props.isGauge ? 'min-height: 52px;' : ''};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  flex: 3;
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

const ChartDetails = ({ chart, children, muni, onViewData, isSubregion, isRPAregion, displayName, hideButtons }) => {
  const [timeframe, setTimeframe] = useState(typeof chart.timeframe === 'string' ? chart.timeframe : 'Unknown');
  const chartWrapperRef = useRef(null);

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
    if (typeof chart.timeframe === 'function') {
      chart.timeframe().then(setTimeframe);
    }
  }, [chart.timeframe]);

  const handleViewData = () => {
    if (isSubregion) {
      // Use the cached aggregated data from subregion state
      onViewData(subregionCache, chart.title);
    } else if (isRPAregion) {
      onViewData(rpaCache, chart.title);
    } else {
      console.log(data);
      onViewData(data, chart.title);
    }
  };

  const isGauge = chart.type === "gauge";

  return (
    <div className="chart-wrapper" ref={chartWrapperRef}>
      <ChartHeader className={isGauge ? "gauge-header" : ""}>
        <ChartTitle
          className="chart__title"
          hideButtons={hideButtons}
          isGauge={isGauge}
        >
          {chart.title || 'Chart Title'}
          {isSubregion && ' (Aggregated)'}
        </ChartTitle>
        {!hideButtons && (
          <ButtonGroup className="chart-details-buttons">
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
};

ChartDetails.defaultProps = {
  isSubregion: false,
  isRPAregion: false
};

export default ChartDetails;

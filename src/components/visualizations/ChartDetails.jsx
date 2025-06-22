import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import DownloadChartButton from '../field/DownloadChartButton';
import DownloadChartImageButton from '../field/DownloadChartImageButton';

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ChartTitle = styled.h3`
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ViewButton = styled.button`
  background: #6FC68E;
  border: none;
  border-radius: 5px;
  color: #FFFFFF;
  cursor: pointer;
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  font-size: 12px;
  padding: 8px 12px;

  &:hover {
     background: #5DB37A;
  }
`;

const makeSelectChartData = (tables, muni) => createSelector(
  [(state) => state.chart.cache],
  (cache) => tables.reduce((acc, table) => ({
    ...acc,
    [table]: cache[table]?.[muni] || []
  }), {})
);

const ChartDetails = ({ chart, children, muni, onViewData }) => {
  const [timeframe, setTimeframe] = useState(typeof chart.timeframe === 'string' ? chart.timeframe : 'Unknown');
  const chartRef = React.useRef(null);

  const selectChartData = React.useMemo(
    () => makeSelectChartData(Object.keys(chart.tables), muni),
    [chart.tables, muni]
  );
  
  const chartData = useSelector(selectChartData);
  const tableName = Object.keys(chartData)[0];
  const data = chartData[tableName];

  useEffect(() => {
    if (typeof chart.timeframe === 'function') {
      chart.timeframe().then(setTimeframe);
    }
  }, [chart.timeframe]);

  const handleViewData = () => {
    onViewData(data, chart.title);
  };

  return (
    <div className="chart-wrapper" ref={chartRef}>
      <ChartHeader>
        <ChartTitle className="chart__title">
          {chart.title || 'Chart Title'}
        </ChartTitle>
        <ButtonGroup>
          <ViewButton
            onClick={handleViewData}
            title="View chart data in table format"
          >
            View Data
          </ViewButton>
          <DownloadChartButton chart={chart} muni={muni} />
          <DownloadChartImageButton 
            chartRef={chartRef} 
            chartTitle={chart.title} 
          />
        </ButtonGroup>
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
              <a key={label} href={`${window.location.origin}/browser/datasets/${chart.datasetLinks[label]}`}>{label}</a>
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
};

export default ChartDetails;

import React from 'react';
import PropTypes from 'prop-types';
import DownloadChartButton from '../field/DownloadChartButton';
import styled from 'styled-components';

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ChartTitle = styled.h3`
  margin: 0;
`;

const ChartDetails = ({ chart, children, muni }) => (
  <div className="chart-wrapper">
    <ChartHeader>
      <ChartTitle className="chart__title">
        {chart.title || 'Chart Title'}
      </ChartTitle>
      <DownloadChartButton chart={chart} muni={muni} />
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
          {chart.timeframe || 'Unknown'}
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

ChartDetails.propTypes = {
  chart: PropTypes.shape({
    title: PropTypes.string,
    source: PropTypes.string,
    timeframe: PropTypes.string,
    datasetLinks: PropTypes.object,
    tables: PropTypes.object.isRequired,
  }).isRequired,
  muni: PropTypes.string.isRequired,
};

export default ChartDetails;

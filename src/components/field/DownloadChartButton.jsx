import React from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import styled from "styled-components";

const StyledButton = styled.button`
  background: #6FC68E;
  border: none;
  border-radius: 5px;
  color: #FFFFFF;
  cursor: pointer;
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  font-size: 12px;

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

export default function DownloadChartButton({ chart, muni }) {
  const selectChartData = React.useMemo(
    () => makeSelectChartData(Object.keys(chart.tables), muni),
    [chart.tables, muni]
  );
  
  const chartData = useSelector(selectChartData);

  const downloadCsv = () => {
    try {
      const tableName = Object.keys(chartData)[0];
      const data = chartData[tableName];
      
      if (!data || data.length === 0) {
        console.error('No data available for the selected municipality.');
        return;
      }
    
      // Convert data to CSV
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${chart.title}_${muni}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading data:', error);
    }
  };

  return (
    <StyledButton 
      onClick={downloadCsv}
      title="Download chart data as CSV"
    >
      Download Data
    </StyledButton>
  );
}

DownloadChartButton.propTypes = {
  chart: PropTypes.shape({
    title: PropTypes.string,
    tables: PropTypes.object.isRequired,
  }).isRequired,
  muni: PropTypes.string.isRequired,
};

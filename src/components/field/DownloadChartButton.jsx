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
  padding: 8px 12px;

  &:hover {
    background: #5DB37A;
  }
`;
const SUBREGIONS = {
  355: 'Inner Core Committee [ICC]',
  356: 'Minuteman Advisory Group on Interlocal Coordination [MAGIC]',
  357: 'MetroWest Regional Collaborative [MWRC]',
  358: 'North Shore Task Force [NSTF]',
  359: 'North Suburban Planning Council [NSPC]',
  360: 'South Shore Coalition [SSC]',
  361: 'South West Advisory Planning Committee [SWAP]',
  362: 'Three Rivers Interlocal Council [TRIC]'
};

const makeSelectChartData = (tables, muni) => createSelector(
  [(state) => state.chart.cache],
  (cache) => tables.reduce((acc, table) => ({
    ...acc,
    [table]: cache[table]?.[muni] || []
  }), {})
);

export default function DownloadChartButton({ chart, muni, isSubregion }) {
  const selectChartData = React.useMemo(
    () => makeSelectChartData(Object.keys(chart.tables), muni),
    [chart.tables, muni]
  );
  
  const chartData = useSelector(selectChartData);

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

  const subregionCache = useSelector(selectSubregionCache);
  
  const downloadCsv = () => {
    try {
      const tableName = Object.keys(chartData)[0];
      const data = isSubregion ? subregionCache : chartData[tableName];
      
      if (!data || data.length === 0) {
        console.error('No data available for the selected municipality.');
        return;
      }
    
      // Convert data to CSV
      const headers = Object.keys(data[0]);
      const firstRow = isSubregion ? ['Subregion:', SUBREGIONS[muni] ] :  ['Municipality:', muni].join(',');
      const csv = [
        firstRow,
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
      link.setAttribute('download', `${chart.title}_${isSubregion ? SUBREGIONS[muni] : muni}.csv`);
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

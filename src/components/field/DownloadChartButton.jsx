import PropTypes from "prop-types";
import React from "react";
import { useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import styled from "styled-components";

import { SUBREGIONS } from "../../constants/subregions";

const StyledButton = styled.button`
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

  i, span {
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

export default function DownloadChartButton({ chart, muni, isSubregion, isRPAregion, displayName }) {
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
  const downloadCsv = () => {
    try {
      const tableName = Object.keys(chartData)[0];
      let data;
      if (isRPAregion) {
        data = rpaCache;
      } else {
        data = isSubregion ? subregionCache : chartData[tableName];
      }

    
      if (!data || data.length === 0) {
        console.error("No data available for the selected municipality.");
        return;
      }

      // Convert data to CSV
      const headers = Object.keys(data[0]);
      let firstRow;
      if (isSubregion) {
        firstRow = ['Subregion:', SUBREGIONS[muni]];
      } else if (isRPAregion) {
        firstRow = ['RPAregion:', "MAPC"];
      } else {
        firstRow = ['Municipality:', muni];
      }
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

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Use displayName if provided, otherwise extract abbreviation or use muni
      let nameSuffix;
      if (displayName) {
        nameSuffix = displayName;
      } else if (isSubregion) {
        nameSuffix = SUBREGIONS[muni]?.match(/\[([^\]]+)\]/)?.[1] || muni;
      } else {
        nameSuffix = muni;
      }
      
      link.setAttribute('download', `${chart.title}_${nameSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading data:", error);
    }
  };

  return (
    <StyledButton
      onClick={downloadCsv}
      title="Download chart data as CSV"
      aria-label="Download chart data as CSV"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <title>Download chart data as CSV</title>
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z" />
      </svg>
    </StyledButton>
  );
}

DownloadChartButton.propTypes = {
  chart: PropTypes.shape({
    title: PropTypes.string,
    tables: PropTypes.object.isRequired,
  }).isRequired,
  muni: PropTypes.string.isRequired,
  isSubregion: PropTypes.bool,
  isRPAregion: PropTypes.bool,
  displayName: PropTypes.string,
};

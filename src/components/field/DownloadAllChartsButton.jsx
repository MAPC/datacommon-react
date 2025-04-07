import React, { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import styled, { keyframes } from "styled-components";
import * as XLSX from "xlsx";
import charts from "../../constants/charts";
import PropTypes from "prop-types";
import { fetchChartData } from "../../reducers/chartSlice";
import { fetchSubregionChartData } from "../../reducers/subregionSlice";
import { fetchRPAregionChartData } from "../../reducers/rparegionSlice";
import { store } from "../../store";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const StyledButton = styled.button`
  background: #6fc68e;
  border: none;
  border-radius: 5px;
  color: #ffffff;
  cursor: ${(props) => (props.disabled ? "wait" : "pointer")};
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  margin: 0 3px 3em;
  padding: 0.25em 1.5em 0.5em;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: ${(props) => (props.disabled ? "#6FC68E" : "#5DB37A")};
  }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.span`
  font-size: 14px;
`;

const makeSelectAllChartsData = (allTables, muni, datatype) => {
  return createSelector(
    [(state) => {
      switch (datatype) {
        case 'subregion':
          return state.subregion.cache;
        case 'rpa':
          return state.rparegion.cache;
        default:
          return state.chart.cache;
      }
    }],
    (cache) => {
      const result = allTables.reduce(
        (acc, table) => ({
          ...acc,
          [table]: cache[table]?.[muni] || [],
        }),
        {}
      );
      return result;
    }
  );
};

// Get all table names from charts
const allTables = (() => {
  const tables = new Set();
  Object.values(charts).forEach((category) => {
    Object.values(category).forEach((chartInfo) => {
      Object.keys(chartInfo.tables).forEach((table) => {
        tables.add(table);
      });
    });
  });
  return Array.from(tables);
})();

export default function DownloadAllChartsButton({ muni, datatype }) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const selectAllChartsData = makeSelectAllChartsData(allTables, muni, datatype);
  const allData = useSelector(selectAllChartsData);

  const fetchMissingData = async () => {
    const fetchPromises = [];
    let totalToFetch = 0;
    let fetched = 0;

    Object.values(charts).forEach((category) => {
      Object.values(category).forEach((chartInfo) => {
        const needsFetch = Object.keys(chartInfo.tables).some(
          (tableName) => !allData[tableName] || allData[tableName].length === 0
        );

        if (needsFetch) {
          totalToFetch++;
          let fetchPromise;
          switch (datatype) {
            case 'subregion':
              fetchPromise = dispatch(
                fetchSubregionChartData({ subregionId: muni, chartInfo })
              );
              break;
            case 'rpa':
              fetchPromise = dispatch(
                fetchRPAregionChartData({ rpa_id: muni, chartInfo })
              );
              break;
            default:
              fetchPromise = dispatch(
                fetchChartData({ chartInfo, municipality: muni })
              );
          }

          fetchPromises.push(
            fetchPromise.then(() => {
              fetched++;
              setLoadingStatus(`Fetching data (${fetched}/${totalToFetch})`);
            })
          );
        }
      });
    });

    if (fetchPromises.length > 0) {
      setLoadingStatus(`Fetching data (0/${totalToFetch})`);
      await Promise.all(fetchPromises);
    }

    return totalToFetch;
  };

  const downloadAllData = async () => {
    try {
      setIsLoading(true);
      await fetchMissingData();
      
      setLoadingStatus("Preparing Excel file...");
      const state = store.getState();
      const excelData = {};
    
      Object.values(charts).forEach((category) => {
        Object.values(category).forEach((chartInfo) => {
          Object.keys(chartInfo.tables).forEach((tableName) => {
            let data;
            switch (datatype) {
              case 'subregion':
                data = state.subregion.cache[tableName]?.[muni] || [];
                break;
              case 'rpa':
                data = state.rparegion.cache[tableName]?.[muni] || [];
                break;
              default:
                data = state.chart.cache[tableName]?.[muni] || [];
            }
            excelData[tableName] = data;
          });
        });
      });
      generateExcel(excelData);

    } catch (error) {
      console.error("Error downloading data:", error);
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const generateExcel = (data) => {
    setLoadingStatus("Preparing Excel file...");
    const wb = XLSX.utils.book_new();

    // Create a mapping of table names to their category and chart key
    const tableMapping = {};
    Object.entries(charts).forEach(([category, categoryCharts]) => {
      Object.entries(categoryCharts).forEach(([chartKey, chart]) => {
        Object.keys(chart.tables).forEach((tableName) => {
          tableMapping[tableName] = `${category}_${chartKey}`;
        });
      });
    });

    Object.entries(data).forEach(([tableName, tableData]) => {
      if (tableData && tableData.length > 0) {
        // Create worksheet with header based on data type
        const header = [
          [datatype === 'subregion' ? 'Subregion:' : 
           datatype === 'rpa' ? 'RPA Region:' : 
           'Municipality:', muni],
          []
        ];
        const ws = XLSX.utils.aoa_to_sheet(header);
        
        // Add the data starting at row 2
        XLSX.utils.sheet_add_json(ws, tableData, { origin: 'A2', skipHeader: false });
        
        // Excel has 31 char limit
        let sheetName =
          tableMapping[tableName]?.slice(0, 31) || tableName.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    setLoadingStatus("Downloading...");
    const filename = `${muni}_${datatype}_charts_data.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <StyledButton
      onClick={downloadAllData}
      title={`Download all ${datatype} charts data`}
      disabled={isLoading}
    >
      {isLoading && <Spinner />}
      <LoadingText>
        {isLoading ? loadingStatus : "Download All Data"}
      </LoadingText>
    </StyledButton>
  );
}

DownloadAllChartsButton.propTypes = {
  muni: PropTypes.string.isRequired,
  datatype: PropTypes.oneOf(['municipality', 'subregion', 'rpa']).isRequired,
};

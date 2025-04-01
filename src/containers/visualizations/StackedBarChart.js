import { connect } from 'react-redux';
import StackedBarChart from '../../components/visualizations/StackedBarChart';
import { selectSubregionChartData, updateSubregionChart } from '../../reducers/subregionSlice';
import { createSelector } from '@reduxjs/toolkit';

// Import SUBREGIONS constant
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

function valuesHaveData(transformedData) {
  const checkData = transformedData.reduce((acc, row) => {
    let datumHasValue = false;
    if (row.y !== null && row.y !== 0) {
      datumHasValue = true;
    }
    acc.push(datumHasValue);
    return acc;
  }, []);

  if (checkData.includes(true)) {
    return true;
  }
  return false;
}

// Memoize the data transformation logic
const selectChartData = createSelector(
  [
    (state, props) => props.isSubregion,
    (state, props) => props.muni,
    (state, props) => props.chart,
    (state) => state.chart.cache,
    (state, props) => state
  ],
  (isSubregion, muni, chart, cache, state) => {
    const tables = Object.keys(chart.tables);

    if (isSubregion) {
      // Handle subregion data
      const subregionId = Object.entries(SUBREGIONS).find(
        ([id, name]) => name === muni
      )?.[0];
      
      if (!subregionId) return { data: [], hasData: false };

      // Check if data is already cached
      const isDataCached = state.subregion.cache[tables[0]]?.[subregionId];
      if (isDataCached) {
        const transformedData = chart.transformer(
          { [tables[0]]: isDataCached },
          chart
        );
        return {
          data: transformedData,
          hasData: valuesHaveData(transformedData)
        };
      }

      const subregionData = tables.map(table => 
        selectSubregionChartData(state, table, subregionId, chart)
      );

      // Check if we have any data
      if (subregionData.some(data => data && data.length > 0)) {
        const transformedData = chart.transformer(
          { [tables[0]]: subregionData[0] }, 
          chart
        );
        
        return {
          data: transformedData,
          hasData: valuesHaveData(transformedData),
          // Only pass cacheData if it's not already cached
          cacheData: {
            tableName: tables[0],
            subregionId,
            data: subregionData[0]
          }
        };
      }
    } else {
      // Handle municipality data
      if (tables.every((table) => cache[table] && cache[table][muni])) {
        const muniTables = tables.reduce((acc, table) => 
          Object.assign(acc, { [table]: cache[table][muni] }), {});
        
        const transformedData = chart.transformer(muniTables, chart);
        return {
          data: transformedData,
          hasData: valuesHaveData(transformedData)
        };
      }
    }

    return { data: [], hasData: false };
  }
);

const mapStateToProps = (state, props) => {
  const { xAxis, yAxis } = props.chart;
  const chartData = selectChartData(state, props);

  return {
    ...props,
    xAxis,
    yAxis,
    ...chartData
  };
};

const mapDispatchToProps = (dispatch) => ({
  cacheSubregionData: (cacheData) => {
    if (cacheData?.tableName && cacheData?.subregionId && cacheData?.data) {
      dispatch(updateSubregionChart({
        tableName: cacheData.tableName,
        subregionId: cacheData.subregionId,
        data: cacheData.data
      }));
    }
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(StackedBarChart);
export { valuesHaveData };

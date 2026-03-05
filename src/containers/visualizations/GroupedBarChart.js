import { connect } from 'react-redux';
import GroupedBarChart from '../../components/visualizations/GroupedBarChart';

function valuesHaveData(transformedData) {
  if (!transformedData || !Array.isArray(transformedData) || transformedData.length === 0) {
    return false;
  }
  return transformedData.some((row) => {
    const yValue = typeof row.y === 'number' ? row.y : parseFloat(row.y);
    return row.y != null && row.y !== undefined && !isNaN(yValue) && yValue !== 0;
  });
}

const mapStateToProps = (state, props) => {
  const { muni, chart, isSubregion, isRPAregion } = props;
  const tables = Object.keys(chart.tables);

  // Handle subregion data
  if (isSubregion) {
    if (tables.every((table) => state.subregion.cache[table] && state.subregion.cache[table][muni])) {
      const subregionTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.subregion.cache[table][muni] }), {});
      return {
        ...props,
        xAxis: chart.xAxis,
        yAxis: chart.yAxis,
        data: chart.transformer(subregionTables, chart),
        hasData: valuesHaveData(chart.transformer(subregionTables, chart)),
      };
    }
  } else if (isRPAregion) {
    if (tables.every((table) => state.rparegion.cache[table] && state.rparegion.cache[table][muni])) {
      const rpaTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.rparegion.cache[table][muni] }), {});
      return {
        ...props,
        xAxis: chart.xAxis,
        yAxis: chart.yAxis,
        data: chart.transformer(rpaTables, chart),
        hasData: valuesHaveData(chart.transformer(rpaTables, chart)),
      };
    }
  } else if (tables.every((table) => state.chart.cache[table] && state.chart.cache[table][muni] && Array.isArray(state.chart.cache[table][muni]) && state.chart.cache[table][muni].length > 0)) {
    const muniTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.chart.cache[table][muni] }), {});
    const transformedData = chart.transformer(muniTables, chart);
    const hasDataResult = valuesHaveData(transformedData);
    return {
      ...props,
      chart: chart,
      xAxis: chart.xAxis,
      yAxis: chart.yAxis,
      data: transformedData,
      hasData: hasDataResult,
    };
  }

  return {
    ...props,
    xAxis: {
      label: '',
    },
    yAxis: {
      label: '',
    },
    data: [],
    hasData: false,
  };
};

const mapDispatchToProps = (dispatch, props) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(GroupedBarChart);
export { valuesHaveData };

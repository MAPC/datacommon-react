import { connect } from 'react-redux';
import StackedBarChart from '../../components/visualizations/StackedBarChart';

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

const mapStateToProps = (state, props) => {
  const { muni, chart, isSubregion } = props;
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
  } 
  // Handle regular municipality data
  else if (tables.every((table) => state.chart.cache[table] && state.chart.cache[table][muni])) {
    const muniTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.chart.cache[table][muni] }), {});
    return {
      ...props,
      xAxis: chart.xAxis,
      yAxis: chart.yAxis,
      data: chart.transformer(muniTables, chart),
      hasData: valuesHaveData(chart.transformer(muniTables, chart)),
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

export default connect(mapStateToProps, mapDispatchToProps)(StackedBarChart);
export { valuesHaveData };
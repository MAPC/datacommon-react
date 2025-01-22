import { connect } from 'react-redux';
import PieChart from '../../components/visualizations/PieChart';

function valuesHaveData(transformedData) {
  const checkData = transformedData.reduce((acc, row) => {
    let datumHasValue = false;
    if (row.value !== null && row.value !== 0) {
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
  const { muni, chart } = props;
  const tables = Object.keys(chart.tables);
  
  if (tables.every((table) => state.chart.cache[table] && state.chart.cache[table][muni])) {
    // Create muniTables while preserving original functionality
    const muniTables = tables.reduce((acc, table) => 
      Object.assign({}, acc, { 
        [table]: state.chart.cache[table][muni] 
      }), {});

    const transformedData = chart.transformer(muniTables, chart);
    
    return {
      ...props,
      xAxis: chart.xAxis,
      data: transformedData,
      hasData: valuesHaveData(transformedData),
    };
  }

  return {
    ...props,
    xAxis: { format: (d) => d },
    data: [],
    hasData: false,
  };
};

const mapDispatchToProps = (dispatch, props) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(PieChart);
export { valuesHaveData };

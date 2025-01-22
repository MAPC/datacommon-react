import { connect } from 'react-redux';
import LineChart from '../../components/visualizations/LineChart';

function valuesHaveData(transformedData) {
  if (!Array.isArray(transformedData) || transformedData.length === 0) return false;
  
  return transformedData.some(row => 
    Array.isArray(row.values) && 
    row.values.length > 0 && 
    row.values.some(value => value !== null && value !== undefined)
  );
}

const mapStateToProps = (state, props) => {
  const { muni, chart } = props;
  const tables = Object.keys(chart.tables);
  
  if (tables.every((table) => state.chart.cache[table] && state.chart.cache[table][muni])) {
    // Create a new object for muniTables with spread operator
    const muniTables = tables.reduce((acc, table) => ({
      ...acc,
      [table]: state.chart.cache[table][muni]
    }), {});

    try {
      const transformedData = chart.transformer(muniTables, chart);
      console.log('Transformed Data:', transformedData);
      
      return {
        ...props,
        xAxis: chart.xAxis,
        yAxis: chart.yAxis,
        data: transformedData,
        hasData: valuesHaveData(transformedData),
      };
    } catch (error) {
      console.error('Error transforming data:', error);
      return {
        ...props,
        xAxis: { label: '' },
        yAxis: { label: '' },
        data: [],
        hasData: false,
      };
    }
  }

  return {
    ...props,
    xAxis: { label: '' },
    yAxis: { label: '' },
    data: [],
    hasData: false,
  };
};

const mapDispatchToProps = (dispatch, props) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(LineChart);
export { valuesHaveData };

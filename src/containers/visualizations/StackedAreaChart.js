import { connect } from 'react-redux';
import StackedAreaChart from '../../components/visualizations/StackedAreaChart';

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
      const subregionTables = tables.reduce((acc, table) => ({
        ...acc,
        [table]: state.subregion.cache[table][muni]
      }), {});

      try {
        const transformedData = chart.transformer(subregionTables, chart);
        console.log(transformedData);
        return {
          ...props,
          xAxis: chart.xAxis,
          yAxis: chart.yAxis,
          data: transformedData,
          hasData: valuesHaveData(transformedData),
        };
      } catch (error) {
        console.error('Error transforming subregion data:', error);
        return {
          ...props,
          xAxis: { label: '' },
          yAxis: { label: '' },
          data: [],
          hasData: false,
        };
      }
    }
  }
  // Handle regular municipality data
  else if (tables.every((table) => state.chart.cache[table] && state.chart.cache[table][muni])) {
    const muniTables = tables.reduce((acc, table) => ({
      ...acc,
      [table]: state.chart.cache[table][muni]
    }), {});

    try {
      const transformedData = chart.transformer(muniTables, chart);
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

export default connect(mapStateToProps, mapDispatchToProps)(StackedAreaChart);
export { valuesHaveData };

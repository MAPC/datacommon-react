import { connect } from 'react-redux';
import GaugeChart from '../../components/visualizations/GaugeChart';
import { selectChartLoading } from '../../reducers/chartSlice';

function valuesHaveData(transformedData) {
  const checkData = transformedData.reduce((acc, row) => {
    let datumHasValue = false;
    if (row.value !== null && row.value !== undefined && !isNaN(row.value)) {
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
  const { muni, chart, isSubregion, isRPAregion } = props;
  const isLoading = selectChartLoading(state);
  const tables = Object.keys(chart.tables);

  // Handle subregion data
  if (isSubregion) {
    if (tables.every((table) => state.subregion.cache[table] && state.subregion.cache[table][muni])) {
      const subregionTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.subregion.cache[table][muni] }), {});
      return {
        ...props,
        data: chart.transformer(subregionTables, chart),
        hasData: valuesHaveData(chart.transformer(subregionTables, chart)),
        minValue: chart.minValue,
        maxValue: chart.maxValue,
        valueColor: chart.valueColor,
        backgroundColor: chart.backgroundColor,
        zones: chart.zones,
        showCenterCircle: chart.showCenterCircle,
        showUnit: chart.showUnit,
        showLabels: chart.showLabels,
        unit: chart.unit,
        minLabel: chart.minLabel,
        maxLabel: chart.maxLabel,
        valueFormat: chart.valueFormat,
        title: chart.title,
        width: chart.width,
        height: chart.height,
        isLoading,
      };
    }
  } else if (isRPAregion) {
    if (tables.every((table) => state.rparegion.cache[table] && state.rparegion.cache[table][muni])) {
      const rpaTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.rparegion.cache[table][muni] }), {});
      return {
        ...props,
        data: chart.transformer(rpaTables, chart),
        hasData: valuesHaveData(chart.transformer(rpaTables, chart)),
        minValue: chart.minValue,
        maxValue: chart.maxValue,
        valueColor: chart.valueColor,
        backgroundColor: chart.backgroundColor,
        zones: chart.zones,
        showCenterCircle: chart.showCenterCircle,
        showUnit: chart.showUnit,
        showLabels: chart.showLabels,
        unit: chart.unit,
        minLabel: chart.minLabel,
        maxLabel: chart.maxLabel,
        valueFormat: chart.valueFormat,
        title: chart.title,
        width: chart.width,
        height: chart.height,
        isLoading,
      };
    }
  } else if (tables.every((table) => state.chart.cache[table] && state.chart.cache[table][muni])) {
    const muniTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.chart.cache[table][muni] }), {});
    return {
      ...props,
      data: chart.transformer(muniTables, chart),
      hasData: valuesHaveData(chart.transformer(muniTables, chart)),
      minValue: chart.minValue,
      maxValue: chart.maxValue,
      valueColor: chart.valueColor,
      backgroundColor: chart.backgroundColor,
      zones: chart.zones,
      showCenterCircle: chart.showCenterCircle,
      showUnit: chart.showUnit,
      showLabels: chart.showLabels,
      unit: chart.unit,
      minLabel: chart.minLabel,
      maxLabel: chart.maxLabel,
      valueFormat: chart.valueFormat,
      title: chart.title,
      width: chart.width,
      height: chart.height,
      isLoading,
    };
  }

  return {
    ...props,
    data: [],
    hasData: false,
    minValue: 0,
    maxValue: 100,
    isLoading,
  };
};

const mapDispatchToProps = (dispatch, props) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(GaugeChart);
export { valuesHaveData };

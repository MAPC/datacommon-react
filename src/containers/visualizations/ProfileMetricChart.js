import { connect } from "react-redux";
import ProfileMetricChart from "../../components/visualizations/ProfileMetricChart";
import { selectChartLoading } from "../../reducers/chartSlice";

function metricHasData(transformedData) {
  if (!transformedData?.length) return false;
  const row = transformedData[0];
  if (!row) return false;
  const v = row.displayValue;
  return v != null && String(v).trim() !== "";
}

const mapStateToProps = (state, props) => {
  const { muni, chart, isSubregion, isRPAregion } = props;
  const isLoading = selectChartLoading(state);
  const tables = Object.keys(chart.tables);
  const statTitle = chart.title || "";

  const buildProps = (muniTables) => {
    const transformed = chart.transformer(muniTables, chart);
    const row = transformed[0] || {};
    const displayValue = row.displayValue != null ? String(row.displayValue) : "";
    return {
      displayValue,
      hasData: metricHasData(transformed),
      isLoading,
      title: statTitle,
    };
  };

  if (isSubregion) {
    if (tables.every((table) => state.subregion.cache[table]?.[muni])) {
      const subregionTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.subregion.cache[table][muni] }), {});
      return buildProps(subregionTables);
    }
  } else if (isRPAregion) {
    if (tables.every((table) => state.rparegion.cache[table]?.[muni])) {
      const rpaTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.rparegion.cache[table][muni] }), {});
      return buildProps(rpaTables);
    }
  } else if (tables.every((table) => state.chart.cache[table]?.[muni])) {
    const muniTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.chart.cache[table][muni] }), {});
    return buildProps(muniTables);
  }

  return {
    displayValue: "",
    hasData: false,
    isLoading,
    title: statTitle,
  };
};

const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(ProfileMetricChart);

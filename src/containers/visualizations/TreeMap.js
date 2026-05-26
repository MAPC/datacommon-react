import { connect } from "react-redux";
import TreeMap from "../../components/visualizations/TreeMap";

function valuesHaveData(transformedData) {
  if (!transformedData || !Array.isArray(transformedData) || transformedData.length === 0) {
    return false;
  }
  return transformedData.some((row) => {
    const raw = row.value ?? row.y;
    const value = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(value) && value > 0;
  });
}

const mapStateToProps = (state, props) => {
  const { muni, chart, isSubregion, isRPAregion } = props;
  const tables = Object.keys(chart.tables);

  if (isSubregion) {
    if (tables.every((table) => state.subregion.cache[table] && state.subregion.cache[table][muni])) {
      const subregionTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.subregion.cache[table][muni] }), {});
      const transformedData = chart.transformer(subregionTables, chart);
      return {
        ...props,
        data: transformedData,
        hasData: valuesHaveData(transformedData),
      };
    }
  } else if (isRPAregion) {
    if (tables.every((table) => state.rparegion.cache[table] && state.rparegion.cache[table][muni])) {
      const rpaTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.rparegion.cache[table][muni] }), {});
      const transformedData = chart.transformer(rpaTables, chart);
      return {
        ...props,
        data: transformedData,
        hasData: valuesHaveData(transformedData),
      };
    }
  } else if (tables.every((table) => state.chart.cache[table] && state.chart.cache[table][muni] && Array.isArray(state.chart.cache[table][muni]) && state.chart.cache[table][muni].length > 0)) {
    const muniTables = tables.reduce((acc, table) => Object.assign(acc, { [table]: state.chart.cache[table][muni] }), {});
    const transformedData = chart.transformer(muniTables, chart);
    return {
      ...props,
      data: transformedData,
      hasData: valuesHaveData(transformedData),
    };
  }

  return {
    ...props,
    data: [],
    hasData: false,
  };
};

const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(TreeMap);
export { valuesHaveData };

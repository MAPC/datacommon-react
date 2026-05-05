import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import locations from "../constants/locations";

export const fetchChartData = createAsyncThunk("chart/fetchData", async ({ chartInfo, municipality }, { dispatch, getState }) => {
  const { chart } = getState();

  for (const fullTableName of Object.keys(chartInfo.tables)) {
    // Skip if data already exists in cache
    if (chart.cache[fullTableName]?.[municipality]) {
      continue;
    }

    let { yearCol, where, latestYearOnly, years, specialFetch, columns } = chartInfo.tables[fullTableName];
    //check years is a function if so call it and assign to years
    if (typeof years === "function") {
      try {
        const yearsResult = await years();
        years = yearsResult;
      } catch (error) {
        console.error("Error executing years function:", error);
        return;
      }
    }
    // Create a dispatch update function to pass to specialFetch
    const dispatchUpdate = (data) => {
      dispatch(
        updateChart({
          table: fullTableName,
          muni: municipality,
          data,
        }),
      );
    };

    if (specialFetch) {
      // Return early if using specialFetch
      return await specialFetch(municipality.replace("-", " "), dispatchUpdate);
    }

    const schema = fullTableName.split('.')[0];
    const tableName = fullTableName.split('.')[1];
    const api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&schema=${schema}&table=${tableName}`;
    let query = `${api}&columns=${columns.join(',')}`;
    let filters = `&filters=municipal~${municipality.replace("-", " ")}`;

    if (yearCol && latestYearOnly && !years) {
      const yearResponse = await fetch(`${api}&columns=${yearCol}&orderByColumn=${yearCol}&orderByDirection=DESC&limit=1`);
      if (!yearResponse.ok) {
        throw new Error(`HTTP error! status: ${yearResponse.status}`);
      }
      
      const payload = (await yearResponse.json()) || {};

      if (payload.rows?.[0]?.[yearCol]) {
        filters = `${filters},${yearCol}:${payload.rows[0][yearCol]}`;
      }
    } else if (years) {
      const asFilters = years.map(y => `${yearCol}:${y}`);
      filters = `${filters},${asFilters.join(',')}`;
    }

    // TODO only one place this is needed.
    // if (where) {  
    //   query = `${query} AND ${where}`; 
    // }
    query = `${query}${filters}`;

    const response = await fetch(query);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const payload = (await response.json()) || {};

    dispatchUpdate(payload.rows || []);
  }
});

const chartSlice = createSlice({
  name: "chart",
  initialState: {
    cache: {},
    loading: false,
    error: null,
  },
  reducers: {
    updateChart: (state, action) => {
      const { table, muni, data } = action.payload;
      if (!table || !muni || !data) {
        return;
      }
      if (!state.cache[table]) {
        state.cache[table] = {};
      }
      state.cache[table][muni] = data;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChartData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChartData.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchChartData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { updateChart } = chartSlice.actions;
export default chartSlice.reducer;

// Selectors
export const selectChartData = (state, tableName, municipality) => state.chart.cache[tableName]?.[municipality];

export const selectChartLoading = (state) => state.chart.loading;
export const selectChartError = (state) => state.chart.error;

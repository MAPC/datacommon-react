import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import locations from "../constants/locations";

export const fetchChartData = createAsyncThunk("chart/fetchData", async ({ chartInfo, municipality }, { dispatch, getState }) => {
  const { chart } = getState();

  for (const tableName of Object.keys(chartInfo.tables)) {
    // Skip if data already exists in cache
    if (chart.cache[tableName]?.[municipality]) {
      continue;
    }

    let { yearCol, where, latestYearOnly, years, specialFetch, columns } = chartInfo.tables[tableName];
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
          table: tableName,
          muni: municipality,
          data,
        }),
      );
    };

    if (specialFetch) {
      // Return early if using specialFetch
      return await specialFetch(municipality.replace("-", " "), dispatchUpdate);
    }

    const api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
    let query = `${api}SELECT ${columns.join(",")} FROM ${tableName}`;
    query = `${query} WHERE municipal ilike '${municipality.replace("-", " ")}'`;

    if (yearCol && latestYearOnly && !years) {
      const yearResponse = await fetch(`${api}SELECT ${yearCol} from ${tableName} ORDER BY ${yearCol} DESC LIMIT 1`);
      const payload = (await yearResponse.json()) || {};

      if (payload.rows?.[0]?.[yearCol]) {
        query = `${query} AND ${yearCol} = '${payload.rows[0][yearCol]}'`;
      }
    } else if (years) {
      query = `${query} AND ${yearCol} IN (${years.map((y) => `'${y}'`).join(",")})`;
    }

    if (where) {
      query = `${query} AND ${where}`;
    }

    const response = await fetch(query);
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

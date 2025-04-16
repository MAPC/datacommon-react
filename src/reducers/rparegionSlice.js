import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import locations from '../constants/locations';

export const fetchRPAregionChartData = createAsyncThunk(
  "rparegion/fetchChartData",
  async ({ rpa_id  , chartInfo }, { dispatch, getState }) => {
    console.log('fetching rpa region chart data', rpa_id, chartInfo);
    const { rparegion } = getState();
    const tableNames = Object.keys(chartInfo.tables);

    const dispatchUpdate = (data, tableName) => {
      dispatch(
        updateRPAregionChart({
          table: tableName,
          muni: rpa_id,
          data,
        })
      );
    };

    // Get all queries first
    const queries = chartInfo.rparegionDataQuery(rpa_id);

    // Handle multiple tables - match each table with its corresponding query
    if (tableNames.length > 1) {
      // Make sure we have the same number of queries as tables
      if (queries.length !== tableNames.length) {
        console.error("Mismatch between number of tables and queries");
        return;
      }

      // Process each table with its corresponding query
      for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        const query = queries[i];
        let { years } = chartInfo.tables[tableName];

        if (rparegion.cache[tableName]?.[rpa_id]) {    
          continue;
        }

        if (typeof years === "function") {
          try {
            const yearsResult = await years();
            years = yearsResult;
          } catch (error) {
            console.error("Error executing years function:", error);
            continue;
          }
        }

        try {
          const api = `${locations.BROWSER_API}?token=${locations.DS_TOKEN}&query=${query}`;
          const response = await fetch(api);
          const payload = (await response.json()) || {};
          dispatchUpdate(payload.rows, tableName);
        } catch (error) {
          console.error(`Error fetching data for table ${tableName}:`, error);
        }
      }
      return;
    }

    // Handle single table
    const tableName = tableNames[0];
    let { years } = chartInfo.tables[tableName];

    if (typeof years === "function") {
      try {
        const yearsResult = await years();
        years = yearsResult;
      } catch (error) {
        console.error("Error executing years function:", error);
        return;
      }
    }

    try {
      // For single table, use the first (and should be only) query
      const query = Array.isArray(queries) ? queries[0] : queries;
      const api = `${locations.BROWSER_API}?token=${locations.DS_TOKEN}&query=${query}`;
      const response = await fetch(api);
      const payload = (await response.json()) || {};
      dispatchUpdate(payload.rows, tableName);
      return { table: tableName, muni: rpa_id, data: payload.rows };
    } catch (error) {
      console.error(`Error fetching data for table ${tableName}:`, error);
      throw error;
    }
  }
);

export const fetchRPAregionData = createAsyncThunk(
  "rparegion/fetchData",
  async () => {
    const api = `${locations.BROWSER_API}?token=${locations.DS_TOKEN}&query=`;
    const query = `
      SELECT 
        muni_id,
        muni_name,
        region as rpa_name,
		region_id as rpa_id
      FROM tabular._datakeys_muni_all
      WHERE rpa_name IS NOT NULL
      ORDER BY region, muni_name
    `;

    const response = await fetch(`${api}${encodeURIComponent(query)}`);
    const payload = await response.json();

    // Transform the data into the desired structure
    const rparegionMap = {};

    payload.rows?.forEach((row) => {
      const { muni_id, muni_name, rpa_name, rpa_id} = row;

      if (!rparegionMap[rpa_id]) {
        rparegionMap[rpa_id] = {
            rpa_name,
          municipalities: [],
          totalMunis: 0,
        };
      }

      // Add municipality data
      rparegionMap[rpa_id].municipalities.push({
        muni_name,
        muni_id,
      });

      rparegionMap[rpa_id].totalMunis =
        rparegionMap[rpa_id].municipalities.length;
    });

    return rparegionMap;
  }
);

const rparegionSlice = createSlice({
  name: "rparegion",
  initialState: {
    data: {},
    loading: false,
    error: null,
    cache: {}
  },
  reducers: {
    updateRPAregionChart: (state, action) => {
      const { table: tableName, muni: rparegionId, data } = action.payload;

      if (!tableName || !rparegionId || !data) {
        return;
      }

      if (!state.cache[tableName]) {
        state.cache[tableName] = {};
      }

      state.cache[tableName][rparegionId] = data;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRPAregionData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRPAregionData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchRPAregionData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchRPAregionChartData.fulfilled, (state, action) => {
        // No need to handle this case since we're using updateRPAregionChart reducer
      });
  },
});

export const { updateRPAregionChart } = rparegionSlice.actions;
export const selectRPAregionData = (state) => state.rparegion.data;
export const selectRPAregionLoading = (state) => state.rparegion.loading;
export const selectRPAregionError = (state) => state.rparegion.error;

export default rparegionSlice.reducer; 
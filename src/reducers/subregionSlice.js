import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import locations from "../constants/locations";

//fetch subregion chart data
export const fetchSubregionChartData = createAsyncThunk(
  "subregion/fetchChartData",
  async ({ subregionId, chartInfo }, { dispatch, getState }) => {
    const { subregion } = getState();
    const tableNames = Object.keys(chartInfo.tables);

    const dispatchUpdate = (data, tableName) => {
      dispatch(
        updateSubregionChart({
          table: tableName,
          muni: subregionId,
          data,
        })
      );
    };

    // Get all queries first
    const queries = chartInfo.subregionDataQuery(subregionId);

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

        if (subregion.cache[tableName]?.[subregionId]) {
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
    } catch (error) {
      console.error(`Error fetching data for table ${tableName}:`, error);
    }
  }
);

export const fetchSubregionData = createAsyncThunk(
  "subregion/fetchData",
  async () => {
    const api = `${locations.BROWSER_API}?token=${locations.DS_TOKEN}&query=`;
    const query = `
      SELECT 
        muni_id,
        muni_name,
        subrg_id,
        subrg_acr
      FROM tabular._datakeys_muni_all
      WHERE subrg_id IS NOT NULL
      ORDER BY subrg_id, muni_name
    `;

    const response = await fetch(`${api}${encodeURIComponent(query)}`);
    const payload = await response.json();

    // Transform the data into the desired structure
    const subregionMap = {};

    payload.rows?.forEach((row) => {
      const { muni_id, muni_name, subrg_id } = row;

      if (!subregionMap[subrg_id]) {
        subregionMap[subrg_id] = {
          municipalities: [],
          totalMunis: 0,
        };
      }

      // Add municipality data
      subregionMap[subrg_id].municipalities.push({
        muni_name,
        muni_id,
      });

      subregionMap[subrg_id].totalMunis =
        subregionMap[subrg_id].municipalities.length;
    });

    return subregionMap;
  }
);

const subregionSlice = createSlice({
  name: "subregion",
  initialState: {
    data: {},
    loading: false,
    error: null,
    cache: {}
  },
  reducers: {
    updateSubregionChart: (state, action) => {
      const { table: tableName, muni: subregionId, data } = action.payload; // Fix destructuring

      if (!tableName || !subregionId || !data) {
        return;
      }

      if (!state.cache[tableName]) {
        state.cache[tableName] = {};
      }

      state.cache[tableName][subregionId] = data;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubregionData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubregionData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchSubregionData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const selectSubregionData = (state) => state.subregion.data;
export const selectSubregionLoading = (state) => state.subregion.loading;
export const { updateSubregionChart } = subregionSlice.actions;
export default subregionSlice.reducer;

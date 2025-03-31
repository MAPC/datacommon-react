import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import locations from "../constants/locations";
import { fetchChartData } from "./chartSlice";

// Helper function to aggregate chart data for a subregion
const aggregateChartData = (chartData, municipalities) => {
  if (!chartData || !municipalities || municipalities.length === 0) return [];

  const aggregatedByYear = {};

  municipalities.forEach(muni => {
    const muniData = chartData[muni.muni_name.toLowerCase().replace(/\s+/g, '-')] || [];
    
    muniData.forEach(row => {
      const yearColumn = Object.keys(row).find(k => 
        k.toLowerCase() === 'fy' || k.toLowerCase().includes('year')
      );
      
      if (!yearColumn) return;
      
      const yearValue = row[yearColumn];
      
      if (!aggregatedByYear[yearValue]) {
        aggregatedByYear[yearValue] = {
          [yearColumn]: yearValue
        };
      }
      
      Object.entries(row).forEach(([key, value]) => {
        if (key !== yearColumn && typeof value === 'number') {
          aggregatedByYear[yearValue][key] = (aggregatedByYear[yearValue][key] || 0) + value;
        } else if (key !== yearColumn && !aggregatedByYear[yearValue][key]) {
          aggregatedByYear[yearValue][key] = value;
        }
      });
    });
  });

  return Object.values(aggregatedByYear);
};

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
    
    payload.rows?.forEach(row => {
      const { muni_id, muni_name, subrg_id } = row;
      
      if (!subregionMap[subrg_id]) {
        subregionMap[subrg_id] = {
          municipalities: [],
          totalMunis: 0
        };
      }
      
      // Add municipality data
      subregionMap[subrg_id].municipalities.push({
        muni_name,
        muni_id
      });

      subregionMap[subrg_id].totalMunis = subregionMap[subrg_id].municipalities.length;
    });
    
    return subregionMap;
  }
);

// New thunk to fetch missing municipality data
export const fetchMissingMunicipalityData = createAsyncThunk(
  "subregion/fetchMissingData",
  async ({ chartInfo, municipalities }, { dispatch, getState }) => {
    const state = getState();
    const tableName = Object.keys(chartInfo.tables)[0];
    
    // Check each municipality and fetch if data is missing
    for (const muni of municipalities) {
      const muniSlug = muni.muni_name.toLowerCase().replace(/\s+/g, '-');
      const existingData = state.chart.cache[tableName]?.[muniSlug];
      
      if (!existingData || existingData.length === 0) {
        await dispatch(fetchChartData({ 
          chartInfo, 
          municipality: muniSlug 
        }));
      }
    }
    
    return true;
  }
);

export const updateSubregionChart = createAsyncThunk(
  "subregion/updateChart",
  async ({ tableName, subregionId, data }) => {
    return { tableName, subregionId, data };
  }
);

const subregionSlice = createSlice({
  name: "subregion",
  initialState: {
    data: {},
    loading: false,
    error: null,
    cache: {},
    dataFetchStatus: {}, // Track fetch status for each subregion-table combination
  },
  reducers: {
    updateSubregionChart: (state, action) => {
      const { tableName, subregionName, data } = action.payload;
      if (!tableName || !subregionName || !data) {
        return;
      }
      if (!state.cache[tableName]) {
        state.cache[tableName] = {};
      }
      state.cache[tableName][subregionName] = data;
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
      })
      .addCase(fetchMissingMunicipalityData.fulfilled, (state, action) => {
        // Mark this subregion-table combination as fetched
        const { subregionId, tableName } = action.meta.arg;
        if (!state.dataFetchStatus[subregionId]) {
          state.dataFetchStatus[subregionId] = {};
        }
        state.dataFetchStatus[subregionId][tableName] = true;
      });
  },
});

// Selectors
export const selectSubregionData = (state) => state.subregion.data;
export const selectSubregionLoading = (state) => state.subregion.loading;
export const selectSubregionError = (state) => state.subregion.error;
export const selectMunicipalitiesBySubregion = (state, subregionId) => 
  state.subregion.data[subregionId]?.municipalities || [];

// Enhanced selector for chart data that handles aggregation
export const selectSubregionChartData = (state, tableName,  subregionId, chartInfo) => {
  const municipalities = selectMunicipalitiesBySubregion(state, subregionId);
  const chartData = {};
  let hasAllData = true;
  
  // First check if we have data for all municipalities
  municipalities.forEach(muni => {
    const muniSlug = muni.muni_name.toLowerCase().replace(/\s+/g, '-');
    const muniData = state.chart.cache[tableName]?.[muniSlug];
    
    if (!muniData || muniData.length === 0) {
      hasAllData = false;
    } else {
      chartData[muniSlug] = muniData;
    }
  });
  
  // Only aggregate if we have data for all municipalities
  return hasAllData ? aggregateChartData(chartData, municipalities) : [];
};

export default subregionSlice.reducer; 
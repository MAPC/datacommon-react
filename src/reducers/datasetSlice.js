import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import locations from "../constants/locations";
import { getCookie } from "../utils/cookies";

const initialState = {
  cache: [],
  categories: [],
  searchable: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

export const fetchDatasets = createAsyncThunk("dataset/fetchDatasets", async () => {
  // check if the user can view non-active datasets
  const cookie = getCookie('datacommon_mapc_token');
  let user;
  if (cookie) {
    const loggedInUserResp = await fetch(`${locations.BROWSER_API}/api/users/me`);
    const userJson = await loggedInUserResp.json();
    user = userJson.user;
  }

  let activeFilter = 'filters=active:Y';
  const validRoles = ['MAPC_USER', 'ADMIN', 'SADMIN'];
  if (user && user.organization === 'MAPC' && validRoles.includes(user.role)) {
    activeFilter = '';
  }

  const response = await fetch(
    `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&schema=tabular&table=_data_browser&${activeFilter}`,
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data.rows;
});

const datasetSlice = createSlice({
  name: "dataset",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDatasets.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        // remove the duplicate datasets using table_name to identify duplicates
        // note: we're leaving duplicates in the db b/c they have different menu1 values and we want to keep that for filtering
        //       we should still use the full list of all datasets with duplicates when doing category filtering
        const dupesRemoved = [];
        const seenDatasets = new Set();
        action.payload.forEach(dataset => {
          if (!seenDatasets.has(dataset.table_name)) {
            dupesRemoved.push(dataset);
            seenDatasets.add(dataset.table_name);
          }
        });

        state.status = "succeeded";
        state.cache = action.payload;
        state.noDupesDatasets = dupesRemoved;
        state.categories = [...new Set(action.payload.map((dataset) => dataset.menu1))].sort();
        state.searchable = action.payload.map((row) => ({
          id: row.seq_id,
          title: row.menu3,
          ...row, // Include all row data for complete search results
        }));
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default datasetSlice.reducer;

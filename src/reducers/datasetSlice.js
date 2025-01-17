import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import locations from '../constants/locations';

const initialState = {
  cache: [],
  categories: [],
  searchable: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null
};

export const fetchDatasets = createAsyncThunk(
  'dataset/fetchDatasets',
  async () => {
    const response = await fetch(
      `${locations.BROWSER_API}?token=${locations.DS_TOKEN}&query=SELECT * FROM tabular._data_browser WHERE active='Y'`
    );
    const data = await response.json();
    return data.rows;
  }
);

const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDatasets.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.cache = action.payload;
        state.categories = [...new Set(action.payload.map(dataset => dataset.menu1))].sort();
        state.searchable = action.payload.map(row => ({
          id: row.seq_id,
          title: row.menu3,
          ...row // Include all row data for complete search results
        }));
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default datasetSlice.reducer; 
import { createSlice } from '@reduxjs/toolkit';

const defaultContext = {
  query: '',
  results: [],
  hovering: null,
};

const initialState = {
  dataset: defaultContext,
  municipality: defaultContext,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setResults: (state, action) => {
      const { contextKey, results, query } = action.payload;
      state[contextKey] = {
        ...state[contextKey],
        results: results,
        query,
      };
    },
    setHovering: (state, action) => {
      const { contextKey, value } = action.payload;
      state[contextKey] = {
        ...state[contextKey],
        hovering: value,
      };
    },
    clearContext: (state, action) => {
      const { contextKey } = action.payload;
      state[contextKey] = defaultContext;
    },
  },
});

export const { setResults, setHovering, clearContext } = searchSlice.actions;
export default searchSlice.reducer; 
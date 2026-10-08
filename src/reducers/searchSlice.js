import { createSlice } from '@reduxjs/toolkit';

const defaultContext = {
  query: '',
  results: [],
  hovering: null,
  highlighted: [],
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
    setHighlighted: (state, action) => {
      const { contextKey, value } = action.payload;
      state[contextKey] = {
        ...state[contextKey],
        highlighted: Array.isArray(value) ? value : [],
      };
    },
    clearContext: (state, action) => {
      const { contextKey } = action.payload;
      state[contextKey] = defaultContext;
    },
  },
});

export const { setResults, setHovering, setHighlighted, clearContext } = searchSlice.actions;
export default searchSlice.reducer; 
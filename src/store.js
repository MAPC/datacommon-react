import { configureStore } from '@reduxjs/toolkit';
import datasetReducer from './reducers/datasetSlice';
import searchReducer from './reducers/searchSlice';

export const store = configureStore({
  reducer: {
    dataset: datasetReducer,
    search: searchReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;

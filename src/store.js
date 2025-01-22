import { configureStore } from '@reduxjs/toolkit';
import datasetReducer from './reducers/datasetSlice';
import searchReducer from './reducers/searchSlice';
import municipalityReducer from './reducers/municipalitySlice';
import chartReducer from './reducers/chartSlice';

export const store = configureStore({
  reducer: {
    dataset: datasetReducer,
    search: searchReducer,
    municipality: municipalityReducer,
    chart: chartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;

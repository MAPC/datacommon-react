import { configureStore } from '@reduxjs/toolkit';
import datasetReducer from './reducers/datasetSlice';
import searchReducer from './reducers/searchSlice';
import municipalityReducer from './reducers/municipalitySlice';
import chartReducer from './reducers/chartSlice';
import subregionReducer from './reducers/subregionSlice';
import rparegionReducer from './reducers/rparegionSlice';

export const store = configureStore({
  reducer: {
    dataset: datasetReducer,
    search: searchReducer,
    municipality: municipalityReducer,
    chart: chartReducer,
    subregion: subregionReducer,
    rparegion: rparegionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;

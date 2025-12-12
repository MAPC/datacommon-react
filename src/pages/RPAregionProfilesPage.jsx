import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import RPAregionProfilesView from '../components/RPAregionProfilesView';
import { fetchRPAregionData, selectRPAregionData, selectRPAregionLoading, selectRPAregionError } from '../reducers/rparegionSlice';

const RPAregionProfilesPage = () => {
  const dispatch = useDispatch();
  
  // Get all RPA region data from Redux store
  const rparegionData = useSelector(selectRPAregionData);
  const loading = useSelector(selectRPAregionLoading);
  const error = useSelector(selectRPAregionError);

  // Effect for fetching RPA region data
  useEffect(() => {
    if (!Object.keys(rparegionData).length) {
      dispatch(fetchRPAregionData());
    }
  }, [dispatch, rparegionData]);

  if (loading) {
    return <div>Loading RPA region data...</div>;
  }

  if (error) {
    return <div>Error loading RPA region data: {error}</div>;
  }

  return <RPAregionProfilesView />;
};

export default RPAregionProfilesPage; 
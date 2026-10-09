import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RPAregionProfilesView from '../components/RPAregionProfilesView';
import { fetchRPAregionData, selectRPAregionData, selectRPAregionLoading, selectRPAregionError } from '../reducers/rparegionSlice';

const RPAregionProfilesPage = () => {
  const dispatch = useDispatch();
  
  // Get MAPC region data from Redux store
  const rparegionData = useSelector(selectRPAregionData);
  const loading = useSelector(selectRPAregionLoading);
  const error = useSelector(selectRPAregionError);

  // Effect for fetching MAPC region data
  useEffect(() => {
    if (!Object.keys(rparegionData).length) {
      dispatch(fetchRPAregionData());
    }
  }, [dispatch, rparegionData]);

  if (loading) {
    return <div>Loading MAPC region data...</div>;
  }

  if (error) {
    return <div>Error loading MAPC region data: {error}</div>;
  }

  return <RPAregionProfilesView />;
};

export default RPAregionProfilesPage; 
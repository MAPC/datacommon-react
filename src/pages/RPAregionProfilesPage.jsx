import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import MoonLoader from 'react-spinners/MoonLoader';
import RPAregionProfilesView from '../components/RPAregionProfilesView';
import { fetchRPAregionData, selectRPAregionData, selectRPAregionLoading, selectRPAregionError } from '../reducers/rparegionSlice';

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 60vh;
  color: #767676;
  font-size: 1rem;
  text-align: center;
`;

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
    return (
      <LoadingState role="status" aria-live="polite">
        <MoonLoader size={42} color="#767676" aria-hidden="true" />
        <span>Loading MAPC region data...</span>
      </LoadingState>
    );
  }

  if (error) {
    return <div>Error loading MAPC region data: {error}</div>;
  }

  return <RPAregionProfilesView />;
};

export default RPAregionProfilesPage; 

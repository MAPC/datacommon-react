import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import SubregionProfilesView from '../components/SubregionProfilesView';
import { fetchSubregionData } from '../reducers/subregionSlice';

const SubregionProfilesPage = () => {
  const dispatch = useDispatch();
  const { subregionId } = useParams();
  
  // Get all subregion data from Redux store
  const subregionData = useSelector(state => state.subregion.data);
  const loading = useSelector(state => state.subregion.loading);
  const error = useSelector(state => state.subregion.error);

  // Effect for fetching subregion data
  useEffect(() => {
    if (!Object.keys(subregionData).length) {
      dispatch(fetchSubregionData());
    }
  }, [dispatch, subregionData]);

  if (loading) {
    return <div>Loading subregion data...</div>;
  }

  if (error) {
    return <div>Error loading subregion data: {error}</div>;
  }

  return <SubregionProfilesView />;
};

export default SubregionProfilesPage; 
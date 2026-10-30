import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import SubregionProfilesView from '../components/SubregionProfilesView';
import PageLoader from '../components/partials/PageLoader';
import { fetchSubregionData } from '../reducers/subregionSlice';

const SubregionProfilesPage = () => {
  const dispatch = useDispatch();
  
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

  if (loading || (!error && !Object.keys(subregionData).length)) {
    return <PageLoader message="Loading subregion data…" />;
  }

  if (error) {
    return <div>Error loading subregion data: {error}</div>;
  }

  return <SubregionProfilesView />;
};

export default SubregionProfilesPage; 
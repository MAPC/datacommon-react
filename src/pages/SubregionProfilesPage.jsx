import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import SubregionProfilesView from '../components/SubregionProfilesView';

const SubregionProfilesPage = () => {
  const { subregionId } = useParams();
  
  // Get subregion data from Redux store
  const subregionData = useSelector(state => state.subregion.data[subregionId]);
  
  if (!subregionData) {
    return <div>Subregion not found</div>;
  }

  return (
    <SubregionProfilesView />
  );
};

export default SubregionProfilesPage; 
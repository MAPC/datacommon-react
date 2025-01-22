import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import CommunityProfilesView from '../components/CommunityProfilesView';

const capitalize = (string) => {
  if (!string) return '';
  return string
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const CommunityProfilesPage = () => {
  const { muni: muniSlug, tab: tabSlug } = useParams();
  
  // Get municipality data from Redux store
  const municipalityCache = useSelector(state => state.municipality.cache);
  
  // Get the municipality data, defaulting to Boston if none selected
  const muni = muniSlug
    ? municipalityCache[muniSlug.toLowerCase()]
    : municipalityCache['boston'];

  if (!muni) {
    return <div>Municipality not found</div>;
  }

  return (
    <CommunityProfilesView 
      name={capitalize(muni.properties.town)}
      municipalFeature={muni}
      muniSlug={muniSlug}
      tabSlug={tabSlug}
    />
  );
};

export default CommunityProfilesPage;

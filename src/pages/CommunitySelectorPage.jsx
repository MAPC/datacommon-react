import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CommunitySelectorView from '../components/CommunitySelectorView';
import { fillPoly, emptyPoly } from '../reducers/municipalitySlice';

// Container component that handles data and logic
const CommunitySelectorPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { municipality, search } = useSelector(state => ({
    municipality: state.municipality,
    search: state.search.municipality
  }));

  // Process map data
  const munisPoly = { ...municipality.geojson };
  const { results, hovering } = search;

  const lineFeatures = results.length
    ? {
        ...munisPoly,
        features: munisPoly.features.filter((feature) =>
          !results.length ||
          results.indexOf(feature.properties.town.toLowerCase()) > -1
        ),
      }
    : munisPoly;

  const muniLines = {
    type: 'line',
    geojson: lineFeatures,
  };

  let muniFill = {
    type: 'fill',
    geojson: { ...munisPoly, features: [] },
  };

  if (hovering) {
    const upperHovering = hovering.toUpperCase();
    let filledMuniIndex = null;

    munisPoly.features.some((feature, i) => {
      if (feature.properties.town === upperHovering) {
        filledMuniIndex = i;
        return true;
      }
      return false;
    });

    if (filledMuniIndex !== null) {
      muniFill.geojson = {
        ...munisPoly,
        features: [munisPoly.features[filledMuniIndex]],
      };
    }
  }

  const handleMunicipalitySelect = (municipality) => {
    const formattedMuni = municipality.toLowerCase().replace(/\s+/g, '-');
    dispatch(fillPoly(formattedMuni));
    navigate(`/profile/${formattedMuni}`);
  };

  return (
    <CommunitySelectorView
      muniLines={muniLines}
      muniFill={muniFill}
      municipalityPoly={munisPoly}
      toProfile={handleMunicipalitySelect}
    />
  );
};

export default CommunitySelectorPage;
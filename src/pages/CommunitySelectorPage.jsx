import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createSelector } from '@reduxjs/toolkit';
import CommunitySelectorView from '../components/CommunitySelectorView';
import { fillPoly, emptyPoly } from '../reducers/municipalitySlice';

// Memoized selectors
const selectMunicipalityState = state => state.municipality;
const selectSearchState = state => state.search.municipality;

const selectProcessedMapData = createSelector(
  [selectMunicipalityState, selectSearchState],
  (municipality, search) => {
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

    return {
      muniLines,
      muniFill,
      municipalityPoly: munisPoly
    };
  }
);

// Container component that handles data and logic
const CommunitySelectorPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Use memoized selector
  const { muniLines, muniFill, municipalityPoly } = useSelector(selectProcessedMapData);

  // Memoize handler
  const handleMunicipalitySelect = useMemo(() => (municipality) => {
    const formattedMuni = municipality.toLowerCase().replace(/\s+/g, '-');
    dispatch(fillPoly(formattedMuni));
    navigate(`/profile/${formattedMuni}`);
  }, [dispatch, navigate]);

  return (
    <CommunitySelectorView
      muniLines={muniLines}
      muniFill={muniFill}
      municipalityPoly={municipalityPoly}
      toProfile={handleMunicipalitySelect}
    />
  );
};

export default React.memo(CommunitySelectorPage);
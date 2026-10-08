import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import CommunitySelectorView from '../components/CommunitySelectorView';
import { fillPoly, emptyPoly } from '../reducers/municipalitySlice';
import colors from '../constants/colors';

// Memoized selectors
const selectMunicipalityState = state => state.municipality;
const selectSearchState = state => state.search.municipality;

const selectProcessedMapData = createSelector(
  [selectMunicipalityState, selectSearchState],
  (municipality, search) => {
    const munisPoly = { ...municipality.geojson };
    const { results, hovering, highlighted = [] } = search;

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

    const emptyFill = { ...munisPoly, features: [] };
    const highlightTowns = new Set(
      (highlighted || []).map((name) => String(name || "").toUpperCase()).filter(Boolean),
    );

    const muniHighlight = {
      id: 'ma-highlight',
      type: 'fill',
      geojson: highlightTowns.size
        ? {
            ...munisPoly,
            features: munisPoly.features.filter((feature) =>
              highlightTowns.has(feature.properties.town),
            ),
          }
        : emptyFill,
      paint: {
        'fill-color': colors.BRAND.SUBREGION_HIGHLIGHT,
        'fill-opacity': 0.72,
      },
    };

    let muniFill = {
      type: 'fill',
      geojson: emptyFill,
    };

    if (hovering) {
      const upperHovering = String(hovering).toUpperCase();
      const hovered = munisPoly.features.filter((feature) =>
        feature.properties.town === upperHovering,
      );
      if (hovered.length) {
        muniFill.geojson = {
          ...munisPoly,
          features: hovered,
        };
      }
    }

    return {
      muniLines,
      muniHighlight,
      muniFill,
      municipalityPoly: munisPoly
    };
  }
);

export const CommunitySelectorMap = ({ searchBeside = false }) => {
  const dispatch = useDispatch();
  const { muniLines, muniHighlight, muniFill, municipalityPoly } = useSelector(selectProcessedMapData);

  const handleMunicipalitySelect = useCallback((municipality) => {
    const formattedMuni = municipality.toLowerCase().replace(/\s+/g, '-');
    dispatch(fillPoly(formattedMuni));
    const tab = window.open(`/profile/${formattedMuni}/demographics`, '_blank');
    tab.focus();
  }, [dispatch]);

  return (
    <CommunitySelectorView
      muniLines={muniLines}
      muniHighlight={muniHighlight}
      muniFill={muniFill}
      municipalityPoly={municipalityPoly}
      toProfile={handleMunicipalitySelect}
      searchBeside={searchBeside}
    />
  );
};

// Container component that handles data and logic
const CommunitySelectorPage = () => {
  // Styles
  const styles = {
    container: {
      maxWidth: "1200px", 
      margin: "0 auto"
    },
    heading: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      marginBottom: "1.5rem",
      color: "#1F4E46",
      paddingLeft: "2rem"
    },
    paragraph: {
      fontSize: "1rem",
      fontWeight: "lighter",
      lineHeight: "1.5rem",
      color: "#1F4E46",
      paddingLeft: "2rem",
      paddingRight: "2rem",
      textAlign: "justify"
    }
  };

  return (
    <>
      <section
        className="page-section"
      >
        <br />
        <div
          className="container"
          style={styles.container}
        >
          <h2
            style={styles.heading}
          >
            Community Profiles
          </h2>
          <p
            style={styles.paragraph}
          >
            MAPC's Community Profiles provide a comprehensive overview of each
            of the 351 cities and towns in Massachusetts. Each profile lets you
            explore data describing the population, housing characteristics,
            economy, transportation patterns, and other factors about a
            municipality. By aggregating data from state and federal agencies as
            well as data from our own planning and research work the profiles
            provide a single location where you can access and download
            information about any municipality.
          </p>
        </div>
      </section>
      <CommunitySelectorMap />
    </>
  );
};


export default React.memo(CommunitySelectorPage);
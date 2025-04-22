import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import CommunitySelectorView from "../components/CommunitySelectorView";
import { fillPoly, emptyPoly } from "../reducers/municipalitySlice";

// Container component that handles data and logic
const CommunitySelectorPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  const { municipality, search } = useSelector((state) => ({
    municipality: state.municipality,
    search: state.search.municipality,
  }));

  // Process map data
  const munisPoly = { ...municipality.geojson };
  const { results, hovering } = search;

  const lineFeatures = results.length
    ? {
        ...munisPoly,
        features: munisPoly.features.filter(
          (feature) =>
            !results.length ||
            results.indexOf(feature.properties.town.toLowerCase()) > -1
        ),
      }
    : munisPoly;

  const muniLines = {
    type: "line",
    geojson: lineFeatures,
  };

  let muniFill = {
    type: "fill",
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
    const formattedMuni = municipality.toLowerCase().replace(/\s+/g, "-");
    dispatch(fillPoly(formattedMuni));
    navigate(`/profile/${formattedMuni}`);
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
      <CommunitySelectorView
        muniLines={muniLines}
        muniFill={muniFill}
        municipalityPoly={munisPoly}
        toProfile={handleMunicipalitySelect}
      />
    </>
  );
};

export default CommunitySelectorPage;

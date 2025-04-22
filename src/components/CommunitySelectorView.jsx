import React from "react";
import PropTypes from "prop-types";
import MapBox from "./MapBox";
import SearchBar from "./partials/SearchBar";

const CommunitySelectorView = ({
  muniLines,
  muniFill,
  municipalityPoly,
  toProfile,
}) => {
  return (
    <section className="component CommunitySelector">
      <div className="search-box">
        <p>Search any community in Massachusetts to view their profile:</p>

        <SearchBar
          contextKey={"municipality"}
          onSelect={(muni) => {
            toProfile(muni.toLowerCase().replace(/\s+/g, "-"));
          }}
          placeholder={"Search for a community ..."}
          className={"small"}
        />
      </div>

      <MapBox
        layers={[muniLines, muniFill]}
        muniPoly={municipalityPoly}
        toProfile={toProfile}
      />
    </section>
  );
};

const layerShape = {
  type: PropTypes.string.isRequired,
  geojson: PropTypes.object.isRequired,
};

CommunitySelectorView.propTypes = {
  toProfile: PropTypes.func.isRequired,
  muniLines: PropTypes.shape(layerShape).isRequired,
  muniFill: PropTypes.shape(layerShape).isRequired,
  municipalityPoly: PropTypes.object.isRequired,
};

export default CommunitySelectorView;

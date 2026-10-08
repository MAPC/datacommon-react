import PropTypes from 'prop-types';
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import MapBox from './MapBox';
import SearchBar from './partials/SearchBar';
import CallToAction from './partials/CallToAction';
import AnimatedCount from './partials/AnimatedCount';
import { fetchSubregionData, selectSubregionData, selectSubregionLoading } from '../reducers/subregionSlice';
import { setHovering, setResults, clearContext } from '../reducers/searchSlice';
// import { fetchRPAregionData, selectRPAregionData, selectRPAregionLoading } from '../reducers/rparegionSlice';

const styles = {
  subregionSelector: {
    marginBottom: '1rem',
    position: 'relative'
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    border: 'none',
    backgroundColor: 'white',
    fontFamily: "skolar-sans-latin, Helvetica,sans-serif",
    height: '45px',
    color: '#95989A',
    padding: '0.5em 1.1em',
    fontSize: '1rem',
    fontWeight: '100',
  },
  selectFocus: {
    outline: 'none',
    boxShadow: '0 0 0 2px rgba(0,102,204,0.2)'
  },
  gradientBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'linear-gradient(to right, #6FC68E, #44aD89)',
    pointerEvents: 'none'
  }
};

// TODO: Get RPA regions from the muni datakeys table?
const RPAREGIONS = {
  352:'MAPC',
  402:'Central Massachusetts',
  403:'Northeastern Massachusetts',
  404:'Southeastern Massachusetts',
  405:'Western Massachusetts'
};

const CommunitySelectorView = ({ muniLines, muniFill, municipalityPoly, toProfile, searchBeside = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const subregionData = useSelector(selectSubregionData);
  // const rparegionData = useSelector(selectRPAregionData);
  const isLoading = useSelector(selectSubregionLoading);
  const muniSearch = useSelector((state) => state.search.municipality);

  const [selectedSubregion, setSelectedSubregion] = useState('');
  // const [selectedRPAregion, setSelectedRPAregion] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedMuni, setSelectedMuni] = useState('');

  useEffect(() => {
    dispatch(fetchSubregionData());
    // dispatch(fetchRPAregionData());
  }, [dispatch]);

  const formatMuniName = (municipality) =>
    String(municipality || "").toLowerCase().replace(/-/g, " ").trim();

  const formatMuniSlug = (municipality) =>
    formatMuniName(municipality).replace(/\s+/g, "-");

  const firstSearchResult = formatMuniName(muniSearch?.results?.[0] || "");
  const resolvedMuni = selectedMuni || firstSearchResult;
  const profileHref = resolvedMuni
    ? `/profile/${formatMuniSlug(resolvedMuni)}/demographics`
    : selectedSubregion
      ? `/profile/subregion/${selectedSubregion}/demographics`
      : "";
  const profileHrefRef = useRef(profileHref);
  profileHrefRef.current = profileHref;

  const handleSubregionChange = (event) => {
    const subregionId = event.target.value;
    setSelectedSubregion(subregionId);
    if (subregionId) {
      setSelectedMuni("");
      dispatch(clearContext({ contextKey: "municipality" }));
    }
    if (!searchBeside && subregionId) {
      const tab = window.open(`/profile/subregion/${subregionId}/demographics`, "_blank");
      tab.focus();
    }
  };

  const handleMuniSelect = (muni) => {
    if (searchBeside) {
      setSelectedMuni(formatMuniName(muni));
      setSelectedSubregion("");
      return;
    }
    toProfile(muni);
  };

  const goToProfile = (muni) => {
    if (muni) {
      const name = formatMuniName(muni);
      setSelectedMuni(name);
      setSelectedSubregion("");
      navigate(`/profile/${formatMuniSlug(name)}/demographics`);
      return;
    }
    if (!profileHrefRef.current) return;
    navigate(profileHrefRef.current);
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    goToProfile();
  };

  const handleSearchBoxKeyDown = (event) => {
    if (event.key !== "Enter" || event.repeat) return;
    if (!profileHrefRef.current) return;
    const tag = event.target.tagName;
    if (tag === "A" || tag === "BUTTON") return;
    event.preventDefault();
    goToProfile();
  };

  const handleSubregionKeyDown = (event) => {
    if (event.key !== "Enter" || event.repeat || !searchBeside) return;
    const subregionId = event.target.value;
    if (!subregionId) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(`/profile/subregion/${subregionId}/demographics`);
  };

  // const handleRPAregionChange = (event) => {
  //   const rpaId = event.target.value;
  //   setSelectedRPAregion(rpaId);
  //   setSelectedSubregion('');
  //   if (rpaId) {
  //     navigate(`/profile/rpa/${rpaId}`);
  //   }
  // };

  useEffect(() => {
    if (!searchBeside || !selectedMuni) return;
    if (muniSearch?.hovering !== selectedMuni) {
      dispatch(setHovering({ contextKey: "municipality", value: selectedMuni }));
    }
  }, [dispatch, searchBeside, selectedMuni, muniSearch?.hovering]);

  const searchBoxInner = (
    <>
      {searchBeside ? (
        <div className="home-geo-intro">
          <p className="home-geo-intro__title">Explore the MAPC region through data.</p>
          <p className="home-geo-intro__lede">
            Discover housing, demographics, transportation, environment, and more—and explore the communities that matter to you.
          </p>
        </div>
      ) : (
        <p>Search any community in Massachusetts to view their profile:</p>
      )}

      <div style={styles.subregionSelector}>
        <select 
          value={selectedSubregion}
          onChange={handleSubregionChange}
          onKeyDown={handleSubregionKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            ...styles.select,
            ...(isFocused ? styles.selectFocus : {})
          }}
          disabled={isLoading}
        >
          <option value="">Select a Subregion</option>
          {Object.entries(subregionData).map(([id, subregionData]) => (
            <option key={id} value={id}>{subregionData.subregionName}</option>
          ))}
        </select>
        <div style={styles.gradientBorder}></div>
      </div>

      <div className="search-box-or" aria-hidden="true">or</div>

      <SearchBar
        contextKey={'municipality'}
        onSelect={handleMuniSelect}
        onEnter={searchBeside ? goToProfile : undefined}
        clearOnSelect={!searchBeside}
        placeholder={'Search for a community ...'}
        className={"small"}
      />

      {searchBeside && (
        <>
          <CallToAction
            type="submit"
            text="View Profile"
            extraClassNames={`home-view-profile-cta${profileHref ? "" : " needs-selection"}`}
            dataTooltip={
              profileHref
                ? undefined
                : "Select a community or subregion first"
            }
          />
          <div className="home-profile-includes">
            <p className="home-profile-includes__title">Every profile includes</p>
            <ul className="home-profile-includes__list">
              <li>
                <AnimatedCount as="strong" end={9} duration={1000} />
                <span>topics</span>
              </li>
              <li>
                <strong>PNG</strong>
                <span>per chart</span>
              </li>
              <li>
                <strong>PDF</strong>
                <span>full export</span>
              </li>
              <li>
                <AnimatedCount as="strong" end={20} suffix="+" duration={1400} />
                <span>visualizations</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </>
  );

  const searchBox = searchBeside ? (
    <form className="search-box" onSubmit={handleProfileSubmit} onKeyDown={handleSearchBoxKeyDown}>
      {searchBoxInner}
    </form>
  ) : (
    <div className="search-box">
      {searchBoxInner}
    </div>
  );

  const selectionOutlineFeatures = (() => {
    const filled = muniFill?.geojson?.features || [];
    if (filled.length) return filled;
    const matches = (muniSearch?.results || []).map((name) => String(name).toLowerCase());
    if (!matches.length) return [];
    return (municipalityPoly?.features || []).filter((feature) =>
      matches.includes(String(feature.properties.town || "").toLowerCase()),
    );
  })();

  const highlightTowns = new Set(
    selectionOutlineFeatures.map((feature) => feature.properties.town),
  );

  const homeMuniLines = searchBeside && highlightTowns.size
    ? {
        ...muniLines,
        id: "ma-line",
        geojson: {
          ...muniLines.geojson,
          features: (muniLines.geojson?.features || []).filter(
            (feature) => !highlightTowns.has(feature.properties.town),
          ),
        },
      }
    : muniLines;

  const selectionOutline = searchBeside
    ? {
        id: "ma-selection-line",
        type: "line",
        geojson: {
          type: "FeatureCollection",
          features: selectionOutlineFeatures,
        },
        paint: {
          "line-color": "#000000",
          "line-width": 2,
          "line-opacity": 1,
        },
      }
    : null;

  const map = (
    <MapBox
      layers={[homeMuniLines, muniFill, selectionOutline].filter(Boolean)}
      muniPoly={municipalityPoly}
      toProfile={searchBeside ? goToProfile : toProfile}
      fitPadding={searchBeside ? { top: 24, left: 24, right: 24, bottom: 24 } : undefined}
    />
  );

  return (
    <section className={`component CommunitySelector${searchBeside ? " CommunitySelector--search-beside" : ""}`}>
      {searchBox}
      {map}
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
  searchBeside: PropTypes.bool,
};

export default CommunitySelectorView;

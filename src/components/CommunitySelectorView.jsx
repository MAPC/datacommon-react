import PropTypes from 'prop-types';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import MapBox from './MapBox';
import SearchBar from './partials/SearchBar';
import CallToAction from './partials/CallToAction';
import AnimatedCount from './partials/AnimatedCount';
import { fetchSubregionData, selectSubregionData, selectSubregionLoading } from '../reducers/subregionSlice';
import { setHovering, setHighlighted, clearContext } from '../reducers/searchSlice';
import capitalize from '../utils/capitalize';

const ALL_MASSACHUSETTS = "all";
const MAPC_REGION = "mapc";
const MAPC_REGION_NAME = "Metropolitan Area Planning Council [MAPC]";
const MAPC_PROFILE_HREF = "/profile/rpa/352/demographics";

const townKey = (municipality) => String(municipality || "").toLowerCase().trim();

const formatMuniSlug = (municipality) =>
  townKey(municipality).replace(/-/g, " ").replace(/\s+/g, "-");

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

const CommunitySelectorView = ({ muniLines, muniHighlight, muniFill, municipalityPoly, toProfile, searchBeside = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const subregionData = useSelector(selectSubregionData);
  const isLoading = useSelector(selectSubregionLoading);
  const muniSearch = useSelector((state) => state.search.municipality);

  const [selectedSubregion, setSelectedSubregion] = useState(searchBeside ? ALL_MASSACHUSETTS : "");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedMuni, setSelectedMuni] = useState("");

  useEffect(() => {
    dispatch(fetchSubregionData());
  }, [dispatch]);

  const isMapcRegion = selectedSubregion === MAPC_REGION;
  const isSpecificSubregion = Boolean(
    selectedSubregion &&
    selectedSubregion !== ALL_MASSACHUSETTS &&
    selectedSubregion !== MAPC_REGION &&
    subregionData[selectedSubregion],
  );
  const isRegionSelection = isSpecificSubregion || isMapcRegion;
  const activeSubregion = isSpecificSubregion ? subregionData[selectedSubregion] : null;
  const regionProfileHref = (id) => {
    if (id === MAPC_REGION) return MAPC_PROFILE_HREF;
    if (subregionData[id]) return `/profile/subregion/${id}/demographics`;
    return "";
  };
  const activeRegionProfileHref = regionProfileHref(selectedSubregion);
  const regionAcronym = isMapcRegion
    ? "MAPC"
    : activeSubregion?.subregionAcronym
      || activeSubregion?.subregionName?.match(/\[([^\]]+)\]/)?.[1]
      || "";
  const regionTitle = isMapcRegion
    ? MAPC_REGION_NAME
    : activeSubregion?.subregionName;
  const regionProfileLabel = isMapcRegion
    ? "View MAPC profile"
    : "View subregion profile";
  const mapcMunis = useMemo(() => {
    const seen = new Set();
    const munis = [];
    Object.values(subregionData).forEach((region) => {
      (region.municipalities || []).forEach((muni) => {
        const key = townKey(muni.muni_name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        munis.push(muni);
      });
    });
    return munis.sort((a, b) =>
      String(a.muni_name || "").localeCompare(String(b.muni_name || ""), undefined, { sensitivity: "base" }),
    );
  }, [subregionData]);
  const subregionMunis = useMemo(() => {
    const munis = activeSubregion?.municipalities || [];
    return [...munis].sort((a, b) =>
      String(a.muni_name || "").localeCompare(String(b.muni_name || ""), undefined, { sensitivity: "base" }),
    );
  }, [activeSubregion]);
  const regionMunis = isMapcRegion ? mapcMunis : subregionMunis;
  const highlightedTowns = useMemo(
    () => regionMunis.map((muni) => townKey(muni.muni_name)).filter(Boolean),
    [regionMunis],
  );

  const profileHref = selectedMuni
    ? `/profile/${formatMuniSlug(selectedMuni)}/demographics`
    : activeRegionProfileHref;
  const profileHrefRef = useRef(profileHref);
  profileHrefRef.current = profileHref;

  useEffect(() => {
    if (!searchBeside) return;
    dispatch(setHighlighted({ contextKey: "municipality", value: highlightedTowns }));
  }, [dispatch, searchBeside, highlightedTowns]);

  useEffect(() => {
    return () => {
      if (!searchBeside) return;
      dispatch(setHighlighted({ contextKey: "municipality", value: [] }));
    };
  }, [dispatch, searchBeside]);

  const handleSubregionChange = (event) => {
    const subregionId = event.target.value;
    setSelectedSubregion(subregionId);
    setSelectedMuni("");
    dispatch(clearContext({ contextKey: "municipality" }));
    const href = regionProfileHref(subregionId);
    if (!searchBeside && href) {
      const tab = window.open(href, "_blank");
      tab.focus();
    }
  };

  const handleMuniSelect = (muni) => {
    if (searchBeside) {
      setSelectedMuni(townKey(muni));
      return;
    }
    toProfile(muni);
  };

  const handleCommunitySelectChange = (event) => {
    setSelectedMuni(townKey(event.target.value));
  };

  const goToProfile = (muni) => {
    if (muni) {
      const name = townKey(muni);
      setSelectedMuni(name);
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
    if (tag === "A" || tag === "BUTTON" || tag === "SELECT") return;
    event.preventDefault();
    goToProfile();
  };

  const handleSubregionKeyDown = (event) => {
    if (event.key !== "Enter" || event.repeat || !searchBeside) return;
    const href = regionProfileHref(event.target.value);
    if (!href) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(href);
  };

  useEffect(() => {
    if (!searchBeside || !selectedMuni) return;
    if (muniSearch?.hovering !== selectedMuni) {
      dispatch(setHovering({ contextKey: "municipality", value: selectedMuni }));
    }
  }, [dispatch, searchBeside, selectedMuni, muniSearch?.hovering]);

  const focusTowns = searchBeside
    ? (highlightedTowns.length ? highlightedTowns : (selectedMuni ? [selectedMuni] : []))
    : [];

  const ctaText = selectedMuni
    ? `View ${capitalize(selectedMuni)} profile`
    : activeRegionProfileHref
      ? regionProfileLabel
      : "Choose a Subregion or RPA or search a community";

  const profileIncludes = (
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
  );

  const subregionOptions = Object.entries(subregionData).map(([id, region]) => (
    <option key={id} value={id}>{region.subregionName}</option>
  ));

  const homepageSearch = (
    <div className="home-geo-search">
      <div className="home-geo-intro">
        <p className="home-geo-intro__title">Explore the MAPC region through data.</p>
        <p className="home-geo-intro__lede">
          Discover housing, demographics, transportation, environment, and more—and explore the communities that matter to you.
        </p>
      </div>
      <div className="home-geo-search__step">
        <div className="home-geo-search__label">
          <span className="home-geo-search__num" aria-hidden="true">1</span>
          <span>
            Subregion or RPA or All communities in Massachusetts
          </span>
        </div>
        <div className="home-geo-search__select-wrap">
          <select
            value={selectedSubregion}
            onChange={handleSubregionChange}
            onKeyDown={handleSubregionKeyDown}
            disabled={isLoading}
            aria-label="Subregion or RPA or All communities in Massachusetts"
          >
            <option value={ALL_MASSACHUSETTS}>
              All communities in Massachusetts
            </option>
            <option value={MAPC_REGION}>{MAPC_REGION_NAME}</option>
            {subregionOptions}
          </select>
        </div>
      </div>

      {isRegionSelection && (
        <div className="home-geo-search__banner">
          <div className="home-geo-search__banner-copy">
            <p className="home-geo-search__banner-title">
              {regionTitle}
            </p>
            <p className="home-geo-search__banner-meta">
              {regionMunis.length} communities highlighted on the map
            </p>
          </div>
          {activeRegionProfileHref && (
            <a
              className="home-geo-search__banner-link"
              href={activeRegionProfileHref}
            >
              {regionProfileLabel}
            </a>
          )}
        </div>
      )}

      <div className="home-geo-search__step">
        <div className="home-geo-search__label">
          <span className="home-geo-search__num" aria-hidden="true">2</span>
          <span>
            {isRegionSelection && regionAcronym
              ? `Community in ${regionAcronym}`
              : "Community"}
          </span>
        </div>
        {isRegionSelection ? (
          <>
            <div className="home-geo-search__select-wrap">
              <select
                value={selectedMuni}
                onChange={handleCommunitySelectChange}
                aria-label={`Community in ${regionAcronym || "this region"}`}
              >
                <option value="">Select a community</option>
                {regionMunis.map((muni) => {
                  const name = townKey(muni.muni_name);
                  return (
                    <option key={muni.muni_id || name} value={name}>
                      {muni.muni_name}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="home-geo-search__hint">
              {isMapcRegion
                ? "Leave blank to open the MAPC profile, or click a town on the map."
                : "Leave blank to open the subregion profile, or click a town on the map."}
            </p>
          </>
        ) : (
          <SearchBar
            contextKey="municipality"
            onSelect={handleMuniSelect}
            onEnter={goToProfile}
            clearOnSelect={false}
            placeholder="Search for a community ..."
            className="small home-geo-community-search"
          />
        )}
      </div>

      <CallToAction
        type="submit"
        text={ctaText}
        disabled={!profileHref}
        extraClassNames={`home-view-profile-cta${profileHref ? "" : " needs-selection"}`}
        dataTooltip={
          profileHref
            ? undefined
            : "Choose a Subregion or RPA or search a community"
        }
      />
      {profileIncludes}
    </div>
  );

  const originalSearch = (
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
          {subregionOptions}
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
    </>
  );

  const searchBox = searchBeside ? (
    <form className="search-box" onSubmit={handleProfileSubmit} onKeyDown={handleSearchBoxKeyDown}>
      {homepageSearch}
    </form>
  ) : (
    <div className="search-box">
      {originalSearch}
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
      layers={[homeMuniLines, muniHighlight, muniFill, selectionOutline].filter(Boolean)}
      muniPoly={municipalityPoly}
      toProfile={searchBeside ? goToProfile : toProfile}
      fitPadding={searchBeside ? { top: 24, left: 24, right: 24, bottom: 24 } : undefined}
      focusTowns={focusTowns}
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
  muniHighlight: PropTypes.shape(layerShape),
  muniFill: PropTypes.shape(layerShape).isRequired,
  municipalityPoly: PropTypes.object.isRequired,
  searchBeside: PropTypes.bool,
};

export default CommunitySelectorView;

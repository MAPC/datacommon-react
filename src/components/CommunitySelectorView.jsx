import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import MapBox from './MapBox';
import SearchBar from './partials/SearchBar';
import { fetchSubregionData, selectSubregionData, selectSubregionLoading } from '../reducers/subregionSlice';
import { fetchRPAregionData, selectRPAregionData, selectRPAregionLoading } from '../reducers/rparegionSlice';
import { SUBREGIONS } from '../constants/subregions';

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

const CommunitySelectorView = ({ muniLines, muniFill, municipalityPoly, toProfile }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const subregionData = useSelector(selectSubregionData);
  const rparegionData = useSelector(selectRPAregionData);
  const isLoading = useSelector(selectSubregionLoading);
  const [selectedSubregion, setSelectedSubregion] = useState('');
  const [selectedRPAregion, setSelectedRPAregion] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    dispatch(fetchSubregionData());
    dispatch(fetchRPAregionData());
  }, [dispatch]);

  const handleSubregionChange = (event) => {
    const subregionId = event.target.value;
    setSelectedSubregion(subregionId);
    setSelectedRPAregion('');
    if (subregionId) {
      navigate(`/profile/subregion/${subregionId}`);
    }
  };

  const handleRPAregionChange = (event) => {
    const rpaId = event.target.value;
    setSelectedRPAregion(rpaId);
    setSelectedSubregion('');
    if (rpaId) {
      navigate(`/profile/rpa/${rpaId}`);
    }
  };

  const handleMuniSelect = (muni) => {
    if (selectedSubregion) {
      navigate(`/profile/subregion/${selectedSubregion}/${muni.toLowerCase().replace(/\s+/g, '-')}`);
    } else if (selectedRPAregion) {
      navigate(`/profile/rparegion/${selectedRPAregion}/${muni.toLowerCase().replace(/\s+/g, '-')}`);
    } else {
      toProfile(muni);
    }
  };

  return (
    <section className="component CommunitySelector">
      <div className="search-box">
        <p>Search any community in Massachusetts to view their profile:</p>

        <div style={styles.subregionSelector}>
          <select 
            value={selectedSubregion}
            onChange={handleSubregionChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              ...styles.select,
              ...(isFocused ? styles.selectFocus : {})
            }}
            disabled={isLoading}
          >
            <option value="">Select a Subregion</option>
            {Object.entries(SUBREGIONS).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <div style={styles.gradientBorder}></div>
        </div>

{/* 
        <div style={styles.subregionSelector}>
          <select 
            value={selectedSubregion}
            onChange={handleRPAregionChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              ...styles.select,
              ...(isFocused ? styles.selectFocus : {})
            }}
            disabled={isLoading}
          >
            <option value="">Select a RPA</option>
            {Object.entries(RPAREGIONS).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div> */}

        <SearchBar
          contextKey={'municipality'}
          onSelect={handleMuniSelect}
          placeholder={'Search for a community ...'}
          className={"small"}
        />
      </div>

      <MapBox
        layers={[muniLines, muniFill]}
        muniPoly={municipalityPoly}
        toProfile={handleMuniSelect}
        selectedSubregion={selectedSubregion}
        subregionData={subregionData}
        selectedRPAregion={selectedRPAregion}
        rparegionData={rparegionData}
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

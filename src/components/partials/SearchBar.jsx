import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { setResults, setHovering, clearContext } from '../../reducers/searchSlice';
import wordSearch from '../../utils/wordSearch';
import capitalize from '../../utils/capitalize';

const SearchBar = ({ 
  contextKey, 
  searchColumn, 
  onSelect, 
  placeholder, 
  className = '' 
}) => {
  const dispatch = useDispatch();
  const searchState = useSelector((state) => state.search[contextKey]);
  
  // Get searchable data based on context
  const searchableData = useSelector((state) => 
    contextKey === 'municipality' 
      ? state.municipality.searchable 
      : state.dataset.searchable
  );
  
  // Handle search input changes
  const handleSearch = (query) => {
    const results = query.length
      ? wordSearch(searchableData, query, searchColumn)
      : [];
      
    dispatch(setResults({ contextKey, results, query }));
  };

  // Handle result selection
  const handleResultSelect = (result) => {
    onSelect(result);
    dispatch(clearContext({ contextKey }));
  };

  // Handle result hover
  const handleResultHover = (result) => {
    dispatch(setHovering({ contextKey, value: result }));
  };

  // Render search results if available
  const renderSearchResults = () => {
    const { results, query } = searchState;
    
    if (!results.length || !query.length) {
      return null;
    }

    return (
      <ul className="styled lift">
        {results.map((result) => {
          const displayValue = result[searchColumn] || result;
          const key = result[searchColumn] 
            ? `${result.id}-${result[searchColumn]}` 
            : result;

          return (
            <li
              key={key}
              onClick={() => handleResultSelect(result)}
              onMouseEnter={() => handleResultHover(result)}
              onMouseLeave={() => handleResultHover(null)}
            >
              <span className="a-tag">
                {capitalize(displayValue)}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => dispatch(clearContext({ contextKey }));
  }, [dispatch, contextKey]);

  return (
    <div className={`component SearchBar ${className}`}>
      <input
        value={searchState.query || ''}
        placeholder={placeholder}
        onChange={({ target }) => handleSearch(target.value)}
      />
      {renderSearchResults()}
    </div>
  );
};

SearchBar.propTypes = {
  contextKey: PropTypes.string.isRequired,
  searchColumn: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default SearchBar; 
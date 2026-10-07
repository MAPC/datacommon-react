import React, { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { setResults, setHovering, clearContext } from '../../reducers/searchSlice';
import wordSearch from '../../utils/wordSearch';
import capitalize from '../../utils/capitalize';

const SearchBar = ({ 
  contextKey, 
  searchColumn, 
  onSelect, 
  onEnter,
  placeholder, 
  className = '',
  disabled = false,
  additionalSearchable = [],
  searchable = null,
  clearOnSelect = true,
}) => {
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const searchState = useSelector((state) => state.search[contextKey]);
  
  // Get searchable data based on context, unless a custom list is provided
  const reduxSearchableData = useSelector((state) => 
    contextKey === 'municipality' 
      ? state.municipality.searchable 
      : state.dataset.searchable
  );
  const baseSearchableData = searchable ?? reduxSearchableData;

  const searchableData = useMemo(
    () => [...(additionalSearchable || []), ...(baseSearchableData || [])],
    [additionalSearchable, baseSearchableData],
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
    if (clearOnSelect) {
      dispatch(clearContext({ contextKey }));
      return;
    }
    const displayValue = result[searchColumn] || result;
    dispatch(setResults({ contextKey, results: [], query: displayValue }));
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || !onEnter) return;
    event.preventDefault();
    event.stopPropagation();
    const { results, query } = searchState;
    onEnter(results[0] || query || undefined);
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
        ref={inputRef}
        value={searchState.query || ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={({ target }) => handleSearch(target.value)}
        onKeyDown={handleKeyDown}
      />
      {renderSearchResults()}
    </div>
  );
};

SearchBar.propTypes = {
  contextKey: PropTypes.string.isRequired,
  searchColumn: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onEnter: PropTypes.func,
  clearOnSelect: PropTypes.bool,
  placeholder: PropTypes.string.isRequired,
  className: PropTypes.string,
  additionalSearchable: PropTypes.arrayOf(PropTypes.string),
  searchable: PropTypes.array,
};

export default SearchBar; 
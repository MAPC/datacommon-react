import React, {  useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { setResults, setHovering, clearContext } from '../../reducers/searchSlice';
import wordSearch from '../../utils/wordSearch';
import capitalize from '../../utils/capitalize';

const SearchBar = ({ contextKey, searchColumn, action, placeholder, className = '' }) => {
  const dispatch = useDispatch();
  const searchState = useSelector((state) => state.search[contextKey]);
  const { searchable } = useSelector((state) => state.dataset);
  
  const search = (query) => {
    const results = query.length
      ? wordSearch(searchable, query, searchColumn)
      : searchable;
      
    dispatch(setResults({ contextKey, results, query }));
  };

  const executeAction = (result) => {
    if (action) {
      action(result);
    }
    dispatch(clearContext({ contextKey }));
  };

  const renderResults = () => {
    if (!searchState.results.length || !searchState.query.length) return null;

    return (
      <ul className="styled lift">
        {searchState.results.map((result) => (
          <li
            key={result[searchColumn] ? `${result.id}-${result[searchColumn]}` : result}
            onClick={() => executeAction(result)}
            onMouseEnter={() => dispatch(setHovering({ contextKey, value: result }))}
            onMouseLeave={() => dispatch(setHovering({ contextKey, value: null }))}
          >
            <span className="a-tag">
              {capitalize(result[searchColumn] || result)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  useEffect(() => {
    return () => {
      dispatch(clearContext({ contextKey }));
    };
  }, [dispatch, contextKey]);

  return (
    <div className={`component SearchBar ${className}`}>
      <input
        value={searchState.query || ''}
        placeholder={placeholder}
        onChange={({ target }) => search(target.value)}
      />
      {renderResults()}
    </div>
  );
};

SearchBar.propTypes = {
  contextKey: PropTypes.string.isRequired,
  searchColumn: PropTypes.string,
  action: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default SearchBar; 
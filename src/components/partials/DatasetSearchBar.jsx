import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { filterDatasets, highlightDatasets, sortDatasets } from '../../utils/manageDatasets';

const SearchContainer = styled.div`
  position: relative;
  z-index: 10;
  min-width: 400px;
  max-width: ${props => props.maxWidth || '800px'};
  margin: 0 auto;
  width: 100%;
  
  /* Gradient bar after input */
  &::after {
    content: '';
    display: block;
    position: absolute;
    bottom: -5px;
    left: 0;
    width: 100%;
    height: 5px;
    background: linear-gradient(to right, #6FC68E, #44aD89);
  }
  
  @media (max-width: 768px) {
    width: 90%;
    min-width: 200px;
    
    &::after {
      height: 3px;
    }
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.6em 1.3em;
  font-size: 1.25rem;
  font-weight: 100;
  font-family: 'skolar-sans-latin', Helvetica, sans-serif;
  border: none;
  outline: none;
  background: white;
  
  @media (max-width: 768px) {
    padding: 0.5em 1.1em;
    font-size: 1rem;
  }
  
  &::placeholder {
    color: #999;
  }
`;

const DropdownContainer = styled.ul`
  position: absolute;
  top: 60px;
  left: 0;
  z-index: -1;
  width: 100%;
  max-height: ${props => props.maxHeight || '50vh'};
  margin-top: 0;
  border: 1px solid #95989A;
  border-top: none;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,.14);
  background: white;
  
  @media (max-width: 768px) {
    top: 45px;
    max-height: ${props => props.maxHeightMobile || '35vh'};
  }
`;

const DropdownItem = styled.li`
  font-size: 1rem;
  background: #FFFFFF;
  
  &:nth-of-type(2n+1) {
    background: #FAFAFA;
  }
  
  &:first-of-type span {
    border-top: none;
  }
  
  &:last-of-type span {
    border-bottom: none;
  }
  
  @media (max-width: 768px) {
    font-size: 0.8125rem;
  }
`;

const DropdownItemContent = styled.span`
  display: block;
  width: 100%;
  height: 100%;
  padding: 0.75em 0.9em;
  border: solid transparent;
  border-width: 1px 0;
  transition: border 0.12s;
  cursor: pointer;
  
  &:hover {
    color: #1F4E46;
    border-color: #95989A;
    transition: border 0.12s;
  }
`;

const DropdownTitle = styled.div`
  font-weight: 600;
  color: #1F4E46;
  margin-bottom: 0.25rem;
`;

const DropdownSubtitle = styled.div`
  font-size: 0.875rem;
  color: #666;
`;

const HighlightMark = styled.mark`
  background-color: #ffec99;
  padding: 0;
`;

function datasetOptionLabel(dataset) {
  return String(dataset?.menu3 || dataset?.table_name || "").trim();
}

const DatasetSearchBar = ({
  datasets = [],
  placeholder = "Search datasets...",
  onSelect,
  onPick,
  onSubmit,
  onSearchChange,
  onQueryChange,
  query,
  inputId,
  maxResults = 10,
  maxWidth,
  maxHeight,
  maxHeightMobile,
  showDropdown = true,
  confirmSelection = false,
  className = ''
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  const isControlled = query !== undefined;
  const searchQuery = isControlled ? query : internalQuery;
  const setSearchQuery = (value) => {
    if (isControlled) onQueryChange?.(value);
    else setInternalQuery(value);
  };
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [highlightMatches, setHighlightMatches] = useState({});
  const [closedQuery, setClosedQuery] = useState(null);
  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);
  const confirmSelectionRef = useRef(confirmSelection);
  const searchQueryRef = useRef(searchQuery);
  confirmSelectionRef.current = confirmSelection;
  searchQueryRef.current = searchQuery;

  // Filter datasets based on search query
  useEffect(() => {
    const filtered = filterDatasets({ datasets, searchQuery, geographies: [] }); // also removes duplicates by table_name
    const highlights = highlightDatasets({ searchQuery, datasets: filtered });
    const sorted = sortDatasets({ searchQuery, datasets: filtered }); // use the default 'Relevance' sort order

    const limitedResults = maxResults ? sorted.slice(0, maxResults) : sorted;
    setFilteredDatasets(limitedResults);
    setHighlightMatches(highlights);
    
    // Notify parent component of search results
    if (onSearchChange) {
      onSearchChange({
        query: searchQuery,
        results: sorted,
        highlights
      });
    }
  }, [datasets, searchQuery, maxResults, onSearchChange]);

  // Close dropdown when clicking outside (but not when interacting with layered UI like modals)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        if (typeof event.target.closest === 'function' && event.target.closest('[data-prevent-dataset-search-clear]')) {
          return;
        }
        if (confirmSelectionRef.current) {
          setClosedQuery(searchQueryRef.current);
          return;
        }
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderHighlightedText = (text, datasetId, key) => {
    if (!text) {
      return null;
    }

    const matches = highlightMatches[datasetId]?.filter((match) => match.key === key);

    if (!matches || matches.length === 0) {
      return text;
    }

    const allIndices = matches
      .flatMap((match) => match.indices || [])
      .sort((a, b) => a[0] - b[0]);

    const segments = [];
    let lastIndex = 0;

    allIndices.forEach(([start, end], idx) => {
      if (start > lastIndex) {
        segments.push(
          <span key={`plain-${datasetId}-${key}-${idx}`}>{text.slice(lastIndex, start)}</span>
        );
      }
      segments.push(
        <HighlightMark key={`highlight-${datasetId}-${key}-${idx}`}>
          {text.slice(start, end + 1)}
        </HighlightMark>
      );
      lastIndex = end + 1;
    });

    if (lastIndex < text.length) {
      segments.push(
        <span key={`plain-${datasetId}-${key}-end`}>{text.slice(lastIndex)}</span>
      );
    }

    return <>{segments}</>;
  };

  const handleDatasetSelect = (dataset) => {
    if (confirmSelection) {
      setClosedQuery(datasetOptionLabel(dataset));
      if (onPick) onPick(dataset);
      // Enter submits from the input, so keep focus there after a pick.
      inputRef.current?.focus();
      return;
    }
    if (onSelect) {
      onSelect(dataset);
    }
    setSearchQuery('');
  };

  const handleInputKeyDown = (event) => {
    if (event.key !== 'Enter' || !onSubmit) return;
    event.preventDefault();
    setClosedQuery(searchQuery);
    onSubmit();
  };

  const dropdownOpen = showDropdown
    && closedQuery !== searchQuery
    && Boolean(searchQuery.trim())
    && filteredDatasets.length > 0;

  return (
    <SearchContainer ref={searchContainerRef} maxWidth={maxWidth} className={className}>
      <SearchInput
        ref={inputRef}
        id={inputId}
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => {
          setClosedQuery(null);
          setSearchQuery(e.target.value);
        }}
        onKeyDown={handleInputKeyDown}
        onFocus={() => {
          if (confirmSelection) setClosedQuery(null);
        }}
      />
      {dropdownOpen && (
        <DropdownContainer maxHeight={maxHeight} maxHeightMobile={maxHeightMobile}>
          {filteredDatasets.map((dataset) => {
            const datasetId = dataset.seq_id || dataset.id;
            return (
              <DropdownItem
                key={datasetId}
                onMouseDown={(event) => {
                  if (confirmSelection) event.preventDefault();
                }}
                onClick={() => handleDatasetSelect(dataset)}
              >
                <DropdownItemContent>
                  <DropdownTitle>
                    {renderHighlightedText(dataset.menu3, datasetId, 'menu3') || 'Untitled'}
                  </DropdownTitle>
                  {dataset.table_name && (
                    <DropdownSubtitle>
                      Table: {renderHighlightedText(dataset.table_name, datasetId, 'table_name')}
                    </DropdownSubtitle>
                  )}
                </DropdownItemContent>
              </DropdownItem>
            );
          })}
        </DropdownContainer>
      )}
    </SearchContainer>
  );
};

DatasetSearchBar.propTypes = {
  datasets: PropTypes.array.isRequired,
  placeholder: PropTypes.string,
  onSelect: PropTypes.func,
  onPick: PropTypes.func,
  onSubmit: PropTypes.func,
  onSearchChange: PropTypes.func, // Callback with { query, results, highlights }
  onQueryChange: PropTypes.func,
  query: PropTypes.string,
  inputId: PropTypes.string,
  maxResults: PropTypes.number, // Limit dropdown results (0 or undefined = no limit)
  maxWidth: PropTypes.string,
  maxHeight: PropTypes.string,
  maxHeightMobile: PropTypes.string,
  showDropdown: PropTypes.bool,
  confirmSelection: PropTypes.bool,
  className: PropTypes.string,
};

export default DatasetSearchBar;

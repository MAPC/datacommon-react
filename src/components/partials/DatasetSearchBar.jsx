import React, { useEffect, useState, useRef } from "react";
import PropTypes from 'prop-types';
import styled from 'styled-components';

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

const DatasetSearchBar = ({
  datasets = [],
  placeholder = "Search datasets...",
  onSelect,
  onSearchChange,
  maxResults = 10,
  maxWidth,
  maxHeight,
  maxHeightMobile,
  showDropdown = true,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [highlightMatches, setHighlightMatches] = useState({});
  const searchContainerRef = useRef(null);

  // Filter datasets based on search query
  useEffect(() => {
    let filtered = datasets || [];
    let highlights = {};

    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      // Escape special regex characters in the query
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Use substring matching for all queries (no minimum character requirement)
      const searchRegex = new RegExp(escapedQuery, 'i');
      
      filtered = filtered.filter((dataset) => {
        const tableName = dataset.table_name || '';
        const menu3 = dataset.menu3 || '';
        
        const tableNameMatch = searchRegex.test(tableName);
        const menu3Match = searchRegex.test(menu3);
        
        if (tableNameMatch || menu3Match) {
          const datasetId = dataset.seq_id || dataset.id;
          highlights[datasetId] = [];
          
          if (tableNameMatch) {
            const highlightRegex = new RegExp(escapedQuery, 'gi');
            tableName.replace(highlightRegex, (matched, offset) => {
              highlights[datasetId].push({
                key: 'table_name',
                indices: [[offset, offset + matched.length - 1]]
              });
            });
          }
          
          if (menu3Match) {
            const highlightRegex = new RegExp(escapedQuery, 'gi');
            menu3.replace(highlightRegex, (matched, offset) => {
              highlights[datasetId].push({
                key: 'menu3',
                indices: [[offset, offset + matched.length - 1]]
              });
            });
          }
          
          return true;
        }
        
        return false;
      });

       // sort the results prioritizing dataset name match over table name match, then sort alphabetically
      filtered.sort((ds1, ds2) => {
        const ds1Menu3 = ds1.menu3 || '';
        const ds2Menu3 = ds2.menu3 || '';
        const ds1Menu3Match = searchRegex.test(ds1Menu3);
        const ds2Menu3Match = searchRegex.test(ds2Menu3);

        if (ds1Menu3Match && ds2Menu3Match) {
          return ds1Menu3.localeCompare(ds2Menu3);
        } else if (ds1Menu3Match) {
          return -1;
        } else if (ds2Menu3Match) {
          return 1;
        } else {
          return ds1Menu3.localeCompare(ds2Menu3);
        }
      });
    }

    setHighlightMatches(highlights);
    const limitedResults = maxResults ? filtered.slice(0, maxResults) : filtered;
    setFilteredDatasets(limitedResults);
    
    // Notify parent component of search results
    if (onSearchChange) {
      onSearchChange({
        query: searchQuery,
        results: filtered,
        highlights
      });
    }
  }, [datasets, searchQuery, maxResults, onSearchChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
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
    if (onSelect) {
      onSelect(dataset);
    }
    setSearchQuery('');
  };

  return (
    <SearchContainer ref={searchContainerRef} maxWidth={maxWidth} className={className}>
      <SearchInput
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {showDropdown && searchQuery.trim() && filteredDatasets.length > 0 && (
        <DropdownContainer maxHeight={maxHeight} maxHeightMobile={maxHeightMobile}>
          {filteredDatasets.map((dataset) => {
            const datasetId = dataset.seq_id || dataset.id;
            return (
              <DropdownItem
                key={datasetId}
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
  onSearchChange: PropTypes.func, // Callback with { query, results, highlights }
  maxResults: PropTypes.number, // Limit dropdown results (0 or undefined = no limit)
  maxWidth: PropTypes.string,
  maxHeight: PropTypes.string,
  maxHeightMobile: PropTypes.string,
  showDropdown: PropTypes.bool,
  className: PropTypes.string,
};

export default DatasetSearchBar;

import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchDatasets } from '../reducers/datasetSlice';
import MetadataModal from "../components/partials/MetadataModal";
import { formatUpdated, parseUpdatedForSort } from '../utils/formatUpdated';
import styled from 'styled-components';

const PageContainer = styled.section`
  &.route.categories {
    background: #fff;
  }
`;

const MainContent = styled.div`
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0rem 1rem;
  gap: 2rem;
`;

const Sidebar = styled.div`
  width: 25%;
  min-width: 250px;
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  height: fit-content;
  position: sticky;
  top: 2rem;
`;

const SidebarTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #333;
`;

const FilterSection = styled.div`
  margin-bottom: 2rem;
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const FilterTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: #6fc68e;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  
  &:hover {
    color: #5db37a;
  }
`;

const FilterList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
    
    &:hover {
      background: #a8a8a8;
    }
  }
`;

const FilterItem = styled.li`
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
`;

const CheckboxInput = styled.input`
  margin-right: 0.75rem;
  cursor: pointer;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
`;

const CheckboxLabel = styled.label`
  cursor: pointer;
  font-size: 0.9375rem;
  color: #555;
  user-select: none;
  flex: 1;
  
  &:hover {
    color: #333;
  }
`;

const SeeMoreLink = styled.a`
  color: #6fc68e;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
    color: #5db37a;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  min-width: 0;
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const SortContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SortLabel = styled.label`
  font-size: 0.9375rem;
  color: #555;
`;

const SortSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9375rem;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #6fc68e;
  }
`;

const DatasetGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 31.5em;
  overflow-y: auto;
  overflow-x: hidden;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
    
    &:hover {
      background: #a8a8a8;
    }
  }
`;

const DatasetBox = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
  cursor: pointer;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const DatasetHeader = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #333;
  line-height: 1.4;
`;

const DatasetBody = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 2rem;
`;

const DatasetInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.9375rem;
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #333;
`;

const InfoValue = styled.span`
  color: #555;
`;

const DescriptionRow = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #555;
`;

const DescriptionLabel = styled.span`
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 0.25rem;
`;

const DescriptionText = styled.span`
  color: #555;
  display: block;
`;

const DatasetActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
  min-width: 200px;
`;

const ViewMetadataButton = styled.button`
  background: linear-gradient(90deg, #64c08d, #5aba8c);
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 5px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 0.9;
  }
`;

const LastUpdated = styled.div`
  font-size: 0.875rem;
  color: #666;
  text-align: right;
`;

const LastUpdatedLabel = styled.span`
  font-weight: 600;
  margin-right: 0.5rem;
`;

const PageHeader = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 1rem 1rem 1rem;
`;

const HeaderTitle = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.875rem;
  font-weight: 700;
  color: #333;
`;

const HeaderDescription = styled.p`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #555;
  line-height: 1.5;
`;

const DatasetCount = styled.div`
  font-size: 1rem;
  color: #666;
  margin-top: 0.5rem;
  
  strong {
    color: #333;
    font-weight: 600;
  }
`;

const SearchInputContainer = styled.div`
  margin-bottom: 1.5rem;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.2s ease;
  
  &:focus {
    border-color: #6fc68e;
    box-shadow: 0 0 0 3px rgba(111, 198, 142, 0.1);
  }
  
  &::placeholder {
    color: #999;
  }
`;

const BrowserPage = () => {
  const dispatch = useDispatch();
  const datasets = useSelector(state => state.dataset.cache);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedMenu1s, setSelectedMenu1s] = useState([]);
  const [sortBy, setSortBy] = useState('A to Z');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayDatasets, setDisplayDatasets] = useState([]);
  const [highlightMatches, setHighlightMatches] = useState({});

  useEffect(() => {
    dispatch(fetchDatasets());
  }, [dispatch]);

  // Get unique sources
  const sources = useMemo(() => {
    // Datasets with multiple sources have them separated by '; '.
    // Source names should align across datasets, edit the table if a source is not consistent across datasets
    const uniqueSources = new Set();
    datasets.forEach(d => {
      d.source && d.source.split("; ").forEach(s => uniqueSources.add(s));
    });

    return [...uniqueSources].sort();
  }, [datasets]);

  // Get unique Menu1 values
  const menu1Options = useMemo(() => {
    return [...new Set(datasets.map(d => d.menu1).filter(Boolean))].sort();
  }, [datasets]);

  useEffect(() => {
    let filtered = datasets || [];

    if (selectedSources.length > 0) {
      filtered = filtered.filter(d => {
        // check if any source in the dataset is a selected source
        // datasets with multiple sources are separated with '; '
        return d.source && d.source.split('; ').some(source => selectedSources.includes(source));
      });
    }

    if (selectedMenu1s.length > 0) {
      filtered = filtered.filter(d => selectedMenu1s.includes(d.menu1));
    }

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
    }

    setHighlightMatches(highlights);
    setDisplayDatasets(filtered);
  }, [datasets, selectedSources, selectedMenu1s, searchQuery]);

  // Sort datasets
  const sortedDatasets = useMemo(() => {
    const sorted = [...displayDatasets];
    
    switch (sortBy) {
      case 'A to Z':
        return sorted.sort((a, b) => (a.menu3 || '').localeCompare(b.menu3 || ''));
      case 'Z to A':
        return sorted.sort((a, b) => (b.menu3 || '').localeCompare(a.menu3 || ''));
      case 'Newest First':
        return sorted.sort((a, b) => {
          const keyA = parseUpdatedForSort(a.updated);
          const keyB = parseUpdatedForSort(b.updated);
          return keyB.localeCompare(keyA);
        });
      case 'Oldest First':
        return sorted.sort((a, b) => {
          const keyA = parseUpdatedForSort(a.updated);
          const keyB = parseUpdatedForSort(b.updated);
          return keyA.localeCompare(keyB);
        });
      default:
        return sorted;
    }
  }, [displayDatasets, sortBy]);

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
        <mark
          key={`highlight-${datasetId}-${key}-${idx}`}
          style={{ backgroundColor: '#ffec99', padding: 0 }}
        >
          {text.slice(start, end + 1)}
        </mark>
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

  const handleSourceChange = (source) => {
    setSelectedSources(prev => {
      if (prev.includes(source)) {
        return prev.filter(s => s !== source);
      } else {
        return [...prev, source];
      }
    });
  };

  const handleMenu1Change = (menu1) => {
    setSelectedMenu1s(prev => {
      if (prev.includes(menu1)) {
        return prev.filter(m => m !== menu1);
      } else {
        return [...prev, menu1];
      }
    });
  };

  const clearSourceFilter = () => {
    setSelectedSources([]);
  };

  const clearMenu1Filter = () => {
    setSelectedMenu1s([]);
  };

  const handleViewMetadata = (dataset) => {
    setSelectedDataset(dataset);
    setShowMetadataModal(true);
  };

  const handleCloseMetadata = () => {
    setShowMetadataModal(false);
    setSelectedDataset(null);
  };

  const toDataset = (dataset) => {
    // open in new tab to preserve user's search & filters from the datasets landing page
    window.open(`/browser/datasets/${dataset.seq_id}`, '_blank', 'noreferrer');
  };

  const handleDatasetClick = (dataset) => {
    toDataset(dataset);
  };

  return (
    <PageContainer className="route categories">
      <PageHeader>
        <HeaderTitle>Datasets</HeaderTitle>
        <HeaderDescription>
          Explore and download data from the Census Bureau, state agencies, municipalities, and MAPC's work. 
          Browse datasets by category, source, or search for specific topics.
        </HeaderDescription>
        <DatasetCount>
          <strong>{datasets?.length || 0}</strong> {datasets?.length === 1 ? 'dataset' : 'datasets'} available
        </DatasetCount>
      </PageHeader>
      <MainContent>
        <Sidebar>
          <SidebarTitle>Filters</SidebarTitle>
          
          <FilterSection>
            <FilterHeader>
              <FilterTitle>Data Source</FilterTitle>
              {selectedSources.length > 0 && (
                <ClearButton onClick={clearSourceFilter}>Clear</ClearButton>
              )}
            </FilterHeader>
            <FilterList>
              {sources.map((source) => (
                <FilterItem key={source}>
                  <CheckboxInput
                    type="checkbox"
                    id={`source-${source}`}
                    checked={selectedSources.includes(source)}
                    onChange={() => handleSourceChange(source)}
                  />
                  <CheckboxLabel htmlFor={`source-${source}`}>
                    {source}
                  </CheckboxLabel>
                </FilterItem>
              ))}
            </FilterList>
          </FilterSection>

          <FilterSection>
            <FilterHeader>
              <FilterTitle>Category</FilterTitle>
              {selectedMenu1s.length > 0 && (
                <ClearButton onClick={clearMenu1Filter}>Clear</ClearButton>
              )}
            </FilterHeader>
            <FilterList>
              {menu1Options.slice(0, expandedCategories ? menu1Options.length : 5).map((menu1) => (
                <FilterItem key={menu1}>
                  <CheckboxInput
                    type="checkbox"
                    id={`menu1-${menu1}`}
                    checked={selectedMenu1s.includes(menu1)}
                    onChange={() => handleMenu1Change(menu1)}
                  />
                  <CheckboxLabel htmlFor={`menu1-${menu1}`}>
                    {menu1}
                  </CheckboxLabel>
                </FilterItem>
              ))}
              {menu1Options.length > 5 && (
                <FilterItem>
                  <SeeMoreLink 
                    onClick={() => setExpandedCategories(!expandedCategories)}
                  >
                    {expandedCategories ? 'See less' : 'See more'}
                  </SeeMoreLink>
                </FilterItem>
              )}
            </FilterList>
          </FilterSection>
        </Sidebar>

        <ContentArea>
          <SearchInputContainer>
            <SearchInput
              type="text"
              placeholder="Search by table name or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchInputContainer>
          
          <ContentHeader>
            <div>
              <strong>{sortedDatasets.length}</strong> {sortedDatasets.length === 1 ? 'dataset' : 'datasets'} found
            </div>
            <SortContainer>
              <SortLabel htmlFor="sort-select">Sort by:</SortLabel>
              <SortSelect
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="A to Z">A to Z</option>
                <option value="Z to A">Z to A</option>
                <option value="Newest First">Newest First</option>
                <option value="Oldest First">Oldest First</option>
              </SortSelect>
            </SortContainer>
          </ContentHeader>

          <DatasetGrid>
            {sortedDatasets.map((dataset) => {
              const datasetId = dataset.seq_id || dataset.id;
              return (
                <DatasetBox 
                  key={datasetId}
                  onClick={() => handleDatasetClick(dataset)}
                >
                  <DatasetHeader>
                    {renderHighlightedText(dataset.menu3, datasetId, 'menu3')}
                  </DatasetHeader>
                  <DatasetBody>
                    <DatasetInfo>
                      <InfoRow>
                        <InfoLabel>Table:</InfoLabel>
                        <InfoValue>
                          {renderHighlightedText(dataset.table_name, datasetId, 'table_name')}
                        </InfoValue>
                      </InfoRow>
                      <InfoRow>
                        <InfoLabel>Source:</InfoLabel>
                        <InfoValue>{dataset.source}</InfoValue>
                      </InfoRow>
                      {dataset.descriptn && (
                        <DescriptionRow>
                          <DescriptionLabel>Description:</DescriptionLabel>
                          <DescriptionText>
                            {renderHighlightedText(dataset.descriptn, datasetId, 'descriptn')}
                          </DescriptionText>
                        </DescriptionRow>
                      )}
                    </DatasetInfo>
                    <DatasetActions>
                      <ViewMetadataButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewMetadata(dataset);
                        }}
                      >
                        View Metadata
                      </ViewMetadataButton>
                      <LastUpdated>
                        <LastUpdatedLabel>Last updated:</LastUpdatedLabel>
                        {formatUpdated(dataset.updated)}
                      </LastUpdated>
                    </DatasetActions>
                  </DatasetBody>
                </DatasetBox>
              );
            })}
          </DatasetGrid>
        </ContentArea>
      </MainContent>

      {showMetadataModal && selectedDataset && (
        <MetadataModal
          show={showMetadataModal}
          handleClose={handleCloseMetadata}
          dataset={selectedDataset}
        />
      )}
    </PageContainer>
  );
};

export default BrowserPage;

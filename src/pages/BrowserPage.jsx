import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from "react-router-dom";
import styled from 'styled-components';
import { fetchDatasets } from '../reducers/datasetSlice';
import MetadataModal from "../components/partials/MetadataModal";
import { formatUpdated } from '../utils/formatUpdated';
import { filterDatasets, highlightDatasets, sortDatasets } from "../utils/manageDatasets";

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
  margin-bottom: 1rem;
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

const FilterListCategories = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 400px;
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

const FilterTreeChevron = styled.div`
  font-size: 0.75rem;
  padding-right: 8px;
  padding-left: 8px;
  cursor: pointer;
`;

const FilterItemChildren = styled.div`
  padding-left: 8px;
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

const HeaderControls = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2rem;
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
  padding: 0.25rem 0.75rem;
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

const ShareLinkContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
`;

const ShareLinkButton = styled.button`
  background: linear-gradient(90deg, #64c08d, #5aba8c);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    opacity: 0.9;
  }
`;

const ShareStatusText = styled.span`
  font-size: 0.8rem;
  color: #666;

  &:hover {
    color: #555;
  }
`;

const DatasetGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 40em;
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

const DatasetContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const DatasetTabs = styled.div`
  display: flex;
  flex-direction: row;
`;
const GeographyTab = styled.div`
  position: relative;
  top: 5px;
  cursor: pointer;
  padding: 6px 12px 10px 12px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-bottom: none;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;

  &:hover {
    background: #f1f1f1;
    border: 1px solid #dadada;
    border-bottom: none;
  }

  &.selected {
    z-index: 99;
    background: #ffffff;
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

const DatasetHeaderContainer = styled.div`
  display: flex;
  align-items: space-between;
  justify-content: space-between;
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

const DatasetActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: end;
  gap: 1rem;
  min-width: 200px;
`;

const ViewMetadataButton = styled.button`
  width: 10rem;
  display: inline;
  text-align: center;
  background: linear-gradient(90deg, #64c08d, #5aba8c);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  position: relative;
`;

const GeographyBarContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const GeographyFilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const GeographyFilterPill = styled.div`
  display: flex;
  gap: 10px;
  color: #867676;
  border: 1px solid #867676;
  border-radius: 12px;
  padding: 4px 8px 6px;
  line-height: 14px;
  cursor: pointer;

  &:hover {
    color: #463e3e;
    border: 1px solid #463e3e;
  }

  &.selected {
    color: #4ea56c;
    border: 1px solid #4ea56c;
    &:hover {
      color: #367a4e;
      border: 1px solid #367a4e;
    }
  }
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
  const { cache: datasets, noDupesDatasets } = useSelector(state => state.dataset);
  const location = useLocation();
  const navigate = useNavigate();

  const datasetGridRef = useRef(null);

  const [selectedSources, setSelectedSources] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const sourcesParam = params.get("source");
    return sourcesParam ? sourcesParam.split(",").filter(Boolean) : [];
  });

  const [selectedMenu1s, setSelectedMenu1s] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const categoriesParam = params.get("category");
    return categoriesParam ? categoriesParam.split(",").filter(Boolean) : [];
  });

  const [selectedMenu2s, setSelectedMenu2s] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const subcategoriesParam = params.get("subcategory");
    return subcategoriesParam ? subcategoriesParam.split(",").filter(Boolean) : [];
  });

  const [selectedGeoFilters, setSelectedGeoFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const geoFilterParams = params.get("geos");
    return geoFilterParams ? geoFilterParams.split(",").filter(Boolean) : ['all'];
  });

  const [selectedGeographyTabs, setSelectedGeographyTabs] = useState({});
  const [categoryOptionTree, setCategoryOptionTree] = useState({});
  const [sortBy, setSortBy] = useState('Relevance');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  });
  const [displayDatasets, setDisplayDatasets] = useState([]);
  const [highlightMatches, setHighlightMatches] = useState({});
  const [shareCopied, setShareCopied] = useState(false);
  const [viewingMetadataDropdownId, setViewingMetadataDropdownId] = useState(null);

  const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

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

  // Get unique Menu1/Menu2 values, form a tree structure
  useEffect(() => {
    const categoryTree = {};
    const params = new URLSearchParams(location.search);
    const currentSubcategories = (params.get("subcategory") || "").split(",").filter(Boolean);
    datasets.forEach(dataset => {
      if (!categoryTree[dataset.menu1]) {
        categoryTree[dataset.menu1] = { open: false, children: new Set()};
      }
      categoryTree[dataset.menu1].children.add(dataset.menu2);

      // if the sub-category is selected, ensure the menu is open (for initial load)
      if (currentSubcategories.includes(dataset.menu2)) {
        categoryTree[dataset.menu1].open = true;
      }
    });

    Object.values(categoryTree).forEach(treeData => {
      treeData.children = [...treeData.children].sort();
    });

    setCategoryOptionTree(categoryTree);
  }, [datasets]);

  const menu1OptionList = useMemo(() => {
    return Object.keys(categoryOptionTree).sort();
  }, [categoryOptionTree]);

  // filter datasets and set highlights whenever the filter criteria change
  useEffect(() => {
    // reset the scroll height whenever the user changes the search or filter
    if (datasetGridRef.current) {
      datasetGridRef.current.scrollTop = 0;
    }

    // filter based on category, subcategory, sources, and search terms. Also remove duplicates by table_name
    const filtered = filterDatasets({
      datasets,
      searchQuery,
      sources: selectedSources,
      categories: selectedMenu1s,
      subcategories: selectedMenu2s,
      geographies: selectedGeoFilters,
    });

    // "Compress" the datasets into fewer cards, datasets with the same base table but different geographies
    // should be displayed on the same card in the search results
    const datasetBaseTableMap = {};
    filtered.forEach(dataset => {
      const tableName = dataset.table_name;
      const datasetName = dataset.menu3;

      let trimmedTable = tableName;
      let trimmedName = datasetName;
      let datasetGeography = null;
      if (tableName.endsWith("_m")) {
        trimmedTable = tableName.slice(0, -2);
        if (datasetName.endsWith(" (Municipal)")) trimmedName = datasetName.slice(0, -12);
        if (datasetName.endsWith(" (Municipality)")) trimmedName = datasetName.slice(0, -15);
        datasetGeography = "Municipalities";
      } else if (tableName.endsWith("_ct")) {
        trimmedTable = tableName.slice(0, -3);
        if (datasetName.endsWith(" (Census Tracts)")) trimmedName = datasetName.slice(0, -16);
        if (datasetName.endsWith(" (Census Tract)")) trimmedName = datasetName.slice(0, -15);
        datasetGeography = "Census Tracts";
      } else if (tableName.endsWith("_bg")) {
        trimmedTable = tableName.slice(0, -3);
        if (datasetName.endsWith(" (Block Groups)")) trimmedName = datasetName.slice(0, -15);
        if (datasetName.endsWith(" (Block Group)")) trimmedName = datasetName.slice(0, -14);
        datasetGeography = "Block Groups";
      } else if (tableName.endsWith("_b")) {
        trimmedTable = tableName.slice(0, -2);
        trimmedName = datasetName.endsWith(" (Blocks)") ? datasetName.slice(0, -9) : datasetName;
        datasetGeography = "Blocks";
      } else if (tableName.endsWith("_blk")) {
        trimmedTable = tableName.slice(0, -4);
        trimmedName = datasetName.endsWith(" (Blocks)") ? datasetName.slice(0, -9) : datasetName;
        datasetGeography = "Blocks";
      }
      if (!datasetBaseTableMap[trimmedTable]) {
        datasetBaseTableMap[trimmedTable] = {
          baseName: trimmedName,
          datasets: [],
          geoIdPairs: [],
        };
      }
      datasetBaseTableMap[trimmedTable].datasets.push(dataset);
      datasetBaseTableMap[trimmedTable].geoIdPairs.push({ geography: datasetGeography, id: dataset.seq_id });
    });

    const compressedDatasets = Object.entries(datasetBaseTableMap).map(([baseTable, cdsInfo]) => {
      const geoOrder = ["Municipal", "Census Tracts", "Block Groups", "Blocks"];
      const sortedGeoIdParis = cdsInfo.geoIdPairs.sort((pair1, pair2) => geoOrder.indexOf(pair1.geography) - geoOrder.indexOf(pair2.geography));

      return {
        table_name: baseTable,
        menu3: cdsInfo.baseName,
        seq_id: cdsInfo.datasets.map(ds => ds.seq_id || ds.id).join(','), // TODO: Is this right?
        updated: cdsInfo.datasets.map(ds => ds.updated).sort()[0],
        source: cdsInfo.datasets.map(ds => ds.source)[0],
        geoIdPairs: sortedGeoIdParis,
        ...cdsInfo,
      }
    });

    // set the matched search terms to be highlighted (use filtered list not compressed datasets)
    const highlights = highlightDatasets({ searchQuery, datasets: filtered });

    setHighlightMatches(highlights);
    setDisplayDatasets(compressedDatasets);
  }, [datasets, selectedSources, selectedMenu1s, selectedMenu2s, selectedGeoFilters, searchQuery]);

  // Keep URL query parameters in sync with search and filters so users can share links
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const currentQ = params.get("q") || "";
    const currentSources = (params.get("source") || "").split(",").filter(Boolean);
    const currentCategories = (params.get("category") || "").split(",").filter(Boolean);
    const currentSubcategories = (params.get("subcategory") || "").split(",").filter(Boolean);
    const currentGeoFilters = (params.get("geos") || "").split(",").filter(Boolean);

    const shouldUpdate =
      currentQ !== searchQuery ||
      !arraysEqual(currentSources, selectedSources) ||
      !arraysEqual(currentCategories, selectedMenu1s) ||
      !arraysEqual(currentSubcategories, selectedMenu2s) ||
      !arraysEqual(currentGeoFilters, selectedGeoFilters);

    if (!shouldUpdate) {
      return;
    }

    if (searchQuery) {
      params.set("q", searchQuery);
    } else {
      params.delete("q");
    }

    if (selectedSources.length > 0) {
      params.set("source", selectedSources.join(","));
    } else {
      params.delete("source");
    }

    if (selectedMenu1s.length > 0) {
      params.set("category", selectedMenu1s.join(","));
    } else {
      params.delete("category");
    }

    if (selectedMenu2s.length > 0) {
      params.set("subcategory", selectedMenu2s.join(","));
    } else {
      params.delete("subcategory");
    }

    if (selectedGeoFilters.length > 0) {
      params.set("geos", selectedGeoFilters.join(","));
    } else {
      params.delete("geos");
    }

    const newSearch = params.toString();
    const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ""}`;
    const currentUrl = `${location.pathname}${location.search}`;

    if (newUrl !== currentUrl) {
      navigate(newUrl, { replace: true });
    }
  }, [searchQuery, selectedSources, selectedMenu1s, selectedMenu2s, selectedGeoFilters, location.pathname, location.search, navigate]);

  // Sort datasets
  const sortedDatasets = useMemo(() => {
    return sortDatasets({searchQuery, datasets: displayDatasets, sortOrder: sortBy });
  }, [displayDatasets, sortBy, searchQuery]);

  // Get the count of found datasets by looking into the nested datasets under the compressed datasets
  const foundDatasetCount = useMemo(() => {
    let count = 0;
    displayDatasets.forEach(compressedDataset => {
      count += compressedDataset.datasets.length;
    });
    return count;
  }, [displayDatasets]);

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

  const handleCopyShareLink = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.top = '-1000px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      // If copying fails, just log; UI remains unchanged
      // eslint-disable-next-line no-console
      console.error('Failed to copy share link', e);
    }
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

  const handleMenu1Change = (menu1, menu1Children, selectedMenu1s, selectedMenu2s) => {
    let newMenu1s = [...selectedMenu1s];
    let newMenu2s = [...selectedMenu2s];

    if (!selectedMenu1s.includes(menu1)) {
      newMenu1s = [...selectedMenu1s, menu1];
      // top level category selected, clear all sub-category filtering
      newMenu2s = newMenu2s.filter(m => !menu1Children.includes(m));
    } else {
      newMenu1s = newMenu1s.filter(m => m !== menu1);
    }
    setSelectedMenu1s(newMenu1s);
    setSelectedMenu2s(newMenu2s);
  };

  const handleMenu2Change = (menu1, menu2, menu1Children, selectedMenu1s, selectedMenu2s) => {
    let newMenu1s = [...selectedMenu1s];
    let newMenu2s = [...selectedMenu2s];

    // top level is checked, a sub-category was clicked
    if (selectedMenu1s.includes(menu1)) {
      // un-check the top level category
      newMenu1s = newMenu1s.filter(m => m !== menu1);
      // check all the sub-categories besides the one clicked
      newMenu2s = [...newMenu2s, ...menu1Children.filter(m => m !== menu2)];
    } else {
      // top level was not checked, add or remove menu2
      if (newMenu2s.includes(menu2)) {
        newMenu2s = newMenu2s.filter(m => m !== menu2);
      } else {
        newMenu2s = [...newMenu2s, menu2];
      }
    }
    setSelectedMenu1s(newMenu1s);
    setSelectedMenu2s(newMenu2s);
  };

  const onGeoFilterClick = (geoVal, selectedGeoFilters) => {
    let newGeoFilters = [...selectedGeoFilters];
    const allGeos = ['_m', '_ct', '_bg', '_b', 'other']

    // if all was selected, break up into individual
    if (newGeoFilters.includes('all')) {
      newGeoFilters = allGeos;
    }

    if (!newGeoFilters.includes(geoVal)) {
      newGeoFilters = [...newGeoFilters, geoVal];
    } else {
      newGeoFilters = newGeoFilters.filter(gf => gf !== geoVal);
    }

    // if all are now selected, replace with all
    if (allGeos.every(geo => newGeoFilters.includes(geo))) {
      newGeoFilters = ['all'];
    }

    setSelectedGeoFilters(newGeoFilters);
  };

  const onCategoryFilterOpenClose = (menu1) => {
    const newTree = {...categoryOptionTree};
    newTree[menu1].open = !categoryOptionTree[menu1].open;
    setCategoryOptionTree(newTree);
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

  const onGeoTabClicked = (compressedDatasetId, geography) => {
    const newSelectedGeoTabs = {...selectedGeographyTabs};

    newSelectedGeoTabs[compressedDatasetId] = geography;
    setSelectedGeographyTabs(newSelectedGeoTabs);
  }

  const isTabSelected = (selectedGeographyTabs, compressedDataset, geography) => {
    const compressedId = compressedDataset.id || compressedDataset.seq_id;
    if (!selectedGeographyTabs[compressedId]) {
      return compressedDataset.geoIdPairs.filter(pair => !!pair.geography)[0].geography === geography;
    } else {
      return selectedGeographyTabs[compressedId] === geography;
    }
  }

  const getSelectedDataset = (compressedDataset) => {
    const compressedId = compressedDataset.id || compressedDataset.seq_id;
    if (compressedDataset.datasets.length === 1) {
      return compressedDataset.datasets[0];
    }
    
    let selectedDatasetId;
    if (!selectedGeographyTabs[compressedId]) {
      selectedDatasetId = compressedDataset.geoIdPairs.filter(pair => !!pair.geography)[0].id;
    } else {
      const selectedGeography = selectedGeographyTabs[compressedId];
      selectedDatasetId = compressedDataset.geoIdPairs.find(geoIdPair => geoIdPair.geography === selectedGeography).id;
    }

    return compressedDataset.datasets.find(d => d.seq_id === selectedDatasetId);
  }

  const toDataset = (datasetId) => {
    // open in new tab to preserve user's search & filters from the datasets landing page
    window.open(`/browser/datasets/${datasetId}`, '_blank', 'noreferrer');
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
          <strong>{noDupesDatasets?.length || 0}</strong> {noDupesDatasets?.length === 1 ? 'dataset' : 'datasets'} available
        </DatasetCount>
      </PageHeader>
      <MainContent>
        <Sidebar>
          <SidebarTitle>Filters</SidebarTitle>

          <FilterSection>
            <FilterHeader>
              <FilterTitle>Category</FilterTitle>
              {selectedMenu1s.length > 0 && (
                <ClearButton onClick={clearMenu1Filter}>Clear</ClearButton>
              )}
            </FilterHeader>
            <FilterListCategories>
              {menu1OptionList.map(menu1 => (
                <div key={menu1}>
                  <FilterItem>
                    <CheckboxInput
                      type="checkbox"
                      id={`menu1-${menu1}`}
                      checked={selectedMenu1s.includes(menu1)}
                      onChange={() => handleMenu1Change(
                        menu1, categoryOptionTree[menu1].children, selectedMenu1s, selectedMenu2s
                      )}
                    />
                    <CheckboxLabel htmlFor={`menu1-${menu1}`}>
                      {menu1}
                    </CheckboxLabel>
                    <FilterTreeChevron onClick={() => onCategoryFilterOpenClose(menu1)}>
                      {categoryOptionTree[menu1].open ? "▲" : "▼"}
                    </FilterTreeChevron>
                  </FilterItem>
                  {categoryOptionTree[menu1].open && <FilterItemChildren>
                    {categoryOptionTree[menu1].children.map(menu2 => (
                      <FilterItem key={menu2}>
                        <CheckboxInput
                          type="checkbox"
                          id={`menu2-${menu2}`}
                          checked={selectedMenu1s.includes(menu1) || selectedMenu2s.includes(menu2)}
                          onChange={() => handleMenu2Change(
                            menu1, menu2, categoryOptionTree[menu1].children, selectedMenu1s, selectedMenu2s
                          )}
                        />
                        <CheckboxLabel htmlFor={`menu2-${menu2}`}>
                          {menu2}
                        </CheckboxLabel>
                      </FilterItem>
                    ))}
                  </FilterItemChildren>}
                </div>
              ))}
            </FilterListCategories>
          </FilterSection>

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

        </Sidebar>

        <ContentArea>
          <SearchInputContainer>
            <SearchInput
              type="text"
              placeholder="Search by table name or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <GeographyBarContainer>
              <GeographyFilterContainer>
                <GeographyFilterPill
                  onClick={() => onGeoFilterClick('_m', selectedGeoFilters)}
                  className={(selectedGeoFilters.includes('_m') || selectedGeoFilters.includes('all')) ? 'selected' : ''}
                >
                  Municipalities
                  {(selectedGeoFilters.includes('_m') || selectedGeoFilters.includes('all')) && <span>✓</span>}
                </GeographyFilterPill>
                <GeographyFilterPill
                  onClick={() => onGeoFilterClick('_ct', selectedGeoFilters)}
                  className={(selectedGeoFilters.includes('_ct') || selectedGeoFilters.includes('all')) ? 'selected' : ''}
                >
                  Census Tracts
                  {(selectedGeoFilters.includes('_ct') || selectedGeoFilters.includes('all')) && <span>✓</span>}
                </GeographyFilterPill>
                <GeographyFilterPill
                  onClick={() => onGeoFilterClick('_bg', selectedGeoFilters)}
                  className={(selectedGeoFilters.includes('_bg') || selectedGeoFilters.includes('all')) ? 'selected' : ''}
                >
                  Block Groups
                  {(selectedGeoFilters.includes('_bg') || selectedGeoFilters.includes('all')) && <span>✓</span>}
                </GeographyFilterPill>
                <GeographyFilterPill
                  onClick={() => onGeoFilterClick('_b', selectedGeoFilters)}
                  className={(selectedGeoFilters.includes('_b') || selectedGeoFilters.includes('all')) ? 'selected' : ''}
                >
                  Blocks
                  {(selectedGeoFilters.includes('_b') || selectedGeoFilters.includes('all')) && <span>✓</span>}
                </GeographyFilterPill>
                <GeographyFilterPill
                  onClick={() => onGeoFilterClick('other', selectedGeoFilters)}
                  className={(selectedGeoFilters.includes('other') || selectedGeoFilters.includes('all')) ? 'selected' : ''}
                >
                  Other
                  {(selectedGeoFilters.includes('other') || selectedGeoFilters.includes('all')) && <span>✓</span>}
                </GeographyFilterPill>
              </GeographyFilterContainer>
              <GeographyFilterPill onClick={() => setSelectedGeoFilters([])}>
                <>Clear all geographies</>
                <span>X</span>
              </GeographyFilterPill>
            </GeographyBarContainer>
          </SearchInputContainer>
          
          <ContentHeader>
            <div>
              <strong>{foundDatasetCount}</strong> {foundDatasetCount === 1 ? 'dataset' : 'datasets'} found
            </div>
            <HeaderControls>
              <SortContainer>
                <SortLabel htmlFor="sort-select">Sort by:</SortLabel>
                <SortSelect
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="Relevance">Relevance</option>
                  <option value="A to Z">A to Z</option>
                  <option value="Z to A">Z to A</option>
                  <option value="Newest First">Newest First</option>
                  <option value="Oldest First">Oldest First</option>
                </SortSelect>
              </SortContainer>
              {(searchQuery.trim() || selectedSources.length > 0 || selectedMenu1s.length > 0 || selectedMenu2s.length > 0 || (selectedGeoFilters.length > 0 && !selectedGeoFilters.includes('all'))) && (
                <ShareLinkContainer>
                  <ShareLinkButton type="button" onClick={handleCopyShareLink}>
                    Share Search Result
                  </ShareLinkButton>
                  {shareCopied && <ShareStatusText>Link copied!</ShareStatusText>}
                </ShareLinkContainer>
              )}
            </HeaderControls>
          </ContentHeader>

          <DatasetGrid ref={datasetGridRef}>
            {sortedDatasets.map((compressedDataset) => {
              const compressedDatasetId = compressedDataset.seq_id || compressedDataset.id;
              const selectedDatasetFromTab = getSelectedDataset(compressedDataset);
              return (
                <DatasetContainer>
                  <DatasetTabs>
                    {compressedDataset.geoIdPairs.filter(pair => !!pair.geography).map(geoIdPair =>
                      <GeographyTab
                        key={`${compressedDataset.id}_${geoIdPair.geography}`}
                        className={isTabSelected(selectedGeographyTabs, compressedDataset, geoIdPair.geography) ? "selected" : ""}
                        onClick={() => onGeoTabClicked(compressedDatasetId, geoIdPair.geography)}
                      >
                        {geoIdPair.geography}
                      </GeographyTab>
                    )}
                  </DatasetTabs>
                  <DatasetBox
                    key={selectedDatasetFromTab.seq_id}
                    onClick={() => toDataset(selectedDatasetFromTab.seq_id)}
                  >
                    <DatasetHeaderContainer>
                      <DatasetHeader>
                        {renderHighlightedText(selectedDatasetFromTab.menu3, selectedDatasetFromTab.seq_id, 'menu3')}
                      </DatasetHeader>
                      <ViewMetadataButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewMetadata(selectedDatasetFromTab);
                        }}
                      >
                        View Metadata
                      </ViewMetadataButton>
                    </DatasetHeaderContainer>
                    <DatasetBody>
                      <DatasetInfo>
                        <InfoRow>
                          <InfoLabel>Table:</InfoLabel>
                          <InfoValue>
                            {renderHighlightedText(selectedDatasetFromTab.table_name, selectedDatasetFromTab.seq_id, 'table_name')}
                          </InfoValue>
                        </InfoRow>
                        <InfoRow>
                          <InfoLabel>Source:</InfoLabel>
                          <InfoValue>{selectedDatasetFromTab.source}</InfoValue>
                        </InfoRow>
                      </DatasetInfo>
                      <DatasetActions>
                        <LastUpdated>
                          <LastUpdatedLabel>Last updated:</LastUpdatedLabel>
                          {formatUpdated(selectedDatasetFromTab.updated)}
                        </LastUpdated>
                      </DatasetActions>
                    </DatasetBody>
                  </DatasetBox>
                </DatasetContainer>
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
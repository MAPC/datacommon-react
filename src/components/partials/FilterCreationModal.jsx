import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useState, useMemo, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideIn = keyframes`
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: ${slideIn} 0.3s ease-out;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: #666;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 3rem 1.5rem;
  overflow-y: auto;
  flex: 1;
  min-height: 300px;
`;

const FilterCreationRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 10px;
`;

const FilterCreationSelect = styled.select`
  max-height: 30px;
`;

const FilterSearchBar = styled.div`
  z-index: 10;
  min-width: 200px;
`;

const FilterInput = styled.input`
  width: 100%;
  padding: 4px 12px;

  font-size: 14px;
  font-weight: 100;

  outline: none;
`;

const FilterSearchResults = styled.ul`
  position: absolute;
  left: 0;
  z-index: 11;
  top: 20px;

  padding: 0px 8px;

  width: 100%;
  max-height: 150px;
  overflow: auto;

  border: 1px solid black;
`;

const RemoveFilterButton = styled.div`
  color: #555555;
  cursor: pointer;
  user-select: none;
  margin-left: 12px;

  &:hover {
    color: #222222;
  }
`;

const AddFilterButton = styled.div`
  width: 120px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #333333;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: #f2f2f2;
  }
`;

const ModalFooter = styled.div`
  border-top: 1px solid #dee2e6;
  padding: 12px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
`;

const CancelButton = styled.button`
  border-radius: 5px;
  padding: 6px 12px;
  border: 1px solid rgba(149, 152, 154, 0.4);
  background: #fff;
  cursor: pointer;

  &:hover {
    border-color: rgba(68, 173, 137, 0.6);
    background: rgba(68, 173, 137, 0.08);
    color: rgb(57.8, 147.05, 116.45);
  }
`;

const CreateButton = styled.button`
  border: none;
  border-radius: 5px;
  padding: 6px 12px;
  color: #fff;
  background-color: #64c08d;

  &:hover {
    background-color: #4fa676
  }

  &.disabled {
    background-color: #9a9a9a;
    cursor: not-allowed;
  }
`;

const NUMERIC_COLUMN_TYPES = [
  'numeric',
  'smallint',
  'integer',
  'bigint',
  'smallserial',
  'serial',
  'bigserial',
  'decimal',
  'real',
  'double precision',
];

const FilterCreationModal = ({ 
  isOpen, handleClose, filterModalColumn, updateFilters, updateFilterJoinType, allRows, existingFilters, existingFilterJoinType,
}) => {
  const [filterJoinType, setFilterJoinType] = useState(existingFilterJoinType);
  const [filters, setFilters] = useState([
    ...existingFilters, 
    { column: filterModalColumn, filterType: "isNotEmpty", textValue: "" }
  ]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const buildFilterThenClose = () => {
    updateFilters(filters);
    updateFilterJoinType(filterJoinType);
    closeModal();
  };

  const closeModal = () => {
    // setFilterType('isNotEmpty');
    // setTextValue('');
    handleClose();
  };

  const isCreateEnabled = () => {
    return true;
    // const textRequired = isTextNeeded()
    // return textRequired ? !!filterType && !!textValue : !!filterType; 
  };


  const handleUpdateFilter = (newFilter, index) => {
    const filtersCopy = [...filters];
    filtersCopy[index] = newFilter;
    setFilters(filtersCopy);
  };

  const handleAddNewFilter = () => {
    const filtersCopy = [...filters];
    filtersCopy.push({ column: filterModalColumn, filterType: 'isNotEmpty', filterText: '' });
    setFilters(filtersCopy);
  };

  const handleRemoveFilter = (index) => {
    const filtersCopy = [...filters];
    filtersCopy.splice(index, 1);
    setFilters(filtersCopy);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay data-prevent-dataset-search-clear onClick={handleOverlayClick}>
      <ModalContainer data-prevent-dataset-search-clear onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Create Filter for: {filterModalColumn.alias}</ModalTitle>
          <CloseButton onClick={closeModal} aria-label="Close">
            ×
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          <div>Show results</div>
          {filters.map((filter, idx) => (
            <FilterRow
              key={`${filter.column.name}.${filter.filterType}.${idx}`}
              index={idx}
              filter={filter}
              filterJoinType={filterJoinType}
              setFilterJoinType={setFilterJoinType}
              updateFilter={(newFilter) => handleUpdateFilter(newFilter, idx)}
              onRemoveFilter={handleRemoveFilter}
              allRows={allRows}
            />
          ))}
          <AddFilterButton onClick={() => handleAddNewFilter()}>
            <FontAwesomeIcon icon={faPlus} />
            Add Filter
          </AddFilterButton>
        </ModalBody>
        <ModalFooter>
          <CancelButton onClick={() => handleClose()}>
            Close
          </CancelButton>
          <CreateButton
            className={isCreateEnabled() ? '' : 'disabled'}
            onClick={() => buildFilterThenClose()}
          >
            Set Filters
          </CreateButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

const FilterRow = ({ index, filter, filterJoinType, setFilterJoinType, updateFilter, onRemoveFilter, allRows }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // When the input column changes, determine the available filter types
  const filterTypeOptions = useMemo(() => {
    const options = [];
    if (!filter.column) {
      return options;
    }

    // column is numeric
    if (NUMERIC_COLUMN_TYPES.includes(filter.column.data_type)) {
      options.push(<option value="greaterThan" key="grt-thn">is greater than...</option>);
      options.push(<option value="lessThan" key="les-thn">is less than...</option>);
      options.push(<option value="equals" key="eq"> is exactly...</option>);
    // column is text based
    } else {
      options.push(<option value="contains" key="cont">contains...</option>);
      options.push(<option value="is" key="is">is...</option>);
    }

    // finally, all data types have is null / is not null
    options.push(<option value="isEmpty" key="is-empty">is empty</option>);
    options.push(<option value="isNotEmpty" key="not-empty">is not empty</option>);

    return options;
  }, [filter.column]);

  // calculate the search results when the input text changes
  useEffect(() => {
    if (!filter.column || NUMERIC_COLUMN_TYPES.includes(filter.column.data_type)) {
      setSearchResults([]);
      return;
    }

    const filtered = allRows.filter(row => row[filter.column.name] && row[filter.column.name].includes(filter.textValue));
    const noDupes = [...new Set(filtered.map(r => r[filter.column.name]))];
    const sorted = noDupes.sort();
    setSearchResults(sorted);
  }, [filter.column, filter.textValue, allRows]);

  const isTextNeeded = () => {
    return filter.filterType !== 'isEmpty' && filter.filterType !== 'isNotEmpty';
  };

  const handleSearchResultClick = async (event, value) => {
    event.stopPropagation();
    onValueChange(value);
    setShowSearchResults(false);
  };

  const onTypeChange = (newType) => {
    const newFilter = { ...filter };
    newFilter.filterType = newType;
    newFilter.textValue = '';
    updateFilter(newFilter);
  };

  const onValueChange = (newValue) => {
    const newFilter = { ...filter };
    newFilter.textValue = newValue;
    updateFilter(newFilter);
  };

  return (
    <FilterCreationRow>
      {index === 0 && <span>Where: </span>}
      {index === 1 && (
        <select value={filterJoinType} onChange={e => setFilterJoinType(e.target.value)}>
          <option value="AND">And</option>
          <option value="OR">Or</option>
        </select>
      )}
      {index > 1 && (
        <span style={{ width: '42px', marginLeft: '8px' }}>{filterJoinType.toLowerCase()}</span>
      )}
      <span>{filter.column.alias}</span>
      <FilterCreationSelect
        value={filter.filterType}
        onChange={e => onTypeChange(e.target.value)}
      >
        {filterTypeOptions}
      </FilterCreationSelect>
      {isTextNeeded() && (
        <FilterSearchBar>
          <FilterInput
            placeholder="Enter a value..."
            value={filter.textValue}
            onChange={e => onValueChange(e.target.value)}
            onClick={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 300)}
          />
          {searchResults.length > 0 && showSearchResults && (
            <FilterSearchResults>
              {searchResults.map(result => (
                <li
                  key={result}
                  onClick={(e) => handleSearchResultClick(e, result)}
                >
                  <span className="a-tag">
                    {result}
                  </span>
                </li>
              ))}
            </FilterSearchResults>
          )}
        </FilterSearchBar>
      )}
      <RemoveFilterButton onClick={() => onRemoveFilter(index)}>
        <FontAwesomeIcon icon={faTrash} />
      </RemoveFilterButton>
    </FilterCreationRow>
  );
};

export default FilterCreationModal;
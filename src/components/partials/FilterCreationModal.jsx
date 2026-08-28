import React, { useState, useEffect, useMemo } from 'react';
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
`;

const FilterCreationRow = styled.div`
  display: flex;
  gap: 12px;
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

const FilterCreationModal = ({ isOpen, handleClose, filterModalColumn, addNewColumnFilter }) => {
  const [filterType, setFilterType] = useState('isNotEmpty');
  const [textValue, setTextValue] = useState('');

  // When the input column changes, determine the available filter types
  const filterTypeOptions = useMemo(() => {
    const options = [];
    if (!filterModalColumn) {
      return options;
    }

    // column is numeric
    if (NUMERIC_COLUMN_TYPES.includes(filterModalColumn.data_type)) {
      options.push(<option value="greaterThan">is greater than...</option>);
      options.push(<option value="lessThan">is less than...</option>);
      options.push(<option value="equals">is exactly...</option>);
    // column is text based
    } else {
      options.push(<option value="contains">contains...</option>);
      options.push(<option value="is">is...</option>);
    }

    // finally, all data types have is null / is not null
    options.push(<option value="isEmpty">is empty</option>);
    options.push(<option value="isNotEmpty">is not empty</option>);

    return options;
  }, [filterModalColumn]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const buildFilterThenClose = () => {
    const filter = {
      columnKey: filterModalColumn.name,
      columnAlias: filterModalColumn.alias,
      filterType,
      textValue,
    }

    addNewColumnFilter(filter)
    closeModal();
  }

  const closeModal = () => {
    setFilterType('isNotEmpty');
    setTextValue('');
    handleClose();
  }

  const isTextNeeded = () => {
    return filterType !== 'isEmpty' && filterType !== 'isNotEmpty';
  }

  const isCreateEnabled = () => {
    const textRequired = isTextNeeded()
    return textRequired ? !!filterType && !!textValue : !!filterType; 
  }

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
          <FilterCreationRow>
            <span>Where {filterModalColumn.alias}</span>
            <select
              value={filterType}
              onChange={e => {
                setFilterType(e.target.value);
                setTextValue('');
              }}
            >
              {...filterTypeOptions}
            </select>
            {isTextNeeded() && (
              <input
                placeholder="Enter a value..."
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
              />
            )}
          </FilterCreationRow>
        </ModalBody>
        <ModalFooter>
          <CancelButton onClick={() => handleClose()}>
            Close
          </CancelButton>
          <CreateButton
            className={isCreateEnabled() ? '' : 'disabled'}
            onClick={() => buildFilterThenClose()}
          >
            Create Filter
          </CreateButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
}

export default FilterCreationModal;
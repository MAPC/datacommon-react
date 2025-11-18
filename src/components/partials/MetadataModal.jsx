import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  padding: 0;
  cursor: pointer;
  color: #666;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  line-height: 1;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #d32f2f;
`;

const MetadataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const TableHeader = styled.thead`
  background-color: #f8f9fa;
`;

const TableHeaderRow = styled.tr`
  border-bottom: 2px solid #dee2e6;
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem;
  font-weight: 700;
  color: #333;
  text-align: left;
  border: 1px solid #dee2e6;
  border-bottom: 2px solid #dee2e6;
`;

const MetadataRow = styled.tr`
  &:nth-child(even) {
    background-color: #f9f9f9;
  }
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const MetadataCell = styled.td`
  padding: 0.75rem;
  color: #555;
  border: 1px solid #dee2e6;
  word-wrap: break-word;
  vertical-align: top;
`;

const MetadataModal = ({ show, handleClose, dataset }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && dataset) {
      fetchMetadata();
    } else {
      // Reset state when modal closes
      setMetadata(null);
      setError(null);
    }
  }, [show, dataset]);

  const fetchMetadata = async () => {
    if (!dataset) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `/api/metadata?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}`
      );
      
      // Handle gisdata differently - it has a different structure
      if (dataset.db_name === 'gisdata') {
        // For gisdata, first get the metadata object from response
        const metadata = Object.values(response.data)[0];
        // Then navigate to documentation.metadata.eainfo.detailed.attr
        const eainfo = metadata?.documentation?.metadata?.eainfo;
        if (eainfo?.detailed?.attr && Array.isArray(eainfo.detailed.attr)) {
          // Map attrlabl, attalias, attrdef to our format
          const mappedMetadata = eainfo.detailed.attr.map(attr => ({
            name: attr.attrlabl || 'N/A',
            alias: attr.attalias || 'N/A',
            details: attr.attrdef || 'undefined'
          }));
          setMetadata(mappedMetadata);
        } else {
          console.warn('gisdata metadata structure not found:', response.data);
          setMetadata([]);
        }
      } else {
        // Handle different metadata formats for other databases
        const metadataData = Object.values(response.data)[0];
        setMetadata(Array.isArray(metadataData) ? metadataData : []);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Failed to load metadata. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Metadata: {dataset?.menu3 || 'Dataset Metadata'}</ModalTitle>
          <CloseButton onClick={handleClose} aria-label="Close">
            ×
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          {loading && (
            <LoadingMessage>Loading metadata...</LoadingMessage>
          )}
          {error && (
            <ErrorMessage>{error}</ErrorMessage>
          )}
          {!loading && !error && metadata && (
            <MetadataTable>
              <TableHeader>
                <TableHeaderRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Alias</TableHeaderCell>
                  <TableHeaderCell>Details</TableHeaderCell>
                </TableHeaderRow>
              </TableHeader>
              <tbody>
                {metadata.map((item, index) => (
                  <MetadataRow key={index}>
                    <MetadataCell>{item.name || 'N/A'}</MetadataCell>
                    <MetadataCell>{item.alias || 'N/A'}</MetadataCell>
                    <MetadataCell>{item.details || 'N/A'}</MetadataCell>
                  </MetadataRow>
                ))}
              </tbody>
            </MetadataTable>
          )}
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default MetadataModal;


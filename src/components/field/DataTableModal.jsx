import React, { useState } from 'react';
import PropTypes from 'prop-types';
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
  max-width: 800px;
  max-height: 90vh;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: ${slideIn} 0.3s ease-out;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
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
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 1rem;
  overflow: hidden;
  max-height: calc(90vh - 120px);
  position: relative;
`;

const TableWrapper = styled.div`
  position: relative;
  max-height: calc(90vh - 160px);
  overflow: auto;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-bottom: 0;
  background: white;

  th, td {
    padding: 0.75rem;
    border: 1px solid #dee2e6;
    text-align: left;
    background: white;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 3;
    
    tr {
      background: white;
    }
  }

  th {
    background: #eef0f2;
    font-weight: 800;
    text-align: center !important;
    white-space: nowrap;
    text-transform: uppercase;
    font-size: 0.9rem;
    letter-spacing: 0.02em;
    border-bottom: 2px solid #dee2e6;
    box-shadow: inset 0 1px 0 #dee2e6, inset 0 -2px 0 #dee2e6;
  }

  td {
    background: inherit;
    vertical-align: middle;
    text-align: left !important;
  }


  tbody tr {
    &:nth-child(odd) {
      background-color: rgba(0, 0, 0, 0.02);
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
  }
`;

const CopyButton = styled.button`
  background: #4A90E2;
  border: none;
  border-radius: 5px;
  color: #FFFFFF;
  cursor: pointer;
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  font-size: 12px;
  padding: 8px 12px;
  margin-left: 10px;
  transition: background 0.2s ease;

  &:hover {
    background: #357ABD;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const DownloadButton = styled(CopyButton)`
  background: #6FC68E;
  
  &:hover {
    background: #5DB37A;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const DataTableModal = ({ show, handleClose, data, title, muni }) => {
  const [copyStatus, setCopyStatus] = useState('Copy to Clipboard');

  if (!show || !data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  // Helper function to check if a value is numeric
  const isNumeric = (value) => {
    if (typeof value === 'number') return true;
    if (typeof value === 'string') {
      // Remove commas and try to convert to number
      const parsed = value.replace(/,/g, '');
      return !isNaN(parsed) && !isNaN(parseFloat(parsed));
    }
    return false;
  };

  const handleCopy = async () => {
    try {
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      await navigator.clipboard.writeText(csvContent);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy to Clipboard'), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus('Copy to Clipboard'), 2000);
    }
  };

  const handleDownload = () => {
    try {
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const fileName = `${title}_${muni || 'data'}.csv`.replace(/[^a-z0-9-_\.]/gi, '_');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading data:', error);
    }
  };

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <HeaderContent>
            <h2>{title}</h2>
            <ButtonGroup>
              <CopyButton 
                onClick={handleCopy}
                disabled={copyStatus === 'Copied!'}
              >
                {copyStatus}
              </CopyButton>
              <DownloadButton 
                onClick={handleDownload}
                title="Download as CSV"
              >
                Download Data
              </DownloadButton>
            </ButtonGroup>
          </HeaderContent>
          <CloseButton 
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  {headers.map(header => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    {headers.map(header => {
                      const value = row[header];
                      return (
                        <td 
                          key={`${index}-${header}`}
                          className={isNumeric(value) ? 'numeric' : ''}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};

DataTableModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  data: PropTypes.arrayOf(PropTypes.object),
  title: PropTypes.string.isRequired,
  muni: PropTypes.string,
};

export default DataTableModal; 
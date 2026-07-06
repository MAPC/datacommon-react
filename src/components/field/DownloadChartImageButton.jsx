import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { exportChartImageBlob } from '../../utils/exportChartImage';

import { SUBREGIONS } from '../../constants/subregions';

const DownloadButton = styled.button`
  background: transparent;
  border: 1px solid #555555;
  border-radius: 4px;
  color: #555555;
  cursor: pointer;
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  font-size: 12px;
  padding: 4px 8px;

  &:hover:not([aria-busy='true']) {
    color: #6FC68E;
    border-color: #6FC68E;
  }

  &[aria-busy='true'] {
    color: #aaaaaa;
    cursor: wait;
  }

  &[data-copied='true'] {
    color: #6FC68E;
    border-color: #6FC68E;
    cursor: default;
  }

  i,
  span {
    color: inherit;
    font-size: 14px;
  }
`;

const DownloadChartImageButton = ({ chartRef, chartTitle, muni, isSubregion, isRPAregion, displayName, hideTitle }) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const downloadChartImage = async () => {
    if (!chartRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      const blob = await exportChartImageBlob(chartRef.current, { chartTitle, hideTitle });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      let nameSuffix;
      if (displayName) {
        nameSuffix = displayName;
      } else if (isSubregion) {
        nameSuffix = SUBREGIONS[muni]?.match(/\[([^\]]+)\]/)?.[1] || muni;
      } else if (isRPAregion) {
        nameSuffix = 'MAPC';
      } else {
        nameSuffix = muni;
      }

      const sanitizedChartTitle = (chartTitle || 'chart').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const sanitizedMuni = nameSuffix.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      link.download = `${sanitizedChartTitle}_${sanitizedMuni}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading chart image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DownloadButton
      type="button"
      onClick={downloadChartImage}
      aria-busy={isDownloading}
      title="Download chart as image"
      aria-label="Download chart as image"
    >
      <span aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <title>Download chart as image</title>
          <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
          <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zm13 1a.5.5 0 0 1 .5.5v6l-3.775-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12v.54L1 12.5v-9a.5.5 0 0 1 .5-.5z" />
        </svg>
      </span>
    </DownloadButton>
  );
};

DownloadChartImageButton.propTypes = {
  chartRef: PropTypes.object.isRequired,
  chartTitle: PropTypes.string,
  muni: PropTypes.string,
  isSubregion: PropTypes.bool,
  isRPAregion: PropTypes.bool,
  displayName: PropTypes.string,
  hideTitle: PropTypes.bool,
};

export default DownloadChartImageButton;

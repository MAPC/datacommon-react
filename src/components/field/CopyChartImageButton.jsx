import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { exportChartImageBlob } from '../../utils/exportChartImage';

const CopyButton = styled.button`
  background: transparent;
  border: 1px solid #555555;
  border-radius: 4px;
  color: #555555;
  cursor: pointer;
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  font-size: 12px;
  padding: 4px 8px;
  white-space: nowrap;

  &:hover:not([aria-busy='true']):not([data-copied='true']) {
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

  span {
    color: inherit;
    font-size: ${({ $copied }) => ($copied ? '12px' : '14px')};
  }
`;

const COPIED_MESSAGE = 'Copied chart';

const CopyChartImageButton = ({ chartRef, chartTitle, hideTitle }) => {
  const [isCopying, setIsCopying] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState('');

  const copyChartImage = async () => {
    if (!chartRef.current || isCopying || statusMessage === COPIED_MESSAGE) return;

    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      setStatusMessage('Copy not supported');
      setTimeout(() => setStatusMessage(''), 2500);
      return;
    }

    setIsCopying(true);
    try {
      const blob = await exportChartImageBlob(chartRef.current, { chartTitle, hideTitle });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setStatusMessage(COPIED_MESSAGE);
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (error) {
      console.error('Error copying chart image:', error);
      setStatusMessage('Copy failed');
      setTimeout(() => setStatusMessage(''), 2500);
    } finally {
      setIsCopying(false);
    }
  };

  const isCopied = statusMessage === COPIED_MESSAGE;
  const ariaLabel = statusMessage || 'Copy chart image to clipboard';

  return (
    <CopyButton
      type="button"
      onClick={copyChartImage}
      aria-busy={isCopying}
      data-copied={isCopied || undefined}
      title={statusMessage ? undefined : 'Copy chart image to clipboard'}
      aria-label={ariaLabel}
      $copied={isCopied}
    >
      {statusMessage ? (
        <span role="status" aria-live="polite">
          {statusMessage}
        </span>
      ) : (
        <span aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <title>Copy chart image to clipboard</title>
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z" />
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z" />
          </svg>
        </span>
      )}
    </CopyButton>
  );
};

CopyChartImageButton.propTypes = {
  chartRef: PropTypes.object.isRequired,
  chartTitle: PropTypes.string,
  hideTitle: PropTypes.bool,
};

export default CopyChartImageButton;

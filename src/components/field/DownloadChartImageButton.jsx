import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const DownloadButton = styled.button`
  background: #6FC68E;
  border: none;
  border-radius: 5px;
  color: #FFFFFF;
  cursor: pointer;
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  font-size: 12px;
  padding: 8px 12px;

  &:hover {
    background: #5DB37A;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const DownloadChartImageButton = ({ chartRef, chartTitle }) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const downloadChartImage = async () => {
    if (!chartRef.current) return;

    setIsDownloading(true);
    try {
      // Get the entire chart wrapper (includes chart, legend, and metadata)
      const chartWrapper = chartRef.current;
      const chartContainer = chartWrapper.querySelector('.chart-container') || chartWrapper.querySelector('.svg-wrapper');
      const legend = chartWrapper.querySelector('.legend');
      const metadata = chartWrapper.querySelector('.metadata');
      
      if (!chartContainer) {
        console.error('Chart container not found');
        return;
      }

      // Get the SVG element
      const svg = chartContainer.querySelector('svg');
      if (!svg) {
        console.error('SVG not found');
        return;
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svg.cloneNode(true);
      
      // Get computed styles for the SVG
      const computedStyle = window.getComputedStyle(svg);
      const svgWidth = parseInt(computedStyle.width) || 500;
      const svgHeight = parseInt(computedStyle.height) - 130;
      
      // Set explicit dimensions on the cloned SVG
      clonedSvg.setAttribute('width', svgWidth);
      clonedSvg.setAttribute('height', svgHeight);
      clonedSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
      
      // Calculate legend height dynamically
      let legendHeight = 0;
      if (legend) {
        const legendItems = legend.querySelectorAll('li');
        const itemsPerRow = 2; // Fixed at 2 items per row
        const rows = Math.ceil(legendItems.length / itemsPerRow);
        legendHeight = rows * 20 + 20; // 20px per row + 20px padding
      }
      
      // Calculate metadata height dynamically
      let metadataHeight = 0;
      if (metadata) {
        const sourceTimeframe = metadata.querySelector('.source-timeframe');
        const link = metadata.querySelector('.link');
        let lines = 0;
        
        if (sourceTimeframe) {
          if (sourceTimeframe.querySelector('.source')) lines++;
          if (sourceTimeframe.querySelector('.timeframe')) lines++;
        }
        if (link) lines++;
        
        metadataHeight = lines * 16 + 20; // 16px per line + 20px padding
      }
      
      // Create a new SVG that will contain everything
      const combinedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      combinedSvg.setAttribute('width', svgWidth + 80); // Increased from 20 to 60 to accommodate left margin
      combinedSvg.setAttribute('height', svgHeight + legendHeight + metadataHeight + 50);
      combinedSvg.setAttribute('viewBox', `0 0 ${svgWidth + 80} ${svgHeight + legendHeight + metadataHeight + 50}`);
      combinedSvg.style.backgroundColor = 'white';
      
      // Add chart title
      const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleText.setAttribute('x', 50); // Aligned with legend left margin instead of center
      titleText.setAttribute('y', 30); // Increased from 18 to 30 for top margin
      titleText.setAttribute('font-family', 'Arial, sans-serif');
      titleText.setAttribute('font-size', '16px');
      titleText.setAttribute('font-weight', 'bold');
      titleText.setAttribute('fill', 'black');
      titleText.setAttribute('text-anchor', 'start'); 
      titleText.textContent = chartTitle || 'Chart Title';
      combinedSvg.appendChild(titleText);
      
      // Add the chart SVG centered
      const chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      chartGroup.setAttribute('transform', 'translate(50, 40)'); // Back to left margin for the group
      
      chartGroup.appendChild(clonedSvg);
      combinedSvg.appendChild(chartGroup);
      
      // Add legend with proper styling if it exists
      if (legend) {
        const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        legendGroup.setAttribute('transform', `translate(50, ${svgHeight + 15})`); // Added 50px left margin
        
        // Get legend items
        const legendItems = legend.querySelectorAll('li');
        const itemsPerRow = 2; // Fixed at 2 items per row
        const maxWidth = svgWidth; // Use full chart width for legend
        const itemWidth = maxWidth / itemsPerRow;
        
        // Track row heights for proper spacing
        const rowHeights = [];
        
        legendItems.forEach((item, index) => {
          const colorPatch = item.querySelector('.color-patch');
          const label = item.querySelector('.label');
          
          if (colorPatch && label) {
            // Calculate position for 2-column layout
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = col * itemWidth;
            
            // Calculate Y position based on previous row heights
            let y = 0;
            for (let i = 0; i < row; i++) {
              y += rowHeights[i] || 18;
            }
            
            // Add color circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x + 8);
            circle.setAttribute('cy', y + 8);
            circle.setAttribute('r', '6');
            
            // Get the actual color from the circle
            const circleElement = colorPatch.querySelector('circle');
            if (circleElement) {
              const fillColor = circleElement.getAttribute('fill');
              circle.setAttribute('fill', fillColor);
            }
            
            legendGroup.appendChild(circle);
            
            // Function to wrap text
            const wrapText = (textContent, maxWidth) => {
              const words = textContent.split(' ');
              const lines = [];
              let currentLine = '';
              
              words.forEach(word => {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                // Approximate text width (rough estimate: 6px per character)
                const testWidth = testLine.length * 6;
                
                if (testWidth > maxWidth && currentLine) {
                  lines.push(currentLine);
                  currentLine = word;
                } else {
                  currentLine = testLine;
                }
              });
              
              if (currentLine) {
                lines.push(currentLine);
              }
              
              return lines;
            };
            
            // Wrap the text
            const maxTextWidth = itemWidth - 30; // Leave space for color circle and padding
            const wrappedLines = wrapText(label.textContent, maxTextWidth);
            
            // Add each line of text
            wrappedLines.forEach((line, lineIndex) => {
              const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              textElement.setAttribute('x', x + 20);
              textElement.setAttribute('y', y + 12 + (lineIndex * 14));
              textElement.setAttribute('font-family', 'Arial, sans-serif');
              textElement.setAttribute('font-size', '12px');
              textElement.setAttribute('fill', 'black');
              textElement.textContent = line;
              legendGroup.appendChild(textElement);
            });
            
            // Calculate and store row height
            const itemHeight = Math.max(18, wrappedLines.length * 14 + 6);
            if (!rowHeights[row] || itemHeight > rowHeights[row]) {
              rowHeights[row] = itemHeight;
            }
          }
        });
        
        // Update legend height based on actual row heights
        const totalLegendHeight = rowHeights.reduce((sum, height) => sum + height, 0) + 10;
        legendHeight = totalLegendHeight;
        
        combinedSvg.appendChild(legendGroup);
      }
      
      // Add metadata with proper styling if it exists
      if (metadata) {
        const metadataGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        metadataGroup.setAttribute('transform', `translate(50, ${svgHeight + legendHeight + 10})`); // Added 50px left margin
        
        // Get metadata sections
        const sourceTimeframe = metadata.querySelector('.source-timeframe');
        const link = metadata.querySelector('.link');
        
        let yOffset = 0;
        
        if (sourceTimeframe) {
          const source = sourceTimeframe.querySelector('.source');
          const timeframe = sourceTimeframe.querySelector('.timeframe');
          
          if (source) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '0');
            text.setAttribute('y', yOffset + 12);
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.setAttribute('font-size', '10px');
            text.setAttribute('fill', 'black');
            text.textContent = source.textContent;
            metadataGroup.appendChild(text);
            yOffset += 14;
          }
          
          if (timeframe) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '0');
            text.setAttribute('y', yOffset + 12);
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.setAttribute('font-size', '10px');
            text.setAttribute('fill', 'black');
            text.textContent = timeframe.textContent;
            metadataGroup.appendChild(text);
            yOffset += 14;
          }
        }
        
        if (link) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', '0');
          text.setAttribute('y', yOffset + 12);
          text.setAttribute('font-family', 'Arial, sans-serif');
          text.setAttribute('font-size', '10px');
          text.setAttribute('fill', 'black');
          text.textContent = link.textContent;
          metadataGroup.appendChild(text);
        }
        
        combinedSvg.appendChild(metadataGroup);
      }
      
      // Convert SVG to string
      const svgData = new XMLSerializer().serializeToString(combinedSvg);
      
      // Create a canvas to draw the SVG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = svgWidth + 60; // Increased from 20 to 60 to accommodate left margin
      canvas.height = svgHeight + legendHeight + metadataHeight + 50;
      
      // Create an image from the SVG
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Draw the SVG on canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${chartTitle || 'chart'}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      
      img.src = url;

    } catch (error) {
      console.error('Error downloading chart image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DownloadButton
      onClick={downloadChartImage}
      disabled={isDownloading}
      title="Download chart as image"
    >
      {isDownloading ? 'Downloading...' : 'Download Image'}
    </DownloadButton>
  );
};

DownloadChartImageButton.propTypes = {
  chartRef: PropTypes.object.isRequired,
  chartTitle: PropTypes.string,
};

export default DownloadChartImageButton; 
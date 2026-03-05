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

const SUBREGIONS = {
  355: 'Inner Core Committee [ICC]',
  356: 'Minuteman Advisory Group on Interlocal Coordination [MAGIC]',
  357: 'MetroWest Regional Collaborative [MWRC]',
  358: 'North Shore Task Force [NSTF]',
  359: 'North Suburban Planning Council [NSPC]',
  360: 'South Shore Coalition [SSC]',
  361: 'South West Advisory Planning Committee [SWAP]',
  362: 'Three Rivers Interlocal Council [TRIC]'
};

const DownloadChartImageButton = ({ chartRef, chartTitle, muni, isSubregion, isRPAregion, displayName }) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Common function to wrap text
  const wrapText = (textContent, maxWidth) => {
    const words = textContent.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
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

  const downloadChartImage = async () => {
    if (!chartRef.current) return;

    setIsDownloading(true);
    try {
      // Get the entire chart wrapper (includes chart, legend, and metadata)
      const chartWrapper = chartRef.current;
      const legend = chartWrapper.querySelector('.legend');
      const metadata = chartWrapper.querySelector('.metadata');
      const isGaugeChart = !!chartWrapper.querySelector('.GaugeChart');
      
      // Get the SVG element
      const svg = chartWrapper.querySelector('svg');
      if (!svg) {
        console.error('SVG not found');
        setIsDownloading(false);
        return;
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svg.cloneNode(true);
      
      // For gauges, switch to the static (print) segment so the exported image shows the final value, not mid-animation
      if (isGaugeChart) {
        const animatedSeg = clonedSvg.querySelector('.donut-segment--animated');
        const printSeg = clonedSvg.querySelector('.donut-segment--print');
        if (animatedSeg && printSeg) {
          animatedSeg.parentNode.removeChild(animatedSeg);
          printSeg.style.display = 'block';
        }
      }
      
      // Get computed styles for the SVG
      const computedStyle = window.getComputedStyle(svg);
      const svgWidth = parseInt(computedStyle.width) || 500;
      
      // Calculate dynamic height based on chart type and content
      let svgHeight = 550; // Default height
      
      // Check chart type for sizing tweaks
      const chartType = chartWrapper.querySelector('.StackedAreaChart') ? 'stacked-area' : 
                       chartWrapper.querySelector('.StackedBarChart') ? 'stacked-bar' : 
                       chartWrapper.querySelector('.PieChart') ? 'pie' :
                       isGaugeChart ? 'gauge' : 'other';
      
      if (legend) {
        const legendItems = legend.querySelectorAll('li');
        const numLegendItems = legendItems.length;
        
        // For pie charts, use smaller height since they don't need as much vertical space
        if (chartType === 'pie') {
          svgHeight = 450; // Smaller height for pie charts
        } else if (chartType === 'stacked-area' || numLegendItems > 8) {
          svgHeight = 570; // Increase height for complex charts
        } else if (numLegendItems > 4) {
          svgHeight = 560;
        }
      }
      
      // Gauges are short; keep aspect similar to what you see in the tab
      if (chartType === 'gauge') {
        svgHeight = Math.round(svgWidth * (40 / 80)); // match 80x40 viewBox ratio
      }
      
      // Set explicit dimensions on the cloned SVG
      clonedSvg.setAttribute('width', svgWidth);
      clonedSvg.setAttribute('height', svgHeight);
      // For gauges, keep the original internal viewBox (80x40) so the arc looks the same as in the tab
      if (!isGaugeChart) {
        clonedSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
      }
      
      // Calculate legend height dynamically with better estimation
      let legendHeight = 0;
      if (legend) {
        const legendItems = legend.querySelectorAll('li');
        const itemsPerRow = 2; // Fixed at 2 items per row
        const rows = Math.ceil(legendItems.length / itemsPerRow);
        
        // Calculate average text length to estimate if text wrapping is needed
        let maxTextLength = 0;
        legendItems.forEach(item => {
          const label = item.querySelector('.label');
          if (label && label.textContent.length > maxTextLength) {
            maxTextLength = label.textContent.length;
          }
        });
        
        // Adjust row height based on text length (longer text may wrap)
        let rowHeight = 20; // Base row height
        if (maxTextLength > 40) {
          rowHeight = 30; // More space for long text that might wrap
        } else if (maxTextLength > 25) {
          rowHeight = 25; // Moderate space for medium text
        }
        
        legendHeight = rows * rowHeight + 30; // Increased padding
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
      
      // Wrap long chart title; force break before "device(s)" so that word is on second line and not hidden
      const rawTitle = chartTitle || 'Chart Title';
      const maxTitleWidth = Math.max(50, svgWidth - 40);
      let titleLines = [];
      if (rawTitle.includes(' devices ') || rawTitle.includes(' devices:')) {
        const idx = rawTitle.indexOf(' devices');
        const firstPart = rawTitle.slice(0, idx).trim();
        const secondPart = rawTitle.slice(idx).trim(); // "devices: ..." or "devices ..."
        titleLines = wrapText(firstPart, maxTitleWidth).concat(wrapText(secondPart, maxTitleWidth));
      } else if (rawTitle.includes(' device ') || rawTitle.includes(' device:')) {
        const idx = rawTitle.indexOf(' device');
        const firstPart = rawTitle.slice(0, idx).trim();
        const secondPart = rawTitle.slice(idx).trim();
        titleLines = wrapText(firstPart, maxTitleWidth).concat(wrapText(secondPart, maxTitleWidth));
      } else {
        titleLines = wrapText(rawTitle, maxTitleWidth);
      }
      const titleHeight = titleLines.length * 18;

      // Top offset for chart (gauge needs more space; multi-line title needs more space)
      const chartTop = Math.max(isGaugeChart ? 55 : 40, 30 + titleHeight + 10);
      const topPadding = chartTop - 40;

      // Create a new SVG that will contain everything
      const combinedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      combinedSvg.setAttribute('width', svgWidth + 80); 
      combinedSvg.setAttribute('height', svgHeight + legendHeight + metadataHeight + 30 + topPadding);
      combinedSvg.setAttribute('viewBox', `0 0 ${svgWidth + 80} ${svgHeight + legendHeight + metadataHeight + 50 + topPadding}`);
      combinedSvg.style.backgroundColor = 'white';
      
      // Add chart title (multiple lines when long)
      const titleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      titleLines.forEach((line, i) => {
        const titleLine = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleLine.setAttribute('x', 50);
        titleLine.setAttribute('y', 30 + i * 18);
        titleLine.setAttribute('font-family', 'Arial, sans-serif');
        titleLine.setAttribute('font-size', '16px');
        titleLine.setAttribute('font-weight', 'bold');
        titleLine.setAttribute('fill', 'black');
        titleLine.setAttribute('text-anchor', 'start');
        titleLine.textContent = line;
        titleGroup.appendChild(titleLine);
      });
      combinedSvg.appendChild(titleGroup);
      
      // Add the chart SVG (chartTop leaves room for title so it doesn't overlap gauge)
      const chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      chartGroup.setAttribute('transform', `translate(50, ${chartTop})`);
      
      chartGroup.appendChild(clonedSvg);
      combinedSvg.appendChild(chartGroup);
      
      // Add legend with proper styling if it exists
      if (legend) {
        const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        legendGroup.setAttribute('transform', `translate(50, ${chartTop + svgHeight + 5})`);
        
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
            
            // Wrap the text
            const maxTextWidth = itemWidth - 30; // Leave space for color circle and padding
            const wrappedLines = wrapText(label.textContent, maxTextWidth);
            
            // Add each line of text
            wrappedLines.forEach((line, lineIndex) => {
              const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              textElement.setAttribute('x', x + 20);
              textElement.setAttribute('y', y + 12 + (lineIndex * 14));
              textElement.setAttribute('font-family', 'Arial, sans-serif');
              textElement.setAttribute('font-size', '0.75rem');
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
        metadataGroup.setAttribute('transform', `translate(50, ${chartTop + svgHeight + legendHeight + 10})`);
        
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
          // Wrap the link text to fit within the available width
          const maxTextWidth = svgWidth - 20; // Leave some margin
          const wrappedLines = wrapText(link.textContent, maxTextWidth);
          
          // Add each line of wrapped text
          wrappedLines.forEach((line, lineIndex) => {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '0');
            text.setAttribute('y', yOffset + 12 + (lineIndex * 12));
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.setAttribute('font-size', '10px');
            text.setAttribute('fill', 'black');
            text.textContent = line;
            metadataGroup.appendChild(text);
          });
          
          // Update metadata height calculation to account for wrapped text
          metadataHeight = (sourceTimeframe ? 28 : 0) + (wrappedLines.length * 12) + 20;
        }
        
        combinedSvg.appendChild(metadataGroup);
      }
      
      // Convert SVG to string
      const svgData = new XMLSerializer().serializeToString(combinedSvg);
      
      // Create a high-resolution canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set high resolution canvas size (2x for retina displays)
      const scale = 2;
      const finalWidth = (svgWidth + 80) * scale;
      const finalHeight = (svgHeight + legendHeight + metadataHeight + 50 + topPadding) * scale;
      
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      
      // Scale the context for high resolution
      ctx.scale(scale, scale);
      
      // Create an image from the SVG
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Draw the SVG on canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
        ctx.drawImage(img, 0, 0);
        
        // Convert canvas to blob and download with high quality
        canvas.toBlob((blob) => {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          
          // Format municipality name for filename
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
          
          // Sanitize filename: remove invalid characters and replace spaces with underscores
          const sanitizedChartTitle = (chartTitle || 'chart').replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const sanitizedMuni = nameSuffix.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          
          link.download = `${sanitizedChartTitle}_${sanitizedMuni}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          URL.revokeObjectURL(url);
        }, 'image/png', 1.0); // Maximum quality
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
  muni: PropTypes.string,
  isSubregion: PropTypes.bool,
  isRPAregion: PropTypes.bool,
  displayName: PropTypes.string,
};

export default DownloadChartImageButton; 
import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

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

  &:hover {
    color: #6FC68E;
    border-color: #6FC68E;
  }

  &:disabled {
    color: #aaaaaa;
    cursor: not-allowed;
  }

  i,
  span {
    color: inherit;
    font-size: 14px;
  }
`;

const DownloadChartImageButton = ({ chartRef, chartTitle, muni, isSubregion, isRPAregion, displayName, hideTitle }) => {
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

  const buildProfileMetricChartSvg = (chartWrapper, cardW) => {
    const ns = 'http://www.w3.org/2000/svg';
    const labelEl = chartWrapper.querySelector('.profile-metric__label');
    const valueEl = chartWrapper.querySelector('.profile-metric__value');
    const emptyEl = chartWrapper.querySelector('.profile-metric__empty');

    const labelText = labelEl?.textContent?.trim() || '';
    const valueText =
      valueEl?.textContent?.trim() || emptyEl?.textContent?.trim() || 'Data not available';
    const isEmpty = !valueEl;

    const padX = 20;
    const padY = 16;
    const labelFs = 13;
    const valueFs = isEmpty ? 13 : 28;
    const labelLineH = 18;
    const valueLineH = Math.ceil(valueFs * 1.2);
    const gap = labelText && valueText ? 10 : 0;
    const innerW = Math.max(120, cardW - padX * 2);

    const labelLines = labelText ? wrapText(labelText, innerW) : [];
    const valueLines = wrapText(valueText, innerW);
    const headerH = labelLines.length * labelLineH;
    const valueH = valueLines.length * valueLineH;
    const cardH = padY + headerH + gap + valueH + padY;

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', String(cardW));
    svg.setAttribute('height', String(cardH));
    svg.setAttribute('viewBox', `0 0 ${cardW} ${cardH}`);

    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', String(cardW));
    bg.setAttribute('height', String(cardH));
    bg.setAttribute('rx', '12');
    bg.setAttribute('fill', '#ffffff');
    bg.setAttribute('stroke', '#e2e8f0');
    bg.setAttribute('stroke-width', '1');
    svg.appendChild(bg);

    let y = padY + labelFs;
    labelLines.forEach((line) => {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', String(padX));
      t.setAttribute('y', String(y));
      t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
      t.setAttribute('font-size', `${labelFs}px`);
      t.setAttribute('font-weight', '500');
      t.setAttribute('fill', '#64748b');
      t.textContent = line;
      svg.appendChild(t);
      y += labelLineH;
    });

    if (gap) {
      y += gap;
    } else if (!labelLines.length) {
      y = padY + valueFs;
    }

    const valueWeight = isEmpty ? '400' : '500';
    const valueColor = isEmpty ? '#64748b' : '#1e293b';
    valueLines.forEach((line) => {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', String(padX));
      t.setAttribute('y', String(y));
      t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
      t.setAttribute('font-size', `${valueFs}px`);
      t.setAttribute('font-weight', valueWeight);
      t.setAttribute('fill', valueColor);
      t.textContent = line;
      svg.appendChild(t);
      y += valueLineH;
    });

    return { svg, width: cardW, height: cardH };
  };

  const downloadChartImage = async () => {
    if (!chartRef.current) return;

    setIsDownloading(true);
    try {
      // Get the entire chart wrapper (includes chart, legend, and metadata)
      const chartWrapper = chartRef.current;
      const legend = chartWrapper.querySelector('.legend');
      const metadata = chartWrapper.querySelector('.metadata');
      const isProfileMetric = !!chartWrapper.querySelector('.ProfileMetricChart');
      const isGaugeChart = !!chartWrapper.querySelector('.GaugeChart');

      let clonedSvg;
      let svgWidth;
      let svgHeight;
      let chartType;

      if (isProfileMetric) {
        const cardW = Math.max(300, chartWrapper.clientWidth || 320);
        const built = buildProfileMetricChartSvg(chartWrapper, cardW);
        clonedSvg = built.svg;
        svgWidth = built.width;
        svgHeight = built.height;
        chartType = 'profile-metric';
      } else {
        // Get the SVG element: prefer the main chart SVG, not small icon SVGs
        let svg = chartWrapper.querySelector('.chart svg');
        if (!svg) {
          svg = chartWrapper.querySelector('svg');
        }
        if (!svg) {
          console.error('SVG not found');
          setIsDownloading(false);
          return;
        }

        // Clone the SVG to avoid modifying the original
        clonedSvg = svg.cloneNode(true);

        // For gauges, switch to the static (print) segment so the exported image shows the final value, not mid-animation,
        // and ensure the value text is dark green for better contrast in the downloaded image.
        if (isGaugeChart) {
          const animatedSeg = clonedSvg.querySelector('.donut-segment--animated');
          const printSeg = clonedSvg.querySelector('.donut-segment--print');
          if (animatedSeg && printSeg) {
            animatedSeg.parentNode.removeChild(animatedSeg);
            printSeg.style.display = 'block';
          }

          const gaugeValueText = clonedSvg.querySelector('.gauge-text');
          if (gaugeValueText) {
            gaugeValueText.setAttribute('fill', '#1F4E46'); // dark brand green
          }
        }

        const computedStyle = window.getComputedStyle(svg);
        svgWidth = parseInt(computedStyle.width, 10) || 500;

        const isSpeedTestMetricsInBranch =
          hideTitle &&
          chartWrapper.classList &&
          chartWrapper.classList.contains('digital-equity-speed-stats');
        svgHeight = isSpeedTestMetricsInBranch ? 260 : 550;

        chartType = chartWrapper.querySelector('.StackedAreaChart')
          ? 'stacked-area'
          : chartWrapper.querySelector('.StackedBarChart')
            ? 'stacked-bar'
            : chartWrapper.querySelector('.PieChart')
              ? 'pie'
              : chartWrapper.querySelector('.TreeMap')
                ? 'treemap'
                : isGaugeChart
                  ? 'gauge'
                  : 'other';

        if (legend && !isSpeedTestMetricsInBranch) {
          const legendItems = legend.querySelectorAll('li');
          const numLegendItems = legendItems.length;

          if (chartType === 'pie') {
            svgHeight = 450;
          } else if (chartType === 'stacked-area' || numLegendItems > 8) {
            svgHeight = 570;
          } else if (numLegendItems > 4) {
            svgHeight = 560;
          }
        }

        if (chartType === 'gauge') {
          svgHeight = Math.round(svgWidth * (40 / 80));
        }
        if (chartType === 'treemap') {
          svgHeight = Math.round(svgWidth * (440 / 760));
        }

        clonedSvg.setAttribute('width', svgWidth);
        clonedSvg.setAttribute('height', svgHeight);
        if (!isGaugeChart && chartType !== 'treemap') {
          clonedSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        }
      }

      const isSpeedTestMetrics =
        hideTitle &&
        chartWrapper.classList &&
        chartWrapper.classList.contains('digital-equity-speed-stats');

      // Fund Revenue treemap: stack summary above chart in the exported image (avoids horizontal overflow).
      const treemapSummaryEl =
        chartType === 'treemap' ? chartWrapper.querySelector('.treemap-summary') : null;
      const TREEMAP_SUMMARY_GAP = 16;
      let layoutChartWidth = svgWidth;
      let treemapChartContent = clonedSvg;
      let exportChartBodyHeight = svgHeight;

      if (
        chartType === 'treemap' &&
        treemapSummaryEl &&
        treemapSummaryEl.children.length >= 2
      ) {
        layoutChartWidth = svgWidth;

        const labelDom = treemapSummaryEl.children[0];
        const valueDom = treemapSummaryEl.children[1];
        const labelCs = window.getComputedStyle(labelDom);
        const valueCs = window.getComputedStyle(valueDom);

        const pickFontFamily = (cs) => {
          const raw = cs.fontFamily || 'Arial, sans-serif';
          const first = raw.split(',')[0] || raw;
          return first.replace(/["']/g, '').trim() || 'Arial';
        };

        const wrapW = Math.max(160, svgWidth - 16);
        const valueStr = valueDom.textContent || '';
        const valueFontSize = valueCs.fontSize || '28px';
        const valueFontNum = parseFloat(valueFontSize) || 28;
        const labelPx = Math.max(10, parseFloat(labelCs.fontSize) || 11);
        const valueLines = wrapText(valueStr, wrapW);
        const valueLineStep = Math.ceil(valueFontNum * 1.22);

        const ns = 'http://www.w3.org/2000/svg';
        const pair = document.createElementNS(ns, 'g');
        const sumG = document.createElementNS(ns, 'g');

        // `y` is the text baseline. Reserve space above the value baseline for tall digits ($),
        // and below the label baseline for the label line box, so they never overlap.
        const padTop = 4;
        const labelBaseline = padTop + Math.ceil(labelPx * 1.05);
        const tLabel = document.createElementNS(ns, 'text');
        tLabel.setAttribute('x', '0');
        tLabel.setAttribute('y', String(labelBaseline));
        tLabel.setAttribute('font-family', pickFontFamily(labelCs));
        tLabel.setAttribute('font-size', labelCs.fontSize || '11px');
        tLabel.setAttribute('font-weight', labelCs.fontWeight || '700');
        tLabel.setAttribute('fill', labelCs.color || '#555555');
        if (labelCs.letterSpacing && labelCs.letterSpacing !== 'normal') {
          tLabel.setAttribute('letter-spacing', labelCs.letterSpacing);
        }
        tLabel.textContent = labelDom.textContent || '';
        sumG.appendChild(tLabel);

        const labelInkBottom = labelBaseline + Math.ceil(labelPx * 0.35);
        const labelValueGap = 14;
        const valueCapAboveBaseline = Math.ceil(valueFontNum * 0.82);
        let valueBaseline = labelInkBottom + labelValueGap + valueCapAboveBaseline;
        valueLines.forEach((line) => {
          const tVal = document.createElementNS(ns, 'text');
          tVal.setAttribute('x', '0');
          tVal.setAttribute('y', String(valueBaseline));
          tVal.setAttribute('font-family', pickFontFamily(valueCs));
          tVal.setAttribute('font-size', valueFontSize);
          tVal.setAttribute('font-weight', valueCs.fontWeight || '800');
          tVal.setAttribute('fill', valueCs.color || '#1F4E46');
          tVal.textContent = line;
          sumG.appendChild(tVal);
          valueBaseline += valueLineStep;
        });

        const summaryBlockHeight = valueBaseline + 12;
        pair.appendChild(sumG);

        const svgBelow = document.createElementNS(ns, 'g');
        svgBelow.setAttribute(
          'transform',
          `translate(0, ${summaryBlockHeight + TREEMAP_SUMMARY_GAP})`,
        );
        svgBelow.appendChild(clonedSvg);
        pair.appendChild(svgBelow);

        treemapChartContent = pair;
        exportChartBodyHeight = summaryBlockHeight + TREEMAP_SUMMARY_GAP + svgHeight;
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
      
      // Wrap long chart title; optionally hide title entirely.
      // Use a single, consistent wrapping rule so any long title breaks cleanly onto multiple lines.
      const rawTitle = hideTitle ? '' : (chartTitle || 'Chart Title');
      const maxTitleWidth = Math.max(50, layoutChartWidth - 40);
      const titleLines = rawTitle ? wrapText(rawTitle, maxTitleWidth) : [];
      const titleHeight = rawTitle ? titleLines.length * 18 : 0;

      // Top offset for chart (gauge needs more space; multi-line title needs more space)
      const chartTop = rawTitle
        ? Math.max(isGaugeChart ? 55 : 40, 30 + titleHeight + 10)
        : (isGaugeChart ? 40 : 30);
      const topPadding = chartTop - 40;
      const chartFooterGap = chartType === 'profile-metric' ? 16 : hideTitle ? 0 : 10;

      // Create a new SVG that will contain everything
      const combinedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      combinedSvg.setAttribute('width', layoutChartWidth + 80); 
      combinedSvg.setAttribute(
        'height',
        exportChartBodyHeight + legendHeight + metadataHeight + chartFooterGap + 30 + topPadding,
      );
      combinedSvg.setAttribute(
        'viewBox',
        `0 0 ${layoutChartWidth + 80} ${exportChartBodyHeight + legendHeight + metadataHeight + chartFooterGap + 50 + topPadding}`,
      );
      combinedSvg.style.backgroundColor = 'white';
      
      // Add chart title (multiple lines when long), unless hidden
      if (rawTitle) {
        const titleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        titleLines.forEach((line, i) => {
          const titleLine = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          titleLine.setAttribute('x', 50);
          titleLine.setAttribute('y', 30 + i * 18);
          titleLine.setAttribute('font-family', 'Arial, sans-serif');
          // Slightly smaller title font so long titles (including gauge charts)
          // render consistently without being clipped in downloaded images.
          titleLine.setAttribute('font-size', '14px');
          titleLine.setAttribute('font-weight', 'bold');
          titleLine.setAttribute('fill', 'black');
          titleLine.setAttribute('text-anchor', 'start');
          titleLine.textContent = line;
          titleGroup.appendChild(titleLine);
        });
        combinedSvg.appendChild(titleGroup);
      }
      
      // Add the chart SVG (chartTop leaves room for title so it doesn't overlap gauge)
      const chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      chartGroup.setAttribute('transform', `translate(50, ${chartTop})`);
      
      chartGroup.appendChild(treemapChartContent);
      combinedSvg.appendChild(chartGroup);
      
      // Add legend with proper styling if it exists
      if (legend) {
        const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        legendGroup.setAttribute('transform', `translate(50, ${chartTop + exportChartBodyHeight + 5})`);
        
        // Get legend items
        const legendItems = legend.querySelectorAll('li');
        const itemsPerRow = 2; // Fixed at 2 items per row
        const maxWidth = layoutChartWidth; // Use full chart width for legend
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
      } else if (chartType === 'treemap') {
        const treemapLegend = chartWrapper.querySelector('.treemap-legend');
        if (treemapLegend && treemapLegend.children.length > 0) {
          const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          legendGroup.setAttribute('transform', `translate(50, ${chartTop + exportChartBodyHeight + 5})`);

          const legendEntries = Array.from(treemapLegend.children);
          const itemsPerRow = 2;
          const maxWidth = layoutChartWidth;
          const itemWidth = maxWidth / itemsPerRow;
          const rowHeights = [];

          legendEntries.forEach((item, index) => {
            const patch = item.querySelector('span[aria-hidden]');
            const labelSpan = item.querySelector('span:not([aria-hidden])');
            const labelText = (labelSpan && labelSpan.textContent) ? labelSpan.textContent.trim() : '';
            const fillColor = patch
              ? window.getComputedStyle(patch).backgroundColor || '#888888'
              : '#888888';

            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = col * itemWidth;

            let y = 0;
            for (let i = 0; i < row; i += 1) {
              y += rowHeights[i] || 18;
            }

            const swatch = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            swatch.setAttribute('x', String(x + 2));
            swatch.setAttribute('y', String(y + 2));
            swatch.setAttribute('width', '12');
            swatch.setAttribute('height', '12');
            swatch.setAttribute('rx', '2');
            swatch.setAttribute('fill', fillColor);
            legendGroup.appendChild(swatch);

            const maxTextWidth = itemWidth - 22;
            const wrappedLines = wrapText(labelText, maxTextWidth);
            wrappedLines.forEach((line, lineIndex) => {
              const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              textElement.setAttribute('x', String(x + 18));
              textElement.setAttribute('y', String(y + 12 + lineIndex * 14));
              textElement.setAttribute('font-family', 'Arial, sans-serif');
              textElement.setAttribute('font-size', '12px');
              textElement.setAttribute('fill', '#4a4a4a');
              textElement.textContent = line;
              legendGroup.appendChild(textElement);
            });

            const itemHeight = Math.max(18, wrappedLines.length * 14 + 6);
            if (!rowHeights[row] || itemHeight > rowHeights[row]) {
              rowHeights[row] = itemHeight;
            }
          });

          const totalLegendHeight = rowHeights.reduce((sum, height) => sum + height, 0) + 10;
          legendHeight = totalLegendHeight;

          combinedSvg.appendChild(legendGroup);
        }
      }
      
      // Add metadata with proper styling if it exists
      if (metadata) {
        const metadataGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        // Slightly tighter spacing between chart and metadata when no title is drawn (e.g., Internet Speed Test),
        // so the exported image more closely matches on-screen layout.
        const metadataYOffset =
          chartTop + exportChartBodyHeight + legendHeight + chartFooterGap;
        metadataGroup.setAttribute('transform', `translate(50, ${metadataYOffset})`);
        
        // Get metadata sections
        const sourceTimeframe = metadata.querySelector('.source-timeframe');
        const link = metadata.querySelector('.link');
        
        let yOffset = 0;

        // For Internet Speed Test metrics, add the title above Source/Years/Link, aligned vertically.
        if (hideTitle && isSpeedTestMetrics) {
          const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          titleText.setAttribute('x', '0');
          titleText.setAttribute('y', yOffset + 12);
          titleText.setAttribute('font-family', 'Arial, sans-serif');
          titleText.setAttribute('font-size', '12px');
          titleText.setAttribute('font-weight', 'bold');
          titleText.setAttribute('fill', 'black');
          titleText.textContent = 'Internet Speed Test (Municipal)';
          metadataGroup.appendChild(titleText);
          yOffset += 18;
        }
        
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
          const maxTextWidth = layoutChartWidth - 20; // Leave some margin
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

      // Treemap legend height is applied after root <svg> was first sized; refresh box so exports are not clipped.
      combinedSvg.setAttribute('width', layoutChartWidth + 80);
      combinedSvg.setAttribute(
        'height',
        exportChartBodyHeight + legendHeight + metadataHeight + chartFooterGap + 30 + topPadding,
      );
      combinedSvg.setAttribute(
        'viewBox',
        `0 0 ${layoutChartWidth + 80} ${exportChartBodyHeight + legendHeight + metadataHeight + chartFooterGap + 50 + topPadding}`,
      );
      
      // Convert SVG to string
      const svgData = new XMLSerializer().serializeToString(combinedSvg);
      
      // Create a high-resolution canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set high resolution canvas size (2x for retina displays)
      const scale = 2;
      const finalWidth = (layoutChartWidth + 80) * scale;
      const finalHeight =
        (exportChartBodyHeight + legendHeight + metadataHeight + chartFooterGap + 50 + topPadding) *
        scale;
      
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
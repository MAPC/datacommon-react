import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ReactGA from 'react-ga';
import axios from 'axios';
import { fetchDownloadShapefile } from '../../api/shapefile';

/**
 * Downloads metadata in CSV format
 * @param {Event} e - The event object
 * @param {string} database - The database name
 * @param {Object} metadata - The metadata object
 * @param {string} title - The title of the dataset
 * @param {string} table - The table name
 * @param {string} description - The description of the dataset
 */
const downloadMetadata = (
  e,
  database,
  metadata,
  title,
  table = '',
  description = ''
)  => {
  e.preventDefault();
  const documentHeader = ['name', 'alias', 'details'];
  let rows;
  if (database === 'towndata' || database === 'gisdata') {
    const metadataName = metadata.documentation.metadata.eainfo.detailed.attr.map(
      (attr) => (attr.attrlabl ? attr.attrlabl : 'undefined')
    );
    const metadataAlias = metadata.documentation.metadata.eainfo.detailed.attr.map(
      (attr) => attr.attalias
    );
    const metadataDescription = metadata.documentation.metadata.eainfo.detailed.attr.map(
      (attr) => (attr.attrdef ? attr.attrdef : 'undefined')
    );
    rows = [
      ['title', 'Title', title],
      ['tbl_table', 'Table', table],
      ['descriptn', 'Description', description],
    ].concat(
      metadataName.map((item, i) => [
        item,
        metadataAlias[i],
        metadataDescription[i],
      ])
    );
  } else {
    const values = metadata.map((row) => documentHeader.map((key) => row[key]));
    rows = values.map((row) => row.reduce((a, b) => `${a},${b}`));
  }
  const csvHeader = 'data:text/csv;charset=utf-8,';
  const documentRows = rows.reduce((a, b) => `${a}\n${b}`);

  const documentStructure = [[documentHeader], documentRows].reduce((a, b) =>
    a.concat(b)
  );
  const documentBody = documentStructure.reduce((a, b) => `${a}\n${b}`);

  const csvFile = csvHeader + documentBody;
  const encoded = encodeURI(csvFile);
  const fileName = `${title}-metadata.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', encoded);
  link.setAttribute('download', fileName);

  document.body.appendChild(link);
  link.click();
}


/**
 * Downloads table data in CSV based on provided parameters
 * @param {string} schema - The database schema name
 * @param {string} table - The table name to query
 * @param {string} database - The database name
 * @param {Array<string|number>} selectedYears - Array of selected years to filter data
 * @param {string} queryYearColumn - The column name containing year data
 * @returns {Promise<void>} - Returns nothing, triggers file download
 */
const downloadTableData = async (schema, table, database, selectedYears, queryYearColumn) => {
  try {
    // Handle zoning atlas special case
    if (table === "zoning_atlas") {
      window.open("https://mapc365.sharepoint.com/:x:/s/DataServicesSP/Efonrnmw_kdMhmG3Dw2BkTcBIpe2sC_2ADWTWfUjOs4JhQ?e=K65BCE", "_blank");
      return;
    }

    // Build query and fetch data based on whether years are selected
    let response;
    if (selectedYears.length > 0 && queryYearColumn !== '') {
      const yearString = selectedYears.map(year => `'${year}'`).join(',');
      response = await axios.get(`/api/?token=testToken&query=SELECT * FROM ${database}.${schema}.${table} WHERE ${queryYearColumn} IN (${yearString}) ORDER BY ${queryYearColumn}`);
      
      if (response.data) {
        const csvContent = generateCsvContent(response.data);
        const yearStringFileName = yearString.split(',')
          .map(year => year.replace(/'/g, '').trim())
          .join('_');
        downloadFile(csvContent, `${table}-${yearStringFileName}.csv`);
      }
    // If no years selected, use the base URL
    } else {
      response = await axios.get(`/api/?token=testToken&query=SELECT * FROM ${database}.${schema}.${table}`);
      if (response.data) {
        const csvContent = generateCsvContent(response.data);
        downloadFile(csvContent, `${table}.csv`);
      }
    }

    if (!response.data) {
      throw new Error('No data received from API');
    }

  } catch (error) {
    console.error('Error downloading CSV:', error);
    alert('Failed to download CSV. Please try again.');
  }
};

/**
 * Generates CSV content from an array of rows
 * @param {Array<Object>} rows - Array of objects representing rows of data
 * @returns {string} - CSV content as a string
 */
const generateCsvContent = (rows) => {
  if (!rows || rows.length === 0) return '';
  
  // Get headers from first row
  const headers = Object.keys(rows[0]);
  
  // Create CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...rows.map(row => headers.map(header => row[header]).join(','))
  ];

  return csvRows.join('\n');
};

/**
 * Downloads a file with the given content and filename
 * @param {string} content - The content to be downloaded
 * @param {string} filename - The name of the file to be downloaded
 */
const downloadFile = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function downloadShp(database, schqema, table) {
   if (table === 'zoning_atlas') {
      return 'https://mapc365.sharepoint.com/:f:/s/DataServicesSP/ErKkXSLH_iBOlDhJrTXldrYBIIZ4ZXe4Bkw7OyVapVpX3Q?e=iRkWVB';
   }
   fetchDownloadShapefile(database, schema, table);
    //return `/shapefile?table=${database}.${schema}.${table}&database=${database}`;
}

const setDownloadButton = (
  metadata,
  schema,
  table,
  title,
  description,
  selectedYears,
  queryYearColumn,
  database
) => {
  if (database === 'towndata' || database === 'gisdata') {
    return (
      <div className="details-content-column download-links">
        Download:
        <div className="download-buttons">
          <div
            className="button metadata-button"
            onClick={(e) =>
              downloadMetadata(e, database, metadata, title, table, description)
            }
          >
            .metadata
          </div>
          <div
            className="button csv-button"
            onClick={() =>
              downloadTableData(schema, table, database, selectedYears, queryYearColumn)
            }
          >
            .csv
          </div>
          <div
            className="button shp-button"
            onClick={() =>
             downloadShp(database, schema, table)
             /*  ReactGA.event({
                category: 'Datasets',
                action: 'Download SHP',
                label: table,
              }) */
            }
          >
            .shp
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="details-content-column download-links">
      <div className="download-buttons">
        <div
          className="button metadata-button"
          onClick={(e) => downloadMetadata(e, database, metadata, title)}
        >
          .metadata
        </div>
        <div
          className="button csv-button"
          onClick={() =>
            downloadTableData(schema, table, database, selectedYears, queryYearColumn)
          }
        >
          .csv
        </div>
      </div>
    </div>
  );
} 

const setSelectYears = (availableYears, updateSelectedYears, selectedYears) => {
  if (availableYears.length > 0) {
    return (
      <div className="year-filter">
        <span>Select Years:</span>
        <ul>
          {availableYears.map((year) => (
            <li
              key={year.toString()}
              onClick={(e) => updateSelectedYears(e, year)}
              className={selectedYears.includes(year) ? 'selected' : ''}
            >
              {year}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}

const setUniverse = (universe) => {
  if (universe) {
    return (
      <li>
        Universe:
        <em>{` ${universe}`}</em>
      </li>
    );
  }
  return null;
}

function DatasetHeader({
  title,
  table,
  source,
  universe,
  description,
  availableYears,
  metadata,
  schema,
  database,
  updateSelectedYears,
  queryYearColumn,
  selectedYears,
}) {

  return (
    <div className="page-header">
      <div className="container back-link">
        <Link to="/browser" className="back-link">
          {'< Back'}
        </Link>
      </div>
      <div className="container tight">
        <h2>{title}</h2>
        <div className="dataset-details-content">
          <div className="details-content-column">
            <ul className="table-meta">
              <li>
                Table:
                <em>{` ${table}`}</em>
              </li>
              <li>
                Source:
                <em>{` ${source}`}</em>
              </li>
              {setUniverse(universe)}
              <li>
                Description:
                <em>{` ${description}`}</em>
              </li>
            </ul>
            {setSelectYears(availableYears, updateSelectedYears, selectedYears)}
          </div>
          {setDownloadButton(
            metadata,
            schema,
            table,
            title,
            description,
            selectedYears,
            queryYearColumn,
            database
          )}
        </div>
      </div>
    </div>
  );
}

DatasetHeader.propTypes = {
  availableYears: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ),
  database: PropTypes.string,
  description: PropTypes.string,
  metadata: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.object),
    PropTypes.objectOf(PropTypes.object),
  ]),
  queryYearColumn: PropTypes.string,
  schema: PropTypes.string,
  selectedYears: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ),
  source: PropTypes.string,
  table: PropTypes.string,
  title: PropTypes.string,
  updateSelectedYears: PropTypes.func.isRequired,
  universe: PropTypes.string,
};

DatasetHeader.defaultProps = {
  availableYears: [],
  database: 'ds',
  description: '',
  metadata: [],
  queryYearColumn: '',
  schema: '',
  selectedYears: [],
  source: '',
  table: '',
  title: '',
  universe: '',
};

export default DatasetHeader;

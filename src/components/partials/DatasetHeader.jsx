import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

const formats = {
  csv: {
    extension: ".csv",
    isGeospatial: true,
    isTabular: true,
    zoningAtlas: "https://mapc365.sharepoint.com/:x:/s/DataServicesSP/Efonrnmw_kdMhmG3Dw2BkTcBIpe2sC_2ADWTWfUjOs4JhQ?e=K65BCE",
    displayName: "CSV",
  },
  json: {
    extension: ".json",
    isGeospatial: false,
    isTabular: true,
    zoningAtlas: "",
    displayName: "JSON",
  },
  shapefile: {
    extension: ".shp",
    isGeospatial: true,
    isTabular: false,
    zoningAtlas: "https://mapc365.sharepoint.com/:f:/s/DataServicesSP/ErKkXSLH_iBOlDhJrTXldrYBIIZ4ZXe4Bkw7OyVapVpX3Q?e=iRkWVB",
    displayName: "ESRI Shapefile",
  },
  geojson: {
    extension: ".geojson",
    isGeospatial: true,
    isTabular: false,
    zoningAtlas: "",
    displayName: "GeoJSON",
  },
};

/**
 * Downloads metadata in CSV format
 * @param {Event} e - The event object
 * @param {string} database - The database name
 * @param {Object} metadata - The metadata object
 * @param {string} title - The title of the dataset
 * @param {string} table - The table name
 * @param {string} description - The description of the dataset
 */
const downloadMetadata = (e, database, metadata, title, table = "", description = "") => {
  // TODO: Make this a cached download from the server as well
  e.preventDefault();
  const documentHeader = ["name", "alias", "details"];
  let rows;
  if (database === "towndata" || database === "gisdata") {
    const metadataName = metadata.documentation.metadata.eainfo.detailed.attr.map((attr) => (attr.attrlabl ? attr.attrlabl : "undefined"));
    const metadataAlias = metadata.documentation.metadata.eainfo.detailed.attr.map((attr) => attr.attalias);
    const metadataDescription = metadata.documentation.metadata.eainfo.detailed.attr.map((attr) => (attr.attrdef ? attr.attrdef : "undefined"));
    rows = [
      ["title", "Title", title],
      ["tbl_table", "Table", table],
      ["descriptn", "Description", description],
    ].concat(metadataName.map((item, i) => [item, metadataAlias[i], metadataDescription[i]]));
  } else {
    const values = metadata.map((row) => documentHeader.map((key) => row[key]));
    rows = values.map((row) => row.reduce((a, b) => `${a},${b}`));
  }
  const csvHeader = "data:text/csv;charset=utf-8,";
  const documentRows = rows.reduce((a, b) => `${a}\n${b}`);

  const documentStructure = [[documentHeader], documentRows].reduce((a, b) => a.concat(b));
  const documentBody = documentStructure.reduce((a, b) => `${a}\n${b}`);

  const csvFile = csvHeader + documentBody;
  const encoded = encodeURI(csvFile);
  const fileName = `${title}-metadata.csv`;

  const link = document.createElement("a");
  link.setAttribute("href", encoded);
  link.setAttribute("download", fileName);

  document.body.appendChild(link);
  link.click();
};

const urlForDownload = (schema, table, database, selectedYears, queryYearColumn, format) => {
  let url = "#";

  // Handle zoning atlas special case
  if (table === "zoning_atlas") {
    return formats[format].zoningAtlas || "#";
  }

  // Build query and fetch data based on whether years are selected
  url = `/api/export?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${database}&schema=${schema}&table=${table}&format=${format}`;
  if (selectedYears.length > 0 && queryYearColumn !== "") {
    url = `${url}&years=${selectedYears.join(",")}`;
  }

  return url;
};

const setDownloadButton = (metadata, schema, table, title, description, selectedYears, queryYearColumn, database) => {
  const tableIsGeospatial = database === "towndata" || database === "gisdata";
  return (
    <div className="details-content-column download-links">
      Download:
      <div className="download-buttons">
        <div className="button file-button" onClick={(e) => downloadMetadata(e, database, metadata, title, table, description)}>
          .metadata
        </div>
        {Object.entries(formats)
          .filter(([format, config]) => config.isGeospatial === tableIsGeospatial || (!tableIsGeospatial && config.isTabular)) // eslint-disable-line no-unused-vars
          .map(([format, config]) => (
            <a
              key={format}
              target="_blank"
              rel="noopener noreferrer"
              title={`Download data as ${config.displayName}`}
              download
              className="button file-button"
              href={urlForDownload(schema, table, database, selectedYears, queryYearColumn, format)}
            >
              {config.extension}
            </a>
          ))}
      </div>
    </div>
  );
};

const setSelectYears = (availableYears, updateSelectedYears, selectedYears) => {
  if (availableYears.length > 0) {
    return (
      <div className="year-filter">
        <span>Select Years:</span>
        <ul>
          {availableYears.map((year) => (
            <li key={year.toString()} onClick={(e) => updateSelectedYears(e, year)} className={selectedYears.includes(year) ? "selected" : ""}>
              {year}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
};

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
};

function DatasetHeader({
  title = "",
  table = "",
  source = "",
  universe = "",
  description = "",
  availableYears = [],
  metadata = [],
  schema = "",
  database = "ds",
  updateSelectedYears,
  queryYearColumn = "",
  selectedYears = [],
}) {
  return (
    <div className="page-header">
      <div className="container back-link">
        <Link to="/browser" className="back-link">
          {"< Back"}
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
          <div className="details-content-column download-section">
            {setDownloadButton(metadata, schema, table, title, description, selectedYears, queryYearColumn, database)}
            <div style={{ marginTop: "10px", textAlign: "right" }}>
              <a
                href="https://airtable.com/appqSr3MqAkN1GCfb/pagdcSeY2bc4rblam/form"
                target="_blank"
                rel="noopener noreferrer"
                className="button feedback-button"
                style={{ fontSize: "12px" }}
              >
                Submit Data Feedback
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

DatasetHeader.propTypes = {
  availableYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  database: PropTypes.string,
  description: PropTypes.string,
  metadata: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.object), PropTypes.objectOf(PropTypes.object)]),
  queryYearColumn: PropTypes.string,
  schema: PropTypes.string,
  selectedYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  source: PropTypes.string,
  table: PropTypes.string,
  title: PropTypes.string,
  updateSelectedYears: PropTypes.func.isRequired,
  universe: PropTypes.string,
};

export default DatasetHeader;

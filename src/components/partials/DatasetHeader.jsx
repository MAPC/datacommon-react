import React, { useState, useRef, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { formatUpdated } from "../../utils/formatUpdated";

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

const urlForDownload = (
  schema, table, database, selectedYears, queryYearColumn, selectedColumns, columnKeys, selectedGeographies, availableGeographies, geographyColumn, filterExportData, format
) => {
  let url = "#";

  // Handle zoning atlas special case
  if (table === "zoning_atlas") {
    return formats[format].zoningAtlas || "#";
  }

  // Build query and fetch data based on whether years are selected
  url = `/api/export?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${database}&schema=${schema}&table=${table}&format=${format}`;
  // TODO: Should the filter export checkbox apply to years too?
  if (selectedYears.length > 0 && queryYearColumn !== "") {
    url = `${url}&years=${selectedYears.join(",")}`;
  }

  // Include all columns by default if the users hasn't de-selected any
  // Respect the checkbox for if data should be filtered
  if (selectedColumns.length && selectedColumns.length !== columnKeys.length && filterExportData) {
    url = `${url}&columns=${selectedColumns.join(',')}`
  }

  // Include all geographies by default if the users hasn't de-selected any
  // Respect the checkbox for if data should be filtered
  if (selectedGeographies.length && selectedGeographies.length !== availableGeographies.length && geographyColumn && filterExportData) {
    // Some geographies have the "&" character, need to be encoded
    const mappedGeos = selectedGeographies.map(col => encodeURIComponent(col));
    url = `${url}&geographies=${mappedGeos.join(',')}&geoColumn=${geographyColumn}`
  }

  return url;
};

const setDownloadButton = (
  metadata, schema, table, title, description, selectedYears, queryYearColumn, selectedColumns, columnKeys, selectedGeographies, availableGeographies, geographyColumn, filterExportData, database
) => {
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
              href={
                urlForDownload(
                  schema, table, database, selectedYears, queryYearColumn, selectedColumns, columnKeys, selectedGeographies, availableGeographies, geographyColumn, filterExportData, format
                )
              }
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

const GeographyFilter = ({ availableGeographies = [], selectedGeographies = [], updateSelectedGeographies }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const [showAllSelectedTags, setShowAllSelectedTags] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    // Reset search when the dropdown closes
    if (!isOpen) setSearchQuery("");
    if (!isOpen) setShowAllSelectedTags(false);
  }, [isOpen]);

  if (!availableGeographies.length || !updateSelectedGeographies) {
    return null;
  }

  const totalCount = availableGeographies.length;
  const selectedCount = selectedGeographies.length || 0;
  const filteredGeographies = !searchQuery.trim()
    ? availableGeographies
    : availableGeographies.filter((geo) => String(geo).toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const displayText =
    selectedCount === 0
      ? "No geographies selected"
      : selectedCount === totalCount
      ? `All geographies (${totalCount})`
      : `${selectedCount} of ${totalCount} geographies selected`;

  return (
    <div className="column-filter-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="column-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{displayText}</span>
        <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="column-dropdown-menu">
          <div className="column-dropdown-header">
            <span>{displayText}</span>
            <button
              type="button"
              className="select-all-button"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedCount === totalCount) {
                  // Deselect all
                  availableGeographies.forEach((geo) => {
                    if (selectedGeographies.includes(geo)) {
                      updateSelectedGeographies(geo);
                    }
                  });
                } else {
                  // Select all
                  availableGeographies.forEach((geo) => {
                    if (!selectedGeographies.includes(geo)) {
                      updateSelectedGeographies(geo);
                    }
                  });
                }
              }}
            >
              {selectedCount === totalCount ? "Deselect All" : "Select All"}
            </button>
          </div>

          {selectedCount > 0 && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(0, 0, 0, 0.08)" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "flex-start",
                  maxHeight: showAllSelectedTags ? 120 : undefined,
                  overflowY: showAllSelectedTags ? "auto" : undefined,
                  paddingRight: showAllSelectedTags ? 6 : undefined,
                }}
              >
                {(() => {
                  const MAX_TAGS = 5;
                  const tagsToShow = showAllSelectedTags ? selectedGeographies : selectedGeographies.slice(0, MAX_TAGS);
                  const extraCount = selectedGeographies.length - tagsToShow.length;

                  return (
                    <>
                      {tagsToShow.map((geo) => (
                        <span
                          key={String(geo)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: "rgba(111, 198, 142, 0.18)",
                            border: "1px solid rgba(111, 198, 142, 0.55)",
                            fontSize: 11,
                            color: "#2f6b44",
                            maxWidth: 160,
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {geo}
                          </span>
                          <button
                            type="button"
                            aria-label={`Deselect ${geo}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSelectedGeographies(geo);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              border: "1px solid rgba(47, 107, 68, 0.35)",
                              background: "rgba(47, 107, 68, 0.06)",
                              color: "#2f6b44",
                              cursor: "pointer",
                              lineHeight: "14px",
                              padding: 0,
                              fontSize: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      {extraCount > 0 && (
                        <span style={{ fontSize: 11, color: "#666" }}>
                          +{extraCount} more
                          {"  "}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAllSelectedTags(true);
                            }}
                            style={{
                              marginLeft: 6,
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              color: "#357ABD",
                              cursor: "pointer",
                              fontSize: 11,
                              textDecoration: "underline",
                            }}
                          >
                            Show all
                          </button>
                        </span>
                      )}
                      {showAllSelectedTags && selectedCount > 12 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAllSelectedTags(false);
                          }}
                          style={{
                            marginLeft: 8,
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            color: "#357ABD",
                            cursor: "pointer",
                            fontSize: 11,
                            textDecoration: "underline",
                          }}
                        >
                          Collapse
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {selectedCount > 40 && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#777" }}>
                  Many geographies selected. Use search or the list to deselect.
                </div>
              )}
            </div>
          )}

          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(0, 0, 0, 0.08)" }}>
            <input
              type="text"
              value={searchQuery}
              placeholder="Search geography..."
              aria-label="Search geographies"
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontSize: "12px",
              }}
            />
          </div>
          <div className="column-checkboxes">
            {filteredGeographies.length === 0 ? (
              <div style={{ padding: "8px 0", fontSize: "12px", color: "#777" }}>No matches</div>
            ) : (
              filteredGeographies.map((geo) => (
              <label key={String(geo)} className="column-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedGeographies.includes(geo)}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateSelectedGeographies(geo);
                  }}
                  className="column-checkbox"
                />
                <span>{geo}</span>
              </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ColumnSelectorDropdown = ({ columnKeys, updateSelectedColumns, selectedColumns }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!columnKeys || columnKeys.length === 0) {
    return null;
  }

  // Sort columns alphabetically by alias (or name if no alias)
  const sortedColumnKeys = [...columnKeys].sort((a, b) => {
    const aName = (a.alias || a.name).toLowerCase();
    const bName = (b.alias || b.name).toLowerCase();
    return aName.localeCompare(bName);
  });

  const selectedCount = selectedColumns.length;
  const totalCount = sortedColumnKeys.length;
  const displayText = selectedCount === totalCount 
    ? `All Columns (${totalCount})` 
    : `${selectedCount} of ${totalCount} Columns Selected`;

  return (
    <div className="column-filter-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="column-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{displayText}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="column-dropdown-menu">
          <div className="column-dropdown-header">
            <span>Select Columns:</span>
            <button
              type="button"
              className="select-all-button"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedCount === totalCount) {
                  // Deselect all except first (keep at least one selected)
                  const firstColumn = sortedColumnKeys[0].name;
                  sortedColumnKeys.forEach((col) => {
                    if (col.name !== firstColumn && selectedColumns.includes(col.name)) {
                      updateSelectedColumns(col.name);
                    }
                  });
                } else {
                  // Select all columns that aren't currently selected
                  sortedColumnKeys.forEach((col) => {
                    if (!selectedColumns.includes(col.name)) {
                      updateSelectedColumns(col.name);
                    }
                  });
                }
              }}
            >
              {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="column-checkboxes">
            {sortedColumnKeys.map((column) => (
              <label key={column.name} className="column-checkbox-label">
              <input
                type="checkbox"
                checked={selectedColumns.includes(column.name)}
                onChange={(e) => {
                  e.stopPropagation();
                  updateSelectedColumns(column.name);
                }}
                className="column-checkbox"
              />
                <span>{column.alias || column.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

ColumnSelectorDropdown.propTypes = {
  columnKeys: PropTypes.arrayOf(PropTypes.object),
  updateSelectedColumns: PropTypes.func,
  selectedColumns: PropTypes.arrayOf(PropTypes.string),
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

const setUpdatedAt = (updatedAt) => (
  <li>
    Last Updated:
    <em>{` ${formatUpdated(updatedAt)}`}</em>
  </li>
);

function DatasetHeader({
  title = "",
  table = "",
  source = "",
  universe = "",
  description = "",
  datasetId,
  availableYears = [],
  columnKeys = [],
  metadata = [],
  schema = "",
  database = "ds",
  updateSelectedYears,
  updateSelectedColumns,
  queryYearColumn = "",
  selectedColumns = [],
  selectedYears = [],
  updatedAt = "",
  availableGeographies = [],
  selectedGeographies = [],
  updateSelectedGeographies,
  geographyColumn,
}) {
  const [filterExportData, setFilterExportData] = useState(true);

  const showFilterExportCheckbox = useMemo(() => {
    return columnKeys.length !== selectedColumns.length || availableGeographies.length !== selectedGeographies.length;
  }, [columnKeys, selectedColumns, selectedColumns.length, availableGeographies, selectedGeographies, selectedGeographies.length]);

  return (
    <div className="page-header">
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
              {setUpdatedAt(updatedAt)}
            </ul>
            {setSelectYears(availableYears, updateSelectedYears, selectedYears)}
            <div style={{ marginTop: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <ColumnSelectorDropdown
                columnKeys={columnKeys}
                updateSelectedColumns={updateSelectedColumns}
                selectedColumns={selectedColumns}
              />
              <GeographyFilter
                availableGeographies={availableGeographies}
                selectedGeographies={selectedGeographies}
                updateSelectedGeographies={updateSelectedGeographies}
              />
            </div>
          </div>
          <div className="details-content-column download-section">
            {setDownloadButton(
              metadata, schema, table, title, description, selectedYears, queryYearColumn, selectedColumns, columnKeys, selectedGeographies, availableGeographies, geographyColumn, filterExportData, database
            )}
            {showFilterExportCheckbox && <div className="download-should-filter-checkbox-container">
              <label title="Should the exported data be filtered using the current selections?">
                Filter export data
              </label>
              <input
                className="download-should-filter-checkbox"
                type="checkbox"
                checked={filterExportData}
                onChange={(e) => {
                  e.stopPropagation();
                  setFilterExportData(e.target.checked);
                }}
              />
            </div>}
            {!!datasetId && (
              <div style={{ marginTop: "10px", textAlign: "right" }}>
                <a
                  href={`/developers?datasetId=${encodeURIComponent(String(datasetId))}`}
                  className="button feedback-button"
                  style={{ fontSize: "12px" }}
                >
                  Generate API
                </a>
              </div>
            )}
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
  columnKeys: PropTypes.arrayOf(PropTypes.object),
  database: PropTypes.string,
  datasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  description: PropTypes.string,
  metadata: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.object), PropTypes.objectOf(PropTypes.object)]),
  queryYearColumn: PropTypes.string,
  schema: PropTypes.string,
  selectedColumns: PropTypes.arrayOf(PropTypes.string),
  selectedYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  source: PropTypes.string,
  table: PropTypes.string,
  title: PropTypes.string,
  updateSelectedColumns: PropTypes.func,
  updateSelectedYears: PropTypes.func.isRequired,
  availableGeographies: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  selectedGeographies: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  updateSelectedGeographies: PropTypes.func,
  geographyColumn: PropTypes.string,
  universe: PropTypes.string,
  updatedAt: PropTypes.string,
};

export default DatasetHeader;

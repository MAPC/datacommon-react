import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { formatUpdated } from "../../utils/formatUpdated";
import ExportDataModal from "./ExportDataModal";

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
                  sortedColumnKeys.forEach((col) => {
                    if (selectedColumns.includes(col.name)) {
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
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

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
            <div className="details-content-column download-links">
              <button type="button" className="button file-button" onClick={() => setDownloadModalOpen(true)}>
                Export data
              </button>
            </div>
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
      <ExportDataModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        datasetId={datasetId}
        title={title}
        table={table}
        description={description}
        database={database}
        schema={schema}
        metadata={metadata}
        columnKeys={columnKeys}
        selectedColumns={selectedColumns}
        selectedYears={selectedYears}
        queryYearColumn={queryYearColumn}
        selectedGeographies={selectedGeographies}
        availableGeographies={availableGeographies}
        geographyColumn={geographyColumn}
        availableYears={availableYears}
      />
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

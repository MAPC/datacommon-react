import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { faMessage } from "@fortawesome/free-regular-svg-icons";
import { formatUpdated } from "../../utils/formatUpdated";
import ExportDataModal from "./ExportDataModal";
import EmbedTableModal from "./EmbedTableModal";
import { buildDatasetViewShareSearchParams, DATASET_VIEW_SHARE_MAX_URL_LENGTH } from "../../utils/datasetViewShareQuery";

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
        <div className="column-dropdown-menu column-dropdown-menu--geography">
          <div className="column-dropdown-header">
            <span>{displayText}</span>
            <div className="column-dropdown-bulk-actions" role="group" aria-label="Geography bulk selection">
              <button
                type="button"
                className="select-all-button"
                disabled={selectedCount === totalCount}
                onClick={(e) => {
                  e.stopPropagation();
                  availableGeographies.forEach((geo) => {
                    if (!selectedGeographies.includes(geo)) {
                      updateSelectedGeographies(geo);
                    }
                  });
                }}
              >
                Select All
              </button>
              <button
                type="button"
                className="select-all-button column-dropdown-clear-button"
                disabled={selectedCount === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  availableGeographies.forEach((geo) => {
                    if (selectedGeographies.includes(geo)) {
                      updateSelectedGeographies(geo);
                    }
                  });
                }}
              >
                Clear All
              </button>
            </div>
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


function columnDropdownVisibleLabel(column) {
  return String(column?.alias ?? "").trim();
}

const CENSUS_ACS_MOE_WEBINAR_URL =
  "https://www.census.gov/data/academy/webinars/2026/using-acs-estimates-margins-of-error.html";

const ColumnSelectorDropdown = ({ columnKeys, updateSelectedColumns, selectedColumns }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Mirrors DataViewerPage.getMarginColumnsByBase so checkbox expansion and counts agree.
  const getMarginColumnsByBase = (columnKeysArg = []) => {
    const byName = new Set((columnKeysArg || []).map((c) => String(c?.name || "")));
    const pairs = {};
    const byAlias = {};
    (columnKeysArg || []).forEach((col) => {
      const alias = String(col?.alias || "").trim().toLowerCase();
      if (alias) byAlias[alias] = String(col?.name || "");
    });

    const normalizeAliasMetric = (text) =>
      String(text || "")
        .toLowerCase()
        .replace(/\s*;\s*(margin of error)\s*$/i, "")
        .trim();

   
    const getBaseCandidates = (name) => {
      const candidates = [];
      const n = String(name || "");

      if (n.endsWith("_mep")) {
        candidates.push(n.slice(0, -4) + "_p");
      } else if (/mep$/i.test(n)) {
        candidates.push(n.slice(0, -3) + "_p");
      }
      if (n.endsWith("_mp")) {
        candidates.push(n.slice(0, -3) + "_p");
        candidates.push(n.slice(0, -3));
      }
      if (n.endsWith("_me")) {
        candidates.push(n.slice(0, -3));
      } else if (/[0-9][a-z0-9_]*me$/i.test(n)) {
        candidates.push(n.slice(0, -2));
      }
      if (n.endsWith("_moe")) {
        candidates.push(n.slice(0, -4));
      }
      if (
        n.endsWith("_m") &&
        !n.endsWith("_me") &&
        !n.endsWith("_mp") &&
        !n.endsWith("_moe") &&
        !n.endsWith("_mep")
      ) {
        candidates.push(n.slice(0, -2));
      }

      return [...new Set(candidates.filter(Boolean))];
    };

    const isMarginColumnForPairing = (col) => {
      const name = String(col?.name || "");
      const alias = String(col?.alias || "").toLowerCase();
      const details = String(col?.details || "").toLowerCase();
      const hintFromMetadata = alias.includes("margin of error") || details.includes("margin of error");
      const suffixHint =
        /(?:_mp|_me|_moe|_mep|_m)$/i.test(name) ||
        /[0-9][a-z0-9_]*me$/i.test(name) ||
        /[a-z0-9_]mep$/i.test(name);
      if (!hintFromMetadata && !suffixHint) return { isMargin: false, base: null };

      if (alias.includes("margin of error")) {
        const baseAlias = normalizeAliasMetric(alias).replace(/\s+/g, " ").trim();
        if (byAlias[baseAlias]) {
          return { isMargin: true, base: byAlias[baseAlias] };
        }
        const normalized = normalizeAliasMetric(alias);
        const matchedBase = (columnKeysArg || []).find((candidate) => {
          const a = String(candidate?.alias || "").toLowerCase();
          const isBaseAlias = !/\bmargin of error\b/i.test(a) && !!a;
          return isBaseAlias && normalizeAliasMetric(a) === normalized;
        });
        if (matchedBase?.name) {
          return { isMargin: true, base: matchedBase.name };
        }
      }

      const base = getBaseCandidates(name).find((candidate) => byName.has(candidate));
      return { isMargin: true, base: base || null };
    };

    (columnKeysArg || []).forEach((col) => {
      const name = String(col?.name || "");
      const result = isMarginColumnForPairing(col);
      if (!result?.isMargin || !result.base || !name) return;
      if (!pairs[result.base]) pairs[result.base] = [];
      pairs[result.base].push(name);
    });

    return pairs;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const raw = event.target;
      const target =
        raw instanceof Element ? raw : raw && raw.parentElement instanceof Element ? raw.parentElement : null;
      if (!target) return;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
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
    if (!isOpen) {
      setColumnSearchQuery("");
    }
  }, [isOpen]);

  if (!columnKeys || columnKeys.length === 0) {
    return null;
  }

  const marginColumnsByBase = getMarginColumnsByBase(columnKeys);
  const isMarginColumn = (col) => {
    const name = String(col?.name || "");
    const alias = String(col?.alias || "").toLowerCase();
    const details = String(col?.details || "").toLowerCase();
    return (
      alias.includes("margin of error") ||
      details.includes("margin of error") ||
      /(?:_mp|_me|_moe|_mep|_m)$/i.test(name) ||
      /[0-9][a-z0-9_]*me$/i.test(name) ||
      /[a-z0-9_]mep$/i.test(name)
    );
  };
  const visibleColumnKeys = columnKeys.filter((col) => !isMarginColumn(col));

  // Same order as metadata / columnKeys (non-MOE rows only)
  const sortedColumnKeys = [...visibleColumnKeys];
  const filteredColumnKeys = sortedColumnKeys.filter((column) => {
    const query = columnSearchQuery.trim().toLowerCase();
    if (!query) return true;
    const aliasLabel = columnDropdownVisibleLabel(column).toLowerCase();
    return aliasLabel.includes(query);
  });

  const fullColumnCount = columnKeys.length;
  const visibleSelectableCount = sortedColumnKeys.length;
  const visibleSelectedCount = sortedColumnKeys.filter((col) => selectedColumns.includes(col.name)).length;
  const tableColumnDisplayCount = sortedColumnKeys
    .filter((col) => selectedColumns.includes(col.name))
    .reduce((sum, col) => {
      const margins = marginColumnsByBase[col.name] || [];
      return sum + 1 + margins.length;
    }, 0);
  const allVisibleSelected =
    visibleSelectableCount > 0 && visibleSelectedCount === visibleSelectableCount;
  const fmt = (n) => Number(n).toLocaleString();
  const displayText = allVisibleSelected
    ? `All Columns (${fmt(fullColumnCount)})`
    : `${fmt(tableColumnDisplayCount)} of ${fmt(fullColumnCount)} Columns Selected`;

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
            <div className="column-dropdown-bulk-actions" role="group" aria-label="Column bulk selection">
              <button
                type="button"
                className="select-all-button"
                disabled={visibleSelectedCount >= visibleSelectableCount || visibleSelectableCount === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  sortedColumnKeys.forEach((col) => {
                    if (!selectedColumns.includes(col.name)) {
                      updateSelectedColumns(col.name);
                    }
                  });
                }}
              >
                Select All
              </button>
              <button
                type="button"
                className="select-all-button column-dropdown-clear-button"
                disabled={visibleSelectedCount === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  sortedColumnKeys.forEach((col) => {
                    if (selectedColumns.includes(col.name)) {
                      updateSelectedColumns(col.name);
                    }
                  });
                }}
              >
                Clear All
              </button>
            </div>
          </div>
          <div
            className="column-dropdown-moe-help"
            role="note"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p>
              Selecting an estimate column will also add the corresponding margin of error column to your table. For
              more information on what a margin of error is and why it is important you can watch{" "}
              <a href={CENSUS_ACS_MOE_WEBINAR_URL} target="_blank" rel="noopener noreferrer">
                this webinar from the US Census Bureau
              </a>
              .
            </p>
          </div>
          <div style={{ padding: "8px 0 10px 0" }}>
            <input
              type="text"
              placeholder="Search columns..."
              value={columnSearchQuery}
              onChange={(e) => setColumnSearchQuery(e.target.value)}
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
            {filteredColumnKeys.length === 0 ? (
              <div style={{ padding: "8px 0", fontSize: "12px", color: "#777" }}>No matches</div>
            ) : (
              filteredColumnKeys.map((column) => (
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
                  <span>{columnDropdownVisibleLabel(column)}</span>
                </label>
              ))
            )}
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
  rowsPerPage,
  updateRowsPerPage,
}) {
  const location = useLocation();
  const isEmbedView = new URLSearchParams(location.search).get("embed") === "1";
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsDropdownRef = useRef(null);

  const { sharePageUrl, embedPageUrl, shareUrlTooLong } = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const basePath = `${origin}/browser/datasets/${datasetId}`;
    const shareArgs = {
      columnKeys,
      selectedColumns,
      availableGeographies,
      selectedGeographies,
      availableYears,
      selectedYears,
      queryYearColumn,
    };
    const shareParams = buildDatasetViewShareSearchParams({ embed: false, ...shareArgs });
    const embedParams = buildDatasetViewShareSearchParams({ embed: true, ...shareArgs });
    const qsShare = shareParams.toString();
    const qsEmbed = embedParams.toString();
    const sharePageUrl = qsShare ? `${basePath}?${qsShare}` : basePath;
    const embedPageUrl = qsEmbed ? `${basePath}?${qsEmbed}` : `${basePath}?embed=1`;
    const shareUrlTooLong =
      sharePageUrl.length > DATASET_VIEW_SHARE_MAX_URL_LENGTH ||
      embedPageUrl.length > DATASET_VIEW_SHARE_MAX_URL_LENGTH;
    return { sharePageUrl, embedPageUrl, shareUrlTooLong };
  }, [
    datasetId,
    columnKeys,
    selectedColumns,
    selectedGeographies,
    availableGeographies,
    selectedYears,
    availableYears,
    queryYearColumn,
  ]);

  const embedModalAdjustFilters = useMemo(
    () => (
      <>
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
      </>
    ),
    [
      availableYears,
      updateSelectedYears,
      selectedYears,
      columnKeys,
      updateSelectedColumns,
      selectedColumns,
      availableGeographies,
      selectedGeographies,
      updateSelectedGeographies,
    ],
  );

  useEffect(() => {
    if (!actionsOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target)) {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionsOpen]);

  return (
    <div className={isEmbedView ? "page-header page-header-embed" : "page-header"}>
      <div className="container tight">
        {isEmbedView && (
          <div className="page-header-embed-top-row" role="group" aria-label="Embed actions">
            <button
              type="button"
              className="embed-view-source-icon-btn"
              onClick={() => {
                const url = new URL(`/browser/datasets/${datasetId}`, window.location.origin);
                window.open(url.href, "_blank", "noopener,noreferrer");
              }}
              title="View source data"
              aria-label="View source data in DataCommon in a new tab"
            >
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>
          </div>
        )}
        <h2>{title}</h2>
        <div className={isEmbedView ? "dataset-details-content dataset-details-content--embed" : "dataset-details-content"}>
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
          {!isEmbedView && (
            <div className="details-content-column download-section">
              <div className="details-content-column download-links">
                <div className="dataset-actions-dropdown" ref={actionsDropdownRef}>
                  <button
                    type="button"
                    className="button file-button dataset-actions-trigger"
                    onClick={() => setActionsOpen((open) => !open)}
                    aria-expanded={actionsOpen}
                    aria-haspopup="menu"
                  >
                    Actions <span className="dropdown-arrow">{actionsOpen ? "▲" : "▼"}</span>
                  </button>
                  {actionsOpen && (
                    <div className="dataset-actions-menu" role="menu" aria-label="Dataset actions">
                      <button
                        type="button"
                        className="dataset-actions-item"
                        onClick={() => {
                          setEmbedModalOpen(true);
                          setActionsOpen(false);
                        }}
                      >
                        <span className="dataset-actions-item-icon" aria-hidden="true">
                          <FontAwesomeIcon icon={faShareNodes} size="sm" />
                        </span>
                        Share and embed
                      </button>
                      <button
                        type="button"
                        className="dataset-actions-item"
                        onClick={() => {
                          window.open(
                            "https://airtable.com/appqSr3MqAkN1GCfb/pagdcSeY2bc4rblam/form",
                            "_blank",
                            "noopener,noreferrer",
                          );
                          setActionsOpen(false);
                        }}
                      >
                        <span className="dataset-actions-item-icon" aria-hidden="true">
                          <FontAwesomeIcon icon={faMessage} size="sm" />
                        </span>
                        Submit data feedback
                      </button>
                    </div>
                  )}
                </div>
                <button type="button" className="button file-button" onClick={() => setDownloadModalOpen(true)}>
                  Export
                </button>
              </div>
              <div className="rows-per-page-selector">
                <label htmlFor="rows-per-page" className="rows-per-page-label">
                  Rows per page:
                </label>
                <select
                  id="rows-per-page"
                  className="rows-per-page-dropdown"
                  value={rowsPerPage}
                  onChange={(e) => updateRowsPerPage(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      <ExportDataModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        datasetId={datasetId}
        title={title}
        table={table}
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
      <EmbedTableModal
        isOpen={embedModalOpen}
        onClose={() => setEmbedModalOpen(false)}
        datasetId={datasetId}
        title={title}
        shareUrl={sharePageUrl}
        embedUrl={embedPageUrl}
        urlTooLong={shareUrlTooLong}
        adjustUrlFiltersSlot={embedModalAdjustFilters}
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
  rowsPerPage: PropTypes.number,
  updateRowsPerPage: PropTypes.func,
};

export default DatasetHeader;

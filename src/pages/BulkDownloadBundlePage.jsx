import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import SearchBar from "../components/partials/SearchBar";
import DatasetInventoryPicker from "../components/partials/DatasetInventoryPicker";
import capitalize from "../utils/capitalize";
import { fetchDatasets } from "../reducers/datasetSlice";
import { getDatasetGeography } from "../utils/manageDatasets";
import {
  getTableDisplayInfo,
  tableHasYearFilter,
  tableConfigFromInventoryDataset,
  MAX_BULK_DOWNLOAD_TABLES,
  BULK_DOWNLOAD_EXTRA_GEOGRAPHIES,
} from "../constants/bulkDownloadBundles";
import {
  downloadBlob,
  requestBulkExport,
  fetchBulkDownloadBundle,
  fetchAvailableYearsForTable,
  fetchGeoColumnForTable,
  resolveDefaultSelectedYears,
  BULK_DOWNLOAD_EXPORT_FAILED,
  BULK_DOWNLOAD_EXPORT_FAILED_MESSAGE,
} from "../utils/bulkDownloadApi";

const YearPill = ({ year, selected, onToggle, disabled = false }) => (
  <button
    type="button"
    className={`bulk-download__year-pill${selected ? " bulk-download__year-pill--selected" : ""}`}
    onClick={() => onToggle(year)}
    aria-pressed={selected}
    disabled={disabled}
  >
    {year}
  </button>
);

YearPill.propTypes = {
  year: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const TableRow = ({
  tableConfig,
  datasets,
  checked,
  tableYears,
  availableYears,
  yearsAreLoading,
  onToggle,
  onToggleYear,
  onRemove,
}) => {
  const { title, source } = getTableDisplayInfo(tableConfig, datasets);
  const isCustom = Boolean(onRemove);

  return (
    <li className={`bulk-download__table-item${checked ? " bulk-download__table-item--selected" : ""}`}>
      <div className="bulk-download__table-label">
        <label className="bulk-download__table-checkbox">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(tableConfig.table)}
            aria-label={`Include ${title} in download`}
          />
        </label>
        <span className="bulk-download__table-info">
          {tableConfig.datasetId ? (
            <Link
              to={`/browser/datasets/${tableConfig.datasetId}`}
              className="bulk-download__table-title bulk-download__table-title--link"
              target="_blank"
              rel="noopener noreferrer"
              title="View table in Data Browser"
            >
              {title}
            </Link>
          ) : (
            <span className="bulk-download__table-title">{title}</span>
          )}
          {source && <span className="bulk-download__table-source">{source}</span>}
          <span className="bulk-download__table-meta">
            <code>{tableConfig.table}</code>
            {tableConfig.isNonMunicipal && (
              <span className="bulk-download__geo-badge">{tableConfig.geographyLabel}</span>
            )}
          </span>
        </span>
        {isCustom && (
          <button
            type="button"
            className="bulk-download__remove-custom-btn"
            onClick={() => onRemove(tableConfig.table)}
            aria-label={`Remove ${title}`}
            title="Remove table"
          >
            ×
          </button>
        )}
      </div>
      <div className={`bulk-download__table-years${checked ? "" : " bulk-download__table-years--disabled"}`}>
        {tableConfig.yearColumn && (
          <>
            <span className="bulk-download__table-years-label">Years</span>
            {yearsAreLoading && <p className="bulk-download__table-years-loading">Loading years…</p>}
            {!yearsAreLoading && availableYears?.length === 0 && (
              <p className="bulk-download__table-years-loading">No years available</p>
            )}
            {!yearsAreLoading && availableYears?.length > 0 && (
              <div className="bulk-download__year-list">
                {availableYears.map((year) => (
                  <YearPill
                    key={year}
                    year={year}
                    selected={tableYears.includes(year)}
                    onToggle={(y) => onToggleYear(tableConfig.table, y)}
                    disabled={!checked}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {tableConfig.isNonMunicipal && (
          <p className="bulk-download__table-years-note">
            This table uses {tableConfig.geographyLabel} geography — it is not filtered by municipality. Select years to
            include.
          </p>
        )}
      </div>
    </li>
  );
};

TableRow.propTypes = {
  tableConfig: PropTypes.object.isRequired,
  datasets: PropTypes.array,
  checked: PropTypes.bool.isRequired,
  tableYears: PropTypes.arrayOf(PropTypes.string).isRequired,
  availableYears: PropTypes.arrayOf(PropTypes.string),
  yearsAreLoading: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onToggleYear: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
};

const SkeletonBone = ({ className = "", style = undefined }) => (
  <span className={`bulk-download__skeleton-bone${className ? ` ${className}` : ""}`} style={style} aria-hidden="true" />
);

SkeletonBone.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

const BulkDownloadBundleSkeleton = ({ tableCount = 6 }) => (
  <>
    <p className="bulk-download__sr-only">Loading download options…</p>

    <aside className="bulk-download__sidebar" aria-busy="true" aria-live="polite">
      <section className="bulk-download__panel">
        <SkeletonBone className="bulk-download__skeleton-heading" />
        <SkeletonBone className="bulk-download__skeleton-line bulk-download__skeleton-line--short" />
        <SkeletonBone className="bulk-download__skeleton-input" />
      </section>

      <section className="bulk-download__panel">
        <SkeletonBone className="bulk-download__skeleton-heading" />
        <SkeletonBone className="bulk-download__skeleton-line" />
        <SkeletonBone className="bulk-download__skeleton-line" />
      </section>

      <section className="bulk-download__panel bulk-download__panel--download">
        <SkeletonBone className="bulk-download__skeleton-button" />
        <SkeletonBone className="bulk-download__skeleton-line bulk-download__skeleton-line--short" />
      </section>
    </aside>

    <div className="bulk-download__tables">
      <div className="bulk-download__tables-header">
        <SkeletonBone className="bulk-download__skeleton-heading bulk-download__skeleton-heading--large" />
        <div className="bulk-download__skeleton-actions">
          <SkeletonBone className="bulk-download__skeleton-action" />
          <SkeletonBone className="bulk-download__skeleton-action" />
        </div>
      </div>
      <SkeletonBone className="bulk-download__skeleton-line bulk-download__skeleton-line--medium" />

      <ul className="bulk-download__table-list">
        {Array.from({ length: tableCount }, (_, index) => (
          <li key={index} className="bulk-download__table-item bulk-download__skeleton-table-item">
            <div className="bulk-download__skeleton-table-row">
              <SkeletonBone className="bulk-download__skeleton-checkbox" />
              <div className="bulk-download__skeleton-table-copy">
                <SkeletonBone className="bulk-download__skeleton-line bulk-download__skeleton-line--title" />
                <SkeletonBone className="bulk-download__skeleton-line bulk-download__skeleton-line--code" />
              </div>
            </div>
            <div className="bulk-download__skeleton-year-block">
              <SkeletonBone className="bulk-download__skeleton-line bulk-download__skeleton-line--label" />
              <div className="bulk-download__skeleton-pills">
                <SkeletonBone className="bulk-download__skeleton-pill" />
                <SkeletonBone className="bulk-download__skeleton-pill" />
                <SkeletonBone className="bulk-download__skeleton-pill" />
                <SkeletonBone className="bulk-download__skeleton-pill bulk-download__skeleton-pill--short" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </>
);

BulkDownloadBundleSkeleton.propTypes = {
  tableCount: PropTypes.number,
};

const LimitReachedModal = ({ maxTables, onClose }) => {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="bulk-download__limit-overlay" onClick={onClose} role="presentation">
      <div
        className="bulk-download__limit-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bulk-download-limit-title"
        aria-describedby="bulk-download-limit-body"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="bulk-download-limit-title">Table limit reached</h2>
        <p id="bulk-download-limit-body">
          You can download a maximum of {maxTables} tables at a time. Deselect some tables, then try Download again.
        </p>
        <button type="button" className="bulk-download__limit-ok" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

LimitReachedModal.propTypes = {
  maxTables: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
};

const BulkDownloadBundlePage = () => {
  const { bundleId } = useParams();
  const dispatch = useDispatch();
  const { cache: datasets, noDupesDatasets, status } = useSelector((state) => state.dataset);
  const inventoryDatasets = useMemo(() => noDupesDatasets || datasets || [], [noDupesDatasets, datasets]);

  const [bundle, setBundle] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(true);
  const [municipalities, setMunicipalities] = useState([]);
  const [customTables, setCustomTables] = useState([]);
  const [selectedTableNames, setSelectedTableNames] = useState([]);
  const [availableYearsByTable, setAvailableYearsByTable] = useState({});
  const [selectedYearsByTable, setSelectedYearsByTable] = useState({});
  const [yearsLoadingByTable, setYearsLoadingByTable] = useState({});
  const [yearsLoading, setYearsLoading] = useState(true);
  const [downloadFormat, setDownloadFormat] = useState(bundleId === "housing" ? "xlsx" : "zip");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  useEffect(() => {
    setDownloadFormat(bundleId === "housing" ? "xlsx" : "zip");
  }, [bundleId]);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDatasets());
    }
  }, [dispatch, status]);

  useEffect(() => {
    let cancelled = false;

    const loadBundle = async () => {
      setBundleLoading(true);
      setBundle(null);
      setCustomTables([]);
      setIsPickerOpen(false);
      setIsLimitModalOpen(false);
      setYearsLoadingByTable({});

      try {
        const result = await fetchBulkDownloadBundle(bundleId);
        if (cancelled) return;

        if (!result) {
          setBundle(null);
        } else {
          const available = {};
          const selected = {};
          result.tables.forEach((tableConfig) => {
            available[tableConfig.table] = tableConfig.availableYears || [];
            if (!tableHasYearFilter(tableConfig)) {
              selected[tableConfig.table] = [];
              return;
            }
            selected[tableConfig.table] = resolveDefaultSelectedYears(
              available[tableConfig.table],
            );
          });

          setBundle(result);
          setSelectedTableNames(result.tables.map((t) => t.table));
          setAvailableYearsByTable(available);
          setSelectedYearsByTable(selected);
          setYearsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setBundle(null);
        }
      } finally {
        if (!cancelled) {
          setBundleLoading(false);
        }
      }
    };

    loadBundle();
    return () => {
      cancelled = true;
    };
  }, [bundleId]);

  const displayTables = useMemo(() => {
    if (!bundle) return customTables;
    return [...customTables, ...bundle.tables];
  }, [bundle, customTables]);

  const alreadyAddedTableNames = useMemo(
    () => new Set(displayTables.map((tableConfig) => tableConfig.table)),
    [displayTables],
  );

  const selectedTableConfigs = useMemo(
    () =>
      displayTables
        .filter((t) => selectedTableNames.includes(t.table))
        .map((t) => ({
          ...t,
          years: selectedYearsByTable[t.table] || [],
        })),
    [displayTables, selectedTableNames, selectedYearsByTable],
  );

  const showLimitReached = useCallback(() => {
    setIsLimitModalOpen(true);
  }, []);

  const handleAddCustomTable = useCallback(
    async (datasetId) => {
      const match = inventoryDatasets.find((d) => String(d.seq_id) === String(datasetId));
      if (!match?.table_name) return;
      if (getDatasetGeography(match) !== "municipal") return;

      const tableName = match.table_name;
      if (alreadyAddedTableNames.has(tableName)) return;

      const newConfig = tableConfigFromInventoryDataset(match);

      setCustomTables((prev) => {
        if (prev.some((t) => t.table === tableName)) return prev;
        return [newConfig, ...prev];
      });
      setSelectedTableNames((prev) => (prev.includes(tableName) ? prev : [tableName, ...prev]));

      if (!newConfig.yearColumn) return;

      setYearsLoadingByTable((prev) => ({ ...prev, [tableName]: true }));
      try {
        const years = await fetchAvailableYearsForTable({
          table: tableName,
          yearColumn: newConfig.yearColumn,
          database: newConfig.database,
          schema: newConfig.schema,
        });
        setAvailableYearsByTable((prev) => ({ ...prev, [tableName]: years }));
        setSelectedYearsByTable((prev) => ({
          ...prev,
          [tableName]: years.length > 0 ? [years[0]] : [],
        }));
        setCustomTables((prev) =>
          prev.map((t) => (t.table === tableName ? { ...t, availableYears: years } : t)),
        );
      } catch {
        // Table stays in the list without year pills if year lookup fails.
      } finally {
        setYearsLoadingByTable((prev) => ({ ...prev, [tableName]: false }));
      }
    },
    [alreadyAddedTableNames, inventoryDatasets],
  );

  const removeCustomTable = (tableName) => {
    setCustomTables((prev) => prev.filter((t) => t.table !== tableName));
    setSelectedTableNames((prev) => prev.filter((name) => name !== tableName));
    setAvailableYearsByTable((prev) => {
      const next = { ...prev };
      delete next[tableName];
      return next;
    });
    setSelectedYearsByTable((prev) => {
      const next = { ...prev };
      delete next[tableName];
      return next;
    });
    setYearsLoadingByTable((prev) => {
      const next = { ...prev };
      delete next[tableName];
      return next;
    });
  };

  const handleOpenPicker = () => {
    setIsPickerOpen(true);
  };

  if (bundleLoading) {
    return (
      <section className="route BulkDownload">
        <div className="bulk-download__header container tight">
          <nav className="bulk-download__breadcrumb" aria-label="Breadcrumb">
            <Link to="/browser">Data Browser</Link>
            <span aria-hidden="true"> / </span>
            <Link to="/browser/bulk-download">Data for Planning</Link>
          </nav>
          <h1>Data for Planning</h1>
        </div>
        <div className="bulk-download__layout container tight">
          <BulkDownloadBundleSkeleton />
        </div>
      </section>
    );
  }

  if (!bundle) {
    return <Navigate to="/browser/bulk-download" replace />;
  }

  const isPageLoading = status !== "succeeded" || yearsLoading;
  const allTablesSelected = selectedTableNames.length === displayTables.length;
  const hasMunicipalTables = selectedTableConfigs.some((t) => !t.skipGeographyFilter);
  const canDownload = selectedTableNames.length > 0 && !yearsLoading && (!hasMunicipalTables || municipalities.length > 0);

  const handleMuniSelect = (muniSlug) => {
    const extraMatch = BULK_DOWNLOAD_EXTRA_GEOGRAPHIES.find(
      (geo) => geo.name.toLowerCase() === String(muniSlug).toLowerCase(),
    );
    const name = extraMatch ? extraMatch.name : capitalize(muniSlug);
    setMunicipalities((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setDownloadError("");
  };

  const removeMunicipality = (name) => {
    setMunicipalities((prev) => prev.filter((m) => m !== name));
  };

  const toggleTable = (tableName) => {
    setSelectedTableNames((prev) => (prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]));
  };

  const selectAllTables = () => setSelectedTableNames(displayTables.map((t) => t.table));
  const clearAllTables = () => setSelectedTableNames([]);

  const toggleTableYear = (tableName, year) => {
    setSelectedYearsByTable((prev) => {
      const current = prev[tableName] || [];
      const next = current.includes(year) ? current.filter((y) => y !== year) : [...current, year];
      return { ...prev, [tableName]: next };
    });
  };

  const handleDownload = async () => {
    if (selectedTableNames.length > MAX_BULK_DOWNLOAD_TABLES) {
      showLimitReached();
      return;
    }

    if (hasMunicipalTables && municipalities.length === 0) {
      setDownloadError("Select at least one municipality.");
      return;
    }

    if (!canDownload) return;

    setIsDownloading(true);
    setDownloadError("");
    setDownloadStatus("Preparing download…");

    try {
      const geoColumnByTable = {};
      const tablesForExport = await Promise.all(
        selectedTableConfigs.map(async (tableConfig) => {
          if (!tableConfig.isCustom || tableConfig.skipGeographyFilter) {
            return tableConfig;
          }
          if (tableConfig.geoColumn) {
            return tableConfig;
          }
          const geoColumn =
            (await fetchGeoColumnForTable({
              table: tableConfig.table,
              database: tableConfig.database,
              schema: tableConfig.schema,
            })) || "municipal";
          geoColumnByTable[tableConfig.table] = geoColumn;
          return { ...tableConfig, geoColumn };
        }),
      );

      if (Object.keys(geoColumnByTable).length > 0) {
        setCustomTables((prev) =>
          prev.map((tableConfig) =>
            geoColumnByTable[tableConfig.table]
              ? { ...tableConfig, geoColumn: geoColumnByTable[tableConfig.table] }
              : tableConfig,
          ),
        );
      }

      const { blob, filename } = await requestBulkExport({
        municipalities,
        tables: tablesForExport,
        format: downloadFormat,
        bundleSlug: bundleId,
      });
      setDownloadStatus("Downloading…");
      downloadBlob(blob, filename);
      setDownloadStatus("");
    } catch (err) {
      const isValidationError = err.message === "Select at least one municipality." || err.message === "Please select at least one table.";
      setDownloadError(isValidationError ? err.message : BULK_DOWNLOAD_EXPORT_FAILED);
      setDownloadStatus("");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="route BulkDownload">
      <div className="bulk-download__header container tight">
        <nav className="bulk-download__breadcrumb" aria-label="Breadcrumb">
          <Link to="/browser">Data Browser</Link>
          <span aria-hidden="true"> / </span>
          <Link to="/browser/bulk-download">Data for Planning</Link>
          <span aria-hidden="true"> / </span>
          <span>{bundle.title}</span>
        </nav>
        <h1>{bundle.title}</h1>
        <p className="bulk-download__intro">{bundle.description}</p>
      </div>

      <div className="bulk-download__layout container tight">
        {isPageLoading ? (
          <BulkDownloadBundleSkeleton tableCount={Math.min(displayTables.length, 6)} />
        ) : (
          <>
            <aside className="bulk-download__sidebar">
              <section className="bulk-download__panel">
                <h2>Municipality</h2>
                <p className="bulk-download__hint">
                  {hasMunicipalTables
                    ? "Required — search and select one or more Massachusetts cities or towns."
                    : "Optional for the tables currently selected. Non-municipal tables are not filtered by city or town."}
                </p>
                <SearchBar contextKey="municipality" onSelect={handleMuniSelect} placeholder="Search for a community…" className="small" />
                {municipalities.length > 0 && (
                  <ul className="bulk-download__muni-list" aria-label="Selected municipalities">
                    {municipalities.map((name) => (
                      <li key={name} className="bulk-download__muni-pill">
                        <span>{name}</span>
                        <button
                          type="button"
                          className="bulk-download__muni-pill-remove"
                          onClick={() => removeMunicipality(name)}
                          aria-label={`Remove ${name}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bulk-download__panel">
                <h2>Format</h2>
                <div className="bulk-download__format-options">
                  <label>
                    <input type="radio" name="downloadFormat" value="zip" checked={downloadFormat === "zip"} onChange={() => setDownloadFormat("zip")} />
                    Download as a ZIP archive (one CSV file for each table)
                  </label>
                  <label>
                    <input type="radio" name="downloadFormat" value="xlsx" checked={downloadFormat === "xlsx"} onChange={() => setDownloadFormat("xlsx")} />
                    Download as an Excel workbook (.xlsx) (one worksheet for each table)
                  </label>
                </div>
              </section>

              <section className="bulk-download__panel bulk-download__panel--download">
                <button type="button" className="bulk-download__download-btn" disabled={!canDownload || isDownloading} onClick={handleDownload}>
                  {isDownloading ? "Preparing…" : "Download"}
                </button>
                {hasMunicipalTables && !municipalities.length && (
                  <p className="bulk-download__validation">Select at least one municipality to continue.</p>
                )}
                {selectedTableNames.length === 0 && <p className="bulk-download__validation">Select at least one table.</p>}
                {selectedTableNames.length > MAX_BULK_DOWNLOAD_TABLES && (
                  <p className="bulk-download__validation">
                    Select no more than {MAX_BULK_DOWNLOAD_TABLES} tables to download.
                  </p>
                )}
                {downloadStatus && <p className="bulk-download__status">{downloadStatus}</p>}
                {downloadError === BULK_DOWNLOAD_EXPORT_FAILED ? (
                  <p className="bulk-download__error" role="alert">
                    {BULK_DOWNLOAD_EXPORT_FAILED_MESSAGE.prefix}
                    <a href={BULK_DOWNLOAD_EXPORT_FAILED_MESSAGE.formHref} target="_blank" rel="noopener noreferrer">
                      {BULK_DOWNLOAD_EXPORT_FAILED_MESSAGE.formLabel}
                    </a>
                    .
                  </p>
                ) : (
                  downloadError && (
                    <p className="bulk-download__error" role="alert">
                      {downloadError}
                    </p>
                  )
                )}
                <p className={`bulk-download__summary${selectedTableNames.length > MAX_BULK_DOWNLOAD_TABLES ? " bulk-download__summary--over-limit" : ""}`}>
                  {selectedTableNames.length} of {displayTables.length} tables selected
                  {selectedTableNames.length > MAX_BULK_DOWNLOAD_TABLES
                    ? ` · ${selectedTableNames.length - MAX_BULK_DOWNLOAD_TABLES} over the ${MAX_BULK_DOWNLOAD_TABLES}-table download limit`
                    : ` · up to ${MAX_BULK_DOWNLOAD_TABLES} can be downloaded at once`}
                </p>
              </section>
            </aside>

            <div className="bulk-download__tables">
              <div className="bulk-download__tables-header">
                <h2>Tables</h2>
                <div className="bulk-download__panel-actions">
                  <button type="button" onClick={selectAllTables} disabled={allTablesSelected}>
                    Select all
                  </button>
                  <button type="button" onClick={clearAllTables} disabled={!selectedTableNames.length}>
                    Clear all
                  </button>
                </div>
              </div>
              <p className="bulk-download__hint">
                Recommended tables are selected by default, and the most recent year is pre-selected. You can add more
                municipal tables from the Data Inventory or change your table and year selections.
              </p>
              <button type="button" className="bulk-download__add-tables-btn" onClick={handleOpenPicker}>
                + Add tables from Data Inventory
              </button>

              {customTables.length > 0 && (
                <section className="bulk-download__added-section" aria-labelledby="bulk-download-added-heading">
                  <div className="bulk-download__tables-header">
                    <h3 id="bulk-download-added-heading">Added tables</h3>
                    <p className="bulk-download__section-count">
                      {customTables.length} {customTables.length === 1 ? "table" : "tables"}
                    </p>
                  </div>
                  <p className="bulk-download__hint">Tables you added from the Data Inventory.</p>
                  <ul className="bulk-download__table-list">
                    {customTables.map((tableConfig) => (
                      <TableRow
                        key={tableConfig.table}
                        tableConfig={tableConfig}
                        datasets={datasets}
                        checked={selectedTableNames.includes(tableConfig.table)}
                        tableYears={selectedYearsByTable[tableConfig.table] || []}
                        availableYears={availableYearsByTable[tableConfig.table]}
                        yearsAreLoading={Boolean(yearsLoadingByTable[tableConfig.table])}
                        onToggle={toggleTable}
                        onToggleYear={toggleTableYear}
                        onRemove={removeCustomTable}
                      />
                    ))}
                  </ul>
                </section>
              )}

              <section
                className="bulk-download__recommended-section"
                aria-labelledby={customTables.length > 0 ? "bulk-download-recommended-heading" : undefined}
              >
                {customTables.length > 0 && (
                  <div className="bulk-download__tables-header">
                    <h3 id="bulk-download-recommended-heading">Recommended tables</h3>
                    <p className="bulk-download__section-count">
                      {bundle.tables.length} {bundle.tables.length === 1 ? "table" : "tables"}
                    </p>
                  </div>
                )}
                <ul className="bulk-download__table-list">
                  {bundle.tables.map((tableConfig) => (
                    <TableRow
                      key={tableConfig.table}
                      tableConfig={tableConfig}
                      datasets={datasets}
                      checked={selectedTableNames.includes(tableConfig.table)}
                      tableYears={selectedYearsByTable[tableConfig.table] || []}
                      availableYears={availableYearsByTable[tableConfig.table]}
                      yearsAreLoading={Boolean(yearsLoadingByTable[tableConfig.table])}
                      onToggle={toggleTable}
                      onToggleYear={toggleTableYear}
                    />
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>

      {isPickerOpen && (
        <DatasetInventoryPicker
          datasets={inventoryDatasets}
          alreadyAddedTableNames={alreadyAddedTableNames}
          allowedGeographies={["municipal"]}
          onSelect={handleAddCustomTable}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {isLimitModalOpen && (
        <LimitReachedModal maxTables={MAX_BULK_DOWNLOAD_TABLES} onClose={() => setIsLimitModalOpen(false)} />
      )}
    </section>
  );
};

export default BulkDownloadBundlePage;

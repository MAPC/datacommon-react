import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import SearchBar from "../components/partials/SearchBar";
import capitalize from "../utils/capitalize";
import { fetchDatasets } from "../reducers/datasetSlice";
import { getTableDisplayInfo, tableHasYearFilter } from "../constants/bulkDownloadBundles";
import {
  downloadBlob,
  requestBulkExport,
  fetchBulkDownloadBundle,
  BULK_DOWNLOAD_EXPORT_FAILED,
  BULK_DOWNLOAD_EXPORT_FAILED_MESSAGE,
} from "../utils/bulkDownloadApi";
import { resolveDefaultSelectedYears } from "../utils/bulkDownloadYears";

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

const SkeletonBone = ({ className = "", style = undefined }) => (
  <span className={`bulk-download__skeleton-bone${className ? ` ${className}` : ""}`} style={style} aria-hidden="true" />
);

SkeletonBone.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

const BulkDownloadBundleSkeleton = ({ tableCount = 6 }) => (
  <>
    <p className="bulk-download__sr-only">Loading housing data download options…</p>

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

const BulkDownloadBundlePage = () => {
  const { bundleId } = useParams();
  const dispatch = useDispatch();
  const { cache: datasets, status } = useSelector((state) => state.dataset);

  const [bundle, setBundle] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(true);
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedTableNames, setSelectedTableNames] = useState([]);
  const [availableYearsByTable, setAvailableYearsByTable] = useState({});
  const [selectedYearsByTable, setSelectedYearsByTable] = useState({});
  const [yearsLoading, setYearsLoading] = useState(true);
  const [downloadFormat, setDownloadFormat] = useState("zip");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");

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
              tableConfig.defaultSelectedYears,
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

  const selectedTableConfigs = useMemo(() => {
    if (!bundle) return [];
    return bundle.tables
      .filter((t) => selectedTableNames.includes(t.table))
      .map((t) => ({
        ...t,
        years: selectedYearsByTable[t.table] || [],
      }));
  }, [bundle, selectedTableNames, selectedYearsByTable]);

  if (bundleLoading) {
    return (
      <section className="route BulkDownload">
        <div className="bulk-download__header container tight">
          <nav className="bulk-download__breadcrumb" aria-label="Breadcrumb">
            <Link to="/browser">Data Browser</Link>
            <span aria-hidden="true"> / </span>
            <Link to="/browser/bulk-download">Download by Topic</Link>
          </nav>
          <h1>Download by Topic</h1>
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
  const allTablesSelected = selectedTableNames.length === bundle.tables.length;
  const canDownload = municipalities.length > 0 && selectedTableNames.length > 0 && !yearsLoading;

  const handleMuniSelect = (muniSlug) => {
    const name = capitalize(muniSlug);
    setMunicipalities((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setDownloadError("");
  };

  const removeMunicipality = (name) => {
    setMunicipalities((prev) => prev.filter((m) => m !== name));
  };

  const toggleTable = (tableName) => {
    setSelectedTableNames((prev) => (prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]));
  };

  const selectAllTables = () => setSelectedTableNames(bundle.tables.map((t) => t.table));
  const clearAllTables = () => setSelectedTableNames([]);

  const toggleTableYear = (tableName, year) => {
    setSelectedYearsByTable((prev) => {
      const current = prev[tableName] || [];
      const next = current.includes(year) ? current.filter((y) => y !== year) : [...current, year];
      return { ...prev, [tableName]: next };
    });
  };

  const handleDownload = async () => {
    if (municipalities.length === 0) {
      setDownloadError("Select at least one municipality.");
      return;
    }

    if (!canDownload) return;

    setIsDownloading(true);
    setDownloadError("");
    setDownloadStatus("Preparing download…");

    try {
      const { blob, filename } = await requestBulkExport({
        municipalities,
        tables: selectedTableConfigs,
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
          <Link to="/browser/bulk-download">Download by Topic</Link>
          <span aria-hidden="true"> / </span>
          <span>{bundle.title}</span>
        </nav>
        <h1>{bundle.title}</h1>
        <p className="bulk-download__intro">{bundle.description}</p>
      </div>

      <div className="bulk-download__layout container tight">
        {isPageLoading ? (
          <BulkDownloadBundleSkeleton tableCount={Math.min(bundle.tables.length, 6)} />
        ) : (
          <>
            <aside className="bulk-download__sidebar">
              <section className="bulk-download__panel">
                <h2>Municipality</h2>
                <p className="bulk-download__hint">Required — search and select one or more Massachusetts cities or towns.</p>
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
                {!municipalities.length && <p className="bulk-download__validation">Select at least one municipality to continue.</p>}
                {municipalities.length > 0 && selectedTableNames.length === 0 && <p className="bulk-download__validation">Select at least one table.</p>}
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
                <p className="bulk-download__summary">
                  {selectedTableNames.length} of {bundle.tables.length} tables
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
                All tables are selected by default, and recommended years are pre-selected. You can change the selected years and tables.
              </p>
              <ul className="bulk-download__table-list">
                {bundle.tables.map((tableConfig) => {
                  const checked = selectedTableNames.includes(tableConfig.table);
                  const { title, source } = getTableDisplayInfo(tableConfig, datasets);
                  const tableYears = selectedYearsByTable[tableConfig.table] || [];
                  const availableYears = availableYearsByTable[tableConfig.table];
                  return (
                    <li key={tableConfig.table} className={`bulk-download__table-item${checked ? " bulk-download__table-item--selected" : ""}`}>
                      <label className="bulk-download__table-label">
                        <input type="checkbox" checked={checked} onChange={() => toggleTable(tableConfig.table)} />
                        <span className="bulk-download__table-info">
                          <span className="bulk-download__table-title">{title}</span>
                          {source && <span className="bulk-download__table-source">{source}</span>}
                          <span className="bulk-download__table-meta">
                            <code>{tableConfig.table}</code>
                          </span>
                        </span>
                      </label>
                      <div className={`bulk-download__table-years${checked ? "" : " bulk-download__table-years--disabled"}`}>
                        {tableConfig.yearColumn && (
                          <>
                            <span className="bulk-download__table-years-label">Years</span>
                            {!yearsLoading && availableYears?.length === 0 && <p className="bulk-download__table-years-loading">No years available</p>}
                            {availableYears?.length > 0 && (
                              <div className="bulk-download__year-list">
                                {availableYears.map((year) => (
                                  <YearPill
                                    key={year}
                                    year={year}
                                    selected={tableYears.includes(year)}
                                    onToggle={(y) => toggleTableYear(tableConfig.table, y)}
                                    disabled={!checked}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default BulkDownloadBundlePage;

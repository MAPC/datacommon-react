import React, { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { faClone } from "@fortawesome/free-regular-svg-icons";
import { supportsTabularGeojsonExport } from "../../utils/datasetMapPreview";
import { resolveDefaultSelectedYears } from "../../utils/bulkDownloadApi";

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
    displayName: "Shapefile",
  },
  geojson: {
    extension: ".geojson",
    isGeospatial: true,
    isTabular: false,
    zoningAtlas: "",
    displayName: "GeoJSON",
  },
};

const downloadMetadata = (metadata, title) => {
  const documentHeader = ["name", "alias", "details"];
  const values = metadata.map((row) => documentHeader.map((key) => row[key]));
  const rows = values.map((row) => row.reduce((a, b) => `${a},${b}`));
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
  document.body.removeChild(link);
};

const urlForDownload = (
  schema,
  table,
  database,
  selectedYears,
  queryYearColumn,
  selectedColumns,
  columnKeys,
  selectedGeographies,
  availableGeographies,
  geographyColumn,
  downloadScope,
  format,
  useMetadataColumns
) => {
  let url = "#";

  if (table === "zoning_atlas") {
    return formats[format].zoningAtlas || "#";
  }

  url = `/api/export?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${database}&schema=${schema}&table=${table}&format=${format}`;
  const shouldUseFilteredValues = downloadScope === "filtered";
  // GeoJSON year pills always go on the export URL, even when other filters use "all".
  const shouldIncludeYears =
    selectedYears.length > 0 &&
    queryYearColumn !== "" &&
    (shouldUseFilteredValues || format === "geojson");
  if (shouldIncludeYears) {
    url = `${url}&years=${selectedYears.join(",")}`;
  }

  if (shouldUseFilteredValues && selectedColumns.length && selectedColumns.length !== columnKeys.length) {
    url = `${url}&columns=${selectedColumns.join(",")}`;
  }

  if (shouldUseFilteredValues && selectedGeographies.length && selectedGeographies.length !== availableGeographies.length && geographyColumn) {
    const mappedGeos = selectedGeographies.map((col) => encodeURIComponent(col));
    url = `${url}&geographies=${mappedGeos.join(",")}&geoColumn=${geographyColumn}`;
  }

  if (["csv", "json", "geojson"].includes(format)) {
    url = `${url}&useMetadataColumns=${useMetadataColumns ? "true" : "false"}`;
  }

  return url;
};

const toAbsoluteExportUrl = (url) => {
  if (!url || url === "#") {
    return url;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    try {
      return new URL(url, window.location.origin).href;
    } catch {
      return url;
    }
  }
  return url;
};

/** Start file download without opening a new tab (avoids a blank window from window.open). */
const triggerExportFileDownload = (url) => {
  if (!url || url === "#") {
    return;
  }
  const link = document.createElement("a");
  link.href = /^https?:\/\//i.test(url) ? url : toAbsoluteExportUrl(url);
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getDownloadFormatOptions = (database, table) => {
  const tableIsGeospatial = database === "towndata" || database === "gisdata";
  const allowTabularGeojson = supportsTabularGeojsonExport(table);
  return Object.entries(formats).filter(([format, config]) => {
    if (format === "geojson" && allowTabularGeojson) return true;
    return config.isGeospatial === tableIsGeospatial || (!tableIsGeospatial && config.isTabular);
  });
};

const resolveInitialGeojsonYears = (selectedYears, availableYears) => {
  const available = (availableYears || []).map((year) => String(year)).filter(Boolean);
  const selected = (selectedYears || []).map((year) => String(year)).filter(Boolean);
  if (!available.length) return selected;

  const availableSet = new Set(available);
  const matched = selected.filter((year) => availableSet.has(year));
  if (matched.length) return matched;

  return resolveDefaultSelectedYears(available);
};

function ExportDataModal({
  isOpen,
  onClose,
  datasetId,
  title = "",
  table = "",
  database = "ds",
  schema = "",
  metadata = [],
  columnKeys = [],
  selectedColumns = [],
  selectedYears = [],
  queryYearColumn = "",
  selectedGeographies = [],
  availableGeographies = [],
  geographyColumn,
  availableYears = [],
}) {
  const [exportTarget, setExportTarget] = useState("data");
  const [downloadDestination, setDownloadDestination] = useState("file");
  const [downloadScope, setDownloadScope] = useState("filtered");
  const [downloadFormat, setDownloadFormat] = useState("csv");
  const [geojsonYears, setGeojsonYears] = useState([]);
  const [useMetadataColumns, setUseMetadataColumns] = useState(true);
  const [apiCopyStatus, setApiCopyStatus] = useState("");
  const [justCopiedEndpoint, setJustCopiedEndpoint] = useState(false);
  const [geojsonDownloadError, setGeojsonDownloadError] = useState("");
  const copyEndpointFeedbackTimerRef = useRef(null);

  const allowsTabularGeojson = supportsTabularGeojsonExport(table);
  const availableDownloadFormats = useMemo(() => getDownloadFormatOptions(database, table), [database, table]);
  const isShapefileSelection = downloadFormat === "shapefile";
  const isTabularGeojsonSelection = downloadFormat === "geojson" && allowsTabularGeojson;
  const showGeojsonYearPicker = isTabularGeojsonSelection && Boolean(queryYearColumn) && availableYears.length > 0;

  const hasFilteredSelections = useMemo(() => {
    const yearsAreFiltered = queryYearColumn && selectedYears.length > 0 && selectedYears.length !== availableYears.length;
    const columnsAreFiltered = columnKeys.length > 0 && selectedColumns.length !== columnKeys.length;
    const geographiesAreFiltered =
      availableGeographies.length > 0 && selectedGeographies.length !== availableGeographies.length;
    return yearsAreFiltered || columnsAreFiltered || geographiesAreFiltered;
  }, [
    queryYearColumn,
    selectedYears,
    availableYears.length,
    columnKeys.length,
    selectedColumns.length,
    availableGeographies.length,
    selectedGeographies.length,
  ]);

  useEffect(() => {
    if (!availableDownloadFormats.length) {
      return;
    }
    const selectedIsAvailable = availableDownloadFormats.some(([format]) => format === downloadFormat);
    if (!selectedIsAvailable) {
      setDownloadFormat(availableDownloadFormats[0][0]);
    }
  }, [availableDownloadFormats, downloadFormat]);

  useEffect(() => {
    if (!hasFilteredSelections) {
      setDownloadScope("all");
    }
  }, [hasFilteredSelections]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setExportTarget("data");
    setDownloadDestination("file");
    setDownloadScope(hasFilteredSelections ? "filtered" : "all");
    setApiCopyStatus("");
    setJustCopiedEndpoint(false);
    setGeojsonDownloadError("");
    setGeojsonYears(resolveInitialGeojsonYears(selectedYears, availableYears));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isTabularGeojsonSelection) {
      setGeojsonDownloadError("");
      return;
    }
    setGeojsonYears((prev) => {
      if (prev.length) return prev;
      return resolveInitialGeojsonYears(selectedYears, availableYears);
    });
  }, [isTabularGeojsonSelection, selectedYears, availableYears]);

  useEffect(
    () => () => {
      if (copyEndpointFeedbackTimerRef.current) {
        window.clearTimeout(copyEndpointFeedbackTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (downloadDestination !== "api" || exportTarget !== "data") {
      setJustCopiedEndpoint(false);
      if (copyEndpointFeedbackTimerRef.current) {
        window.clearTimeout(copyEndpointFeedbackTimerRef.current);
        copyEndpointFeedbackTimerRef.current = null;
      }
    }
  }, [downloadDestination, exportTarget]);

  const getConfiguredExportUrl = (scopeOverride = downloadScope, formatOverride = downloadFormat) => {
    const useGeojsonYears = formatOverride === "geojson" && allowsTabularGeojson && showGeojsonYearPicker;
    const yearsForUrl = useGeojsonYears ? geojsonYears : selectedYears;
    // Year pills drive GeoJSON years; keep page column/geography filters off for that path.
    const scopeForUrl = useGeojsonYears ? "all" : scopeOverride;

    return urlForDownload(
      schema,
      table,
      database,
      yearsForUrl,
      queryYearColumn,
      selectedColumns,
      columnKeys,
      selectedGeographies,
      availableGeographies,
      geographyColumn,
      scopeForUrl,
      formatOverride,
      useMetadataColumns,
    );
  };

  const toggleGeojsonYear = (year) => {
    const yearKey = String(year);
    setGeojsonYears((prev) =>
      prev.includes(yearKey) ? prev.filter((value) => value !== yearKey) : [...prev, yearKey],
    );
    setGeojsonDownloadError("");
  };

  const selectAllGeojsonYears = () => {
    setGeojsonYears(availableYears.map((year) => String(year)));
    setGeojsonDownloadError("");
  };

  const clearGeojsonYears = () => {
    setGeojsonYears([]);
    setGeojsonDownloadError("");
  };

  const allGeojsonYearsSelected =
    availableYears.length > 0 && geojsonYears.length === availableYears.length;

  const copyApiEndpoint = () => {
    const effectiveDownloadScope = isShapefileSelection ? "all" : downloadScope;
    const apiUrl = toAbsoluteExportUrl(getConfiguredExportUrl(effectiveDownloadScope));
    if (!apiUrl || apiUrl === "#") {
      setApiCopyStatus("Nothing to copy.");
      setJustCopiedEndpoint(false);
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(apiUrl)
        .then(() => {
          setApiCopyStatus("API endpoint copied!");
          setJustCopiedEndpoint(true);
          if (copyEndpointFeedbackTimerRef.current) {
            window.clearTimeout(copyEndpointFeedbackTimerRef.current);
          }
          copyEndpointFeedbackTimerRef.current = window.setTimeout(() => {
            setJustCopiedEndpoint(false);
            copyEndpointFeedbackTimerRef.current = null;
          }, 2200);
        })
        .catch(() => {
          setJustCopiedEndpoint(false);
          setApiCopyStatus("Could not copy. Try selecting the URL or use Copy endpoint below.");
        });
    } else {
      setApiCopyStatus("Copy not available in this browser.");
      setJustCopiedEndpoint(false);
    }
  };

  const handleDownloadSubmit = () => {
    if (exportTarget === "metadata") {
      downloadMetadata(metadata, title);
      return;
    }

    const effectiveDownloadScope = isShapefileSelection ? "all" : downloadScope;

    if (downloadDestination === "api") {
      copyApiEndpoint();
      return;
    }

    if (isTabularGeojsonSelection && showGeojsonYearPicker && geojsonYears.length === 0) {
      setGeojsonDownloadError("Select at least one year to export as GeoJSON.");
      return;
    }

    setGeojsonDownloadError("");
    const downloadUrl = getConfiguredExportUrl(effectiveDownloadScope);
    triggerExportFileDownload(downloadUrl);
  };

  const geojsonDownloadDisabled =
    isTabularGeojsonSelection && showGeojsonYearPicker && geojsonYears.length === 0;

  const resolvedApiExportUrl =
    isOpen && exportTarget === "data" && downloadDestination === "api"
      ? toAbsoluteExportUrl(getConfiguredExportUrl(isShapefileSelection ? "all" : downloadScope))
      : "";

  if (!isOpen) {
    return null;
  }

  return (
    <div className="download-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="download-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export data"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="download-modal-header">
          <h3>Export data</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close export dialog">
            <FontAwesomeIcon icon={faXmark} aria-hidden />
          </button>
        </div>
        <div className="download-modal-body">
          <>
            <fieldset className="download-option-group">
              <legend>What to export</legend>
              <div className="download-destination-switch" role="tablist" aria-label="Export content">
                <button
                  type="button"
                  role="tab"
                  aria-selected={exportTarget === "data"}
                  className={exportTarget === "data" ? "is-active" : ""}
                  onClick={() => setExportTarget("data")}
                >
                  Dataset data
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={exportTarget === "metadata"}
                  className={exportTarget === "metadata" ? "is-active" : ""}
                  onClick={() => setExportTarget("metadata")}
                >
                  Metadata
                </button>
              </div>
              <p className="download-option-note">
                {exportTarget === "data"
                  ? "Export table rows in the selected file format."
                  : "Download a CSV file that describes the dataset columns (names, aliases, and descriptions) — no data included."}
              </p>
            </fieldset>

            {exportTarget === "data" && (
              <>
                <fieldset className="download-option-group">
                  <legend>File format</legend>
                  <p className="download-option-note">Choose the type of file.</p>
                  <select value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value)}>
                    {availableDownloadFormats.map(([format, config]) => (
                      <option key={format} value={format}>
                        {config.displayName}
                      </option>
                    ))}
                  </select>
                  {["csv", "json", "geojson"].includes(downloadFormat) && (
                    <div className="download-header-switch-wrapper">
                      <p className="download-option-note">Choose a column header style</p>
                      <div className="download-destination-switch" role="tablist" aria-label="Column header style">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={useMetadataColumns}
                          className={useMetadataColumns ? "is-active" : ""}
                          onClick={() => setUseMetadataColumns(true)}
                        >
                          Metadata header
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={!useMetadataColumns}
                          className={!useMetadataColumns ? "is-active" : ""}
                          onClick={() => setUseMetadataColumns(false)}
                        >
                          Raw table header
                        </button>
                      </div>
                    </div>
                  )}
                  {isTabularGeojsonSelection && (
                    <p className="download-option-note">
                      GeoJSON joins table attributes to municipal or census tract boundaries via the export API.
                      {showGeojsonYearPicker
                        ? " Select one or more years below. Multiple years download as a ZIP of GeoJSON files."
                        : ""}
                    </p>
                  )}
                </fieldset>

                {showGeojsonYearPicker && (
                  <fieldset className="download-option-group">
                    <legend>Years for GeoJSON</legend>
                    <div className="download-geojson-year-header">
                      <p className="download-option-note">
                        Choose which years to include. One year downloads a .geojson file; multiple years download a .zip.
                      </p>
                      <button
                        type="button"
                        className="download-geojson-year-link"
                        onClick={allGeojsonYearsSelected ? clearGeojsonYears : selectAllGeojsonYears}
                      >
                        {allGeojsonYearsSelected ? "Clear selection" : "Select all"}
                      </button>
                    </div>
                    <div className="download-geojson-year-list" role="group" aria-label="Years for GeoJSON export">
                      {availableYears.map((year) => {
                        const yearKey = String(year);
                        const selected = geojsonYears.includes(yearKey);
                        return (
                          <button
                            key={yearKey}
                            type="button"
                            className={`download-geojson-year-pill${selected ? " download-geojson-year-pill--selected" : ""}`}
                            aria-pressed={selected}
                            onClick={() => toggleGeojsonYear(yearKey)}
                          >
                            {yearKey}
                          </button>
                        );
                      })}
                    </div>
                    {geojsonYears.length > 1 && (
                      <p className="download-option-note">
                        {geojsonYears.length} years selected — download will be a ZIP with one GeoJSON file per year.
                      </p>
                    )}
                  </fieldset>
                )}

                <div className="download-destination-switch" role="tablist" aria-label="Export destination">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={downloadDestination === "file"}
                    className={downloadDestination === "file" ? "is-active" : ""}
                    onClick={() => setDownloadDestination("file")}
                  >
                    Download file
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={downloadDestination === "api"}
                    className={downloadDestination === "api" ? "is-active" : ""}
                    onClick={() => setDownloadDestination("api")}
                  >
                    API endpoint
                  </button>
                </div>

                {downloadDestination === "api" ? (
                  <div className="download-api-endpoint-section">
                    <div className="download-endpoint-field" role="group" aria-label="API endpoint">
                      <div className="download-endpoint-field-body">
                        <span className="download-endpoint-field-label">API endpoint</span>
                        <div className="download-endpoint-field-url">{resolvedApiExportUrl}</div>
                      </div>
                      <button
                        type="button"
                        className="download-endpoint-field-copy"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyApiEndpoint();
                        }}
                        aria-label="Copy API endpoint URL"
                        title="Copy URL"
                      >
                        <FontAwesomeIcon icon={faClone} aria-hidden />
                      </button>
                    </div>
                    {apiCopyStatus && (
                      <p className="download-option-note download-api-endpoint-status" role="status" aria-live="polite">
                        {apiCopyStatus}
                      </p>
                    )}
                  </div>
                ) : isShapefileSelection ? (
                  <fieldset className="download-option-group">
                    <legend>ESRI Shapefile behavior</legend>
                    <p className="download-option-note">
                      ESRI Shapefile always downloads the full table. Filtered export is not applied.
                    </p>
                  </fieldset>
                ) : isTabularGeojsonSelection ? (
                  geojsonDownloadError ? (
                    <p className="download-option-note download-geojson-error" role="alert">
                      {geojsonDownloadError}
                    </p>
                  ) : null
                ) : (
                  <fieldset
                    className={`download-option-group${!hasFilteredSelections ? " download-data-scope--inactive" : ""}`}
                    aria-disabled={!hasFilteredSelections}
                  >
                    <legend>Data scope</legend>
                    <label className={!hasFilteredSelections ? "download-data-scope-label--disabled" : undefined}>
                      <input
                        type="checkbox"
                        checked={downloadScope === "filtered"}
                        disabled={!hasFilteredSelections}
                        onChange={(e) => setDownloadScope(e.target.checked ? "filtered" : "all")}
                      />
                      Export filtered data only
                    </label>
                    <p className="download-option-note">
                      {!hasFilteredSelections
                        ? "No column, year, or geography filters are applied. Export uses the full table."
                        : downloadScope === "filtered"
                          ? "Only current filtered rows will be exported."
                          : "The full table will be exported."}
                    </p>
                  </fieldset>
                )}
              </>
            )}

            {exportTarget === "data" && (
              <p className="download-modal-api-more download-modal-api-more--bottom">
                <a
                  href={datasetId ? `/developers?datasetId=${encodeURIComponent(String(datasetId))}` : "/developers"}
                >
                  API documentation
                </a>{" "}
                has parameters, code examples, and more detail.
              </p>
            )}
          </>
        </div>
        <div className="download-modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={`button file-button${
              justCopiedEndpoint && exportTarget === "data" && downloadDestination === "api" ? " download-modal-primary--copied" : ""
            }`}
            onClick={handleDownloadSubmit}
            disabled={
              (downloadDestination === "file" && geojsonDownloadDisabled) ||
              (exportTarget === "metadata" && (!metadata || (Array.isArray(metadata) && metadata.length === 0)))
            }
          >
            {exportTarget === "metadata"
              ? "Download"
              : downloadDestination === "api"
                ? justCopiedEndpoint
                  ? "Copied!"
                  : "Copy endpoint"
                : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}

ExportDataModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  datasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  table: PropTypes.string,
  database: PropTypes.string,
  schema: PropTypes.string,
  metadata: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.object), PropTypes.objectOf(PropTypes.object)]),
  columnKeys: PropTypes.arrayOf(PropTypes.object),
  selectedColumns: PropTypes.arrayOf(PropTypes.string),
  selectedYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  queryYearColumn: PropTypes.string,
  selectedGeographies: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  availableGeographies: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  geographyColumn: PropTypes.string,
  availableYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
};

export default ExportDataModal;

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { faClone } from "@fortawesome/free-regular-svg-icons";

const SIZE_PRESETS = {
  small: { label: "Small", width: 500, height: 425 },
  medium: { label: "Medium", width: 760, height: 646 },
  large: { label: "Large", width: 950, height: 808 },
};

const IFRAME_WIDTH_DEFAULT = SIZE_PRESETS.large.width;
const IFRAME_HEIGHT_DEFAULT = SIZE_PRESETS.large.height;

const makeIframeSnippet = (embedUrl, title, w, h, viewMode = "table") =>
  `<iframe src="${embedUrl}" title="${title || (viewMode === "map" ? "Embedded dataset map" : "Embedded dataset table")}" width="${w}" height="${h}" frameborder="0" loading="lazy"></iframe>`;

const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");
const getPresetForDimensions = (width, height) => {
  if (width === SIZE_PRESETS.small.width && height === SIZE_PRESETS.small.height) {
    return "small";
  }
  if (width === SIZE_PRESETS.medium.width && height === SIZE_PRESETS.medium.height) {
    return "medium";
  }
  if (width === SIZE_PRESETS.large.width && height === SIZE_PRESETS.large.height) {
    return "large";
  }
  return "custom";
};

const EmbedTableModal = ({
  isOpen,
  onClose,
  datasetId,
  title,
  shareUrl: shareUrlProp,
  embedUrl: embedUrlProp,
  urlTooLong = false,
  adjustUrlFiltersSlot = null,
  viewMode = "table",
}) => {
  const [panel, setPanel] = useState("share");
  /** Shown in inputs while typing; only digits (empty allowed briefly). */
  const [widthInput, setWidthInput] = useState(String(IFRAME_WIDTH_DEFAULT));
  const [heightInput, setHeightInput] = useState(String(IFRAME_HEIGHT_DEFAULT));
  /** Used in generated iframe after blur validation. */
  const [widthCommitted, setWidthCommitted] = useState(IFRAME_WIDTH_DEFAULT);
  const [heightCommitted, setHeightCommitted] = useState(IFRAME_HEIGHT_DEFAULT);
  const [sizePreset, setSizePreset] = useState("large");
  const [copyStatus, setCopyStatus] = useState("");
  /** Once the share URL is too long while this dialog is open, keep filter controls visible after it fits again. */
  const [keepAdjustFiltersVisible, setKeepAdjustFiltersVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPanel("share");
      setCopyStatus("");
      setWidthInput(String(IFRAME_WIDTH_DEFAULT));
      setHeightInput(String(IFRAME_HEIGHT_DEFAULT));
      setWidthCommitted(IFRAME_WIDTH_DEFAULT);
      setHeightCommitted(IFRAME_HEIGHT_DEFAULT);
      setSizePreset(getPresetForDimensions(IFRAME_WIDTH_DEFAULT, IFRAME_HEIGHT_DEFAULT));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setKeepAdjustFiltersVisible(false);
      return;
    }
    if (urlTooLong) {
      setKeepAdjustFiltersVisible(true);
    }
  }, [isOpen, urlTooLong]);

  const fallbackSourceUrl = useMemo(() => {
    const path =
      viewMode === "map" ? `/browser/datasets/${datasetId}/map` : `/browser/datasets/${datasetId}`;
    if (typeof window === "undefined") {
      return path;
    }
    return `${window.location.origin}${path}`;
  }, [datasetId, viewMode]);

  const fallbackEmbedUrl = useMemo(() => {
    const path =
      viewMode === "map" ? `/browser/datasets/${datasetId}/map` : `/browser/datasets/${datasetId}`;
    if (typeof window === "undefined") {
      return `${path}?embed=1`;
    }
    return `${window.location.origin}${path}?embed=1`;
  }, [datasetId, viewMode]);

  const sourceUrl = shareUrlProp ?? fallbackSourceUrl;
  const embedUrl = embedUrlProp ?? fallbackEmbedUrl;

  const resolveWidthFromInput = () => {
    if (widthInput === "") {
      return IFRAME_WIDTH_DEFAULT;
    }
    const n = parseInt(widthInput, 10);
    if (Number.isNaN(n)) {
      return IFRAME_WIDTH_DEFAULT;
    }
    return Math.max(1, Math.round(n));
  };

  const resolveHeightFromInput = () => {
    if (heightInput === "") {
      return IFRAME_HEIGHT_DEFAULT;
    }
    const n = parseInt(heightInput, 10);
    if (Number.isNaN(n)) {
      return IFRAME_HEIGHT_DEFAULT;
    }
    return Math.max(1, Math.round(n));
  };

  const iframeCode = useMemo(
    () => makeIframeSnippet(embedUrl, title, widthCommitted, heightCommitted, viewMode),
    [embedUrl, heightCommitted, title, widthCommitted, viewMode],
  );

  const commitWidth = () => {
    const c = resolveWidthFromInput();
    setWidthCommitted(c);
    setWidthInput(String(c));
    setSizePreset(getPresetForDimensions(c, heightCommitted));
    setCopyStatus("");
  };

  const commitHeight = () => {
    const c = resolveHeightFromInput();
    setHeightCommitted(c);
    setHeightInput(String(c));
    setSizePreset(getPresetForDimensions(widthCommitted, c));
    setCopyStatus("");
  };

  const handleWidthChange = (e) => {
    setWidthInput(digitsOnly(e.target.value));
    setCopyStatus("");
  };

  const handleHeightChange = (e) => {
    setHeightInput(digitsOnly(e.target.value));
    setCopyStatus("");
  };

  const copyText = async (value, successMessage) => {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("Copy is not supported in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(successMessage);
    } catch (error) {
      setCopyStatus("Could not copy. Please copy manually.");
    }
  };

  const copyEmbedCode = () => {
    const w = resolveWidthFromInput();
    const h = resolveHeightFromInput();
    setWidthCommitted(w);
    setHeightCommitted(h);
    setWidthInput(String(w));
    setHeightInput(String(h));
    setSizePreset(getPresetForDimensions(w, h));
    copyText(makeIframeSnippet(embedUrl, title, w, h, viewMode), "Embed code copied!");
  };

  const handleSizePresetChange = (e) => {
    const nextPreset = e.target.value;
    setSizePreset(nextPreset);
    setCopyStatus("");
    if (nextPreset === "custom") {
      return;
    }
    const preset = SIZE_PRESETS[nextPreset];
    setWidthInput(String(preset.width));
    setHeightInput(String(preset.height));
    setWidthCommitted(preset.width);
    setHeightCommitted(preset.height);
  };

  const selectPanel = (next) => {
    setPanel(next);
    setCopyStatus("");
  };

  if (!isOpen) {
    return null;
  }

  const showFilterEditor = Boolean(adjustUrlFiltersSlot && (urlTooLong || keepAdjustFiltersVisible));

  const shareEmbedFilterHelp = (
    <>
      {urlTooLong && (
        <p className="embed-table-modal-url-warning" role="alert">
          This link is too long to share reliably. To shorten it, select fewer table columns, fewer years, or fewer places
          in the geography filter.
        </p>
      )}
      {showFilterEditor && (
        <div className="embed-table-modal-overlimit-editor">
          {!urlTooLong && (
            <p className="embed-table-modal-url-ready" role="status">
              This share link is within a safe length.
            </p>
          )}
          <p className="embed-table-modal-overlimit-title">Adjust filters in this window</p>
          <div className="embed-table-modal-dataset-filters">{adjustUrlFiltersSlot}</div>
        </div>
      )}
    </>
  );

  return (
    <div className="download-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="download-modal embed-table-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Share and embed"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="download-modal-header">
          <h3>Share and Embed</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close share and embed dialog">
            <FontAwesomeIcon icon={faXmark} aria-hidden />
          </button>
        </div>
        <div className="download-modal-body">
          <div className="embed-table-modal-tablist" role="tablist" aria-label="Share or embed">
            <div className="embed-table-modal-tabrow">
              <button
                type="button"
                role="tab"
                aria-selected={panel === "share"}
                className={panel === "share" ? "is-active" : ""}
                onClick={() => selectPanel("share")}
              >
                Share
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panel === "embed"}
                className={panel === "embed" ? "is-active" : ""}
                onClick={() => selectPanel("embed")}
              >
                Embed
              </button>
            </div>
          </div>

          {panel === "share" && (
            <div className="embed-table-modal-panel" role="tabpanel" aria-label="Share">
              <p className="embed-table-modal-section-title">Copy link to page</p>
              <p className="embed-table-modal-section-hint">
                {viewMode === "map"
                  ? "This link opens the map view and includes the selected map variable, geography, and year."
                  : "This link includes the selected filters (columns, geography, and years)."}
              </p>
              {shareEmbedFilterHelp}
              <div
                className={`download-endpoint-field ${urlTooLong ? "is-disabled" : ""}`}
                role="group"
                aria-label="Page link"
                aria-disabled={urlTooLong}
              >
                <div className="download-endpoint-field-body">
                  <span className="download-endpoint-field-label">Link</span>
                  <div className="download-endpoint-field-url">{sourceUrl}</div>
                </div>
                <button
                  type="button"
                  className="download-endpoint-field-copy"
                  onClick={() => {
                    if (urlTooLong) return;
                    copyText(sourceUrl, "Link copied!");
                  }}
                  aria-label="Copy link to clipboard"
                  title="Copy URL"
                  disabled={urlTooLong}
                >
                  <FontAwesomeIcon icon={faClone} aria-hidden />
                </button>
              </div>
            </div>
          )}

          {panel === "embed" && (
            <div className="embed-table-modal-panel" role="tabpanel" aria-label="Embed">
              <p className="embed-table-modal-section-title">Copy embed code</p>
              <p className="embed-table-modal-section-hint">
                {viewMode === "map"
                  ? "The embed URL uses the map view and updates with the selected map variable, geography, and year."
                  : "The embed URL updates based on the applied filters (columns, geography, and years)."}
              </p>
              {shareEmbedFilterHelp}
              <div className="embed-table-modal-group embed-table-modal-group--tight">
                <label className="embed-table-modal-embed-size-label" htmlFor="embed-size-preset">
                  Size
                </label>
                <select
                  id="embed-size-preset"
                  className="embed-table-modal-size-select"
                  value={sizePreset}
                  onChange={handleSizePresetChange}
                >
                  <option value="small">{`${SIZE_PRESETS.small.width} x ${SIZE_PRESETS.small.height} (Small)`}</option>
                  <option value="medium">{`${SIZE_PRESETS.medium.width} x ${SIZE_PRESETS.medium.height} (Medium)`}</option>
                  <option value="large">{`${SIZE_PRESETS.large.width} x ${SIZE_PRESETS.large.height} (Large)`}</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="embed-table-modal-size-row">
                <div className="embed-table-modal-group embed-table-modal-group--tight">
                  <label className="embed-table-modal-embed-size-label" htmlFor="embed-width">
                    Iframe width (px)
                  </label>
                  <input
                    id="embed-width"
                    className="embed-table-modal-size-input embed-table-modal-size-input--number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck="false"
                    value={widthInput}
                    onChange={handleWidthChange}
                    onBlur={commitWidth}
                    aria-label="Iframe width in pixels, numbers only"
                  />
                </div>
                <div className="embed-table-modal-group embed-table-modal-group--tight">
                  <label className="embed-table-modal-embed-size-label" htmlFor="embed-height">
                    Iframe height (px)
                  </label>
                  <input
                    id="embed-height"
                    className="embed-table-modal-size-input embed-table-modal-size-input--number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck="false"
                    value={heightInput}
                    onChange={handleHeightChange}
                    onBlur={commitHeight}
                    aria-label="Iframe height in pixels, numbers only"
                  />
                </div>
              </div>
              <div
                className={`download-endpoint-field ${urlTooLong ? "is-disabled" : ""}`}
                role="group"
                aria-label="Embed code"
                aria-disabled={urlTooLong}
              >
                <div className="download-endpoint-field-body">
                  <span className="download-endpoint-field-label">Embed code</span>
                  <pre className="download-endpoint-field-url embed-table-modal-embed-code-content">{iframeCode}</pre>
                </div>
                <button
                  type="button"
                  className="download-endpoint-field-copy"
                  onClick={() => {
                    if (urlTooLong) return;
                    copyEmbedCode();
                  }}
                  aria-label="Copy embed code to clipboard"
                  title="Copy embed code"
                  disabled={urlTooLong}
                >
                  <FontAwesomeIcon icon={faClone} aria-hidden />
                </button>
              </div>
            </div>
          )}

          {copyStatus && (
            <p className="embed-table-modal-copy-status" role="status">
              {copyStatus}
            </p>
          )}
        </div>
        <div className="download-modal-footer embed-table-modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

EmbedTableModal.propTypes = {
  datasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  shareUrl: PropTypes.string,
  embedUrl: PropTypes.string,
  urlTooLong: PropTypes.bool,
  adjustUrlFiltersSlot: PropTypes.node,
  viewMode: PropTypes.oneOf(["table", "map"]),
};

EmbedTableModal.defaultProps = {
  title: "",
  urlTooLong: false,
  viewMode: "table",
};

export default EmbedTableModal;

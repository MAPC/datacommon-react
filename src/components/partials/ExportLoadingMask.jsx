import { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import MoonLoader from "react-spinners/MoonLoader";
import { fetchAndDownloadFile } from "../../utils/bulkDownloadApi";

export const EXPORT_DOWNLOAD_FAILED = "Please try again later.";

/**
 * In-container loading mask for dataset export flows.
 * Parent must be `position: relative` (e.g. the export modal).
 */
export function ExportLoadingMask({ active }) {
  if (!active) return null;

  return (
    <div className="export-loading-mask" role="status" aria-live="polite" aria-label="Preparing download">
      <MoonLoader size={36} color="#767676" />
      <span>Preparing download…</span>
    </div>
  );
}

ExportLoadingMask.propTypes = {
  active: PropTypes.bool,
};

/**
 * Shared export download state + fetch helper for modal and map actions.
 */
export function useExportFileDownload() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const exportingRef = useRef(false);

  const clearExportError = useCallback(() => {
    setExportError("");
  }, []);

  const runExportDownload = useCallback(async (url, fallbackFilename) => {
    if (exportingRef.current) return false;
    if (!url || url === "#") {
      setExportError(EXPORT_DOWNLOAD_FAILED);
      return false;
    }

    exportingRef.current = true;
    setExportError("");
    setIsExporting(true);
    try {
      await fetchAndDownloadFile(url, fallbackFilename);
      return true;
    } catch {
      setExportError(EXPORT_DOWNLOAD_FAILED);
      return false;
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    exportError,
    runExportDownload,
    clearExportError,
  };
}

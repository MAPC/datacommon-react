import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { getInventoryRowDatasetId } from "../../utils/datasetInventoryRow";

const DataRow = ({ headers, rowData, linkRowsToDatasetView }) => {
  const targetId = getInventoryRowDatasetId(rowData);
  const canLink = Boolean(linkRowsToDatasetView && targetId != null && targetId !== "");

  const go = useCallback(() => {
    if (!canLink) {
      return;
    }
    const url = new URL(`/browser/datasets/${targetId}`, window.location.origin);
    window.open(url.href, "_blank", "noopener,noreferrer");
  }, [canLink, targetId]);

  const onKeyDown = (e) => {
    if (!canLink) {
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };

  const formatValue = (value) => {
    // Check if the value is a number and has decimal places
    if (typeof value === "number" && value % 1 !== 0) {
      return value.toFixed(2);
    }

    // Check if the value is a string that represents a decimal number
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed % 1 !== 0) {
        return parsed.toFixed(2);
      }
    }

    return value;
  };

  const renderedRow = headers
    .filter((header) => header !== "seq_id")
    .map((header) => <td key={header}>{formatValue(rowData[header])}</td>);

  return (
    <tr
      className={canLink ? "data-row--dataset-link" : undefined}
      onClick={canLink ? go : undefined}
      onKeyDown={canLink ? onKeyDown : undefined}
      tabIndex={canLink ? 0 : undefined}
      title={canLink ? "Click to view data (open in a new tab)" : undefined}
      aria-label={canLink ? `Open dataset table view for id ${targetId} in a new tab` : undefined}
    >
      {renderedRow}
    </tr>
  );
};

DataRow.propTypes = {
  headers: PropTypes.arrayOf(PropTypes.string).isRequired,
  rowData: PropTypes.object.isRequired,
  linkRowsToDatasetView: PropTypes.bool,
};

DataRow.defaultProps = {
  linkRowsToDatasetView: false,
};

export default DataRow;

import { useCallback } from "react";
import PropTypes from "prop-types";
import { getInventoryRowDatasetId } from "../../utils/datasetInventoryRow";

const DataRow = ({
  headers,
  rowData,
  linkRowsToDatasetView,
  showPreviewControls,
  isDragging,
  onDragHandleDragStart,
  onDragHandleDragEnd,
  onRowDragOver,
  onRowDrop,
}) => {
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
    if (typeof value === "number" && value % 1 !== 0) {
      return value.toFixed(2);
    }

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
      className={[
        canLink ? "data-row--dataset-link" : "",
        isDragging ? "dataset-table__row--dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={canLink ? go : undefined}
      onKeyDown={canLink ? onKeyDown : undefined}
      onDragOver={showPreviewControls ? onRowDragOver : undefined}
      onDrop={showPreviewControls ? onRowDrop : undefined}
      tabIndex={canLink ? 0 : undefined}
      role={canLink ? "link" : undefined}
      title={canLink ? "Click to view data (open in a new tab)" : undefined}
      aria-label={canLink ? `Open dataset table view for id ${targetId} in a new tab` : undefined}
    >
      {showPreviewControls && (
        <td className="dataset-table__gutter">
          <div className="dataset-table__row-controls">
            <span
              className="dataset-table__drag-grip dataset-table__drag-grip--row"
              draggable
              onDragStart={onDragHandleDragStart}
              onDragEnd={onDragHandleDragEnd}
              onClick={(e) => e.stopPropagation()}
              title="Drag to reorder row"
              aria-label="Drag to reorder row"
            />
          </div>
        </td>
      )}
      {renderedRow}
    </tr>
  );
};

DataRow.propTypes = {
  headers: PropTypes.arrayOf(PropTypes.string).isRequired,
  rowData: PropTypes.object.isRequired,
  linkRowsToDatasetView: PropTypes.bool,
  showPreviewControls: PropTypes.bool,
  isDragging: PropTypes.bool,
  onDragHandleDragStart: PropTypes.func,
  onDragHandleDragEnd: PropTypes.func,
  onRowDragOver: PropTypes.func,
  onRowDrop: PropTypes.func,
};

DataRow.defaultProps = {
  linkRowsToDatasetView: false,
  showPreviewControls: false,
  isDragging: false,
};

export default DataRow;

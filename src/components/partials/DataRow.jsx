import { useCallback } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTable } from "@fortawesome/free-solid-svg-icons";
import { getInventoryRowDatasetId } from "../../utils/datasetInventoryRow";

const DataRow = ({
  columnSegments,
  showHiddenColumnMarkers,
  rowData,
  linkRowsToDatasetView,
  showRowDragControls,
  isDragging,
  onDragHandleDragStart,
  onDragHandleDragEnd,
  onRowDragOver,
  onRowDrop,
}) => {
  const targetId = getInventoryRowDatasetId(rowData);
  const canLink = Boolean(linkRowsToDatasetView && targetId != null && targetId !== "" && rowData?.active === 'Y');
  const openDatasetTooltip = canLink ? "Open dataset table in a new tab" : "";
  const showOpenTableAction = canLink;
  const showGutter = showRowDragControls || linkRowsToDatasetView;

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

  const formatValue = (value, header) => {
    const yearCols = ["fy_year", "fiscal_yr", "fy", "acs_year", "year", "dec_year", "cal_year"];
    const isYear = yearCols.includes(header);
    if (typeof value === "number" && !isYear) {
      return value.toLocaleString("en-US", { maximumFractionDigits: 2});
    }

    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && !isYear) {
        return parsed.toLocaleString("en-US", { maximumFractionDigits: 2});
      }
    }

    return value;
  };

  const renderedRow = columnSegments.flatMap((segment, segmentIndex) => {
    if (segment.type === "hidden") {
      if (!showHiddenColumnMarkers) return [];
      return [
        <td
          key={`hidden-${segmentIndex}-${segment.columnNames.join("|")}`}
          className="dataset-table__hidden-columns-marker dataset-table__hidden-columns-marker--body"
          aria-hidden
        />,
      ];
    }

    const { column } = segment;
    if (column.name === "seq_id") return [];

    return [<td key={column.name}>{formatValue(rowData[column.name], column.name)}</td>];
  });

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
      onDragOver={showRowDragControls ? onRowDragOver : undefined}
      onDrop={showRowDragControls ? onRowDrop : undefined}
      tabIndex={canLink ? 0 : undefined}
      role={canLink ? "link" : undefined}
      title={openDatasetTooltip}
      aria-label={openDatasetTooltip}
    >
      {showGutter && (
        <td className="dataset-table__gutter">
          <div className="dataset-table__row-controls">
            {showRowDragControls && (
              <span
                className="dataset-table__drag-grip dataset-table__drag-grip--row"
                draggable
                onDragStart={onDragHandleDragStart}
                onDragEnd={onDragHandleDragEnd}
                onClick={(e) => e.stopPropagation()}
                title="Drag to reorder row"
                aria-label="Drag to reorder row"
              />
            )}
            {showOpenTableAction && (
              <button
                type="button"
                className="dataset-table__open-table-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  go();
                }}
                title={openDatasetTooltip}
                aria-label={openDatasetTooltip}
              >
                <FontAwesomeIcon icon={faTable} size="sm" aria-hidden />
              </button>
            )}
          </div>
        </td>
      )}
      {renderedRow}
    </tr>
  );
};

DataRow.propTypes = {
  columnSegments: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(["visible", "hidden"]).isRequired,
      column: PropTypes.object,
      columnNames: PropTypes.arrayOf(PropTypes.string),
    }),
  ).isRequired,
  showHiddenColumnMarkers: PropTypes.bool,
  rowData: PropTypes.object.isRequired,
  linkRowsToDatasetView: PropTypes.bool,
  showRowDragControls: PropTypes.bool,
  isDragging: PropTypes.bool,
  onDragHandleDragStart: PropTypes.func,
  onDragHandleDragEnd: PropTypes.func,
  onRowDragOver: PropTypes.func,
  onRowDrop: PropTypes.func,
};

DataRow.defaultProps = {
  showHiddenColumnMarkers: false,
  linkRowsToDatasetView: false,
  showRowDragControls: false,
  isDragging: false,
};

export default DataRow;

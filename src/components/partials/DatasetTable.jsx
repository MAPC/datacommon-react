import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faArrowsUpDown, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import DataRow from "./DataRow";
import DatasetTableContextMenu from "./DatasetTableContextMenu";
import {
  applyPreviewRowOrder,
  getDatasetRowKey,
  orderColumnKeys,
  reorderList,
} from "../../utils/datasetTablePreview";

class DatasetTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sortColumn: null,
      sortDirection: "asc",
      inputPageNum: props.currentPage,
      contextMenu: null,
      dragColumnIndex: null,
      dragRowIndex: null,
    };
    this.handleSort = this.handleSort.bind(this);
    this.onPageNumberUpdate = this.onPageNumberUpdate.bind(this);
    this.onPageNumberBlur = this.onPageNumberBlur.bind(this);
    this.closeContextMenu = this.closeContextMenu.bind(this);
    this.openColumnContextMenu = this.openColumnContextMenu.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.currentPage !== prevProps.currentPage) {
      this.setState({ inputPageNum: this.props.currentPage });
    }
  }

  closeContextMenu() {
    this.setState({ contextMenu: null });
  }

  openColumnContextMenu(e, column) {
    e.preventDefault();
    e.stopPropagation();
    const { updateSelectedColumns } = this.props;
    if (!updateSelectedColumns) return;
    this.setState({
      contextMenu: {
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: "Hide column",
            onSelect: () => {
              if (this.props.selectedColumns.includes(column.name)) {
                updateSelectedColumns(column.name);
              }
            },
          },
        ],
      },
    });
  }

  handleSort(columnName) {
    const { sortColumn, sortDirection } = this.state;
    let newDirection = "asc";

    if (sortColumn === columnName) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }

    // Column sort overrides manual row drag order so rows stay sorted.
    this.props.onPreviewRowOrderChange?.([]);

    this.setState({
      sortColumn: columnName,
      sortDirection: newDirection,
    });
  }

  getSortIcon(columnName) {
    const { sortColumn, sortDirection } = this.state;
    if (sortColumn !== columnName) {
      return <FontAwesomeIcon icon={faArrowsUpDown} className="sort-icon sort-icon--inactive" size="sm" aria-hidden />;
    }
    return sortDirection === "asc" ? (
      <FontAwesomeIcon icon={faArrowUp} className="sort-icon sort-icon--active" size="sm" aria-hidden />
    ) : (
      <FontAwesomeIcon icon={faArrowDown} className="sort-icon sort-icon--active" size="sm" aria-hidden />
    );
  }

  getSortTooltip(columnName, columnAlias) {
    const { sortColumn, sortDirection } = this.state;
    const label = columnAlias || columnName;
    if (sortColumn !== columnName) {
      return `Sort ascending by ${label}`;
    }
    if (sortDirection === "asc") {
      return `Sorted ascending by ${label}. Click to sort descending.`;
    }
    return `Sorted descending by ${label}. Click to sort ascending.`;
  }

  getAriaSort(columnName) {
    const { sortColumn, sortDirection } = this.state;
    if (sortColumn !== columnName) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  handleHideColumnClick(e, column) {
    e.preventDefault();
    e.stopPropagation();
    const { updateSelectedColumns, selectedColumns } = this.props;
    if (!updateSelectedColumns || !selectedColumns.includes(column.name)) return;
    updateSelectedColumns(column.name);
  }

  handleColumnDragStart(e, index) {
    this.setState({ dragColumnIndex: index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  handleColumnDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  handleColumnDrop(e, toIndex, columnNames) {
    e.preventDefault();
    const { dragColumnIndex } = this.state;
    const { previewColumnOrder, onPreviewColumnOrderChange } = this.props;
    if (dragColumnIndex == null || !onPreviewColumnOrderChange || !columnNames?.length) return;

    const order = previewColumnOrder?.length
      ? previewColumnOrder.filter((name) => columnNames.includes(name))
      : [...columnNames];
    columnNames.forEach((name) => {
      if (!order.includes(name)) order.push(name);
    });

    onPreviewColumnOrderChange(reorderList(order, dragColumnIndex, toIndex));
    this.setState({ dragColumnIndex: null });
  }

  handleRowDragStart(e, index) {
    this.setState({ dragRowIndex: index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  handleRowDrop(e, toIndex, rowKeysInView) {
    e.preventDefault();
    const { dragRowIndex } = this.state;
    const { previewRowOrder, onPreviewRowOrderChange } = this.props;
    if (dragRowIndex == null || !onPreviewRowOrderChange) return;

    const order = previewRowOrder?.length ? [...previewRowOrder] : [...rowKeysInView];
    const fromKey = rowKeysInView[dragRowIndex];
    const toKey = rowKeysInView[toIndex];
    const from = order.indexOf(fromKey);
    const to = order.indexOf(toKey);
    if (from === -1 || to === -1) {
      const rebuilt = rowKeysInView;
      onPreviewRowOrderChange(reorderList(rebuilt, dragRowIndex, toIndex));
    } else {
      onPreviewRowOrderChange(reorderList(order, from, to));
    }
    this.setState({ dragRowIndex: null });
  }

  setTableHeaders(orderedColumnKeys) {
    const columnNames = orderedColumnKeys.map((col) => col.name);
    return orderedColumnKeys.map((header, index) => (
      <th
        className={`ui table sortable-header dataset-table__header${this.state.dragColumnIndex === index ? " dataset-table__header--dragging" : ""}`}
        key={header.name}
        title={this.getSortTooltip(header.name, header.alias)}
        aria-sort={this.getAriaSort(header.name)}
        onClick={() => this.handleSort(header.name)}
        onContextMenu={(e) => this.openColumnContextMenu(e, header)}
        onDragOver={this.handleColumnDragOver}
        onDrop={(e) => this.handleColumnDrop(e, index, columnNames)}
        style={{ cursor: "pointer" }}
      >
        <div className="header-content">
          <span
            className="dataset-table__drag-grip"
            draggable
            onDragStart={(e) => this.handleColumnDragStart(e, index)}
            onDragEnd={() => this.setState({ dragColumnIndex: null })}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title="Drag to reorder column"
            aria-label="Drag to reorder column"
          />
          <span className="dataset-table__header-label">{header.alias}</span>
          <div className="dataset-table__header-actions">
            <span className="sort-icon-wrap" title={this.getSortTooltip(header.name, header.alias)} aria-hidden>
              {this.getSortIcon(header.name)}
            </span>
            <button
              type="button"
              className="dataset-table__hide-btn"
              title="Hide column"
              aria-label={`Hide column ${header.alias}`}
              onClick={(e) => this.handleHideColumnClick(e, header)}
            >
              <FontAwesomeIcon icon={faEyeSlash} size="sm" aria-hidden />
            </button>
          </div>
        </div>
      </th>
    ));
  }

  sortData(data, columnName, direction) {
    if (!columnName) return data;

    return [...data].sort((a, b) => {
      let aVal = a[columnName];
      let bVal = b[columnName];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === "asc" ? 1 : -1;
      if (bVal == null) return direction === "asc" ? -1 : 1;

      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (direction === "asc") {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      }
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    });
  }

  getDefaultMunicipalitySortColumn(rows, geographyColumn) {
    if (!geographyColumn || !rows || rows.length === 0) return null;

    const candidateColumns = ["muni_id"];
    return (
      candidateColumns.find((columnName) =>
        rows.some((row) => row && row[columnName] !== undefined && row[columnName] !== null),
      ) || null
    );
  }

  onPageNumberUpdate(newPage, numberOfPages) {
    const asInt = parseInt(newPage, 10);
    this.setState({ inputPageNum: Number.isNaN(asInt) ? "" : asInt });
    if (this.isValidPageNumber(asInt, numberOfPages)) {
      this.props.updatePage(asInt);
    }
  }

  onPageNumberBlur(numberOfPages) {
    if (!this.state.inputPageNum) {
      this.setState({ inputPageNum: this.props.currentPage });
    } else if (this.state.inputPageNum < 1) {
      this.props.updatePage(1);
      this.setState({ inputPageNum: 1 });
    } else if (this.state.inputPageNum > numberOfPages) {
      this.props.updatePage(numberOfPages);
      this.setState({ inputPageNum: numberOfPages });
    }
  }

  isValidPageNumber(page, numberOfPages) {
    return page && page > 0 && page <= numberOfPages;
  }

  render() {
    const {
      columnKeys = [],
      currentPage = 1,
      queryYearColumn = "",
      rows = [],
      rowsPerPage = 25,
      selectedColumns = [],
      selectedYears = [],
      selectedGeographies = [],
      geographyColumn = null,
      linkRowsToDatasetView = false,
      updatePage,
      updateSelectedColumns,
      previewColumnOrder = [],
      previewRowOrder = [],
      onPreviewColumnOrderChange,
      onPreviewRowOrderChange,
      onResetPreviewLayout,
    } = this.props;
    const { sortColumn, sortDirection, inputPageNum, contextMenu, dragRowIndex } = this.state;

    const orderedColumnKeys = orderColumnKeys(columnKeys, selectedColumns, previewColumnOrder);

    // Avoid a broken table (row drag gutter only) when all columns are deselected.
    if (columnKeys.length > 0 && orderedColumnKeys.length === 0) {
      const showRowPreviewControls = Boolean(updateSelectedColumns || onPreviewRowOrderChange);
    const canCustomizeLayout = Boolean(
        showRowPreviewControls || onPreviewColumnOrderChange,
      );
      const defaultColumnNames = orderedColumnKeys.map((col) => col.name);
      const columnOrderCustom =
        previewColumnOrder.length > 0 && previewColumnOrder.join("|") !== defaultColumnNames.join("|");
      const hasPreviewCustomization = columnOrderCustom || previewRowOrder.length > 0;
      const isEmbedView = new URLSearchParams(location.search).get("embed") === "1";

      return (
        <div className="table-wrapper">
          <DatasetTableContextMenu menu={contextMenu} onClose={this.closeContextMenu} />
          {canCustomizeLayout && hasPreviewCustomization && onResetPreviewLayout ? (
            <div className="dataset-table-preview-toolbar">
              <button type="button" className="dataset-table-preview-toolbar__reset" onClick={onResetPreviewLayout}>
                Reset table layout
              </button>
            </div>
          ) : null}
          <div className="container tight">
            <div className="scroll-horizontal-rotated ui lift">
              <div className="cancel-rotate">
                <div className={`table-container${!isEmbedView && rowsPerPage <= 25 ? "" : " vertical-scroll"}`}>
                  <table
                    className="ui sortable unstackable selectable compact table ember-view sticky-header-table dataset-table--preview dataset-table--empty"
                    role="presentation"
                  >
                    <tbody>
                      <tr>
                        <td className="dataset-table-empty-state" role="status" colSpan={1}>
                          <p className="dataset-table-empty-state__title">No columns selected</p>
                          <p className="dataset-table-empty-state__hint">
                            Choose one or more columns with the column picker in the header to view the table.
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const renderedHeaders = this.setTableHeaders(orderedColumnKeys);
    const selectedYearsSet = new Set(selectedYears);

    let allRows;
    if (queryYearColumn) {
      allRows = rows.filter((row) => selectedYearsSet.has(row[queryYearColumn]));
    } else {
      allRows = rows;
    }

    if (geographyColumn) {
      if (selectedGeographies && selectedGeographies.length > 0) {
        const geoSet = new Set(selectedGeographies);
        allRows = allRows.filter((row) => geoSet.has(row[geographyColumn]));
      } else {
        allRows = [];
      }
    }

    const defaultMunicipalitySortColumn = this.getDefaultMunicipalitySortColumn(allRows, geographyColumn);
    const effectiveSortColumn = sortColumn || defaultMunicipalitySortColumn;
    const effectiveSortDirection = sortColumn ? sortDirection : "asc";
    const sortedRows = this.sortData(allRows, effectiveSortColumn, effectiveSortDirection);

    const showRowDragControls = Boolean(
      !linkRowsToDatasetView && (updateSelectedColumns || onPreviewRowOrderChange),
    );
    const showRowGutter = showRowDragControls || linkRowsToDatasetView;
    const canCustomizeLayout = Boolean(
      showRowDragControls || onPreviewColumnOrderChange,
    );

    const previewRows = applyPreviewRowOrder(sortedRows, previewRowOrder);
    const rowKeysInView = previewRows.map((row, i) => getDatasetRowKey(row, i));

    const dataRows = previewRows.map((row, i) => (
      <DataRow
        key={rowKeysInView[i]}
        rowData={row}
        headers={orderedColumnKeys.map((key) => key.name)}
        linkRowsToDatasetView={linkRowsToDatasetView}
        showRowDragControls={showRowDragControls}
        isDragging={dragRowIndex === i}
        onDragHandleDragStart={(e) => this.handleRowDragStart(e, i)}
        onDragHandleDragEnd={() => this.setState({ dragRowIndex: null })}
        onRowDragOver={this.handleColumnDragOver}
        onRowDrop={(e) => this.handleRowDrop(e, i, rowKeysInView)}
      />
    ));

    const renderedRows = dataRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const firstRecordOnPage = (currentPage - 1) * rowsPerPage + 1;
    const lastRecordOnPage = (currentPage - 1) * rowsPerPage + renderedRows.length;
    const numOfPages = Math.ceil(dataRows.length / rowsPerPage) || 1;
    const backButtonClasses = currentPage === 1 ? "button-wrapper lift disabled" : "button-wrapper lift";
    const forwardButtonClasses = currentPage === numOfPages ? "button-wrapper list disabled" : "button-wrapper lift";
    const isEmbedView = new URLSearchParams(location.search).get("embed") === "1";
    const defaultColumnNames = orderedColumnKeys.map((col) => col.name);
    const columnOrderCustom =
      previewColumnOrder.length > 0 && previewColumnOrder.join("|") !== defaultColumnNames.join("|");
    const hasPreviewCustomization = columnOrderCustom || previewRowOrder.length > 0;

    return (
      <div className="table-wrapper">
        <DatasetTableContextMenu menu={contextMenu} onClose={this.closeContextMenu} />
        {canCustomizeLayout && hasPreviewCustomization && onResetPreviewLayout ? (
          <div className="dataset-table-preview-toolbar">
            <button type="button" className="dataset-table-preview-toolbar__reset" onClick={onResetPreviewLayout}>
              Reset table layout
            </button>
          </div>
        ) : null}
        <div className="container tight">
          <div className="scroll-horizontal-rotated ui lift">
            <div className="cancel-rotate">
              <div className={`table-container${!isEmbedView && rowsPerPage <= 25 ? "" : " vertical-scroll"}`}>
                <table className="ui sortable unstackable selectable compact table ember-view sticky-header-table dataset-table--preview">
                  <thead className="sticky-header">
                    <tr>
                      {showRowGutter && (
                        <th
                          className="dataset-table__gutter"
                          aria-label={linkRowsToDatasetView ? "Open dataset" : "Row controls"}
                        />
                      )}
                      {renderedHeaders}
                    </tr>
                  </thead>
                  <tbody>{renderedRows}</tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="pagination">
            <div className="pagination-count-text">
              Displaying {firstRecordOnPage} to {lastRecordOnPage} of {dataRows.length} records
            </div>
            <div className="pagination-nav-container">
              <div className={backButtonClasses}>
                <button
                  title="First"
                  onClick={() => {
                    currentPage !== 1 && updatePage(1);
                  }}
                  className="datatable__button"
                  type="button"
                >
                  &lt;&lt;
                </button>
                <span className="separator" />
                <button
                  onClick={() => {
                    currentPage !== 1 && updatePage(currentPage - 1);
                  }}
                  title="Previous"
                  className="datatable__button"
                  type="button"
                >
                  &lt;
                </button>
              </div>

              <div className="page-counter">
                <input
                  className="page-number-input"
                  type="number"
                  title="Enter a number to jump to that page"
                  step={1}
                  value={inputPageNum}
                  onChange={(e) => this.onPageNumberUpdate(e.target.value, numOfPages)}
                  onBlur={() => this.onPageNumberBlur(numOfPages)}
                />
                <span className="separator" />
                {numOfPages}
              </div>

              <div className={forwardButtonClasses}>
                <button
                  onClick={() => {
                    currentPage !== numOfPages && updatePage(currentPage + 1);
                  }}
                  title="Next"
                  className="datatable__button"
                  type="button"
                >
                  &gt;
                </button>
                <span className="separator" />
                <button
                  onClick={() => {
                    currentPage !== numOfPages && updatePage(numOfPages);
                  }}
                  title="Last"
                  className="datatable__button"
                  type="button"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

DatasetTable.propTypes = {
  columnKeys: PropTypes.arrayOf(PropTypes.object),
  currentPage: PropTypes.number,
  queryYearColumn: PropTypes.string,
  rows: PropTypes.arrayOf(PropTypes.object),
  rowsPerPage: PropTypes.number,
  selectedColumns: PropTypes.arrayOf(PropTypes.string),
  selectedYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  selectedGeographies: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  geographyColumn: PropTypes.string,
  linkRowsToDatasetView: PropTypes.bool,
  updatePage: PropTypes.func.isRequired,
  updateSelectedColumns: PropTypes.func,
  previewColumnOrder: PropTypes.arrayOf(PropTypes.string),
  previewRowOrder: PropTypes.arrayOf(PropTypes.string),
  onPreviewColumnOrderChange: PropTypes.func,
  onPreviewRowOrderChange: PropTypes.func,
  onResetPreviewLayout: PropTypes.func,
};

export default DatasetTable;

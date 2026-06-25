import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faChevronDown,
  faEyeSlash,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";

import DataRow from "./DataRow";
import DatasetTableContextMenu from "./DatasetTableContextMenu";
import FilterCreationModal from "./FilterCreationModal"
import {
  applyPreviewRowOrder,
  getDatasetRowKey,
  getHiddenColumnMarkerLabel,
  getPreviewTableColumnSegments,
  isVisibleColumnOrderCustom,
  mergeVisibleColumnReorder,
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
      filterModalOpen: false,
      filterModalColumn: null,
    };
    this.handleSort = this.handleSort.bind(this);
    this.onPageNumberUpdate = this.onPageNumberUpdate.bind(this);
    this.onPageNumberBlur = this.onPageNumberBlur.bind(this);
    this.closeContextMenu = this.closeContextMenu.bind(this);
    this.openColumnHeaderMenu = this.openColumnHeaderMenu.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.currentPage !== prevProps.currentPage) {
      this.setState({ inputPageNum: this.props.currentPage });
    }
  }

  closeContextMenu() {
    this.setState({ contextMenu: null });
  }

  openColumnHeaderMenu(e, column) {
    e.preventDefault();
    e.stopPropagation();
    const { sortColumn, sortDirection } = this.state;
    const { updateSelectedColumns, selectedColumns } = this.props;
    const rect = e.currentTarget.getBoundingClientRect();
    const isSorted = sortColumn === column.name;
    const sortAscendingNext = !isSorted || sortDirection === "desc";

    const items = [
      {
        label: sortAscendingNext
          ? "Sort this column in ascending order"
          : "Sort this column in descending order",
        icon: sortAscendingNext ? faArrowUp : faArrowDown,
        onSelect: () => this.handleSort(column.name),
      },
    ];

    if (updateSelectedColumns && selectedColumns.includes(column.name)) {
      items.push({
        label: "Hide this column",
        icon: faEyeSlash,
        onSelect: () => updateSelectedColumns(column.name),
      });
    }

    items.push({
      label: "Filter by this column",
      icon: faFilter,
      onSelect: () => this.setState({ 
        filterModalOpen: true,
        filterModalColumn: column,
      }),
    });

    this.setState({
      contextMenu: {
        x: rect.left,
        y: rect.bottom + 4,
        columnName: column.name,
        items,
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

  getHeaderMenuIcon(columnName) {
    const { sortColumn, sortDirection } = this.state;
    if (sortColumn !== columnName) {
      return faChevronDown;
    }
    return sortDirection === "asc" ? faArrowUp : faArrowDown;
  }

  getAriaSort(columnName) {
    const { sortColumn, sortDirection } = this.state;
    if (sortColumn !== columnName) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  handleUnhideHiddenColumns(e, hiddenColumnNames) {
    e.preventDefault();
    e.stopPropagation();
    const { showHiddenColumns } = this.props;
    if (!showHiddenColumns || !hiddenColumnNames?.length) return;
    showHiddenColumns(hiddenColumnNames);
  }

  renderHiddenColumnsMarker(segment, segmentIndex) {
    const { columnKeys } = this.props;
    const { columnNames } = segment;
    const label = getHiddenColumnMarkerLabel(columnNames, columnKeys);
    const markerKey = `hidden-${segmentIndex}-${columnNames.join("|")}`;

    return (
      <th
        key={markerKey}
        className="dataset-table__hidden-columns-marker"
        title={label}
        aria-label={label}
        data-hidden-count={columnNames.length > 1 ? columnNames.length : undefined}
        tabIndex={0}
        onClick={(e) => this.handleUnhideHiddenColumns(e, columnNames)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.handleUnhideHiddenColumns(e, columnNames);
          }
        }}
      >
        <span className="dataset-table__hidden-columns-marker__line" aria-hidden />
      </th>
    );
  }

  renderVisibleHeader(header, visibleIndex, columnNames) {
    const { sortColumn } = this.state;
    const isSorted = sortColumn === header.name;

    return (
      <th
        className={`ui table sortable-header dataset-table__header${this.state.dragColumnIndex === visibleIndex ? " dataset-table__header--dragging" : ""}`}
        key={header.name}
        aria-sort={this.getAriaSort(header.name)}
        onDragOver={this.handleColumnDragOver}
        onDrop={(e) => this.handleColumnDrop(e, visibleIndex, columnNames)}
      >
        <div className="header-content">
          <span
            className="dataset-table__drag-grip"
            draggable
            onDragStart={(e) => this.handleColumnDragStart(e, visibleIndex)}
            onDragEnd={() => this.setState({ dragColumnIndex: null })}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title="Drag to reorder column"
            aria-label="Drag to reorder column"
          />
          <span className="dataset-table__header-label">{header.alias}</span>
          <div className="dataset-table__header-actions">
            <button
              type="button"
              className={`dataset-table__header-menu-btn${isSorted ? " dataset-table__header-menu-btn--sorted" : ""}`}
              title={`Column options for ${header.alias}`}
              aria-label={`Column options for ${header.alias}`}
              aria-haspopup="menu"
              aria-expanded={this.state.contextMenu?.columnName === header.name}
              onClick={(e) => this.openColumnHeaderMenu(e, header)}
            >
              <FontAwesomeIcon icon={this.getHeaderMenuIcon(header.name)} size="sm" aria-hidden />
            </button>
          </div>
        </div>
      </th>
    );
  }

  buildTableHeaderCells(columnSegments, columnNames, showHiddenColumnMarkers) {
    let visibleIndex = 0;

    return columnSegments.flatMap((segment, segmentIndex) => {
      if (segment.type === "hidden") {
        if (!showHiddenColumnMarkers) return [];
        return [this.renderHiddenColumnsMarker(segment, segmentIndex)];
      }

      const cell = this.renderVisibleHeader(segment.column, visibleIndex, columnNames);
      visibleIndex += 1;
      return [cell];
    });
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

    const visibleOrder = previewColumnOrder?.length
      ? previewColumnOrder.filter((name) => columnNames.includes(name))
      : [...columnNames];
    columnNames.forEach((name) => {
      if (!visibleOrder.includes(name)) visibleOrder.push(name);
    });

    const reorderedVisible = reorderList(visibleOrder, dragColumnIndex, toIndex);
    const fullOrder = previewColumnOrder?.length ? previewColumnOrder : [...columnNames];
    const nextOrder = mergeVisibleColumnReorder(fullOrder, columnNames, reorderedVisible);

    onPreviewColumnOrderChange(nextOrder);
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
      rowsPerPage = 10,
      selectedColumns = [],
      selectedYears = [],
      selectedGeographies = [],
      geographyColumn = null,
      linkRowsToDatasetView = false,
      updatePage,
      updateSelectedColumns,
      showHiddenColumns,
      addNewColumnFilter,
      columnFilters,
      previewColumnOrder = [],
      previewRowOrder = [],
      onPreviewColumnOrderChange,
      onPreviewRowOrderChange,
      onResetPreviewLayout,
    } = this.props;
    const { sortColumn, sortDirection, inputPageNum, contextMenu, dragRowIndex } = this.state;

    const orderedColumnKeys = orderColumnKeys(columnKeys, selectedColumns, previewColumnOrder);
    const columnSegments = getPreviewTableColumnSegments(previewColumnOrder, columnKeys, selectedColumns);
    const showHiddenColumnMarkers = Boolean(
      showHiddenColumns && columnSegments.some((segment) => segment.type === "hidden"),
    );
    const hasVisibleColumns = orderedColumnKeys.length > 0;

    // Avoid a broken table (row drag gutter only) when all columns are deselected.
    if (columnKeys.length > 0 && !hasVisibleColumns) {
      const isEmbedView = new URLSearchParams(location.search).get("embed") === "1";

      return (
        <div className="table-wrapper">
          <DatasetTableContextMenu menu={contextMenu} onClose={this.closeContextMenu} />
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

    const visibleColumnNames = orderedColumnKeys.map((col) => col.name);
    const renderedHeaders = this.buildTableHeaderCells(
      columnSegments,
      visibleColumnNames,
      showHiddenColumnMarkers,
    );
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

    if (columnFilters.length > 0) {
      columnFilters.forEach(filter => {
        allRows = allRows.filter(row => {
          const columnValue = row[filter.columnKey];

          if (filter.filterType === 'contains') {
            if (columnValue === null || columnValue === undefined) {
              return false;
            } else {
              const asString = columnValue.toString();
              return asString.includes(filter.textValue.toString());
            }
          } else if (filter.filterType === 'is') {
            if (columnValue === null || columnValue === undefined) {
              return false;
            } else {
              const asString = columnValue.toString();
              return asString === filter.textValue.toString();
            }
          } else if (filter.filterType === 'isEmpty') {
            return columnValue === null || columnValue === undefined || columnValue === '';
          } else if (filter.filterType === 'isNotEmpty') {
            return columnValue == 0 || !!columnValue;
          }
        });
      });
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
        columnSegments={columnSegments}
        showHiddenColumnMarkers={showHiddenColumnMarkers}
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
    const columnOrderCustom = isVisibleColumnOrderCustom(
      previewColumnOrder,
      visibleColumnNames,
      columnKeys,
    );
    const hasPreviewCustomization = columnOrderCustom || previewRowOrder.length > 0;

    return (
      <div className="table-wrapper">
        <DatasetTableContextMenu menu={contextMenu} onClose={this.closeContextMenu} />
        {hasVisibleColumns && canCustomizeLayout && hasPreviewCustomization && onResetPreviewLayout ? (
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
        <FilterCreationModal
          isOpen={this.state.filterModalOpen}
          filterModalColumn={this.state.filterModalColumn}
          handleClose={() => this.setState({ filterModalOpen: false})}
          addNewColumnFilter={addNewColumnFilter}
        />
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
  showHiddenColumns: PropTypes.func,
  addNewColumnFilter: PropTypes.func,
  columnFilters: PropTypes.arrayOf(PropTypes.object),
  previewColumnOrder: PropTypes.arrayOf(PropTypes.string),
  previewRowOrder: PropTypes.arrayOf(PropTypes.string),
  onPreviewColumnOrderChange: PropTypes.func,
  onPreviewRowOrderChange: PropTypes.func,
  onResetPreviewLayout: PropTypes.func,
};

export default DatasetTable;

import React from "react";
import PropTypes from "prop-types";
import DataRow from "./DataRow";

class DatasetTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sortColumn: null,
      sortDirection: 'asc',
      inputPageNum: props.currentPage
    };
    this.handleSort = this.handleSort.bind(this);
    this.onPageNumberUpdate = this.onPageNumberUpdate.bind(this);
    this.onPageNumberBlur = this.onPageNumberBlur.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.currentPage !== prevProps.currentPage) {
      this.setState({ inputPageNum: this.props.currentPage });
    }
  }

  handleSort(columnName) {
    const { sortColumn, sortDirection } = this.state;
    let newDirection = 'asc';
    
    if (sortColumn === columnName) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    this.setState({
      sortColumn: columnName,
      sortDirection: newDirection
    });
  }

  getSortIcon(columnName) {
    const { sortColumn, sortDirection } = this.state;
    if (sortColumn !== columnName) {
      return <span className="sort-icon">↕</span>;
    }
    return sortDirection === 'asc' ? 
      <span className="sort-icon">↑</span> : 
      <span className="sort-icon">↓</span>;
  }

  setTableHeaders(columnKeys) {
    return columnKeys.map((header) => (
      <th 
        className="ui table sortable-header" 
        key={header.alias}
        onClick={() => this.handleSort(header.name)}
        style={{ cursor: 'pointer' }}
      >
        <div className="header-content">
          {header.alias}
          {this.getSortIcon(header.name)}
        </div>
      </th>
    ));
  }

  sortData(data, columnName, direction) {
    if (!columnName) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[columnName];
      let bVal = b[columnName];
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? 1 : -1;
      if (bVal == null) return direction === 'asc' ? -1 : 1;
      
      // Convert to numbers if possible
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }

  getDefaultMunicipalitySortColumn(rows, geographyColumn) {
    if (!geographyColumn || !rows || rows.length === 0) return null;

    const candidateColumns = ["muni_id"];
    return candidateColumns.find((columnName) =>
      rows.some((row) => row && row[columnName] !== undefined && row[columnName] !== null),
    ) || null;
  }

  onPageNumberUpdate(newPage, numberOfPages) {
    const asInt = parseInt(newPage);
    this.setState({ inputPageNum: asInt !== NaN ? asInt : "" });
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
      metadata = [],
      queryYearColumn = "",
      rows = [],
      rowsPerPage = 25,
      selectedColumns = [],
      selectedYears = [],
      selectedGeographies = [],
      geographyColumn = null,
      linkRowsToDatasetView = false,
      updatePage,
      updateRowsPerPage
    } = this.props;
    const { sortColumn, sortDirection, inputPageNum } = this.state;
    // Filter columnKeys based on selectedColumns
    const filteredColumnKeys = columnKeys.filter((col) => selectedColumns.includes(col.name));
    
    const renderedHeaders = this.setTableHeaders(filteredColumnKeys);
    let allRows;
    const selectedYearsSet = new Set(selectedYears);
    
    if (queryYearColumn) {
      allRows = rows.filter((row) => selectedYearsSet.has(row[queryYearColumn]));
    } else {
      allRows = rows;
    }

    // Apply geography filter if configured
    if (geographyColumn) {
      if (selectedGeographies && selectedGeographies.length > 0) {
        const geoSet = new Set(selectedGeographies);
        allRows = allRows.filter((row) => geoSet.has(row[geographyColumn]));
      } else {
        // If no geographies are selected, show zero rows
        allRows = [];
      }
    }
    
    // Apply sorting (default municipal datasets to municipality ID)
    const defaultMunicipalitySortColumn = this.getDefaultMunicipalitySortColumn(allRows, geographyColumn);
    const effectiveSortColumn = sortColumn || defaultMunicipalitySortColumn;
    const effectiveSortDirection = sortColumn ? sortDirection : "asc";
    const sortedRows = this.sortData(allRows, effectiveSortColumn, effectiveSortDirection);
    
    // Convert to DataRow components
    const dataRows = sortedRows.map((row, i) => (
      <DataRow
        key={i}
        rowData={row}
        headers={filteredColumnKeys.map((key) => key.name)}
        linkRowsToDatasetView={linkRowsToDatasetView}
      />
    ));

    const renderedRows = dataRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const firstRecordOnPage = (currentPage - 1) * rowsPerPage + 1;
    const lastRecordOnPage = (currentPage - 1) * rowsPerPage + renderedRows.length;
    const numOfPages = Math.ceil(dataRows.length / rowsPerPage);
    const backButtonClasses = currentPage === 1 ? "button-wrapper lift disabled" : "button-wrapper lift";
    const forwardButtonClasses = currentPage === numOfPages ? "button-wrapper list disabled" : "button-wrapper lift";
    return (
      <div className="table-wrapper">
        <div className="container tight">
          <div className="scroll-horizontal-rotated ui lift">
            <div className="cancel-rotate">
              <div className="table-container">
                <table className="ui sortable unstackable selectable compact table ember-view sticky-header-table">
                  <thead className="sticky-header">
                    <tr>{renderedHeaders}</tr>
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
  metadata: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.object), PropTypes.objectOf(PropTypes.object)]),
  queryYearColumn: PropTypes.string,
  rows: PropTypes.arrayOf(PropTypes.object),
  rowsPerPage: PropTypes.number,
  selectedColumns: PropTypes.arrayOf(PropTypes.string),
  selectedYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  selectedGeographies: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  geographyColumn: PropTypes.string,
  linkRowsToDatasetView: PropTypes.bool,
  updatePage: PropTypes.func.isRequired,
  updateRowsPerPage: PropTypes.func.isRequired,
};

export default DatasetTable;

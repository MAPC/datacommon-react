import React from "react";
import PropTypes from "prop-types";
import DataRow from "./DataRow";

class DatasetTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sortColumn: null,
      sortDirection: 'asc'
    };
    this.handleSort = this.handleSort.bind(this);
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

  render() {
    const { columnKeys = [], currentPage = 1, metadata = [], queryYearColumn = "", rows = [], selectedYears = [], updatePage } = this.props;
    const { sortColumn, sortDirection } = this.state;
    
    const renderedHeaders = this.setTableHeaders(columnKeys);
    let allRows;
    const selectedYearsSet = new Set(selectedYears);
    
    if (queryYearColumn) {
      allRows = rows.filter((row) => selectedYearsSet.has(row[queryYearColumn]));
    } else {
      allRows = rows;
    }
    
    // Apply sorting
    const sortedRows = this.sortData(allRows, sortColumn, sortDirection);
    
    // Convert to DataRow components
    const dataRows = sortedRows.map((row, i) => 
      <DataRow key={i} rowData={row} headers={columnKeys.map((key) => key.name)} />
    );

    const renderedRows = dataRows.slice((currentPage - 1) * 50, currentPage * 50);
    const numOfPages = Math.ceil(dataRows.length / 50);
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
            <div className={backButtonClasses}>
              <button
                onClick={(e) => {
                  currentPage !== 1 ? updatePage(e, "Beginning") : null;
                }}
                className="datatable__button"
              >
                &lt;&lt;
              </button>
              <span className="separator" />
              <button
                onClick={(e) => {
                  currentPage !== 1 ? updatePage(e, "Backward") : null;
                }}
                className="datatable__button"
              >
                &lt;
              </button>
            </div>

            <div className="page-counter">
              {currentPage}
              <span className="separator" />
              {numOfPages}
            </div>

            <div className={forwardButtonClasses}>
              <button
                onClick={(e) => {
                  currentPage !== numOfPages ? updatePage(e, "Forward") : null;
                }}
                className="datatable__button"
              >
                &gt;
              </button>
              <span className="separator" />
              <button
                onClick={(e) => {
                  currentPage !== numOfPages ? updatePage(e, "End", numOfPages) : null;
                }}
                className="datatable__button"
              >
                &gt;&gt;
              </button>
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
  selectedYears: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  updatePage: PropTypes.func.isRequired,
};

export default DatasetTable;

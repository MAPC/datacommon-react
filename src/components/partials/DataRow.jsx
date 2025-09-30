import React from "react";

const DataRow = ({ headers, rowData }) => {
  const formatValue = (value) => {
    // Check if the value is a number and has decimal places
    if (typeof value === 'number' && value % 1 !== 0) {
      return value.toFixed(2);
    }
    
    // Check if the value is a string that represents a decimal number
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed % 1 !== 0) {
        return parsed.toFixed(2);
      }
    }
    
    return value;
  };

  const renderedRow = headers.filter((header) => header !== "seq_id").map((header) => <td key={header}>{formatValue(rowData[header])}</td>);
  return <tr>{renderedRow}</tr>;
};

export default DataRow;

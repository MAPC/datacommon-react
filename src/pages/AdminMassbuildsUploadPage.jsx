import { faDownload, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import Papa from 'papaparse';
import { useMemo, useState } from "react";
import styled from "styled-components"

const PageContainer = styled.div`
  padding: 0px 30px;
  width: calc(100% - 200px);
  max-width: calc(100% - 220px);
`;

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderMessage = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #111111;
  padding-bottom: 24px;
`;

const AdminButton = styled.button`
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid #222222;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 18px;

  &:hover {
    background-color: #f8f8f8;
  }

  &:disabled {
    background-color: #777777;
    color: black;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #721414;
  font-size: 16px;
`;

const FileUploadInput = styled.input`
  margin-bottom: 12px;
`;

const TableContainer = styled.div`
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 450px;
  overflow: auto;
  margin-bottom: 12px;
`;

const UploadedDataTable = styled.table`
  width: 100%;
  max-width: 100%;
  overflow: auto;
  border-collapse: separate;
`;

const UploadedDataHeader = styled.thead`
  top: 0px;
  position: sticky;
  background-color: white;
  z-index: 10;
`;

const HeaderCell = styled.th`
  border: 1px solid black;
  padding: 4px 8px;
`;

const TableCell = styled.td`
  border: 1px solid black;
  padding: 4px 8px;
`;

const StatusBlock = styled.div`
  display: flex;
  justify-content: center;
  border: 1px solid #333333;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
`;

const ActionsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
`;

const COLUMN_WIDTHS = {
  'name': '250px',
  'descr': '600px',
  'address': '300px',
};

// list of all columns in the db
// const columns = [
//   'rdv', 'asofright', 'ovr55', 'clusteros', 'phased', 'stalled', 'name',
//   'status', 'descr', 'prj_url', 'address', 'state', 'zip_code', 'height',
//   'stories', 'year_compl', 'prjarea', 'singfamhu', 'smmultifam', 'lgmultifam', 'hu',
//   'gqpop', 'rptdemp', 'commsf', 'hotelrms', 'onsitepark', 'total_cost', 'ret_sqft',
//   'ofcmd_sqft', 'indmf_sqft', 'whs_sqft', 'rnd_sqft', 'ei_sqft', 'other_sqft', 'hotel_sqft',
//   'other_rate', 'affordable', 'latitude', 'longitude', 'parcel_id', 'mixed_use', 'point',
//   'programs', 'forty_b', 'residential', 'commercial', 'created_at', 'updated_at', 'municipal',
//   'devlper', 'yrcomp_est', 'units_1bd', 'units_2bd', 'units_3bd', 'affrd_unit', 'aff_u30',
//   'aff_30_50', 'aff_50_80', 'aff_80p', 'headqtrs', 'park_type', 'publicsqft', 'unknownhu',
//   'aff_unknown', 'unk_sqft', 'loc_id', 'parcel_fy', 'd_n_trnsit', 'rpa_name', 'county',
//   'nhood', 'n_transit', 'flag', 'mepa_id', 'traffic_count_data', 'mepa_id_present', 'traffic_count_data_present'
// ];

// Removed fields that are always null in the DB:
//   - other_rate, affordable, parcel_id, programs, d_n_trnsit, traffic_count_data
// Removed fields that are always derived on the backend:
//   - point, created_at, updated_at, loc_id, rpa_name, n_transit, deleted_at,
// TODO: 
//   - fourty_b, residential, commercial - Always null in the DB but filled in in spreadsheet
const FILTERED_COLUMNS = [
  'rdv', 'asofright', 'ovr55', 'clusteros', 'phased', 'stalled', 'name',
  'status', 'descr', 'prj_url', 'address', 'state', 'zip_code', 'height',
  'stories', 'year_compl', 'prjarea', 'singfamhu', 'smmultifam', 'lgmultifam', 'hu',
  'gqpop', 'rptdemp', 'commsf', 'hotelrms', 'onsitepark', 'total_cost', 'ret_sqft',
  'ofcmd_sqft', 'indmf_sqft', 'whs_sqft', 'rnd_sqft', 'ei_sqft', 'other_sqft', 'hotel_sqft',
  'latitude', 'longitude', 'mixed_use',
  'forty_b', 'residential', 'commercial', 'municipal',
  'devlper', 'yrcomp_est', 'units_1bd', 'units_2bd', 'units_3bd', 'affrd_unit', 'aff_u30',
  'aff_30_50', 'aff_50_80', 'aff_80p', 'headqtrs', 'park_type', 'publicsqft', 'unknownhu',
  'aff_unknown', 'unk_sqft', 'parcel_fy', 'county',
  'nhood', 'flag', 'mepa_id'
];

const REQUIRED_COLUMNS = ['name', 'status', 'descr', 'address', 'state', 'municipal', 'year_compl', 'yrcomp_est'];

const AdminMassbuildsUploadPage = () => {
  const [parsedRows, setParsedRows] = useState(null);
  const [topLevelError, setTopLevelError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({});
  const [uploading, setUploading] = useState(false);

  const warningsByRow = useMemo(() => {
    if (!parsedRows) {
      return {};
    }

    const warnings = {};
    parsedRows.forEach((row, idx) => {
      // create warnings for missing columns
      const missingColumns = [];
      REQUIRED_COLUMNS.forEach((requiredCol) => {
        if (row[requiredCol] === null || row[requiredCol] === undefined) {
          missingColumns.push(requiredCol);
        }
      });
      if (missingColumns.length > 0) {
        warnings[idx] = `Row is missing required columns - ${missingColumns.join(", ")}`;
      }
    });

    return warnings;
  }, [parsedRows]);

  const handleDownloadTemplateFile = () => {
    const blob = new Blob([FILTERED_COLUMNS], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "massbuilds_upload_template.csv");
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); 
  };

  const handleUploadCsv = (file) => {
    setTopLevelError(null);
    if (!file) {
      setTopLevelError("Unable to read uploaded file");
      return;
    }
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setTopLevelError("Please upload a valid CSV file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        setParsedRows(results.data);
      },
      error: (err) => {
        setTopLevelError(`Parsing error: ${err.message}`);
      }
    });
  };

  const getHeaderWidth = (colName) => {
    const width = COLUMN_WIDTHS[colName];
    return width || 'auto';
  };

  const getStatusForRow = (row, idx) => {
    const warning = warningsByRow[idx];
    if (uploading) {
      const statusObj = uploadStatus[idx];
      if (!statusObj) {
        return (
          <StatusBlock style={{ backgroundColor: '#9f9f9f', color: 'black', maxWidth: '90px' }}>
            In Queue
          </StatusBlock>
        );
      } else if (statusObj.status === 'in-progress') {
        return (
          <StatusBlock style={{ backgroundColor: '#9f9f9f', color: 'black', maxWidth: '90px' }}>
            In Progress..
          </StatusBlock>
        );
      } else if (statusObj.status === 'success') {
        return (
          <StatusBlock style={{ backgroundColor: '#1F4E46', color: 'white', maxWidth: '90px' }}>
            Uploaded
          </StatusBlock>
        );
      } else if (statusObj.status === 'error') {
        return (
          <>
            <StatusBlock style={{ backgroundColor: '#721414', color: 'white', minWidth: '200px' }}>
              <div>Error</div>
            </StatusBlock>
            <div>{statusObj.message}</div>
          </>
        );
      } else {
        return null;
      }
    } else if (warning) {
      return (
        <>
          <StatusBlock style={{ backgroundColor: '#898903', color: 'white', width: '200px' }}>
            Invalid Row
          </StatusBlock>
          <div>{warning}</div>
        </>
      );
    } else {
      return (
        <StatusBlock style={{ backgroundColor: '#1F4E46', color: 'white', maxWidth: '90px' }}>
          OK
        </StatusBlock>
      );
    }
  };

  const kickOffUploads = async () => {
    setUploading(true);
    for (const [idx, parsedRow] of parsedRows.entries()) {
      setUploadStatus(oldStatus => {
        const newStatus = { ...oldStatus };
        newStatus[idx] = { status: 'in-progress' };
        return newStatus;
      });

      try {
        const updatedRow = updateRowValues(parsedRow);
        const resp = await axios.post('/api/massbuilds/upsert', updatedRow);
        // TODO: what if response is not "ok"? It shouldn't be
        if (resp.data === "ok") {
          setUploadStatus(oldStatus => {
            const newStatus = { ...oldStatus };
            newStatus[idx] = { status: 'success' };
            return newStatus;
          });
        }
      } catch (err) {
        const message = err?.response?.data || err?.message || 'unknown error';
        setUploadStatus(oldStatusObj => {
          const newStatus = { ...oldStatusObj };
          newStatus[idx] = { status: 'error', message: message };
          return newStatus;
        });
      }
    }
  };

  const updateRowValues = (parsedRow) => {
    const updatedRow = {};
    Object.entries(parsedRow).forEach(([key, value]) => {
      // don't add null values
      if (value !== null && value !== undefined) {
        // ensure status is lower case:
        if (key === 'status') {
          updatedRow[key] = value.toLowerCase();
        } else {
          updatedRow[key] = value;
        }
      }
    });
    return updatedRow;
  };

  return (
    <PageContainer>
      <HeaderContainer>
        <HeaderMessage>Massbuilds bulk upload</HeaderMessage>
        <AdminButton onClick={() => handleDownloadTemplateFile()}>
          <FontAwesomeIcon icon={faDownload} />
          Download Template
        </AdminButton>
      </HeaderContainer>

      <FileUploadInput 
        type="file" 
        accept=".csv" 
        onChange={(e) => handleUploadCsv(e.target?.files[0])} 
      />

      {topLevelError && <ErrorMessage>{topLevelError}</ErrorMessage>}

      {parsedRows && parsedRows.length > 0 && (
        <TableContainer>
          <UploadedDataTable>
            <UploadedDataHeader>
              <tr style={{ position: 'sticky'}}>
                <HeaderCell>Upload Status</HeaderCell>
                {FILTERED_COLUMNS.map(colName => (
                  <HeaderCell key={colName} style={{ minWidth: getHeaderWidth(colName)}}>
                    {colName}
                  </HeaderCell>
                ))}
              </tr>
            </UploadedDataHeader>
            <tbody>
              {parsedRows.map((parsedRow, idx) => (
                <tr key={idx}>
                  <TableCell>
                    {getStatusForRow(parsedRow, idx)}
                  </TableCell>
                  {FILTERED_COLUMNS.map(colName => (
                    <TableCell key={colName}>{parsedRow[colName]}</TableCell>
                  ))}
                </tr>
              ))}
            </tbody>
          </UploadedDataTable>
        </TableContainer>
      )}

      {parsedRows && parsedRows.length > 0 && (
        <ActionsContainer>
          {warningsByRow && Object.keys(warningsByRow).length > 0 && (
            <div style={{ fontSize: '18px', color: '#721414'}}>
              Please fix the flagged warnings and re-upload the csv before starting ingestion.
            </div>
          )}
          <AdminButton disabled={warningsByRow && Object.keys(warningsByRow).length > 0} onClick={() => kickOffUploads()}>
            <FontAwesomeIcon icon={faUpload} />
            Begin Upload
          </AdminButton>
        </ActionsContainer>
      )}
    </PageContainer>
  );
};

export default AdminMassbuildsUploadPage;
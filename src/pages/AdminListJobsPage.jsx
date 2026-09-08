import axios from "axios";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const AdminJobsContainer = styled.div`
  padding: 0px 30px;
  max-width: calc(100% - 200px);
`;

const JobsHeaderMessage = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #111111;
  padding-bottom: 24px;
`;

const JobsTableContainer = styled.div`
  width: calc(100% - 100px);
  overflow-x: auto;
`;

const JobsTableHeader = styled.tr`
  background: #f1f1f1;
`;

const JobsTableCell = styled.td`
  color: #111111;
  font-size: 15px;
  padding: 4px 12px;
  border: 1px solid #111111;
`;

const JobsTableRow = styled.tr`
`;

const JobStatusCell = styled.div`
  border-radius: 8px;
  padding: 2px 8px;
  display: inline-block;
`;

const GitHubLink = styled.a`
  color: #0909da;

  &:hover {
    color: #0c0c9b
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 60px;
  height: 60px;
  margin-left: 200px;
  margin-top: 20px;
  border: 2px solid #978080;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;


const jobTypeToStyledMap = {
  validation: "Validation",
  repair: "Repair",
  ingestion: "Ingestion",
};

const jobStatusToCellMap = {
  FINISHED: <JobStatusCell style={{ background: "#1F4E46", color: "white"}}>Finished</JobStatusCell>,
  IN_PROGRESS: <JobStatusCell style={{ background: "#d5c834", color: "#111111"}}>In-Progress</JobStatusCell>,
  ERROR: <JobStatusCell style={{ background: "#6d1414", color: "white"}}>Errored</JobStatusCell>,
};

const jobNameToGithubLinkMap = {
  repair_muni_names: 'https://github.com/MAPC/data-validation/blob/main/repair/repair_muni_names.py',
  validate_aggregations: 'https://github.com/MAPC/data-validation/blob/main/validation/validate_aggregations.py',
  validate_muni_names: 'https://github.com/MAPC/data-validation/blob/main/validation/validate_muni_names.py',
};


const AdminListJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);

  useEffect(() => {
    axios.get("/api/jobs")
      .then(res => {
        setJobs(res.data);
        setLoading(false);
      }).catch(err => {
        setJobs([]);
        setLoading(false);
      });
  }, []);

  const toggleRowExpanded = (rowId) => {
    let newRows = [...expandedRows];

    if (expandedRows.includes(rowId)) {
      newRows = newRows.filter(id => id !== rowId);
    } else {
      newRows.push(rowId);
    }

    setExpandedRows(newRows);
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) {
      return 'Unknown time';
    }

    const asDate = new Date(dateString);
    return asDate.toLocaleString();
  };
  
  const formatTopLevelMetadata = (jobRow) => {
    // TODO: add more types here
    if (jobRow.job_name === 'validate_muni_names') {
      const errorCountIsNum = jobRow.metadata?.error_count !== undefined && jobRow.metadata?.error_count !== null;
      return `Errors found: ${errorCountIsNum ? jobRow.metadata?.error_count : 'unknown'}`;
    } else if (jobRow.job_name === 'repair_muni_names') {
      return `Errors detected: ${jobRow.metadata?.errors_detected}, Errors fixed: ${jobRow.metadata?.errors_fixed}`;
    }
  };

  const formatExpandedRow = (jobRow) => {
    // TODO: add more types here
    if (jobRow.job_name === 'validate_muni_names') {
      const hasErrors = jobRow.metadata?.error_count > 0;
      return (
        <>
          <div>{`Tables checked: ${jobRow.metadata?.tables_checked}`}</div>
          {hasErrors && <div>Errors:</div>}
          {hasErrors && jobRow.metadata?.errors.map(error => (
            <div style={{marginLeft: '8px'}}>
              <b>{error.table}</b>
              {` - Expected "${error.expected}" for muni_id (${error.muni_id}) but found "${error.actual}"`}
            </div>
          ))}
        </>
      );
    } else if (jobRow.job_name === 'repair_muni_names') {
      return (
        <>
          <div>{`Tables checked: ${jobRow.metadata?.tables_checked}`}</div>
        </>
      );
    }
  };

  return (
    <AdminJobsContainer>
      <JobsHeaderMessage>
        List of recently run data pipelines 
      </JobsHeaderMessage>
      <JobsTableContainer>
        <table>
          <thead>
            <JobsTableHeader>
              <JobsTableCell style={{ minWidth: '100px' }}>
                Job Type
              </JobsTableCell>
              <JobsTableCell style={{ minWidth: '200px' }}>
                Job Name
              </JobsTableCell>
              <JobsTableCell style={{ minWidth: '120px' }}>
                Status
              </JobsTableCell>
              <JobsTableCell style={{ minWidth: '180px' }}>
                Started at
              </JobsTableCell>
              <JobsTableCell style={{ minWidth: '180px' }}>
                Finished at
              </JobsTableCell>
              <JobsTableCell style={{ minWidth: '300px' }}>
                Comment
              </JobsTableCell>
              <JobsTableCell style={{ minWidth: '300px' }}>
                Extra Info
              </JobsTableCell>
            </JobsTableHeader>
          </thead>
          <tbody>
            {jobs.map(job => (
              <>
                <JobsTableRow key={job.id}>
                  <JobsTableCell>
                    {jobTypeToStyledMap[job.job_type] || 'Unknown'}
                  </JobsTableCell>
                  <JobsTableCell>
                    {jobNameToGithubLinkMap[job.job_name] && (
                      <GitHubLink href={jobNameToGithubLinkMap[job.job_name]} target="_blank">
                        {job.job_name}
                      </GitHubLink>
                    )}
                    {!jobNameToGithubLinkMap[job.job_name] && (
                      <>{job.job_name}</>
                    )}
                  </JobsTableCell>
                  <JobsTableCell>
                    {jobStatusToCellMap[job.status] || 'Unknown'}
                  </JobsTableCell>
                  <JobsTableCell>
                    {formatTimestamp(job.started_at)}
                  </JobsTableCell>
                  <JobsTableCell>
                    {formatTimestamp(job.finished_at)}
                  </JobsTableCell>
                  <JobsTableCell>
                    {job.comment}
                  </JobsTableCell>
                  <JobsTableCell>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      {formatTopLevelMetadata(job)}
                      <div 
                        onClick={() => toggleRowExpanded(job.id)}
                        style={{ fontSize: '20px', top: '-8px', cursor: 'pointer' }}
                      >
                        ⌄
                      </div>
                    </div>
                  </JobsTableCell>
                </JobsTableRow>
                {expandedRows.includes(job.id) && (
                  <JobsTableRow key={`${job.id}_expanded`}>
                    <JobsTableCell colSpan={7}>
                      {formatExpandedRow(job)}
                    </JobsTableCell>
                  </JobsTableRow>
                )}
              </>
            ))}
          </tbody>
        </table>
        {loading && <Spinner />}
      </JobsTableContainer>
    </AdminJobsContainer>
  );
};

export default AdminListJobsPage;
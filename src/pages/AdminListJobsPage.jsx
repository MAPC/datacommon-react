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
  font-size: 16px;
  padding: 4px 12px;
  border: 1px solid #111111;
`;

const JobsTableRow = styled.tr`
`;

const JobStatusCell = styled.div`
  border-radius: 8px;
  padding: 2px 8px;
  display: inline-block;
`

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
}


const AdminListJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const formatTimestamp = (dateString) => {
    if (!dateString) {
      return 'Unknown time';
    }

    const asDate = new Date(dateString);
    return asDate.toLocaleString();
  };
  
  const formatMetadata = (metadataObject) => {
    return (
      <div>
        {Object.entries(metadataObject).map(([key, value]) => {
          if (key === 'errors') {
            let displayValue;
            if (value.length === 0) {
              displayValue = 'none';
            } else {
              displayValue = value.map(errorObject => JSON.stringify(errorObject)).join(', ');
            }
            return <div key={key}>
              {`${key}: ${displayValue}`}
            </div>;
          } else if (key === "error_count") {
            return <></>; // for now skip error count since we have errors array
          } else {
            return <div key={key}>{`${key}: ${value}`}</div>;
          }
         })}
      </div>
    );
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
              <JobsTableCell style={{ minWidth: '200px' }}>
                Started at
              </JobsTableCell>
              <JobsTableCell style={{ minWidth: '200px' }}>
                Finished at
              </JobsTableCell>
              <JobsTableCell style={{ maxWidth: '400px' }}>
                Extra Info
              </JobsTableCell>
              <JobsTableCell style={{ minWidth: '400px' }}>
                Comment
              </JobsTableCell>
            </JobsTableHeader>
          </thead>
          <tbody>
            {jobs.map(job => (
              <JobsTableRow key={job.email}>
                <JobsTableCell>
                  {jobTypeToStyledMap[job.job_type] || 'Unknown'}
                </JobsTableCell>
                <JobsTableCell>
                  {job.job_name}
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
                  {formatMetadata(job.metadata)}
                </JobsTableCell>
                <JobsTableCell>
                  {job.comment}
                </JobsTableCell>
              </JobsTableRow>
            ))}
          </tbody>
        </table>
        {loading && <Spinner />}
      </JobsTableContainer>
    </AdminJobsContainer>
  );
};

export default AdminListJobsPage;
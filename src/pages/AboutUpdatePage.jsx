import React, { useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useAirtableCMS } from "@mapc/airtable-cms";

const ErrorContainer = styled.div`
  padding: 1rem;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
`;

const ErrorTitle = styled.p`
  margin: 0;
  font-weight: bold;
`;

const ErrorMessage = styled.p`
  margin: 0.5rem 0 0 0;
`;

const LogsContainer = styled.div`
  margin-top: 2rem;
`;

const LogItem = styled.div`
  margin-bottom: 1.5rem;
`;

const LogTitle = styled.div`
  font-weight: bold;
  margin-bottom: 0.35rem;
  font-size: 1rem;
`;

const LogDate = styled.div`
  font-weight: 400;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: #666;
`;

const LogDescription = styled.div`
  margin-left: 0;
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
`;

const SpinningIcon = styled(FontAwesomeIcon)`
  animation: ${spin} 1s linear infinite;
  font-size: 1.25rem;
  color: #6fc68e;
`;

const LoadingText = styled.span`
  font-size: 1rem;
  color: #1f4e46;
`;

const AboutUpdatePage = () => {
  const response = useAirtableCMS({
    tableName: "Feature Update Logs",
    fieldMapping: {
      description: "Description",
      title: "Title",
      updateDate: "Update Date"
    },
    sortBy: (a, b) => {
      // Sort by date descending (newest first)
      const dateA = a.updateDate ? new Date(a.updateDate) : null;
      const dateB = b.updateDate ? new Date(b.updateDate) : null;
      
      if (dateA && dateB) {
        return dateB - dateA;
      } else if (dateA) {
        return -1;
      } else if (dateB) {
        return 1;
      }
      // If no date, maintain original order
      return 0;
    },
    asList: true,
  });

  const logsData = response.data;
  const loading = !response.metadata.done;
  const error = response.metadata.error;
  /**
   * Transform logs to include dateObj for sorting and ensure we have an array
   * @returns {Array} logs with dateObj
   */
  const logs = useMemo(() => {
    if (!logsData || !Array.isArray(logsData)) {
      return [];
    }
    
    return logsData.map((log) => {
      const updateDate = log.updateDate || "";
      const dateObj = updateDate ? new Date(updateDate) : null;
      
      return {
        ...log,
        id: log.recordId || log.description || `log-${Math.random()}`, // Use recordId from Airtable, fallback to description
        title: (log.title ?? "").trim(),
        description: log.description || "",
        updateDate: updateDate,
        dateObj: dateObj,
      };
    });
    // Note: sorting is already done by the hook's sortBy function
  }, [logsData]);

  /**
   * Handle error state with user-friendly message
   * @returns {string} error message
   */
  const errorMessage = useMemo(() => {
    if (!error) return null;
    
    // Convert technical errors to user-friendly messages
    if (error.message) {
      if (error.message.includes("401") || error.message.includes("403")) {
        return "Unable to access update information. Please try again later.";
      } else if (error.message.includes("404")) {
        return "Update information is currently unavailable.";
      } else if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
        return "Our servers are experiencing issues. Please try again in a few moments.";
      }
    }
    
    return "Something went wrong while loading updates. Please try again later.";
  }, [error]);


  /**
   * string to date
   * @param {*} dateString 
   * @returns {string} date string in M/D/YYYY format
   */
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid date
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  return (
    <section className="page page--about-update">
      <div className="page-header">
        <div className="container tight">
          <h1>Update Log</h1>
        </div>
      </div>
      <section className="page-section container">
        {loading && (
          <LoadingContainer>
            <SpinningIcon icon={faSpinner} />
            <LoadingText>Loading updates...</LoadingText>
          </LoadingContainer>
        )}
        {errorMessage && (
          <ErrorContainer>
            <ErrorTitle>Unable to Load Updates</ErrorTitle>
            <ErrorMessage>{errorMessage}</ErrorMessage>
          </ErrorContainer>
        )}
        {!loading && !errorMessage && logs.length > 0 && (
          <LogsContainer className="update-logs-container">
            {logs.map((log) => {
              const titleText = (log.title ?? "").trim();
              const hasDate = Boolean(log.updateDate);
              return (
                <LogItem key={log.id}>
                  {titleText ? (
                    <LogTitle>{titleText}</LogTitle>
                  ) : hasDate ? (
                    <LogTitle>{formatDate(log.updateDate)}</LogTitle>
                  ) : null}
                  {titleText && hasDate ? (
                    <LogDate>Updated {formatDate(log.updateDate)}</LogDate>
                  ) : null}
                  <LogDescription>{log.description}</LogDescription>
                </LogItem>
              );
            })}
          </LogsContainer>
        )}
        {!loading && !errorMessage && logs.length === 0 && (
          <p>No update logs found.</p>
        )}
      </section>
    </section>
  );
};

export default AboutUpdatePage;


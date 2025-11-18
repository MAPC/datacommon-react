import React from "react";
import { useAirtableCMS } from "@mapc/airtable-cms";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const AboutOverviewPage = () => {
  const updateLogsResponse = useAirtableCMS({
    tableName: "Feature Update Logs",
    fieldMapping: {
      description: "Description",
      updateDate: "Update Date"
    },
    sortBy: (a, b) => {
      const dateA = a.updateDate ? new Date(a.updateDate) : null;
      const dateB = b.updateDate ? new Date(b.updateDate) : null;
      
      if (dateA && dateB) {
        return dateB - dateA;
      } else if (dateA) {
        return -1;
      } else if (dateB) {
        return 1;
      }
      return 0;
    },
    asList: true,
  });

  const majorReleaseResponse = useAirtableCMS({
    tableName: "Major Release",
    fieldMapping: {
      title:"Title",
      showTitle:"Show Title",
      content: "Content",
      order: "Order"
    },
    sortBy: (a, b) => {
      const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999;
      const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999;
      return orderA - orderB;
    },
    asList: true,
  });

  const logsData = updateLogsResponse.data;
  const loading = !updateLogsResponse.metadata.done;
  const error = updateLogsResponse.metadata.error;

  const majorReleaseData = majorReleaseResponse.data;
  const majorReleaseLoading = !majorReleaseResponse.metadata.done;
  const majorReleaseError = majorReleaseResponse.metadata.error;


  const logs = (() => {
    if (!logsData || !Array.isArray(logsData)) {
      return [];
    }
    
    return logsData.map((log) => {
      const updateDate = log.updateDate || "";
      const dateObj = updateDate ? new Date(updateDate) : null;
      
      return {
        id: log.recordId || log.description || `log-${Math.random()}`,
        description: log.description || "",
        updateDate: updateDate,
        dateObj: dateObj,
        ...log,
      };
    });
  })();

  const majorReleases = (() => {
    if (!majorReleaseData) {
      return [];
    }
    
    if (!Array.isArray(majorReleaseData)) {
      // Try to convert object to array if it's an object
      if (typeof majorReleaseData === 'object') {
        const asArray = Object.values(majorReleaseData);
        if (Array.isArray(asArray) && asArray.length > 0) {
          return asArray.map((release) => {
            return {
              id: release.recordId || `release-${Math.random()}`,
              title: release.title || "",
              showTitle: release.showTitle === true || release.showTitle === "true" || release.showTitle === 1,
              content: release.content || "",
              order: release.order !== undefined && release.order !== null ? Number(release.order) : 999,
              ...release,
            };
          }).filter(release => release.content && release.content.trim().length > 0);
        }
      }
      return [];
    }
    
    if (majorReleaseData.length === 0) {
      return [];
    }
    
    const releases = majorReleaseData.map((release) => {
      return {
        id: release.recordId || release.id || `release-${Math.random()}`,
        title: release.title || "",
        showTitle: release.showTitle === true || release.showTitle === "true" || release.showTitle === 1,
        content: release.content || "",
        order: release.order !== undefined && release.order !== null ? Number(release.order) : 999,
        ...release,
      };
    });
    
    // Filter out releases with empty content
    const filtered = releases.filter(release => {
      const hasContent = release.content && release.content.trim().length > 0;
      return hasContent;
    });
    return filtered;
  })();

  const majorReleaseErrorMessage = (() => {
    if (!majorReleaseError) return null;
    
    // Convert technical errors to user-friendly messages
    if (majorReleaseError.message) {
      if (majorReleaseError.message.includes("401") || majorReleaseError.message.includes("403")) {
        return "Unable to access major release information. Please check table permissions.";
      } else if (majorReleaseError.message.includes("404")) {
        return "Major release table not found. Please check the table name.";
      } else if (majorReleaseError.message.includes("500") || majorReleaseError.message.includes("502") || majorReleaseError.message.includes("503")) {
        return "Our servers are experiencing issues. Please try again in a few moments.";
      }
    }
    
    return "Something went wrong while loading major releases. Please try again later.";
  })();

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  return (
    <section className="page page--about-overview">
      <div className="page-header">
        <div className="container">
          <h1>Overview</h1>
        </div>
      </div>
      <section className="page-section container">
        <div className="columns two about-overview__columns">
          {/* Left Column */}
          <div className="about-overview__left">
            <div className="about-overview__section">
              <h2>About DataCommon</h2>
              <p>
                DataCommon is the Open Data portal that brings together data from the Census Bureau, state agencies, municipalities, and MAPC's work and reformats it
                in a way that makes it easy to see and download town-by-town and regional statistics. The datasets pages allow users to explore data on a specific
                topic for a range of geographies including census tracts, municipalities, counties, regions, and the state. The Community Profile pages provide a
                central location where users can see data describing the population, housing characteristics, economy, transportation patterns, and more for each of
                the 351 cities and towns in Massachusetts. The Gallery section of DataCommon has maps and charts that tell different stories about our region.
              </p>
            </div>

            <div className="about-overview__section">
              <h2>Who we are</h2>
              <p>
                MAPC is the regional planning agency serving the people who live and work in the 101 cities and towns of Greater Boston. MAPC is governed by
                representatives from each city and town in our region, as well as gubernatorial appointees and designees of major public agencies. Through our work on
                regional planning and research, we seek to build a more equitable, sustainable, collaborative, and climate-resilient future for all.
              </p>
              <p>
                This tool and the data published to it are created, cleaned, and maintained by{" "}
                <a href="https://www.mapc.org/our-work/expertise/data-services/" target="_blank" rel="noopener noreferrer">
                  MAPC's Data Services
                </a>{" "}
                team. If you encounter any issues with a dataset or want to see us publish a dataset that is not currently available, please let us know through{" "}
                <a href="https://airtable.com/appqSr3MqAkN1GCfb/pagdcSeY2bc4rblam/form" target="_blank" rel="noopener noreferrer">
                  this form
                </a>
                . If you encounter any issues with the website or want to recommend a new feature that would make the site better for you to use, please let us know
                through{" "}
                <a href="https://airtable.com/appvsTkjC3FUe4yZ1/pagrTq8UqNU1zcrCL/form" target="_blank" rel="noopener noreferrer">
                  this form
                </a>
                . To contact someone on the team about DataCommon email <a href="mailto:datacommon@mapc.org">datacommon@mapc.org</a>.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="about-overview__right">
            {majorReleaseLoading && (
              <div className="about-overview__section">
                <h2>Major Release</h2>
                <div className="about-overview__loading">
                  <FontAwesomeIcon icon={faSpinner} className="about-overview__spinner" />
                  <span>Loading major releases...</span>
                </div>
              </div>
            )}
            {majorReleaseErrorMessage && (
              <div className="about-overview__section">
                <h2>Major Release</h2>
                <div className="about-overview__error">
                  <p><strong>Unable to Load Major Releases</strong></p>
                  <p>{majorReleaseErrorMessage}</p>
                  {process.env.NODE_ENV === 'development' && (
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Debug: {majorReleaseError?.message || JSON.stringify(majorReleaseError)}</p>
                  )}
                </div>
              </div>
            )}
            {!majorReleaseLoading && !majorReleaseError && majorReleases.length > 0 && (
              <div className="about-overview__section">
                <h2>Major Release</h2>
                <div className="about-overview__major-release">
                  {majorReleases.map((release) => (
                    <div key={release.id}>
                      {release.showTitle && release.title && (
                        <h3>{release.title}</h3>
                      )}
                      <p>{release.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="about-overview__section">
              <h2>Update Logs</h2>
              {loading && (
                <div className="about-overview__loading">
                  <FontAwesomeIcon icon={faSpinner} className="about-overview__spinner" />
                  <span>Loading updates...</span>
                </div>
              )}
              {error && (
                <div className="about-overview__error">
                  <p><strong>Unable to Load Updates</strong></p>
                  <p>Something went wrong while loading updates. Please try again later.</p>
                </div>
              )}
              {!loading && !error && logs.length > 0 && (
                <div className="about-overview__logs">
                  {logs.slice(0, 10).map((log) => (
                    <div key={log.id} className="about-overview__log-item">
                      <div className="about-overview__log-date">{formatDate(log.updateDate)}</div>
                      <div className="about-overview__log-description">{log.description}</div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && !error && logs.length === 0 && (
                <p>No update logs found.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
};

export default AboutOverviewPage;

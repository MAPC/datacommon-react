import React from "react";
import ReactMarkdown from "react-markdown";
import { useAirtableCMS } from "@mapc/airtable-cms";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

/** Valid numeric Order from Airtable, or null when missing / not a number */
const parseMajorReleaseOrder = (order) => {
  if (order === null || order === undefined || order === "") return null;
  const n = Number(order);
  return Number.isFinite(n) ? n : null;
};

const parseAboutSectionOrder = (order) => {
  if (order === null || order === undefined || order === "") return null;
  const n = Number(order);
  return Number.isFinite(n) ? n : null;
};


const majorReleaseCreatedTimeMs = (release) => new Date(release.createdTime).getTime();

const AboutOverviewPage = () => {
  const updateLogsResponse = useAirtableCMS({
    tableName: "Feature Update Logs",
    viewName: "All",
    fieldMapping: {
      description: "Description",
      title: "Title",
      createdTime: "Created",
      publishedDate: "Production Date"
    },
    sortBy: (a, b) => {
      const dateA = a.createdTime ? new Date(a.createdTime) : null;
      const dateB = b.createdTime ? new Date(b.createdTime) : null;
      
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
    viewName: "All",
    fieldMapping: {
      title:"Title",
      showTitle:"Show Title",
      content: "Content",
      order: "Order",
      createdTime: "Created time"
    },
    sortBy: (a, b) => {
      const oa = parseMajorReleaseOrder(a.order);
      const ob = parseMajorReleaseOrder(b.order);
      if (oa != null && ob != null) return oa - ob;
      if (oa != null && ob == null) return -1;
      if (oa == null && ob != null) return 1;
      return majorReleaseCreatedTimeMs(b) - majorReleaseCreatedTimeMs(a);
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
      return {
        id: log.recordId || log.description || `log-${Math.random()}`,
        description: log.description || "",
        publishedDate: log.publishedDate || "",
        createdTime: log.createdTime || "",
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

   /**
   * string to date
   * @param {*} dateString 
   * @returns {string} date string in M/D/YYYY format
   */
   const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid date
    
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const aboutPageLeftContent = useAirtableCMS({
    tableName: "Page - About",
    viewName: "Grid view",
    fieldMapping: {
      title: "Title",
      content: "Content",
      order: "Order",
    },
    sortBy: (a, b) => {
      const oa = parseAboutSectionOrder(a.order);
      const ob = parseAboutSectionOrder(b.order);
      if (oa != null && ob != null) return oa - ob;
      if (oa != null && ob == null) return -1;
      if (oa == null && ob != null) return 1;
      return 0;
    },
    asList: true,
  });

  const aboutPageLeftLoading = !aboutPageLeftContent.metadata.done;
  const aboutPageLeftError = aboutPageLeftContent.metadata.error;
  const aboutLeftSections = Array.isArray(aboutPageLeftContent.data)
    ? aboutPageLeftContent.data
        .map((section, index) => ({
          id: section.recordId || `about-left-${index}`,
          title: (section.title || "").trim(),
          content: section.content || "",
        }))
        .filter((section) => section.title || section.content.trim())
    : [];

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
            {aboutPageLeftLoading && (
              <div className="about-overview__section">
                <div className="about-overview__loading">
                  <FontAwesomeIcon icon={faSpinner} className="about-overview__spinner" />
                  <span>Loading about content...</span>
                </div>
              </div>
            )}
            {aboutPageLeftError && (
              <div className="about-overview__section">
                <div className="about-overview__error">
                  <p><strong>Unable to Load About Content</strong></p>
                  <p>Something went wrong while loading this content. Please try again later.</p>
                </div>
              </div>
            )}
            {!aboutPageLeftLoading && !aboutPageLeftError && aboutLeftSections.length > 0 && (
              <>
                {aboutLeftSections.map((section) => (
                  <div key={section.id} className="about-overview__section">
                    {section.title && <h2>{section.title}</h2>}
                    <div className="about-overview__major-release-markdown">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </>
            )}
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
                      <div className="about-overview__major-release-markdown">
                        <ReactMarkdown>{release.content}</ReactMarkdown>
                      </div>
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
                  {logs.slice(0, 10).map((log) => {
                    const titleText = (log.title ?? "").trim();
                    const hasDate = Boolean(log.publishedDate);
                    return (
                      <div key={log.id} className="about-overview__log-item">
                        {titleText ? (
                          <div className="about-overview__log-title">{titleText}</div>
                        ) : hasDate ? (
                          <div className="about-overview__log-title">{formatDate(log.publishedDate)}</div>
                        ) : null}
                        {titleText && hasDate ? (
                          <div className="about-overview__log-meta">Published {formatDate(log.publishedDate)}</div>
                        ) : null}
                        <div className="about-overview__log-description">
                          <ReactMarkdown>{log.description}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
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

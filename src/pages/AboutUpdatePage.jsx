import React, { useEffect, useState } from "react";

const AboutUpdatePage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAirtableData = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
        const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
        const tableName = "Feature Update Logs";

        if (!baseId || !apiKey) {
          throw new Error("Unable to load update information. Please contact support if this issue persists.");
        }

        // Fetch all records with pagination support
        const allRecords = [];
        let offset = null;

        do {
          // Build URL with pagination
          let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?pageSize=100`;
          if (offset) {
            url += `&offset=${offset}`;
          }

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (!response.ok) {
            // Convert technical errors to user-friendly messages
            if (response.status === 401 || response.status === 403) {
              throw new Error("Unable to access update information. Please try again later.");
            } else if (response.status === 404) {
              throw new Error("Update information is currently unavailable.");
            } else if (response.status >= 500) {
              throw new Error("Our servers are experiencing issues. Please try again in a few moments.");
            } else {
              throw new Error("Unable to load updates at this time. Please try again later.");
            }
          }

          const data = await response.json();
          allRecords.push(...data.records);
          offset = data.offset || null;
        } while (offset);

        // Transform Airtable records to our format
        const transformedLogs = allRecords
          .map((record) => {
            const updateDate = record.fields["Update Date"] || "";
            // Parse date string to Date object for sorting
            let dateObj = null;
            if (updateDate) {
              dateObj = new Date(updateDate);
            }
            
            return {
              id: record.id,
              description: record.fields["Description"] || "",
              updateDate: updateDate,
              dateObj: dateObj,
              order: record.fields["Order"] || 0,
              ...record.fields, // Include all other fields
            };
          })
          .sort((a, b) => {
            // Sort by date descending (newest first), fallback to order if no date
            if (a.dateObj && b.dateObj) {
              return b.dateObj - a.dateObj;
            } else if (a.dateObj) {
              return -1;
            } else if (b.dateObj) {
              return 1;
            }
            return (b.order || 0) - (a.order || 0);
          });

        setLogs(transformedLogs);
      } catch (err) {
        console.error("Error fetching Airtable data:", err);
        const userMessage = "Something went wrong while loading updates. Please try again later.";
        setError({ message: userMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchAirtableData();
  }, []);


  // Format date to M/D/YYYY format
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
    <section className="page page--about-update container">
      <h1>Update Log</h1>
      {loading && <p>Loading updates...</p>}
      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: "4px", color: "#c33" }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>Unable to Load Updates</p>
          <p style={{ margin: "0.5rem 0 0 0" }}>{error.message}</p>
        </div>
      )}
      {!loading && !error && logs.length > 0 && (
        <div 
          style={{ marginTop: "2rem" }}
          className="update-logs-container"
        >
          {logs.map((log) => (
            <div key={log.id} style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: "bold", marginBottom: "0.5rem", fontSize: "1rem" }}>
                {formatDate(log.updateDate)}
              </div>
              <div style={{ marginLeft: 0 }}>
                {log.description}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && !error && logs.length === 0 && (
        <p>No update logs found.</p>
      )}
    </section>
  );
};

export default AboutUpdatePage;


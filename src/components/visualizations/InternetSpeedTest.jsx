import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";
import locations from "../../constants/locations";
import { fetchDatasets } from "../../reducers/datasetSlice";
import DownloadChartImageButton from "../field/DownloadChartImageButton";

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 0.75rem;
`;

const ActionButton = styled.button`
  background: transparent;
  border: 1px solid #555555;
  border-radius: 4px;
  color: #555555;
  cursor: pointer;
  font-family: "skolar-sans-latin", Helvetica, sans-serif;
  font-weight: 400;
  font-size: 12px;
  padding: 4px 8px;

  &:hover {
    color: #6fc68e;
    border-color: #6fc68e;
  }

  i, span {
    color: inherit;
    font-size: 14px;
  }
`;

const InternetSpeedTest = ({ municipalityName, onViewData }) => {
  const [stats, setStats] = useState(null);
  const [hasNoData, setHasNoData] = useState(false);
  const rowsRef = useRef(null);
  const chartWrapperRef = useRef(null);
  const dispatch = useDispatch();
  const { cache: datasets, status } = useSelector((state) => state.dataset);

  // Ensure dataset metadata (including source) is loaded from _data_browser
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDatasets());
    }
  }, [status, dispatch]);

  useEffect(() => {
    if (!municipalityName) {
      setStats(null);
      setHasNoData(false);
      return;
    }

    const normalize = (v) => String(v ?? "").trim().toLowerCase();
    const matchName = normalize(municipalityName);

    const findAndSet = (rows) => {
      const matching = rows.filter((r) => normalize(r.muni_name) === matchName);
      if (!matching.length) {
        setStats(null);
        setHasNoData(true);
        return;
      }
      const row = matching.reduce((latest, current) => {
        const latestYear = Number(latest.year);
        const currentYear = Number(current.year);
        return Number.isNaN(currentYear) || currentYear <= latestYear ? latest : current;
      }, matching[0]);

      const na = (v) => v == null || String(v).trim().toUpperCase() === "NA" || String(v).trim() === "";
      const num = (v) => (na(v) ? null : Number(v));

      setStats({
        year: num(row.year),
        med_down: num(row.med_down),
        med_up: num(row.med_up),
        d_100p: num(row.d_100p),
        u_20p: num(row.u_20p),
      });
      setHasNoData(false);
    };

    if (rowsRef.current) {
      findAndSet(rowsRef.current);
      return;
    }

    const apiBase = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&schema=tabular&table=internet_speed_test_m`;
    const escapedName = municipalityName.replace(/'/g, "''");
    const query = `${apiBase}&columns=muni_name,year,med_down,med_up,d_100p,u_20p&filters=muni_name:${escapedName}`;

    fetch(query)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        const rows = payload?.rows || [];
        rowsRef.current = rows;
        findAndSet(rows);
      })
      .catch((error) => {
        console.error("Failed to load internet_speed_test_m data", error);
        setStats(null);
        setHasNoData(true);
      });
  }, [municipalityName]);

  // While loading (no stats and no explicit no-data), render nothing
  if (!stats && !hasNoData) {
    return null;
  }

  const speedTestDataset = datasets.find((d) => Number(d.seq_id) === 499);
  const sourceLabel = speedTestDataset?.source || "N/A";

  const handleViewDataClick = () => {
    if (!onViewData || !rowsRef.current || rowsRef.current.length === 0) return;
    // Pass the backing table so `DataTableModal` can fetch column aliases for header labels.
    onViewData(rowsRef.current, "Internet Speed Test (Municipal)", "tabular.internet_speed_test_m");
  };

  const handleDownloadDataClick = () => {
    if (!rowsRef.current || rowsRef.current.length === 0) return;
    const data = rowsRef.current;
    const headers = Object.keys(data[0]);
    const firstRow = ["Municipality:", municipalityName || ""];
    const csv = [
      firstRow,
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === "string" && value.includes(",") ? `"${value}"` : value;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (municipalityName || "municipality").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.href = url;
    link.download = `internet_speed_test_${safeName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // If we explicitly have no data, show a simple message in the UI,
  // but do not include this row when printing charts.
  if (hasNoData && !stats) {
    return (
      <div className="tab__row digital-equity-speed-stats-row digital-equity-speed-stats-row--nodata">
        <div className="digital-equity-speed-stats" style={{ maxWidth: "100%", flex: "0 0 100%" }}>
          <h3 className="chart__title digital-equity-speed-stats__title">Internet Speed Test</h3>
          <div className="digital-equity-speed-stat-grid">
            <div className="digital-equity-speed-stat">
              <div className="digital-equity-speed-stat__label">Internet speed test data</div>
              <div className="digital-equity-speed-stat__value">
                Data not available.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab__row digital-equity-speed-stats-row">
      <div
        className="digital-equity-speed-stats"
        style={{ maxWidth: "100%", flex: "0 0 100%" }}
        ref={chartWrapperRef}
      >
        {/* Hidden SVG used only for image export via DownloadChartImageButton */}
        <svg
          className="chart"
          width="900"
          height="260"
          viewBox="0 0 900 260"
          style={{ position: "absolute", left: "-9999px", top: 0 }}
        >
          <rect width="900" height="260" fill="#ffffff" />
          <text
            x="20"
            y="32"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="18"
            fontWeight="700"
            fill="#1F4E46"
          >
            Internet Speed Test
          </text>
          {/* four card boxes to mirror on-screen cards */}
          {/* card 1 */}
          <rect
            x="20"
            y="50"
            width="190"
            height="120"
            rx="5"
            ry="5"
            fill="#FFFFFF"
            stroke="#95989A"
            strokeWidth="1"
          />
          <text
            x="115"
            y="80"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#1F4E46"
          >
            Median download speed (Mbps)
          </text>
          <text
            x="115"
            y="125"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="24"
            fontWeight="600"
            fill="#1F4E46"
          >
            {stats.med_down != null ? stats.med_down.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "N/A"}
          </text>
          {/* card 2 */}
          <rect
            x="235"
            y="50"
            width="190"
            height="120"
            rx="5"
            ry="5"
            fill="#FFFFFF"
            stroke="#95989A"
            strokeWidth="1"
          />
          <text
            x="330"
            y="80"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#1F4E46"
          >
            Median upload speed (Mbps)
          </text>
          <text
            x="330"
            y="125"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="24"
            fontWeight="600"
            fill="#1F4E46"
          >
            {stats.med_up != null ? stats.med_up.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "N/A"}
          </text>
          {/* card 3 */}
          <rect
            x="450"
            y="50"
            width="190"
            height="120"
            rx="5"
            ry="5"
            fill="#FFFFFF"
            stroke="#95989A"
            strokeWidth="1"
          />
          <text
            x="545"
            y="75"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#1F4E46"
          >
            Percent of download tests
          </text>
          <text
            x="545"
            y="92"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#1F4E46"
          >
            at or above 100 Mbps
          </text>
          <text
            x="545"
            y="135"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="24"
            fontWeight="600"
            fill="#1F4E46"
          >
            {stats.d_100p != null ? `${Number(stats.d_100p).toFixed(1)}%` : "N/A"}
          </text>
          {/* card 4 */}
          <rect
            x="665"
            y="50"
            width="190"
            height="120"
            rx="5"
            ry="5"
            fill="#FFFFFF"
            stroke="#95989A"
            strokeWidth="1"
          />
          <text
            x="760"
            y="75"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#1F4E46"
          >
            Percent of upload tests
          </text>
          <text
            x="760"
            y="92"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#1F4E46"
          >
            at or above 20 Mbps
          </text>
          <text
            x="760"
            y="135"
            textAnchor="middle"
            fontFamily="skolar-sans-latin, Helvetica, sans-serif"
            fontSize="24"
            fontWeight="600"
            fill="#1F4E46"
          >
            {stats.u_20p != null ? `${Number(stats.u_20p).toFixed(1)}%` : "N/A"}
          </text>
        </svg>
        <h3 className="chart__title digital-equity-speed-stats__title">Internet Speed Test</h3>
        <ButtonGroup className="chart-details-buttons">
          {onViewData && (
            <ActionButton
              type="button"
              onClick={handleViewDataClick}
              title="View Internet speed test data"
              aria-label="View Internet speed test data"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <title>View Internet speed test data</title>
                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm15 2h-4v3h4zm0 4h-4v3h4zm0 4h-4v3h3a1 1 0 0 0 1-1zm-5 3v-3H6v3zm-5 0v-3H1v2a1 1 0 0 0 1 1zm-4-4h4V8H1zm0-4h4V4H1zm5-3v3h4V4zm4 4H6v3h4z" />
              </svg>
            </ActionButton>
          )}
          <ActionButton
            type="button"
            onClick={handleDownloadDataClick}
            title="Download Internet speed test data as CSV"
            aria-label="Download Internet speed test data as CSV"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <title>Download Internet speed test data as CSV</title>
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z" />
            </svg>
          </ActionButton>
          <DownloadChartImageButton
            chartRef={chartWrapperRef}
            chartTitle="Internet Speed Test (Municipal)"
            hideTitle
            muni={municipalityName}
          />
        </ButtonGroup>
        <div className="digital-equity-speed-stat-grid">
          <div className="digital-equity-speed-stat">
            <div className="digital-equity-speed-stat__label">Median download speed (Mbps)</div>
            <div className="digital-equity-speed-stat__value">
              {stats.med_down != null ? stats.med_down.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "N/A"}
            </div>
          </div>
          <div className="digital-equity-speed-stat">
            <div className="digital-equity-speed-stat__label">Median upload speed (Mbps)</div>
            <div className="digital-equity-speed-stat__value">
              {stats.med_up != null ? stats.med_up.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "N/A"}
            </div>
          </div>
          <div className="digital-equity-speed-stat">
            <div className="digital-equity-speed-stat__label">Percent of download tests at or above 100 Mbps</div>
            <div className="digital-equity-speed-stat__value">
              {stats.d_100p != null ? `${Number(stats.d_100p).toFixed(1)}%` : "N/A"}
            </div>
          </div>
          <div className="digital-equity-speed-stat">
            <div className="digital-equity-speed-stat__label">Percent of upload tests at or above 20 Mbps</div>
            <div className="digital-equity-speed-stat__value">
              {stats.u_20p != null ? `${Number(stats.u_20p).toFixed(1)}%` : "N/A"}
            </div>
          </div>
        </div>
        <div className="metadata">
          <div className="source-timeframe">
            <div className="source">
              Source:
              {" "}
              {sourceLabel}
            </div>
            <div className="timeframe">
              Years:
              {" "}
              {stats.year != null ? stats.year : "N/A"}
            </div>
          </div>
          <div className="link">
            <span>Link to: </span>
            <a
              href={`${window.location.origin}/browser/datasets/499`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Internet Speed Test (Municipal)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternetSpeedTest;


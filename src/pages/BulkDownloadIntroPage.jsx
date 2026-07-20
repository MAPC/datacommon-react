import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDatasets } from "../reducers/datasetSlice";
import { fetchBulkDownloadBundles } from "../utils/bulkDownloadApi";

const BulkDownloadIntroPage = () => {
  const dispatch = useDispatch();
  const { status } = useSelector((state) => state.dataset);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDatasets());
    }
  }, [dispatch, status]);

  useEffect(() => {
    let cancelled = false;

    const loadBundles = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await fetchBulkDownloadBundles();
        if (cancelled) return;
        setBundles(Object.values(result));
      } catch {
        if (!cancelled) {
          setError("Could not load download topics. Please try again later.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBundles();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="route BulkDownload">
      <div className="bulk-download__header container tight">
        <nav className="bulk-download__breadcrumb" aria-label="Breadcrumb">
          <Link to="/browser">Data Browser</Link>
          <span aria-hidden="true"> / </span>
          <span>Download data for planning</span>
        </nav>
        <h1>Download data for planning</h1>
        <p className="bulk-download__intro">
          Download curated sets of related tables for one or more Massachusetts municipalities.
          Browse planning and research datasets, select your community and years, then download multiple related tables in one Excel workbook or ZIP of CSV files.
        </p>
      </div>

      <div className="container tight">
        {loading && <p className="bulk-download__hint">Loading topics…</p>}
        {error && (
          <p className="bulk-download__error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && bundles.length === 0 && (
          <p className="bulk-download__hint">No download topics are available right now.</p>
        )}
        <ul className="bulk-download__bundle-grid">
          {bundles.map((bundle) => (
            <li key={bundle.id} className="bulk-download__bundle-card">
              <Link to={`/browser/bulk-download/${bundle.id}`} className="bulk-download__bundle-link">
                <h2>{bundle.title}</h2>
                <p>{bundle.description}</p>
                <span className="bulk-download__bundle-meta">
                  {bundle.tables.length} tables · {bundle.geographyType === "municipality" ? "Municipality" : bundle.geographyType}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default BulkDownloadIntroPage;

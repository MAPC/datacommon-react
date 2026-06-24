import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDatasets } from "../reducers/datasetSlice";
import { BULK_DOWNLOAD_BUNDLES } from "../constants/bulkDownloadBundles";

const BulkDownloadIntroPage = () => {
  const dispatch = useDispatch();
  const { status } = useSelector((state) => state.dataset);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDatasets());
    }
  }, [dispatch, status]);

  return (
    <section className="route BulkDownload">
      <div className="bulk-download__header container tight">
        <nav className="bulk-download__breadcrumb" aria-label="Breadcrumb">
          <Link to="/browser">Data Browser</Link>
          <span aria-hidden="true"> / </span>
          <span>Download by Topic</span>
        </nav>
        <h1>Download by Topic</h1>
        <p className="bulk-download__intro">
          Download curated sets of related tables for one or more Massachusetts municipalities.
          Choose a topic, select your community and years, then download multiple
          related tables in one Excel workbook or ZIP of CSV files.
        </p>
      </div>

      <div className="container tight">
        <ul className="bulk-download__bundle-grid">
          {Object.values(BULK_DOWNLOAD_BUNDLES).map((bundle) => (
              <li key={bundle.id} className="bulk-download__bundle-card">
                <Link to={`/browser/bulk-download/${bundle.id}`} className="bulk-download__bundle-link">
                  <h2>{bundle.title}</h2>
                  <p>{bundle.description}</p>
                  <span className="bulk-download__bundle-meta">
                    {bundle.tables.length} tables · Municipality only
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

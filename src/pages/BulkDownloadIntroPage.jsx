import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDatasets } from "../reducers/datasetSlice";
import { CUSTOM_BULK_DOWNLOAD_BUNDLE } from "../constants/bulkDownloadBundles";
import { fetchBulkDownloadBundles } from "../utils/bulkDownloadApi";

const geographyMetaLabel = (geographyType) =>
  geographyType === "municipality" ? "Municipality" : geographyType;

const BundleCard = ({ bundle, isAvailable, meta }) => {
  const content = (
    <>
      <h2>{bundle.title}</h2>
      <p>{bundle.description}</p>
      <span className="bulk-download__bundle-meta">{meta}</span>
    </>
  );

  return (
    <li className="bulk-download__bundle-card">
      {isAvailable ? (
        <Link to={`/browser/bulk-download/${bundle.id}`} className="bulk-download__bundle-link">
          {content}
        </Link>
      ) : (
        <div className="bulk-download__bundle-link bulk-download__bundle-link--disabled" aria-disabled="true">
          {content}
        </div>
      )}
    </li>
  );
};

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
        setBundles(
          Object.values(result).filter((bundle) => bundle.id !== CUSTOM_BULK_DOWNLOAD_BUNDLE.id),
        );
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
          <span>Data by Plan Type</span>
        </nav>
        <h1>Data by Plan Type</h1>
        <p className="bulk-download__intro">
          Download curated sets of related tables, or build your own from the Data Inventory, for one or more interested geographic areas.
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
          <p className="bulk-download__hint">No curated download topics are available right now.</p>
        )}
        <ul className="bulk-download__bundle-grid">
          {bundles.map((bundle) => {
            const isAvailable = bundle.tables.length > 0;
            return (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                isAvailable={isAvailable}
                meta={
                  isAvailable
                    ? `${bundle.tables.length} tables · ${geographyMetaLabel(bundle.geographyType)}`
                    : "Coming soon"
                }
              />
            );
          })}
          <BundleCard
            key={CUSTOM_BULK_DOWNLOAD_BUNDLE.id}
            bundle={CUSTOM_BULK_DOWNLOAD_BUNDLE}
            isAvailable
            meta={`Choose from Data Inventory · ${geographyMetaLabel(CUSTOM_BULK_DOWNLOAD_BUNDLE.geographyType)}`}
          />
        </ul>
      </div>
    </section>
  );
};

export default BulkDownloadIntroPage;

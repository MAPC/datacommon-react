import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDatasets } from "../reducers/datasetSlice";
import DatasetSearchBar from "../components/partials/DatasetSearchBar";
import CategoryGrid from "../components/CategoryGrid";
import AnimatedCount from "../components/partials/AnimatedCount";
import { CommunitySelectorMap } from "./CommunitySelectorPage";

const Home = () => {
  const dispatch = useDispatch();
  const { noDupesDatasets, status } = useSelector((state) => state.dataset);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDatasets());
    }
  }, [dispatch, status]);

  const toDataset = (dataset) => {
    window.location.pathname = `/browser/datasets/${dataset.seq_id || dataset.id}`;
  };

  return (
    <section className="route Home">
      <div className="home-anniversary-banner">
        <p>
          <img
            src="/favicon.ico"
            alt=""
            className="home-anniversary-banner__icon"
          />
          Celebrating 20 years of DataCommon
          <span className="home-anniversary-banner__dot" aria-hidden="true">·</span>
          2006-2026
        </p>
      </div>
      <div className="page-header">
        <div className="container">
          <h1 className="home-community-title">Explore data for your community</h1>
          <div className="home-community-map">
            <CommunitySelectorMap searchBeside />
          </div>
        </div>
      </div>

      <section className="page-section home-datasets-section">
        <div className="home-20-watermark" aria-hidden="true">
          <AnimatedCount className="home-20-watermark__num" end={20} duration={1600} />
          <span className="home-20-watermark__meta">
            <span className="home-20-watermark__range">2006–2026</span>
            <span className="home-20-watermark__label">years</span>
          </span>
        </div>
        <div className="container">
          <div className="home-datasets-heading">
            <h2 className="home-datasets-title">
              Search datasets, or start from a topic
            </h2>
            <a href="/browser" className="home-browse-datasets-link">
              Browse all datasets
            </a>
          </div>
          <div className="home-dataset-search">
            <DatasetSearchBar
              className="home-dataset-search-bar"
              datasets={noDupesDatasets || []}
              placeholder={`Search ${noDupesDatasets?.length || 0} datasets ...`}
              onSelect={toDataset}
              maxResults={10}
              maxWidth="100%"
            />
          </div>
          <div className="home-topic-filters">
            <h3 className="home-filter-by-topic">Filter by topic</h3>
            <CategoryGrid />
          </div>
        </div>
      </section>
    </section>
  );
};

export default Home;

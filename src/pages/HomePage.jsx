import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import CallToAction from "../components/partials/CallToAction";
import Particles from "../components/partials/Particles";
import { fetchDatasets } from "../reducers/datasetSlice";
import SearchBar from "../components/partials/SearchBar";
import CategoryGrid from "../components/CategoryGrid";

const Home = () => {
  const dispatch = useDispatch();
  const { cache: datasets, status } = useSelector((state) => state.dataset);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDatasets());
    }
  }, [dispatch, status]);

  const toDataset = (dataset) => {
    window.location.pathname = `/browser/datasets/${dataset.id}`;
  };

  return (
    <section className="route Home">
      <div className="page-header">
        <Particles />
        <div className="container tight">
          <SearchBar
            contextKey="dataset"
            searchColumn="title"
            action={(selected) => toDataset(selected)}
            placeholder={`Search ${datasets?.length || 0} datasets ...`}
          />
        </div>
      </div>

      <section className="page-section container gallery-spotlight__wrapper">
        <div className="gallery-spotlight__info">
          <p>
            Find and explore data visualizations about the region. Check back
            monthly or sign up for our newsletter to receive maps and data
            visualizations. We cover a range of vital and interrelated topics:
            equity, housing, transportation, climate, arts and culture, and
            more. Always with data first, and always with an interdisciplinary
            lens.
          </p>
          <CallToAction
            link="/gallery"
            text="View Gallery"
            extraClassNames="gallery-spotlight__cta"
          />
        </div>
      </section>
      <div className="container tight page-section">
        <h2>Data by category</h2>

        <CategoryGrid />
      </div>

      <section className="page-section container tight">
        <div className="page-section page-section__map">
          <h2>Community Profiles</h2>
          <p className="gallery-spotlight__info">
            a paragraph to explain what is community profile
          </p>
          <CallToAction
            link="/communities"
            text="View Community Profiles"
            extraClassNames="community-profiles__cta"
          />
        </div>
      </section>
    </section>
  );
};

export default Home;

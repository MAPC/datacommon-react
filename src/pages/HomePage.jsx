import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import CallToAction from "../components/partials/CallToAction";
import Particles from "../components/partials/Particles";
import { fetchDatasets } from "../reducers/datasetSlice";
import DatasetSearchBar from "../components/partials/DatasetSearchBar";
import CategoryGrid from "../components/CategoryGrid";
import CommunityProfiles from "../assets/images/homepage/community-profiles.jpeg";
import Image from "react-bootstrap/Image";

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
      <div className="page-header">
        <Particles />
        <div className="container tight">
          <DatasetSearchBar
            datasets={noDupesDatasets || []} // use no-dupes list here b/c we don't care about categories
            placeholder={`Search ${noDupesDatasets?.length || 0} datasets ...`}
            onSelect={toDataset}
            maxResults={10}
          />
        </div>
      </div>
      <section className="page-section container">
        <div className="page-section page-section__map container">
          <h2>Community Profiles</h2>
          <p className="gallery-spotlight__info">
            MAPC's Community Profiles provide a comprehensive overview of each
            of the 351 cities and towns in Massachusetts. Each profile lets you
            explore data describing the population, housing characteristics,
            economy, transportation patterns, and other factors about a
            municipality. By aggregating data from state and federal agencies as
            well as data from our own planning and research work the profiles
            provide a single location where you can access and download
            information about any municipality.
          </p>
          <Image
            src={CommunityProfiles}
            alt="Community Profiles"
            className="community-profiles-image"
          />
        </div>
        <div
          className="gallery-spotlight__info container"
          style={{
            marginTop: "3rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <CallToAction
            link="/communities"
            text="View Community Profiles"
            extraClassNames="gallery-spotlight__cta"
            isDefaultLength={false}
          />
        </div>
      </section>

      <section className="page-section container" style={{ padding: "0" }}>
        <div className="container">
          <h2>Data by category</h2>
          <CategoryGrid />
        </div>
      </section>

      <section className="page-section container">
        <div className="gallery-spotlight__info container">
        <div><iframe title="Crime Data from 2020 to 2024" width="500" height="425" src="https://data.lacity.org/w/2nrs-mtv8" frameborder="0" tabindex="0" scrolling="no"></iframe><p><a href="https://tylertech.com" target="_blank">Powered by Tyler Technologies.</a></p></div>
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
    </section>
  );
};

export default Home;

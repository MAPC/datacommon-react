import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled, { keyframes } from "styled-components";
import { fetchDatasets } from "../reducers/datasetSlice";

const FavoriteDatasetsContainer = styled.div`
  padding: 0px 30px;
  width: 100%;
`;

const FavoriteDatasetsHeaderMessage = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #111111;
  padding-bottom: 24px;
`;

const FavoriteDatasetsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  max-height: 430px;
  width: 100%;
`;

const FavoriteDatasetRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #111111;
`;

const FavoriteIconContainer = styled.div`
  cursor: pointer;
  color: rgb(191, 168, 37);

  &:hover {
    color: rgb(165, 145, 31);
  }
`;

const DatasetNameLink = styled.a`
  text-decoration: underline;
  cursor: pointer;
  color: blue;
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 60px;
  height: 60px;
  margin-left: 200px;
  margin-top: 20px;
  border: 2px solid #978080;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const ProfileFavoriteDatasetsPage = () => {
  const [favorites, setFavorites] = useState(null);
  const [loading, setLoading] = useState(true);

  const dispatch = useDispatch();
  const { cache: datasets, noDupesDatasets } = useSelector(state => state.dataset);

  useEffect(() => {
    dispatch(fetchDatasets());
  }, [dispatch]);

  useEffect(() => {
    axios.get("/api/datasets/favorites")
      .then(res => {
        setFavorites(res.data);
        setLoading(false);
      }).catch(err => {
        setFavorites([]);
        setLoading(false);
      });
  }, []);

  const getDatasetName = (tableName) => {
    const dataset = noDupesDatasets.find(dataset => dataset.table_name === tableName);

    return dataset.menu3 || 'unknown';
  };

  const getDatasetId = (tableName) => {
    const dataset = noDupesDatasets.find(dataset => dataset.table_name === tableName);

    return dataset.seq_id || 'unknown';
  };


  const handleToggleDatasetFavorite = async (table) => {
    // bail out if currently loading
    if (loading) return;

    try {
      setLoading(true);
      await axios.post("/api/datasets/toggle-favorite", { tableName: table });

      // if toggle request succeeds, re-fetch updated datasets:
      axios.get("/api/datasets/favorites")
        .then(res => {
          setFavorites(res?.data || null);
          setLoading(false);
        }).catch(err => {
          console.error("Error while fetching dataset favorites: ", err);
          setFavorites(null);
          setLoading(false);
        });
    } catch (err) {
      console.error('Error while toggling dataset favorite status');
      setLoading(false);
    }
  }

  return (
    <FavoriteDatasetsContainer>
      <FavoriteDatasetsHeaderMessage>
        Your Favorite Datasets
      </FavoriteDatasetsHeaderMessage>
      {loading && <Spinner />}

      {!loading && noDupesDatasets && (
        <FavoriteDatasetsList>
          {favorites && favorites.length === 0 && (
            <div>Click the star when viewing a dataset to start building your list of favorites</div>
          )}
          {favorites && favorites.length > 0 && favorites.map(favoriteDataset => (
            <FavoriteDatasetRow key={favoriteDataset.table_name}>
              <FavoriteIconContainer title="Click to remove from favorites" onClick={() => handleToggleDatasetFavorite(favoriteDataset.table_name)}>
                <FontAwesomeIcon icon={faStar} size="lg" />
              </FavoriteIconContainer>
              <DatasetNameLink href={`/browser/datasets/${getDatasetId(favoriteDataset.table_name)}`} target="_blank">
                {getDatasetName(favoriteDataset.table_name)}
              </DatasetNameLink>
              <div>
                -
              </div>
              <div>
                {favoriteDataset.table_name}
              </div>
            </FavoriteDatasetRow>
          ))}
        </FavoriteDatasetsList>
      )}
    </FavoriteDatasetsContainer>
  );
};

export default ProfileFavoriteDatasetsPage;
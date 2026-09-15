import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled, { keyframes } from "styled-components";

import { isUserMAPCAdmin } from "../utils/auth";
import { AVAILABLE_MUNIS } from "./MuniAccountCreationPage";

const PageContainer = styled.div`
  padding: 0px 30px;
  width: 100%;
`;

const HeaderMessage = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #111111;
  padding-bottom: 24px;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InputLabel = styled.label`
  margin-right: 0.5rem;
  font-weight: bold;
`;

const MuniSelect = styled.select`
  width: 293px;
  border: 2px solid black;
  border-radius: 4px;
  height: 42px;
`;

const MuniOption = styled.option`
`;

const DescriptionTextArea = styled.textarea`
  width: 600px;
  height: 220px;
  margin-top: 12px;
`;

const UpdateButton = styled.button`
  width: 6.5rem;
  height: 2.8rem;
  padding: 0.5rem 1.5rem;
  border-radius: 10px;
  border: none;
  background: #1F4E46;
  color: white;

  &:hover {
    background: #2e5e56
  }
  
  &.disabled {
    cursor: not-allowed;
    pointer-events: none;
    background: #555555;
  }
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

const AdminMuniDescriptionsPage = () => {
  const [user, setUser] = useState(null);
  const [muniId, setMuniId] = useState(-1);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/users/me")
      .then(res => {
        setUser(res.data.user);
        setLoading(false);
      }).catch(err => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user && user.rep_of_muni_id && user.role === 'MUNI_REP') {
      setMuniId(user.rep_of_muni_id);
    }
  }, [user]);

  // fetch the existing description if there is one
  useEffect(() => {
    setLoading(true);
    axios.get(`/api/muni-info/description?muni_id=${muniId}`)
      .then(res => {
        if (res.data?.length === 0) {
          setDescription('');
        } else if (res.data?.length === 1) {
          setDescription(res.data[0].description);
        }
        setLoading(false);
      }).catch(err => {
        setDescription('');
        setLoading(false);
      });
  }, [muniId]);

  const isMapcAdmin = useMemo(() => {
    return isUserMAPCAdmin(user);
  }, [user]);

  const sortedMunis = useMemo(() => {
    return AVAILABLE_MUNIS.sort((a, b) => a.name.localeCompare(b.name));
  }, [AVAILABLE_MUNIS]);


  const updateMuniDescription = async () => {
    // bail out if currently loading or null values
    if (loading || !muniId) return;

    try {
      setLoading(true);
      await axios.post("/api/muni-admin/upsert-muni-description", { description: description, muni_id: muniId });

      // if update request succeeds, re-fetch:
     axios.get(`/api/muni-info/description?muni_id=${muniId}`)
      .then(res => {
        if (res.data?.length === 1) {
          setDescription(res.data[0].description);
        }
        setLoading(false);
      }).catch(err => {
        setDescription('');
        setLoading(false);
      });
    } catch (err) {
      console.error('Error while updating muni description');
      setLoading(false);
    }
  };

  const getMuniById = (id) => {
    const foundMuni = AVAILABLE_MUNIS.find(muni => muni.id === id);
    return foundMuni;
  };

  return (
    <PageContainer>
      <HeaderMessage>
        Update municipality description for community profile
      </HeaderMessage>
      {loading && <Spinner />}

      <ContentContainer>
        <div>
          {!loading && isMapcAdmin && (
            <div>
              <InputLabel htmlFor="datacommon-account-create-muni-select">
                Select municipality:
              </InputLabel>
              <MuniSelect 
                id="datacommon-account-create-muni-select"
                style={{'marginLeft': '10px'}}
                value={muniId}
                onChange={e => setMuniId(e.target.value)}
                placeholder="Pick your municipality"
              >
                <MuniOption value={-1}>Pick your municipality</MuniOption>
                {sortedMunis.map(muni => (
                  <MuniOption key={muni.id} value={muni.id}>{muni.name}</MuniOption>
                ))}
              </MuniSelect>
            </div>
          )}

          {!loading && !isMapcAdmin && muniId !== -1 && (
            <div>
              {`Municipal description for ${getMuniById(muniId)?.name || 'Unknown'}:`}
            </div>
          )}

          {!loading && muniId !== -1 && (
            <DescriptionTextArea 
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="No existing description..."
            />
          )}
        </div>
        
        {!loading && muniId !== -1 && (
          <UpdateButton onClick={updateMuniDescription}>
            Update
          </UpdateButton>
        )}
      </ContentContainer>
    </PageContainer>
  );
};

export default AdminMuniDescriptionsPage;
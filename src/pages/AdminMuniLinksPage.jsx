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

const ErrorMessage = styled.div`
  color: #721414;
  font-size: 16px;
`;

const InputLabel = styled.label`
  margin-right: 0.5rem;
  font-weight: bold;
`;

const SelectBox = styled.select`
  width: 293px;
  border: 2px solid black;
  border-radius: 4px;
  height: 42px;
`;

const MuniOption = styled.option`
`;

const LinkBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: white;
  border: 1px solid #111111;
  border-radius: 8px;
  box-shadow: 8px 4px 4px #cccccc;
`;

const LinkUrlContainer = styled.div`
  max-width: 600px;
  overflow: hidden;
  text-overflow: ellipsis;
;`

const TextInput = styled.input`
  width: 250px;
  padding: 0.5rem;
  border-radius: 5px;
`;

const AddLinkButton = styled.button`
  width: 8rem;
  height: 2.8rem;
  padding: 0.5rem 1.5rem;
  margin: 8px 0px;
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

const LINK_TYPES = [
  // Plans:
  { name: 'Climate Action Plan (CAP)', key: 'CLIMATE_ACTION_PLAN' },
  { name: 'CDBG Consolidated Plan', key: 'CONSOLIDATED_PLAN' },
  { name: 'Comprehensive Plan', key: 'COMPREHENSIVE_PLAN' },
  { name: 'Digital Equity Plan (DEP)', key: 'DIGITAL_EQUITY_PLAN' },
  { name: 'Hazard Mitigation Plan (HMP)', key: 'HAZARD_MITIGATION_PLAN' },
  { name: 'Housing Production Plan (HPP)', key: 'HOUSING_PRODUCTION_PLAN' },
  { name: 'Municipal Vulnerability Plan (MVP)', key: 'MUNI_VULN_PLAN' },
  { name: 'Open Space and Recreation Plan (OSRP)', key: 'OPEN_SPACE_REC_PLAN' },

  // Websites
  { name: 'Assessors / Parcel Data Portal', key: 'PARCEL_DATA_PORTAL' },
  { name: 'Open Data Portal', key: 'OPEN_DATA_PORTAL' },
  { name: 'Planning Department Site', key: 'PLANNING_DEPARTMENT_WEBSITE' },
  { name: 'Planning Board Site', key: 'PLANNING_BOARD_WEBSITE' },
  { name: 'Spatial Data Hub', key: 'SPATIAL_DATA_HUB_WEBSITE' },
  { name: 'Zoning Board Site', key: 'ZONING_BOARD_WEBSITE' },

  // Maps:
  { name: 'Zoning Map', key: 'ZONING_MAP' },

  // Documents:
  { name: 'Municipal Budget', key: 'MUNICIPAL_BUDGET_DOC' },
  { name: 'Zoning Bylaw or Ordinance', key: 'ZONING_BYLAW_DOC' },

  // Other:
  { name: "Other link", key: "OTHER" },
];

const AdminMuniLinksPage = () => {
  const [user, setUser] = useState(null);
  const [muniId, setMuniId] = useState(-1);
  const [existingLinks, setExistingLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [addingLink, setAddingLink] = useState(false);
  const [addingLinkType, setAddingLinkType] = useState(-1);
  const [addingLinkName, setAddingLinkName] = useState('');
  const [addingLinkUrl, setAddingLinkUrl] = useState('');

  useEffect(() => {
    axios.get("/api/users/me")
      .then(res => {
        setUser(res.data.user);
      }).catch(err => {
        setUser(null);
        setErrorMessage("Error while fetching user info")
      }).finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user && user.rep_of_muni_id && user.role === 'MUNI_REP') {
      setMuniId(user.rep_of_muni_id);
    }
  }, [user]);

  // fetch the existing links if they exist
  useEffect(() => {
    if (muniId === -1) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    axios.get(`/api/muni-info/links?muni_id=${muniId}`)
      .then(res => {
        if (res.data) {
          setExistingLinks(res.data);
        }
      }).catch(err => {
        setExistingLinks([]);
        setErrorMessage("Error while fetching existing links for the municipality.")
      }).finally(() => {
        setLoading(false);
      });
  }, [muniId]);

  const isMapcAdmin = useMemo(() => {
    return isUserMAPCAdmin(user);
  }, [user]);

  const sortedMunis = useMemo(() => {
    return AVAILABLE_MUNIS.sort((a, b) => a.name.localeCompare(b.name));
  }, [AVAILABLE_MUNIS]);

  const sortedLinkTypes = useMemo(() => {
    return LINK_TYPES.sort((a, b) => a.name.localeCompare(b.name));
  }, [LINK_TYPES]);


  const onSubmitLink = async () => {
    // bail out if currently loading or null values
    if (loading || !muniId || !addingLinkName || !addingLinkType || !addingLinkUrl) return;

    try {
      setLoading(true);
      await axios.post(
        "/api/muni-admin/add-muni-link",
        { muni_id: muniId, type: addingLinkType, name: addingLinkName, link: addingLinkUrl }
      );
      setAddingLink(false);
      setAddingLinkType(-1);
      setAddingLinkName('');
      setAddingLinkUrl('');

      // if update request succeeds, re-fetch:
      axios.get(`/api/muni-info/links?muni_id=${muniId}`)
        .then(res => {
          if (res.data) {
            setExistingLinks(res.data);
          }
        }).catch(err => {
          setExistingLinks([]);
          setErrorMessage("Error while fetching existing links for the municipality.")
        }).finally(() => {
          setLoading(false);
        });
    } catch (err) {
      console.error('Error while adding muni link');
      setErrorMessage('Error while adding municipal link')
      setLoading(false);
    }
  };

  const getMuniById = (id) => {
    const foundMuni = AVAILABLE_MUNIS.find(muni => muni.id === id);
    return foundMuni;
  };

  const getLinkTypeName = (typeKey) => {
    const foundType = LINK_TYPES.find(type => type.key === typeKey);
    return foundType?.name || 'unknown';
  };

  return (
    <PageContainer>
      <HeaderMessage>
        Update municipality links
      </HeaderMessage>
      {loading && <Spinner />}
      {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}

      <ContentContainer>
        <div>
          {!loading && isMapcAdmin && (
            <div>
              <InputLabel htmlFor="datacommon-select-muni-link-page">
                Link Type:
              </InputLabel>
              <SelectBox 
                id="datacommon-select-muni-link-page"
                style={{'marginLeft': '10px'}}
                value={muniId}
                onChange={e => setMuniId(e.target.value)}
                placeholder="Pick your municipality"
              >
                <MuniOption value={-1}>Pick a municipality</MuniOption>
                {sortedMunis.map(muni => (
                  <MuniOption key={muni.id} value={muni.id}>{muni.name}</MuniOption>
                ))}
              </SelectBox>
            </div>
          )}

          {!loading && !isMapcAdmin && muniId !== -1 && (
            <div>
              {`Municipal links for ${getMuniById(muniId)?.name || 'Unknown'}:`}
            </div>
          )}

          {!loading && muniId !== -1 && (
            <AddLinkButton onClick={() => setAddingLink(true)}>
              Add Link
            </AddLinkButton>
          )}

          {!loading && muniId !== -1 && addingLink && (
            <LinkBox>
              <div>
                <InputLabel htmlFor="datacommon-select-link-type">
                  Link Type:
                </InputLabel>
                <SelectBox 
                  id="datacommon-select-link-type"
                  // style={{'marginLeft': '10px'}}
                  value={addingLinkType}
                  onChange={e => setAddingLinkType(e.target.value)}
                  placeholder="Pick your municipality"
                >
                  <MuniOption value={-1}>Pick a type</MuniOption>
                  {sortedLinkTypes.map(type => (
                    <MuniOption key={type.key} value={type.key}>{type.name}</MuniOption>
                  ))}
                </SelectBox>
              </div>

              <div>
                <InputLabel htmlFor="datacommon-add-link-name-input">
                  Name:
                </InputLabel>
                <TextInput 
                  id="datacommon-add-link-name-input"
                  value={addingLinkName}
                  onChange={e => setAddingLinkName(e.target.value)}
                  placeholder="Link name..."
                />
              </div>

              <div>
                <InputLabel htmlFor="datacommon-add-link-url-input">
                  URL:
                </InputLabel>
                <TextInput 
                  id="datacommon-add-link-url-input"
                  value={addingLinkUrl}
                  onChange={e => setAddingLinkUrl(e.target.value)}
                  placeholder="URL..."
                />
              </div>

              <AddLinkButton
                style={{ marginTop: '32px' }} 
                className={(addingLinkType !== -1 && addingLinkName && addingLinkUrl) ? '' : 'disabled'}
                onClick={() => onSubmitLink()}>
                Submit
              </AddLinkButton>

            </LinkBox>
          )}

          {!loading && muniId !== -1 && existingLinks.length > 0 && existingLinks.map(link => (
            <LinkBox key={link.seq_id}>
              <div>{getLinkTypeName(link.link_type)}</div>
              <div>{link.name}</div>
              <LinkUrlContainer title={link.link}>
                {link.link}
              </LinkUrlContainer>
            </LinkBox>
          ))}
        </div>
      </ContentContainer>
    </PageContainer>
  );
};

export default AdminMuniLinksPage;
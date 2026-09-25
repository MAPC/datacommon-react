import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";

const AdminTeammatesContainer = styled.div`
  padding: 0px 30px;
`;

const TeammatesHeaderMessage = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #111111;
  padding-bottom: 24px;
`;

const InputLabel = styled.label`
  margin-right: 0.5rem;
  font-weight: bold;
`;

const OrganizationSelect = styled.select`
  width: 293px;
  margin-bottom: 16px;
  border: 2px solid black;
  border-radius: 4px;
  height: 42px;
`;

const OrgOption = styled.option`
`;

const TeammatesTableHeader = styled.tr`
  background: #f1f1f1;
`;

const TeammatesTableCell = styled.td`
  color: #111111;
  font-size: 16px;
  padding: 4px 12px;
  border: 1px solid #111111;
`;

const TeammatesTableRow = styled.tr`
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

const ProfileTeammatesPage = () => {
  const [teammates, setTeammates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(-1);

  useEffect(() => {
    axios.get("/api/users/my-teammates") // TODO: expose to all users
      .then(res => {
        setTeammates(res.data.teammates);
        setLoading(false);
      }).catch(err => {
        setTeammates([]);
        setLoading(false);
      });
  }, []);

  const usersByOrgMap = useMemo(() => {
    if (!teammates) return null;

    const userMap = {};
    teammates.forEach(user => {
      if (!userMap[user.organization]) {
        userMap[user.organization] = [];
      }
      userMap[user.organization].push(user);
    });
    return userMap;
  }, [teammates]);

  const alphabeticalOrgs = useMemo(() => {
    if (!usersByOrgMap) return null;

    const keys = Object.keys(usersByOrgMap);
    const sorted = keys.sort((a, b) => a.localeCompare(b));
    return sorted;
  }, [usersByOrgMap]);

  return (
    <AdminTeammatesContainer>
      <TeammatesHeaderMessage>
        Public Users and Teammates
      </TeammatesHeaderMessage>
      {loading && <Spinner />}
      {!loading && usersByOrgMap && alphabeticalOrgs && (
        <div>
          <InputLabel htmlFor="datacommon-teammates-org-select">
            Select organization:
          </InputLabel>
          <OrganizationSelect 
            id="datacommon-teammates-org-select"
            style={{'marginLeft': '10px'}}
            value={selectedOrg}
            onChange={e => setSelectedOrg(e.target.value)}
            placeholder="Pick your municipality"
          >
            <OrgOption value={-1}>Pick an organization...</OrgOption>
            {alphabeticalOrgs.map(org => (
              <OrgOption key={org} value={org}>{org}</OrgOption>
            ))}
          </OrganizationSelect>
        </div>
      )}

      {!loading && usersByOrgMap && selectedOrg !== -1 && (
        <table style={{ display: 'block', maxHeight: '370px', overflowY: 'auto', borderCollapse: 'separate' }}>
          <thead>
            <TeammatesTableHeader style={{ position: 'sticky', top: '0px', zIndex: 10 }}>
              <TeammatesTableCell style={{ width: '250px' }}>
                Name
              </TeammatesTableCell>
              <TeammatesTableCell style={{ width: '300px' }}>
                Email
              </TeammatesTableCell>
              <TeammatesTableCell style={{ width: '250px' }}>
                Organization
              </TeammatesTableCell>
            </TeammatesTableHeader>
          </thead>
          <tbody>
            {usersByOrgMap && selectedOrg && usersByOrgMap[selectedOrg].map(tm => (
              <TeammatesTableRow key={tm.email}>
                <TeammatesTableCell style={{ width: '250px' }}>
                  {tm.name}
                </TeammatesTableCell>
                <TeammatesTableCell style={{ width: '300px' }}>
                  {tm.email}
                </TeammatesTableCell>
                <TeammatesTableCell style={{ width: '250px' }}>
                  {tm.organization}
                </TeammatesTableCell>
              </TeammatesTableRow>
            ))}
          </tbody>
        </table>
      )}
    </AdminTeammatesContainer>
  );
};

export default ProfileTeammatesPage;
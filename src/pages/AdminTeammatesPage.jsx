import axios from "axios";
import React, { useEffect, useState } from "react";
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

const AdminTeammatesPage = () => {
  const [teammates, setTeammates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/users/my-teammates")
      .then(res => {
        setTeammates(res.data.teammates);
        setLoading(false);
      }).catch(err => {
        setTeammates([]);
        setLoading(false);
      });
  }, []);

  return (
    <AdminTeammatesContainer>
      <TeammatesHeaderMessage>
        Teammates within your organization
      </TeammatesHeaderMessage>
      <table>
        <thead>
          <TeammatesTableHeader>
            <TeammatesTableCell style={{ width: '200px' }}>
              Name
            </TeammatesTableCell>
            <TeammatesTableCell style={{ width: '200px' }}>
              Email
            </TeammatesTableCell>
            <TeammatesTableCell style={{ width: '200px' }}>
              Role
            </TeammatesTableCell>
          </TeammatesTableHeader>
        </thead>
        <tbody>
          {teammates.map(tm => (
            <TeammatesTableRow key={tm.email}>
              <TeammatesTableCell style={{ width: '200px' }}>
                {tm.name}
              </TeammatesTableCell>
              <TeammatesTableCell style={{ width: '200px' }}>
                {tm.email}
              </TeammatesTableCell>
              <TeammatesTableCell style={{ width: '200px' }}>
                {tm.role}
              </TeammatesTableCell>
            </TeammatesTableRow>
          ))}
        </tbody>
      </table>
      {loading && <Spinner />}
    </AdminTeammatesContainer>
  );
};

export default AdminTeammatesPage;
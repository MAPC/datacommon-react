import axios from "axios";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const UserProfileContainer = styled.div`
  padding: 0px 30px;
`;

const UserProfileHeader = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #111111;
  padding-bottom: 24px;
`;

const UserProfileAttributes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-left: 28px;
`;

const UserProfileAttribute = styled.div`
  display: flex;
  gap: 12px;
  color: #111111;
`;

const AttributeTag = styled.div`
  width: 120px;
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

const ProfileMyProfilePage = () => {
  const [myUser, setMyUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/users/me")
      .then(res => {
        setMyUser(res.data?.user);
        setLoading(false);
      }).catch(err => {
        setMyUser(null);
        setLoading(false);
      });
  }, []);

  return (
    <UserProfileContainer>
      <UserProfileHeader>
        User Profile
      </UserProfileHeader>
      {loading && <Spinner />}
      {!loading && (
        <UserProfileAttributes>
            <UserProfileAttribute>
              <AttributeTag>Name:</AttributeTag>
              <div>{myUser.name}</div>
            </UserProfileAttribute>
            <UserProfileAttribute>
              <AttributeTag>Email:</AttributeTag>
              <div>{myUser.email}</div>
            </UserProfileAttribute> 
        </UserProfileAttributes>
      )}
    </UserProfileContainer>
  );
};

export default ProfileMyProfilePage;
import axios from 'axios';
import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from "react-router"
import styled from 'styled-components';

import { getCookie, logoutUser } from '../utils/cookies';
import { isUserAdmin } from '../utils/auth';

const UserProfileMainWrapper = styled.div`
  display: flex;
  width: 1400px;
  margin: 10px auto; 
`;

const UserProfileLeftNavContainer = styled.div`
  min-width: 16rem;
  min-height: 500px;
  border: 1px solid #dddddd;
`;

const UserProfileLeftNavHeader = styled.div`
  padding: 8px 12px;
  background: #1F4E46;
  border-radius: 4px;
  font-size: 20px;
  font-weight: bold;
  color: white;
`;

const UserProfileLinksContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 45px);
`;

const UserProfilePageRoute = styled.div`
  cursor: pointer;
  padding: 10px 20px;
  font-size: 18px;
  color: #111111;
  border-bottom: 1px solid #dddddd;

  &:hover {
    background: #f4f4f4;
  }

  &.active {
    background: #ececec;

    &:hover {
      background: #e9e9e9;
    }
  }
`;

const UserProfileLogoutButton = styled.div`
  background: #1F4E46;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  padding: 10px 20px;
  font-size: 18px;

  &:hover {
    background: #2e645b;
  }
`;

const UserProfileWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Whenever the user navigates to an admin page or sub-page, verify their login and auth
  useEffect(() => {
    const cookie = getCookie('datacommon_mapc_token');

    // If the user isn't logged in, bounce them to the homepage
    if (!cookie) {
      sendUserToHome();
      return;
    }

    // bounce the user to the home page if token is invalid
    axios.get("/api/users/me")
      .then(res => {
        const user = res?.data?.user;
        if (!user) {
          sendUserToHome();
        }
      }).catch(err => {
        sendUserToHome();
        return;
      });

    // Finally, redirect from the base /profile page to /profile/me
    if (location.pathname === "/user-profile") {
      navigate("/user-profile/me");
    }
  }, [location.pathname]);

  const sendUserToHome = () => {
    navigate("/");
  };

  const onLogoutClicked = () => {
    logoutUser();
    sendUserToHome();
  };

  return (
    <UserProfileMainWrapper>
      <UserProfileLeftNavContainer>
        <UserProfileLeftNavHeader>User Profile</UserProfileLeftNavHeader>
        <UserProfileLinksContainer>
          <div>
            <UserProfilePageRoute
              className={location.pathname === '/user-profile/me' ? 'active' : ''}
              onClick={() => navigate("/user-profile/me")}
            >
              My Profile
            </UserProfilePageRoute>
            <UserProfilePageRoute
              className={location.pathname === '/user-profile/teammates' ? 'active' : ''}
              onClick={() => navigate("/user-profile/teammates")}
            >
              Teammates
            </UserProfilePageRoute>
            <UserProfilePageRoute
              className={location.pathname === '/user-profile/favorite-datasets' ? 'active' : ''}
              onClick={() => navigate("/user-profile/favorite-datasets")}
            >
              Favorite Datasets
            </UserProfilePageRoute>
          </div>

          <UserProfileLogoutButton onClick={() => onLogoutClicked()}>
            Logout
          </UserProfileLogoutButton>
        </UserProfileLinksContainer>
      </UserProfileLeftNavContainer>
      <Outlet />
    </UserProfileMainWrapper>
  );
};

export default UserProfileWrapper;
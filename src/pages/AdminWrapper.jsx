import axios from 'axios';
import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from "react-router"
import styled from 'styled-components';

import { getCookie, logoutUser } from '../utils/cookies';

const ALLOWED_ROLES = ['ADMIN', 'SADMIN', 'MAPC_USER'];

const AdminMainWrapper = styled.div`
  display: flex;
  width: 1400px;
  margin: 10px auto; 
`;

const AdminLeftNavContainer = styled.div`
  min-width: 16rem;
  border: 1px solid #dddddd;
`;

const AdminLeftNavHeader = styled.div`
  padding: 8px 12px;
  background: #1F4E46;
  border-radius: 4px;
  font-size: 24px;
  font-weight: bold;
  color: white;
`;

const AdminPageRoute = styled.div`
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

const AdminLogoutButton = styled.div`
  margin-top: 160px;
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

const AdminWrapper = () => {
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

    // bounce the user to the home page if they're not an admin or token is invalid
    axios.get("/api/users/me")
      .then(res => {
        const userRole = res.data?.user?.role;
        if (!ALLOWED_ROLES.includes(userRole)) {
          sendUserToHome();
          return;
        }
      }).catch(err => {
        sendUserToHome();
        return;
      });

    // Finally, redirect from the base /admin page to /admin/teammates
    if (location.pathname === "/admin") {
      navigate("/admin/teammates");
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
    <AdminMainWrapper>
      <AdminLeftNavContainer>
        <AdminLeftNavHeader>DataCommon Admin</AdminLeftNavHeader>
        <AdminPageRoute
          className={location.pathname === '/admin/teammates' ? 'active' : ''}
          onClick={() => navigate("/admin/teammates")}
        >
          Teammates
        </AdminPageRoute>
        <AdminPageRoute
          className={location.pathname === '/admin/jobs' ? 'active' : ''}
          onClick={() => navigate("/admin/jobs")}
        >
          Pipeline Jobs
        </AdminPageRoute>
        <AdminPageRoute >
          More Coming Soon! 
        </AdminPageRoute>
        <AdminLogoutButton onClick={() => onLogoutClicked()}>
          Logout
        </AdminLogoutButton>
      </AdminLeftNavContainer>
      <Outlet />
    </AdminMainWrapper>
  );
};

export default AdminWrapper;
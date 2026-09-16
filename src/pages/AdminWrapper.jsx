import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from "react-router"
import styled from 'styled-components';

import { getCookie, logoutUser } from '../utils/cookies';
import { isUserAdmin, isUserFromMAPC } from '../utils/auth';

const AdminMainWrapper = styled.div`
  display: flex;
  width: 1400px;
  margin: 10px auto; 
`;

const AdminLeftNavContainer = styled.div`
  min-width: 16rem;
  min-height: 500px;
  border: 1px solid #dddddd;
`;

const AdminLeftNavHeader = styled.div`
  padding: 8px 12px;
  background: #1F4E46;
  border-radius: 4px;
  font-size: 20px;
  font-weight: bold;
  color: white;
`;

const AdminLinksContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 45px);
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

  const [user, setUser] = useState(null);

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
        const user = res?.data?.user;
        setUser(user);
        const isAdmin = isUserAdmin(user);
        if (!isAdmin) {
          sendUserToHome();
          return;
        }
      }).catch(err => {
        sendUserToHome();
        return;
      });

    // Finally, redirect from the base /admin page to /admin/job
    if (location.pathname === "/admin") {
      navigate("/admin/jobs");
    }
  }, [location.pathname]);

  const sendUserToHome = () => {
    navigate("/");
  };

  const onLogoutClicked = () => {
    logoutUser();
    sendUserToHome();
  };

  const availablePages = useMemo(() => {
    const pages = [];

    if (isUserFromMAPC(user)) {
      pages.push({ name: "Pipeline Jobs", path: "/admin/jobs" });
    }

    if (isUserAdmin(user)) {
      pages.push({ name: "Municipal Description", path: "/admin/muni-description" });
      pages.push({ name: "Municipal Links", path: "/admin/muni-links" });
    }

    return pages;
  }, [user]);

  return (
    <AdminMainWrapper>
      <AdminLeftNavContainer>
        <AdminLeftNavHeader>DataCommon Admin</AdminLeftNavHeader>
        <AdminLinksContainer>
          <div>
            {availablePages.map(page => (
              <AdminPageRoute
                key={page.path}
                className={location.pathname === page.path ? 'active' : ''}
                onClick={() => navigate(page.path)}
              >
                {page.name}
              </AdminPageRoute>
            ))}
          </div>
          <AdminLogoutButton onClick={() => onLogoutClicked()}>
            Logout
          </AdminLogoutButton>
        </AdminLinksContainer>
      </AdminLeftNavContainer>
      <Outlet />
    </AdminMainWrapper>
  );
};

export default AdminWrapper;
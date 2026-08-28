import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import logoImg from "../assets/images/logo.svg";
import { getCookie } from "../utils/cookies";

function handleActivePage(subdirectory, link = "/home") {
  if (subdirectory.startsWith(link)) {
    return "active";
  }
  if (subdirectory.startsWith("/calendar") && link === "/gallery") {
    return "active";
  }

  return null;
}

const Header = () => {
  const [userName, setUserName] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If the user has a login cookie set, fetch their name to display in the Icon.
    const cookie = getCookie('datacommon_mapc_token');
    if (cookie) {
      axios.get("/api/users/me")
        .then(res => {
          if (res.data?.user?.name) {
            setUserName(res.data.user.name);
          } else {
            setUserName(null);
          }
        }).catch(err => {
          setUserName(null);
        });
    } else {
      // user has no cookie
      setUserName(null);
    }
  }, [location.pathname]);

  const initialsString = useMemo(() => {
    if (!userName) {
      return '';
    }

    const words = userName.split(" ");
    const letters = words.map(w => w.length > 0 ? w[0] : '');
    return letters.join('');
  }, [userName]);

  return (
    <header className="container">
      <nav>
        <div className="scroll-wrapper">
          <div className="header-brand">
            <a href="/">
              <img src={logoImg} alt="DataCommon Logo" />
              DataCommon
            </a>
          </div>
          <ul>
            <li>
              <a
                className={handleActivePage(location.pathname, "/communities")}
                href="/communities"
              >
                Community Profiles
              </a>
            </li>
            <li>
              <a
                className={handleActivePage(location.pathname, "/browser")}
                href="/browser"
              >
                Datasets
              </a>
            </li>
            <li>
              <a
                className={handleActivePage(location.pathname, "/gallery")}
                href="/gallery"
              >
                Gallery
              </a>
            </li>
            <li>
              <a
                className={handleActivePage(location.pathname, "/about")}
                href="/about"
              >
                About
              </a>
            </li>
            <li>
              <a
                className={handleActivePage(location.pathname, "/developers")}
                href="/developers"
              >
                API
              </a>
            </li>
          </ul>
        </div>
      </nav>
      {userName && 
        <div className="header-user-icon-container" onClick={() => navigate("/admin/teammates")}>
          <div className="header-user-icon">
            {initialsString}
          </div>
        </div>
      }
    </header>
  );
};

export default Header;
export { handleActivePage };

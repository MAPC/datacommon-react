import axios from "axios";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faGear } from "@fortawesome/free-solid-svg-icons";

import logoImg from "../assets/images/logo.svg";
import { getCookie } from "../utils/cookies";
import { isUserAdmin } from "../utils/auth";

function handleActivePage(subdirectory, link = "/home") {
  if (link === "/browser" && subdirectory.startsWith("/browser/bulk-download")) {
    return null;
  }
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const userIconRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // If the user has a login cookie set, fetch their name to display in the Icon.
  useEffect(() => {
    const cookie = getCookie('datacommon_mapc_token');
    if (cookie) {
      axios.get("/api/users/me")
        .then(res => {
          if (res.data?.user?.name) {
            setUserName(res.data.user.name);
          } else {
            setUserName(null);
          }

          if (res.data?.user) {
            setIsAdmin(isUserAdmin(res.data.user));
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

    let words = userName.split(" ");
    if (words.length > 3) {
      words = words.slice(0, 3);
    }
    const letters = words.map(w => w.length > 0 ? w[0].toUpperCase() : '');
    return letters.join('');
  }, [userName]);

  // handle clicking outside menu when user menu is open
  useEffect(() => {
    if (!userMenuOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      event.stopPropagation();  
      if (userMenuRef.current && !userMenuRef.current.contains(event.target) && !userIconRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const navigateTo = (path) => {
    setUserMenuOpen(false);
    navigate(path);
  };

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
                className={handleActivePage(location.pathname, "/browser/bulk-download")}
                href="/browser/bulk-download"
              >
                Data for Planning
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
        <>
          <div className="header-user-icon-container" onClick={() => setUserMenuOpen(!userMenuOpen)} ref={userIconRef}>
            <div className="header-user-icon">
              {initialsString}
            </div>
          </div>
          {userMenuOpen && 
            <div className="header-user-icon-menu" ref={userMenuRef}>
              <>
                <div className="user-icon-menu-row" onClick={() => navigateTo('/user-profile/me')}>
                  <FontAwesomeIcon icon={faUser} />
                  <div>Profile</div>
                </div>
                {isAdmin && 
                  <div className="user-icon-menu-row" onClick={() => navigateTo('/admin/jobs')}>
                    <FontAwesomeIcon icon={faGear} />
                    <div>Admin</div>
                  </div>
                }
              </>
            </div>
          }
        </>
      }
    </header>
  );
};

export default Header;
export { handleActivePage };

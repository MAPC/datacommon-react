import axios from "axios";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faGear } from "@fortawesome/free-solid-svg-icons";

import logoImg from "../assets/images/DataCommon20_horizontal_open-data-dates.svg";
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

const DATA_MENU_LINKS = [
  { href: "/browser", label: "Browse Data Catalog" },
  { href: "/browser/bulk-download", label: "Data by Plan Type" },
  { href: "/explore", label: "Explore on the Map" },
];

const Header = () => {
  const [userName, setUserName] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const userMenuRef = useRef(null);
  const userIconRef = useRef(null);
  const dataMenuRef = useRef(null);
  const navRef = useRef(null);
  const navToggleRef = useRef(null);
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

  useEffect(() => {
    setDataMenuOpen(false);
    setUserMenuOpen(false);
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const desktopNav = window.matchMedia("(min-width: 961px)");
    const closeMobileNav = () => {
      if (desktopNav.matches) {
        setNavOpen(false);
      }
    };

    desktopNav.addEventListener("change", closeMobileNav);
    return () => desktopNav.removeEventListener("change", closeMobileNav);
  }, []);

  // handle clicking outside menu when user menu is open
  useEffect(() => {
    if (!userMenuOpen && !dataMenuOpen && !navOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target) &&
        !userIconRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }

      if (dataMenuOpen && dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
        setDataMenuOpen(false);
      }

      if (
        navOpen &&
        navRef.current &&
        navToggleRef.current &&
        !navRef.current.contains(event.target) &&
        !navToggleRef.current.contains(event.target)
      ) {
        setNavOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setDataMenuOpen(false);
        setNavOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen, dataMenuOpen, navOpen]);

  const navigateTo = (path) => {
    setUserMenuOpen(false);
    setDataMenuOpen(false);
    setNavOpen(false);
    navigate(path);
  };

  const dataMenuActive = DATA_MENU_LINKS.some(
    (link) => handleActivePage(location.pathname, link.href) === "active",
  );

  const navClassName = [
    navOpen ? "header-nav--open" : "",
    dataMenuOpen ? "header-nav--dropdown-open" : "",
  ].filter(Boolean).join(" ");

  return (
    <header className="container">
      <div className="header-brand">
        <a href="/">
          <img src={logoImg} alt="DataCommon" />
        </a>
      </div>
      <nav
        id="site-navigation"
        className={navClassName || undefined}
        ref={navRef}
      >
        <ul>
            <li>
              <a
                className={handleActivePage(location.pathname, "/communities")}
                href="/communities"
              >
                Community Profiles
              </a>
            </li>
            <li
              className={`header-dropdown${dataMenuOpen ? " header-dropdown--open" : ""}`}
              ref={dataMenuRef}
            >
              <button
                type="button"
                className={`header-dropdown__trigger${dataMenuActive ? " active" : ""}`}
                aria-expanded={dataMenuOpen}
                aria-haspopup="true"
                onClick={() => {
                  setUserMenuOpen(false);
                  setDataMenuOpen((open) => !open);
                }}
              >
                Data
                <span className="header-dropdown__caret" aria-hidden="true" />
              </button>
              <ul className="header-dropdown__menu">
                {DATA_MENU_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      className={handleActivePage(location.pathname, link.href)}
                      href={link.href}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
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
      </nav>
      <div className="header-tools">
        {userName &&
          <>
            <div className="header-user-icon-container" onClick={() => {
              setDataMenuOpen(false);
              setNavOpen(false);
              setUserMenuOpen(!userMenuOpen);
            }} ref={userIconRef}>
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
                    <div className="user-icon-menu-row" onClick={() => navigateTo('/admin/muni-description')}>
                      <FontAwesomeIcon icon={faGear} />
                      <div>Admin</div>
                    </div>
                  }
                </>
              </div>
            }
          </>
        }
        <button
          type="button"
          className={`header-nav-toggle${navOpen ? " is-open" : ""}`}
          aria-expanded={navOpen}
          aria-controls="site-navigation"
          aria-label={navOpen ? "Close menu" : "Open menu"}
          ref={navToggleRef}
          onClick={() => {
            setUserMenuOpen(false);
            setDataMenuOpen(false);
            setNavOpen((open) => !open);
          }}
        >
          <span className="header-nav-toggle__icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
export { handleActivePage };

import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import logoImg from "../assets/images/logo.svg";

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
  const location = useLocation();
  const aboutDropdownRef = useRef(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const aboutIsActive = handleActivePage(location.pathname, "/about");

  const handleToggleAbout = event => {
    event.preventDefault();
    setIsAboutOpen(previous => !previous);
  };

  const closeAbout = () => setIsAboutOpen(false);

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        aboutDropdownRef.current &&
        !aboutDropdownRef.current.contains(event.target)
      ) {
        setIsAboutOpen(false);
      }
    };

    const handleEscape = event => {
      if (event.key === "Escape") {
        setIsAboutOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    closeAbout();
  }, [location.pathname]);

  return (
    <header className="container">
      <nav className={isAboutOpen ? "header-nav--dropdown-open" : undefined}>
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
            <li
              className={`header-dropdown${
                isAboutOpen ? " header-dropdown--open" : ""
              }`}
              ref={aboutDropdownRef}
            >
              <button
                className={`header-dropdown__trigger${
                  aboutIsActive ? " active" : ""
                }`}
                type="button"
                aria-haspopup="true"
                aria-expanded={isAboutOpen}
                onClick={handleToggleAbout}
              >
                About
                <span className="header-dropdown__caret" aria-hidden="true" />
              </button>
              <ul className="header-dropdown__menu">
                <li>
                  <a
                    className={handleActivePage(location.pathname, "/about/overview")}
                    href="/about/overview"
                    onClick={closeAbout}
                  >
                    Overview
                  </a>
                </li>
                <li>
                  <a
                    className={handleActivePage(location.pathname, "/about/update")}
                    href="/about/update"
                    onClick={closeAbout}
                  >
                    Update
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;
export { handleActivePage };

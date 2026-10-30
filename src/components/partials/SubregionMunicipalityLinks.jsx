import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import { muniProfileHref } from "../../utils/profileLinks";

const SubregionMunicipalityLinks = ({ municipalities, tab, tabLabel, regionLabel }) => {
  const sortedMunis = useMemo(
    () => [...municipalities].sort((a, b) =>
      String(a.muni_name || "").localeCompare(String(b.muni_name || ""), undefined, { sensitivity: "base" }),
    ),
    [municipalities],
  );

  if (!sortedMunis.length) return null;

  return (
    <section className="member-municipalities" aria-labelledby="member-municipalities-title">
      <div className="member-municipalities__header">
        <h3 id="member-municipalities-title" className="member-municipalities__title">
          Communities in {regionLabel}
        </h3>
        <p className="member-municipalities__hint">
          Open the {tabLabel} profile for any of these {sortedMunis.length} communities, or use
          {" "}<strong>See this chart for a community</strong> under each chart.
        </p>
      </div>
      <ul className="member-municipalities__list">
        {sortedMunis.map((muni) => (
          <li key={muni.muni_id || muni.muni_name}>
            <Link
              to={muniProfileHref(muni.muni_name, tab)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open the ${tabLabel} profile for ${muni.muni_name} in a new tab`}
            >
              {muni.muni_name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

SubregionMunicipalityLinks.propTypes = {
  municipalities: PropTypes.arrayOf(PropTypes.shape({
    muni_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    muni_name: PropTypes.string,
  })).isRequired,
  tab: PropTypes.string.isRequired,
  tabLabel: PropTypes.string.isRequired,
  regionLabel: PropTypes.string.isRequired,
};

export default SubregionMunicipalityLinks;

import { createContext } from "react";

export const muniProfileSlug = (muniName) =>
  String(muniName || "").toLowerCase().trim().replace(/\s+/g, "-");

export const chartAnchorId = (chart) => {
  const slug = String(chart?.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `chart-${slug}` : undefined;
};

export const muniProfileHref = (muniName, tab, chart) => {
  const anchor = chart ? chartAnchorId(chart) : undefined;
  return `/profile/${muniProfileSlug(muniName)}/${tab}${anchor ? `#${anchor}` : ""}`;
};

// Aggregate profiles provide { municipalities, tab } so each chart can link to the
// same chart on a member municipality's profile.
export const MemberMunicipalitiesContext = createContext(null);

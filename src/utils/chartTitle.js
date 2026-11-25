import capitalize from "./capitalize";

export function muniLabelFromSlug(muniSlug) {
  if (!muniSlug) return "this municipality";
  const lower = String(muniSlug).toLowerCase();
  if (lower === "manchester-by-the-sea") return "Manchester-by-the-Sea";
  return capitalize(lower.replace(/-/g, " "));
}

export function municipalityDisplayName({ muni, displayName, tableRow } = {}) {
  const fromRow = tableRow?.municipal;
  if (fromRow != null && String(fromRow).trim() !== "") {
    return String(fromRow).trim();
  }
  if (displayName) return displayName;
  return muniLabelFromSlug(muni);
}

/** @param {string | ((municipality: string) => string)} chartTitle */
export function resolveChartTitle(chart, context = {}) {
  const municipality = municipalityDisplayName(context);
  const chartTitle = chart?.title;
  if (typeof chartTitle === "function") {
    return chartTitle(municipality);
  }
  return chartTitle || "";
}
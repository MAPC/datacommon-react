/**
 * Latest year in an available-years list (string-sorted descending; works for
 * numeric years and ACS ranges like "2020-24").
 * @param {string[]} availableYears
 * @returns {string|null}
 */
export function getLatestAvailableYear(availableYears) {
  const years = (availableYears || []).map((year) => String(year)).filter(Boolean);
  if (!years.length) return null;
  return [...years].sort((a, b) => b.localeCompare(a))[0];
}

/**
 * Pre-select only the configured default years that exist in the available set.
 * When no defaults are configured, falls back to the latest available year.
 * @param {string[]} defaultSelectedYears
 * @param {string[]} availableYears
 */
export function resolveDefaultSelectedYears(defaultSelectedYears, availableYears) {
  const years = (availableYears || []).map((year) => String(year)).filter(Boolean);
  const defaults = (defaultSelectedYears || []).map((year) => String(year)).filter(Boolean);

  if (!years.length) {
    return defaults;
  }

  if (defaults.length) {
    const availableSet = new Set(years);
    const matched = defaults.filter((year) => availableSet.has(year));
    if (matched.length) return matched;
  }

  const latest = getLatestAvailableYear(years);
  return latest ? [latest] : [];
}

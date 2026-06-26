/**
 * Pre-select only the configured default years that exist in the available set.
 * @param {string[]} defaultSelectedYears
 * @param {string[]} availableYears
 */
export function resolveDefaultSelectedYears(defaultSelectedYears, availableYears) {
  const defaults = (defaultSelectedYears || []).map((year) => String(year));
  if (!availableYears.length) {
    return defaults;
  }
  const availableSet = new Set(availableYears.map((year) => String(year)));
  return defaults.filter((year) => availableSet.has(year));
}

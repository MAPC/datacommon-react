/**
 * Format "updated" string (e.g. "Dec 2017", "September 2018") as "2017/12", "2018/9".
 * Returns "N/A" for null, undefined, or empty.
 */

const MONTH_ABBR = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
const MONTH_FULL = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

function parseMonthYear(updatedStr) {
  if (updatedStr == null || String(updatedStr).trim() === '') return null;
  const s = String(updatedStr).trim();
  // Full month first (e.g. "September 2018")
  const fullMatch = s.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
  if (fullMatch) {
    const month = MONTH_FULL[fullMatch[1].charAt(0).toUpperCase() + fullMatch[1].slice(1).toLowerCase()];
    return month ? { year: fullMatch[2], month } : null;
  }
  // Abbreviation (e.g. "Dec 2017", "Sep 2017")
  const abbrMatch = s.match(/^(\w{3,4})\s+(\d{4})$/);
  if (abbrMatch) {
    const abbr = abbrMatch[1].charAt(0).toUpperCase() + abbrMatch[1].slice(1).toLowerCase();
    const month = MONTH_ABBR[abbr] ?? MONTH_ABBR[abbrMatch[1]];
    return month ? { year: abbrMatch[2], month } : null;
  }
  return null;
}

export function formatUpdated(updatedStr) {
  const parsed = parseMonthYear(updatedStr);
  if (!parsed) return updatedStr == null || String(updatedStr).trim() === '' ? 'N/A' : String(updatedStr).trim();
  return `${parsed.year}/${parsed.month}`;
}

export function parseUpdatedForSort(updatedStr) {
  const parsed = parseMonthYear(updatedStr);
  if (!parsed) return '';
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
}

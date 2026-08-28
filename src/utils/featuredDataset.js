import { compressDatasetsByGeography } from './manageDatasets';

const EXCLUDED_TABLE_NAMES = new Set(['_data_browser']);

/** to get the same featured dataset for all users each week. */
function getRandomFeaturedDatasetSeed() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((now - jan1) / 86400000) + 1;
  const week = Math.ceil((dayOfYear + jan1.getUTCDay()) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Turn the week seed (e.g. "2026-W12") into a list index. */
function weekSeedToIndex(weekSeed, datasetCount) {
  let total = 0;

  for (let i = 0; i < weekSeed.length; i += 1) {
    const charCode = weekSeed.charCodeAt(i);
    // use a prime number for the multiplier to avoid clustering
    total = total * 31 + charCode;
  }

  return Math.abs(total) % datasetCount;
}

/**
 * Pick one compressed dataset card for the current week.
 * Uses the full dataset list so multi-geography cards render correctly.
 */
export function pickDatasetOfTheWeek(datasets) {
  const eligible = (datasets).filter(
    d => d.table_name && !EXCLUDED_TABLE_NAMES.has(d.table_name),
  );
  const compressed = compressDatasetsByGeography(eligible);
  const sorted = [...compressed].sort((a, b) =>
    a.table_name.localeCompare(b.table_name),
  );

  if (sorted.length === 0) {
    return null;
  }

  const index = weekSeedToIndex(getRandomFeaturedDatasetSeed(), sorted.length);
  return sorted[index];
}

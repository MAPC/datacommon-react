import charts from "./charts";

const ACS_INTERNET = { tables: ["s2801_computer_internet_acs_m"], yearCol: "acs_year" };
const ENERGY = {
  tables: ["energy_masssave_elec_gas_ci_consumption_m", "energy_masssave_elec_gas_res_li_consumption_m"],
  yearCol: "cal_year",
  allYears: true,
  orderBy: ["sector"],
  regionRow: false,
  searchPlaceholder: "Filter by community, year, or sector",
};

/**
 * Where the per-community figures behind each RPA region profile chart come from, keyed by chart
 * topic and chart key. The columns themselves are the ones in the region's "view data" table
 * (the chart's region rows), so both tables always show the same fields.
 *
 * Each source is queried for its latest year across all member municipalities, unless `allYears`.
 * - `filters`: extra API filters, e.g. to pick one row per municipality.
 * - `exclude`: region-row columns that are not values (besides ids and the year column).
 * - `regionRow: false`: the table has no usable region row, so the region total is the sum of members
 *   (with `allYears`, no region rows are listed).
 * - `allYears`: list every year's rows as-is (one table row per source row, ordered by year then
 *   `orderBy`), like the region's long "view data" table. The region's own rows are listed first.
 * - `minYear`: with `allYears`, drop earlier years so the table covers the chart's year range.
 * - `regionFill`: values for columns the region's rows leave empty, matching constants the region's
 *   "view data" query selects (e.g. `12 as months_rep`).
 * - `searchPlaceholder`: search box hint; long tables also match text columns and years.
 */
const regionCommunityMetrics = {
  demographics: {
    race_ethnicity: { tables: ["b03002_race_ethnicity_acs_m"], yearCol: "acs_year" },
    pop_by_age: {
      tables: ["demo_race_by_age_gender_m"],
      yearCol: "years",
      filters: "race_eth:All Race/Ethnicity",
    },
  },
  "digital-equity": {
    no_computer_access: ACS_INTERNET,
    internet_access: ACS_INTERNET,
    smartphone_only: ACS_INTERNET,
    internet_usage_by_income: ACS_INTERNET,
    internet_subscription_types: ACS_INTERNET,
  },
  economy: {
    resident_employment: { tables: ["b23025_employment_acs_m"], yearCol: "acs_year" },
    emp_by_sector: {
      tables: ["econ_es202_naics_2d_m"],
      yearCol: "cal_year",
      allYears: true,
      orderBy: ["naicscode"],
      searchPlaceholder: "Filter by community, year, or NAICS name",
    },
  },
  education: {
    edu_attainment_by_race: { tables: ["c15002_educational_attainment_by_race_acs_m"], yearCol: "acs_year" },
  },
  environment: {
    energy_usage_gas: ENERGY,
    energy_usage_electricity: ENERGY,
  },
  housing: {
    cost_burden: { tables: ["b25091_b25070_costburden_acs_m"], yearCol: "acs_year" },
    units_permitted: {
      tables: ["hous_building_permits_m"],
      yearCol: "cal_year",
      allYears: true,
      minYear: 2001,
      regionFill: { months_rep: 12 },
      searchPlaceholder: "Filter by community or year",
    },
  },
  "public-health": {
    premature_mortality_rate: { tables: ["health_premature_mortality_race_m"], yearCol: "years" },
    hospitalizations: { tables: ["health_hospitalizations_hypertension_m"], yearCol: "cal_years" },
  },
  transportation: {
    daily_vmt: { tables: ["trans_mavc_public_summary_m"], yearCol: "quarter", regionRow: false },
    commute_to_work: { tables: ["b08301_means_transportation_to_work_by_residence_acs_m"], yearCol: "acs_year" },
  },
};

const sourcesByChart = new Map();
Object.entries(regionCommunityMetrics).forEach(([topic, topicCharts]) => {
  Object.entries(topicCharts).forEach(([chartKey, source]) => {
    const chart = charts[topic]?.[chartKey];
    if (chart) sourcesByChart.set(chart, { id: `${topic}.${chartKey}`, topic, source });
  });
});

/** Community figures config for a chart object from `constants/charts`, or null. */
export function communityMetricsForChart(chart) {
  return sourcesByChart.get(chart) || null;
}

export default regionCommunityMetrics;

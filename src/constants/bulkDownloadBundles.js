/**
 * Housing bundle tables.
 * to do should move it into database 
 */
export const HOUSING_BUNDLE_TABLES = [
  {
    table: "b25119_mhi_tenure_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B25119 — Median household income by tenure",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b01001_population_by_age_gender_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B01001 — Population by age and gender",
    defaultSelectedYears: ["2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b11005_hh_with_kids_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B11005 — Households with children",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b11007_hh_with_seniors_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B11007 — Households with seniors",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b15002_educational_attainment_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B15002 — Educational attainment",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b17017_poverty_by_hh_type_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B17017 — Poverty by household type",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b18101_thru_b18107_disability_status_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Tables B18101–B18107 — Disability status",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b19001_hh_income_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B19001 — Household income",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b19001_hh_income_race_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B19001 — Household income by race",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b19013_mhi_race_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B19013 — Median household income by race",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b19037_hh_income_by_age_race_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B19037 — Household income by age and race",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b25002_b25003_hu_occupancy_by_tenure_race_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Tables B25002/B25003 — Occupancy and tenure by race",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b25004_hu_vacancy_status_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B25004 — Housing unit vacancy status",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b25007_hh_tenure_by_age_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B25007 — Household tenure by age",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b25010_avg_hhsize_by_tenure_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B25010 — Average household size by tenure",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b25024_hu_units_in_structure_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B25024 — Housing units in structure",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b25031_median_rent_by_bedrooms_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B25031 — Median rent by bedrooms",
    defaultSelectedYears: ["2020-24", "2015-19", "2011-15"],
    yearColumn: "acs_year",
  },
  {
    table: "b25041_bedrooms_per_unit_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table B25041 — Bedrooms per unit",
    defaultSelectedYears: ["2020-24", "2015-19"],
    yearColumn: "acs_year",
  },
  {
    table: "b25072_b25093_costburden_by_age_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Tables B25072/B25093 — Cost burden by age",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "b25091_b25070_costburden_acs_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Tables B25091/B25070 — Cost burden by tenure",
    defaultSelectedYears: ["2020-24", "2015-19", "2010-14"],
    yearColumn: "acs_year",
  },
  {
    table: "census2020_2010_pop_hu_change_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "Decennial Census — Population and housing unit change, 2010–2020",
    defaultSelectedYears: [],
    yearColumn: "",
  },
  {
    table: "census2020_pl94_hu_occ_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "U.S. Decennial Census, 2020 — Housing unit occupancy",
    defaultSelectedYears: [],
    yearColumn: "",
  },
  {
    table: "demo_pop_estimates_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "Population estimates",
    defaultSelectedYears: ["2020-2024", "2020", "2015", "2010 Census"],
    yearColumn: "years",
  },
  {
    table: "demo_race_ethnicity_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "Decennial Census — Race and ethnicity",
    defaultSelectedYears: ["2020", "2010", "2000"],
    yearColumn: "years",
  },
  {
    table: "econ_es202_naics_2d_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ES-202 — Employment by NAICS (2-digit)",
    defaultSelectedYears: ["2024", "2023", "2022", "2021", "2020", "2015", "2010", "2005"],
    yearColumn: "cal_year",
  },
  {
    table: "educ_enrollment_by_year_districts",
    schema: "tabular",
    geoColumn: "district",
    source: "MADESE — Public school enrollment by district",
    defaultSelectedYears: [
      "2023-24", "2022-23", "2021-22", "2020-21", "2019-20",
      "2018-19", "2017-18", "2016-17", "2015-16", "2014-15",
    ],
    yearColumn: "schoolyear",
  },
  {
    table: "hous_building_permits_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "Census Building Permit Survey",
    defaultSelectedYears: [
      "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017",
      "2016", "2015", "2014", "2013", "2012", "2011", "2010", "2005", "2000",
    ],
    yearColumn: "cal_year",
  },
  {
    table: "hous_hh_income_by_cb_chas_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "HUD CHAS — Household income by cost burden",
    defaultSelectedYears: ["2018-22", "2013-17", "2008-12"],
    yearColumn: "acs_year",
  },
  {
    table: "hous_hh_income_by_hh_type_chas_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "HUD CHAS — Household income by household type",
    defaultSelectedYears: ["2018-22", "2013-17", "2008-12"],
    yearColumn: "acs_year",
  },
  {
    table: "hous_hh_type_by_cb_chas_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "HUD CHAS — Household type by cost burden",
    defaultSelectedYears: ["2018-22", "2013-17", "2008-12"],
    yearColumn: "acs_year",
  },
  {
    table: "hous_section8_income_limits_by_year_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "HUD — Section 8 income limits",
    defaultSelectedYears: ["2024", "2020", "2015", "2010", "2005", "2000"],
    yearColumn: "fy_year",
  },
  {
    table: "s2504_phys_characteristics_for_occ_housing_units_m",
    schema: "tabular",
    geoColumn: "municipal",
    source: "ACS 5-Year, Table S2504 — Physical characteristics of occupied housing",
    defaultSelectedYears: ["2020-24", "2015-19"],
    yearColumn: "acs_year",
  },
];

export const BULK_DOWNLOAD_BUNDLES = {
  housing: {
    id: "housing",
    title: "Housing Data",
    description:
      "Download data on demographics, housing cost, building permits, and economic tables for one or more municipalities.",
    geographyType: "municipality",
    geoColumn: "muni_name",
    maxTables: HOUSING_BUNDLE_TABLES.length,
    tables: HOUSING_BUNDLE_TABLES,
  },
};

/** check if the table has a year filter */
export function tableHasYearFilter(tableConfig) {
  return Boolean(tableConfig.yearColumn);
}

/** build the table entry for the bulk export request */
export function buildBulkExportTableEntry(tableConfig) {
  const hasYearFilter = tableHasYearFilter(tableConfig);
  const years = hasYearFilter
    ? (tableConfig.years ?? tableConfig.defaultSelectedYears ?? [])
        .map((year) => String(year).trim())
        .filter(Boolean)
    : [];

  const entry = {
    database: tableConfig.database || "ds",
    schema: tableConfig.schema || "tabular",
    table: tableConfig.table,
    geoColumn: tableConfig.geoColumn || "municipal",
    years,
  };

  if (hasYearFilter && years.length > 0) {
    entry.yearColumn = tableConfig.yearColumn;
  }

  return entry;
}

export function buildInitialYearsByTable(tables) {
  return Object.fromEntries(
    tables.map(({ table, defaultSelectedYears, yearColumn }) => [
      table,
      yearColumn ? [...defaultSelectedYears] : [],
    ]),
  );
}

/**
 * Resolve display title and source from _data_browser when available.
 * @param {BulkDownloadTable} tableConfig
 * @param {object[]} datasets
 */
export function getTableDisplayInfo(tableConfig, datasets = []) {
  const match = datasets.find((d) => d.table_name === tableConfig.table);

  return {
    title: match?.menu3 || tableConfig.source,
    source: match?.source || "",
  };
}

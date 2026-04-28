import colors from "./colors";
import locations from "./locations";

const notNothing = (d) => typeof d !== "undefined" && d != null;

const format = {
  string: {
    blank: () => "",
    default: (d) => (notNothing(d) ? String(d) : ""),
  },
  number: {
    thousands: (d) => (notNothing(d) ? `${(d / 1000).toFixed(0)}k` : ""),
    percentage: (d) => (notNothing(d) ? `${d * 100}%` : ""),
    integer: (d) => (notNothing(d) ? d.toFixed(0) : ""),
    nearestTenth: (d) => (notNothing(d) ? d.toFixed(1) : ""),
    ignoreFloat: (d) => (notNothing(d) && d % 1 == 0 ? d.toFixed(0) : ""),
    integerPercentage: (d) => (notNothing(d) ? `${(d * 100).toFixed(0)}%` : ""),
    // For charts where the data is already in percent (0-100), not a ratio (0-1)
    integerPercent: (d) => (notNothing(d) ? `${d.toFixed(0)}%` : ""),
    localeString: (d) => (notNothing(d) ? d.toLocaleString() : ""),
  },
};

const fetchLatestYear = async (queryString) => {
  const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
  const query = `${tabular_api}${queryString}`;
  try {
    const response = await fetch(query);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = (await response.json()) || {};
    return data.rows?.map((row) => row.latest_year) || [];
  } catch (error) {
    console.error("Error fetching latest year:", error);
    return [];
  }
};

const formatYearRange = (latestYear) => {
  if (!latestYear) return null;
  const yearStr = Array.isArray(latestYear) ? latestYear[0] : latestYear;
  // Handle ACS year range format (e.g., "2019-23")
  const [startStr, endStr] = yearStr.split("-");
  if (startStr && endStr) {
    const startYear = parseInt(startStr);
    const endYear = parseInt("20" + endStr);
    return `${startYear}-${endYear}`;
  }
  return yearStr;
};

const getFormattedYearRange = async (queryString) => {
  const latestYear = await fetchLatestYear(queryString);
  return formatYearRange(latestYear);
};

const eduAttainmentByRaceColumns = [
  "acs_year",
  "nhwlh",
  "nhwlh_me",
  "nhwlh_p",
  "nhwlh_mep",
  "nhwhs",
  "nhwhs_me",
  "nhwhs_p",
  "nhwhs_mep",
  "nhwsc",
  "nhwsc_me",
  "nhwsc_p",
  "nhwsc_mep",
  "nhwbd",
  "nhwbd_me",
  "nhwbd_p",
  "nhwbd_mep",
  "aalh",
  "aalh_me",
  "aalh_p",
  "aalh_mep",
  "aahs",
  "aahs_me",
  "aahs_p",
  "aahs_mep",
  "aasc",
  "aasc_me",
  "aasc_p",
  "aasc_mep",
  "aabd",
  "aabd_me",
  "aabd_p",
  "aabd_mep",
  "nalh",
  "nalh_me",
  "nalh_p",
  "nalh_mep",
  "nahs",
  "nahs_me",
  "nahs_p",
  "nahs_mep",
  "nasc",
  "nasc_me",
  "nasc_p",
  "nasc_mep",
  "nabd",
  "nabd_me",
  "nabd_p",
  "nabd_mep",
  "aslh",
  "aslh_me",
  "aslh_p",
  "aslh_mep",
  "ashs",
  "ashs_me",
  "ashs_p",
  "ashs_mep",
  "assc",
  "assc_me",
  "assc_p",
  "assc_mep",
  "asbd",
  "asbd_me",
  "asbd_p",
  "asbd_mep",
  "pilh",
  "pilh_me",
  "pihs",
  "pihs_me",
  "pihs_p",
  "pihs_mep",
  "pisc",
  "pisc_me",
  "pisc_p",
  "pisc_mep",
  "pibd",
  "pibd_me",
  "pibd_p",
  "pibd_mep",
  "othlh",
  "othlh_me",
  "othlh_p",
  "othlh_mep",
  "othhs",
  "othhs_me",
  "othhs_p",
  "othhs_mep",
  "othsc",
  "othsc_me",
  "othsc_p",
  "othsc_mep",
  "othbd",
  "othbd_me",
  "othbd_p",
  "othbd_mep",
  "mltlh",
  "mltlh_me",
  "mltlh_p",
  "mltlh_mep",
  "mlths",
  "mlths_me",
  "mlths_p",
  "mlths_mep",
  "mltsc",
  "mltsc_me",
  "mltsc_p",
  "mltsc_mep",
  "mltbd",
  "mltbd_me",
  "mltbd_p",
  "mltbd_mep",
  "latlh",
  "latlh_me",
  "latlh_p",
  "latlh_mep",
  "laths",
  "laths_me",
  "laths_p",
  "laths_mep",
  "latsc",
  "latsc_me",
  "latsc_p",
  "latsc_mep",
  "latbd",
  "latbd_me",
  "latbd_p",
  "latbd_mep",
];

const costBurdenColumns = [
  "acs_year",
  "o_notcb",
  "o_notcbme",
  "o_notcb_p",
  "o_notcbmep",
  "r_notcb",
  "r_notcbme",
  "r_notcb_p",
  "r_notcbmep",
  "ocb3050",
  "ocb3050me",
  "ocb3050_p",
  "ocb3050mep",
  "rcb3050",
  "rcb3050me",
  "rcb3050_p",
  "rcb3050mep",
  "cb_3050",
  "cb_3050_me",
  "cb_3050_p",
  "cb_3050mep",
  "o_cb50",
  "o_cb50me",
  "o_cb50_p",
  "o_cb50_mep",
  "r_cb50",
  "r_cb50me",
  "r_cb50_p",
  "r_cb50_mep"
];

const commuteToWorkColumns = [
  "acs_year",
  "ctvsngl",
  "ctvsnglme",
  "carpool",
  "carpoolme",
  "pub",
  "pub_me",
  "taxi",
  "taxi_me",
  "mcycle",
  "mcycle_me",
  "bicycle",
  "bicycleme",
  "walk",
  "walk_me",
  "other",
  "other_me",
];

const internetUsageByIncomeColumns = [
  "acs_year",
  "municipal",
  "lt20dia",
  "lt20diam",
  "lt20dia_p",
  "lt20dia_mp",
  "lt20nin",
  "lt20ninm",
  "lt20nin_p",
  "lt20nin_mp",
  "i2074di",
  "i2074dim",
  "i2074di_p",
  "i2074di_mp",
  "i2074ni",
  "i2074nim",
  "i2074ni_p",
  "i2074ni_mp",
  "mt74dia",
  "mt74diam",
  "mt74dia_p",
  "mt74dia_mp",
  "mt74nin",
  "mt74ninm",
  "mt74nin_p",
  "mt74nin_mp",
];

const internetSubscriptionTypesColumns = [
  "acs_year",
  "municipal",
  "dialo",
  "dialom",
  "dialo_p",
  "dialo_mp",
  "cdpinto",
  "cdpintom",
  "cdpinto_p",
  "cdpinto_mp",
  "bbfib",
  "bbfibm",
  "bbfib_p",
  "bbfib_mp",
];

const demoRaceByAgeGenderColumns = [
  "years",
  "race_eth",
  "pop",
  "pop_u18",
  "pop18_24",
  "pop25_34",
  "pop35_39",
  "pop40_44",
  "pop45_49",
  "pop50_54",
  "pop55_59",
  "pop60_64",
  "pop65_69",
  "pop70_74",
  "pop75_79",
  "pop80_84",
  "pop85o",
];

/**
 * True when chart metadata indicates American Community Survey (ACS) data.
 * Used for tooltips: "Estimate" / survey MOE wording instead of "Count" for tallies.
 */
export const chartSourceIsAcs = (chart) => {
  const s = chart?.source;
  if (typeof s !== "string" || !s.trim()) return false;
  return /american community survey/i.test(s) || /\bACS\b/i.test(s);
};

export default {
  demographics: {
    race_ethnicity: {
      type: "stacked-bar",
      title: "Race and Ethnicity",
      tooltip: { type: "countAndPercent" }, // Match Race and Ethnicity tooltip style: count + MOE and percent + percent MOE
      xAxis: { label: "5-Year Estimates" },
      yAxis: { label: "Population", format: format.number.localeString },
      tables: {
        "tabular.b03002_race_ethnicity_acs_m": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: [
            "acs_year",
            "nhwhi",
            "nhwhi_me",
            "nhwhi_p",
            "nhwhi_mep",
            "nh_mep",
            "nhaa",
            "nhaa_me",
            "nhaa_p",
            "nhaa_mep", 
            "nhna",
            "nhna_me",
            "nhna_p",
            "nhna_mep",
            "nhas",
            "nhas_me",
            "nhas_p",
            "nhas_mep",
            "nhpi",
            "nhpi_me",
            "nhpi_p",
            "nhpi_mep",
            "nhoth",
            "nhoth_me",
            "nhoth_p",
            "nhoth_mep",
            "nhmlt",
            "nhmlt_me",
            "nhmlt_p",
            "nhmlt_mep",
            "lat",
            "lat_me",
            "lat_p",
            "lat_mep",
            "totpop",
            "totpop_me",
          ],
        },
      },
      labels: {
        nhwhi: "Non-hispanic White",
        nhaa: "Non-hispanic Black or African American",
        nhas: "Non-Hispanic Asian",
        nhpi: "Non-Hispanic Native Hawaiian and Other Pacific Islander",
        nhoth:"Non-Hispanic Some Other Race",
        nhmlt:"Non-Hispanic Two or More Races",
        nhna:"Non-Hispanic American Indian and Alaska Native",
        lat: "Hispanic or Latino",
      },
      colors: {
        nhwhi: colors.CHART.EXTENDED.get("YELLOW"),
        nhaa: colors.CHART.EXTENDED.get("DARK_RED"),
        nhas: colors.CHART.EXTENDED.get("TEAL_GREEN"),
        nhpi: colors.CHART.EXTENDED.get("LIGHT_GREEN"),
        nhoth: colors.CHART.EXTENDED.get("GREEN"),
        nhmlt: colors.CHART.EXTENDED.get("CYAN"),
        nhna: colors.CHART.EXTENDED.get("BLUE"),
        lat: colors.CHART.EXTENDED.get("PINK"),
       
      },
      source: "American Community Survey",
      timeframe: async () => {
        let queryString = `SELECT acs_year as latest_year FROM tabular.b03002_race_ethnicity_acs_m ORDER BY acs_year DESC LIMIT 1`;
        return await getFormattedYearRange(queryString);
      },
      datasetLinks: { "Race and Ethnicity Estimates (Municipal)": 6 },
      transformer: (tables, chart) => {
        const raceEthnicityData = tables["tabular.b03002_race_ethnicity_acs_m"];
        const tableDef = chart.tables["tabular.b03002_race_ethnicity_acs_m"];
        if (raceEthnicityData.length < 1) {
          return [];
        }
        const row = raceEthnicityData[0];
        const toNumber = (v) => {
          if (v == null || v === "") return undefined;
          const n = Number(v);
          return Number.isFinite(n) ? n : undefined;
        };

        const groupings = {
          nhwhi: { value: toNumber(row.nhwhi), me: toNumber(row.nhwhi_me), pct: toNumber(row.nhwhi_p), pct_me: toNumber(row.nhwhi_mep) },
          nhaa: { value: toNumber(row.nhaa), me: toNumber(row.nhaa_me), pct: toNumber(row.nhaa_p), pct_me: toNumber(row.nhaa_mep) },
          nhas: { value: toNumber(row.nhas), me: toNumber(row.nhas_me), pct: toNumber(row.nhas_p), pct_me: toNumber(row.nhas_mep) },
          nhpi: { value: toNumber(row.nhpi), me: toNumber(row.nhpi_me), pct: toNumber(row.nhpi_p), pct_me: toNumber(row.nhpi_mep) },
          nhoth: { value: toNumber(row.nhoth), me: toNumber(row.nhoth_me), pct: toNumber(row.nhoth_p), pct_me: toNumber(row.nhoth_mep) },
          nhmlt: { value: toNumber(row.nhmlt), me: toNumber(row.nhmlt_me), pct: toNumber(row.nhmlt_p), pct_me: toNumber(row.nhmlt_mep) },
          nhna: { value: toNumber(row.nhna), me: toNumber(row.nhna_me), pct: toNumber(row.nhna_p), pct_me: toNumber(row.nhna_mep) },
          lat: { value: toNumber(row.lat), me: toNumber(row.lat_me), pct: toNumber(row.lat_p), pct_me: toNumber(row.lat_mep) },
        };
        return Object.keys(groupings).reduce(
          (set, key) =>
            tableDef.yearCol == key
              ? set
              : set.concat([
                  {
                    x: row[tableDef.yearCol],
                    y: groupings[key].value,
                    z: chart.labels[key],
                    color: chart.colors[key],
                    me: groupings[key].me,
                    totpop: row.totpop,
                    totpop_me: row.totpop_me,
                    pct: groupings[key].pct,
                    pct_me: groupings[key].pct_me,
                  },
                ]),
          [],
        );
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
                select 
              acs_year,
              nhwhi, nhwhi_me, nhwhi_p, nhwhi_mep,
              nhaa, nhaa_me, nhaa_p, nhaa_mep,
              nhna, nhna_me, nhna_p, nhna_mep,
              nhas, nhas_me, nhas_p, nhas_mep,
              nhpi, nhpi_me, nhpi_p, nhpi_mep,
              nhoth, nhoth_me, nhoth_p, nhoth_mep,
              nhmlt, nhmlt_me, nhmlt_p, nhmlt_mep,
              lat, lat_me, lat_p, lat_mep,
              totpop, totpop_me
            from 
            tabular.b03002_race_ethnicity_acs_m 
            where muni_id = '${subregionId}'
            AND acs_year = ( SELECT MAX(acs_year) 
                            FROM tabular.b03002_race_ethnicity_acs_m)
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
                select 
              acs_year,
              nhwhi, nhwhi_me, nhwhi_p, nhwhi_mep,
              nhaa, nhaa_me, nhaa_p, nhaa_mep,
              nhna, nhna_me, nhna_p, nhna_mep,
              nhas, nhas_me, nhas_p, nhas_mep,
              nhpi, nhpi_me, nhpi_p, nhpi_mep,
              nhoth, nhoth_me, nhoth_p, nhoth_mep,
              nhmlt, nhmlt_me, nhmlt_p, nhmlt_mep,
              lat, lat_me, lat_p, lat_mep,
              totpop, totpop_me
            from 
            tabular.b03002_race_ethnicity_acs_m 
            where muni_id = '${rpaId}'
            AND acs_year = ( SELECT MAX(acs_year) 
                            FROM tabular.b03002_race_ethnicity_acs_m)
        `;
        return queryString;
      },
    },
    pop_by_age: {
      type: "stacked-bar",
      title: "Population by Age",
      xAxis: { label: "Year" },
      yAxis: { label: "Population", format: format.number.localeString },
      tables: {
        "tabular.demo_race_by_age_gender_m": {
          yearCol: "years",
          latestYearOnly: true,
          columns: demoRaceByAgeGenderColumns,
        },
      },
      labels: {
        pop_u18: "Under 18",
        pop18_24: "18-24",
        pop25_34: "25-34",
        pop35_49: "35-49",
        pop50_64: "50-64",
        pop65_74: "65-74",
        pop75o: "75 and over",
      },
      source: "2020 Census",
      timeframe: async () => {
        let queryString = `SELECT years as latest_year FROM tabular.demo_race_by_age_gender_m ORDER BY years DESC LIMIT 1`;
        return await getFormattedYearRange(queryString);
      },
      datasetLinks: { "Race and Ethnicity by Gender and Age Groups (Municipal)": 315 },
      transformer: (tables, chart) => {
        const popData = tables["tabular.demo_race_by_age_gender_m"];
        if (popData.length < 1) {
          return [];
        }
        // For aggregated data (subregion/RPA), race_eth is already filtered in query
        // For municipal data, filter for "All Race/Ethnicity"
        console.log("popData", popData);
        const row = popData.filter((r) => r.race_eth === "All Race/Ethnicity")[0] || popData[0];
       
        const data = {
          pop_u18: row.pop_u18,
          pop18_24: row.pop18_24,
          pop25_34: row.pop25_34,
          pop35_49: row.pop35_39 + row.pop40_44 + row.pop45_49,
          pop50_64: row.pop50_54 + row.pop55_59 + row.pop60_64,
          pop65_74: row.pop65_69 + row.pop70_74,
          pop75o: row.pop75_79 + row.pop80_84 + row.pop85o,
        };
        return Object.keys(data).map((k) => ({
          x: row[chart.tables["tabular.demo_race_by_age_gender_m"].yearCol],
          y: data[k],
          z: chart.labels[k],
          totpop: row.pop,
        }));
      },
      subregionDataQuery: (subregionId) => {
        const selectList = demoRaceByAgeGenderColumns.join(",");
        const queryString = `
          SELECT
            ${selectList}
          FROM tabular.demo_race_by_age_gender_m
          WHERE muni_id = '${subregionId}'
            AND race_eth = 'All Race/Ethnicity'
          ORDER BY years DESC
          LIMIT 1
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
          SELECT
            d.years,
            SUM(d.pop) as pop,
            SUM(d.pop_u18) as pop_u18,
            SUM(d.pop18_24) as pop18_24,
            SUM(d.pop25_34) as pop25_34,
            SUM(d.pop35_39) as pop35_39,
            SUM(d.pop40_44) as pop40_44,
            SUM(d.pop45_49) as pop45_49,
            SUM(d.pop50_54) as pop50_54,
            SUM(d.pop55_59) as pop55_59,
            SUM(d.pop60_64) as pop60_64,
            SUM(d.pop65_69) as pop65_69,
            SUM(d.pop70_74) as pop70_74,
            SUM(d.pop75_79) as pop75_79,
            SUM(d.pop80_84) as pop80_84,
            SUM(d.pop85o) as pop85o
          FROM tabular.demo_race_by_age_gender_m d
          JOIN tabular._datakeys_muni_all k ON d.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
            AND d.race_eth = 'All Race/Ethnicity'
          GROUP BY d.years
          ORDER BY d.years DESC
          LIMIT 1
        `;
        return queryString;
      },
    },
  },
  economy: {
    resident_employment: {
      type: "stacked-bar",
      title: "Employment of Residents",
      tooltip: { type: "countAndPercent", showTotals: true },
      xAxis: { label: "5-Year Estimates", format: format.string.default },
      yAxis: { label: "Population", format: format.number.localeString },
      tables: {
        "tabular.b23025_employment_acs_m": {
          yearCol: "acs_year",
          years: async () => {
            let queryString = `SELECT distinct(acs_year) as latest_year FROM tabular.b23025_employment_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 2`;
            const years = await fetchLatestYear(queryString);
            return years;
          },
          columns: ["acs_year", "emp", "emp_me","emp_p","emp_mep","unemp", "unemp_me", "unemp_p","unemp_mep","clf", "clf_me","clf_p","clf_mep"],
        },
      },
      labels: {
        emp: "Employed",
        unemp: "Unemployed",
      },
      source: "American Community Survey",
      timeframe: async () => {
        let queryString = `SELECT acs_year as latest_year FROM tabular.b23025_employment_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 2`;
        const years = await fetchLatestYear(queryString);
        if (!years || years.length < 2) return "";
        const [latest, previous] = years;

        // Convert year ranges from '2019-23' format to '2019-2023 5-Year Estimates' format
        const formatYearRange = (yearStr) => {
          const [start, end] = yearStr.split("-");
          return `${start}-20${end}`;
        };

        return `${formatYearRange(previous)} and ${formatYearRange(latest)} 5-Year Estimates`;
      },
      datasetLinks: { "Labor Force (Municipal)": 129 },
      transformer: (tables, chart) => {
        const empData = tables["tabular.b23025_employment_acs_m"];
        if (empData.length < 1) {
          return [];
        }
        return empData.reduce(
          (acc, row) =>
            acc.concat(
              Object.keys(chart.labels).map((key) => ({
                x: row[chart.tables["tabular.b23025_employment_acs_m"].yearCol],
                y: row[key],
                z: chart.labels[key],
                me: row[`${key}_me`],
                pct: row[`${key}_p`],
                pct_me: row[`${key}_mep`],
                totpop: row.clf,
                totpop_me: row.clf_me,
              })),
            ),
          [],
        );
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
         SELECT 
            acs_year, 
            emp,
            emp_me,
            emp_p,
            emp_mep,
            unemp,
            unemp_me,
            unemp_p,
            unemp_mep,
            clf,
            clf_me,
            clf_p,
            clf_mep
        FROM tabular.b23025_employment_acs_m 
        WHERE muni_id ='${subregionId}' order by acs_year desc limit 2 
        `
        return queryString;
      },
    },
    emp_by_sector: {
      type: "stacked-area",
      title: "Employment by Industry",
      xAxis: { label: "Year", format: format.string.default },
      yAxis: {
        label: "Employment by Industry",
        format: format.number.localeString,
      },
      tables: {
        "tabular.econ_es202_naics_2d_m": {
          yearCol: "cal_year",
          columns: ["cal_year", "naicstitle", "naicscode", "avgemp"],
        },
      },
      labels: {
        "11+21": "Agriculture, Forestry, Fishing, Hunting, and Mining",
        22: "Construction",
        "31-33": "Manufacturing",
        "42+44-45": "Wholesale and Retail Trade",
        "22+48-49": "Transportation, warehousing, and utilities",
        51: "Information",
        "52+53": "Finance, Insurance, Real Estate, and Rental and Leasing",
        "54+55+56": "Professional, technical, management, administrative, and waste management services",
        "61+62": "Education, health, and social services",
        "71+72": "Arts, entertainment, recreation, accommodation, and food services",
        81: "Other services (other than public administration)",
        92: "Public administration",
      },
      source: "Executive Office of Labor and Workforce Development (EOLWD)",
      timeframe: async () => {
        let queryString = `SELECT cal_year as latest_year FROM tabular.econ_es202_naics_2d_m GROUP BY cal_year ORDER BY cal_year`;
        const years = await fetchLatestYear(queryString);
        if (!years || years.length === 0) return "";
        return `${years[0]}-${years[years.length - 1]}`;
      },
      datasetLinks: {
        "2 Digit Sector: Employment & Avg Wkly Wages (Municipal)": 387,
      },
      transformer: (tables, chart) => {
        const indData = tables["tabular.econ_es202_naics_2d_m"];
        if (indData.length < 1) {
          return [];
        }
        const mapping = {};
        indData.forEach((row) => {
          if (!mapping[row.cal_year]) {
            mapping[row.cal_year] = {};
          }
          mapping[row.cal_year][row.naicscode] = row.avgemp || 0;
        });

        const combineCategories = (year) => {
          const getOrZero = (obj, key) => obj[key] || 0;
          return {
            "11+21": getOrZero(year, "11") + getOrZero(year, "21"),
            22: getOrZero(year, "22"),
            "31-33": getOrZero(year, "31-33"),
            "42+44-45": getOrZero(year, "42") + getOrZero(year, "44-45"),
            "22+48-49": getOrZero(year, "22") + getOrZero(year, "48-49"),
            51: getOrZero(year, "51"),
            "52+53": getOrZero(year, "52") + getOrZero(year, "53"),
            "54+55+56": getOrZero(year, "54") + getOrZero(year, "55") + getOrZero(year, "56"),
            "61+62": getOrZero(year, "61") + getOrZero(year, "62"),
            "71+72": getOrZero(year, "71") + getOrZero(year, "72"),
            81: getOrZero(year, "81"),
            92: getOrZero(year, "92"),
          };
        };
        const data = Object.keys(mapping).reduce((acc, year) => {
          const yearData = combineCategories(mapping[year]);
          return acc.concat(
            Object.keys(yearData).map((key) => ({
              x: parseInt(year),
              y: yearData[key],
              z: chart.labels[key],
            })),
          );
        }, []);
        return data;
      },
      subregionDataQuery: (subregionId) => {
       const queryString = `
          SELECT 
            cal_year, 
            naicstitle, 
            naicscode, 
            avgemp
          FROM tabular.econ_es202_naics_2d_m 
          WHERE muni_id = '${subregionId}'
          AND naicstitle IS NOT NULL
          ORDER BY cal_year, naicstitle;
       `;
       return queryString;
      },
      rparegionDataQuery: (rpaId) => {
       const queryString = `
          SELECT 
            cal_year, 
            naicstitle, 
            naicscode, 
            avgemp
          FROM tabular.econ_es202_naics_2d_m 
          WHERE muni_id = '${rpaId}'
          AND naicstitle IS NOT NULL
          ORDER BY cal_year, naicstitle;
       `;
       return queryString;
      },
    },
  },
  education: {
    school_enrollment: {
      type: "stacked-bar",
      title: "School Enrollment",
      xAxis: { label: "Year", format: format.string.default },
      yAxis: { label: "Enrollment", format: format.string.default },
      tables: {
        "tabular.educ_enrollment_by_year_districts": {
          specialFetch: async (municipality, dispatchUpdate) => {
            const spatial_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=gisdata&query=`;
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const gis_query =
              `${spatial_api}` +
              "SELECT districtid, district, madisttype, town_reg, municipal " +
              "FROM mapc.school_districts_poly " +
              "JOIN mapc.ma_municipalities " +
              "ON ST_Intersects(mapc.school_districts_poly.shape, mapc.ma_municipalities.shape) " +
              "WHERE " +
              `municipal ilike '${municipality}' ` +
              "AND madisttype in ('Local School', 'Regional Academic') " +
              "AND (ST_Area(ST_Intersection(mapc.school_districts_poly.shape, mapc.ma_municipalities.shape)) / ST_Area(mapc.ma_municipalities.shape)) > 0.5";
            const gis_response = await fetch(gis_query);
            
            if (!gis_response.ok) {
              throw new Error(`HTTP error! status: ${gis_response.status}`);
            }
            
            const gis_payload = (await gis_response.json()) || {};
            if (!gis_payload.rows || gis_payload.rows.length < 1) {
              return dispatchUpdate([]);
            }
            const districtIds = gis_payload.rows.map((district) => `'${district.districtid}'`);
            const query =
              `${tabular_api}` +
              "SELECT district, districtid, schoolyear, grade_k, grade_1," +
              "grade_2, grade_3, grade_4, grade_5, grade_6, grade_7, grade_8," +
              "grade_9, grade_10, grade_11, grade_12 " +
              "FROM tabular.educ_enrollment_by_year_districts " +
              `WHERE districtid IN (${districtIds.join(",")})`;
            const response = await fetch(query);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const payload = (await response.json()) || {};
            return dispatchUpdate(payload.rows);
          },
        },
      },
      labels: {
        grade_k: { label: "Kindergarden", order: 0 },
        grade_1: { label: "1st Grade", order: 1 },
        grade_2: { label: "2nd Grade", order: 2 },
        grade_3: { label: "3rd Grade", order: 3 },
        grade_4: { label: "4th Grade", order: 4 },
        grade_5: { label: "5th Grade", order: 5 },
        grade_6: { label: "6th Grade", order: 6 },
        grade_7: { label: "7th Grade", order: 7 },
        grade_8: { label: "8th Grade", order: 8 },
        grade_9: { label: "9th Grade", order: 9 },
        grade_10: { label: "10th Grade", order: 10 },
        grade_11: { label: "11th Grade", order: 11 },
        grade_12: { label: "12th Grade", order: 12 },
      },
      source: "MA Department of Elementary and Secondary Education",
      timeframe: async () => {
        let queryString = `WITH years AS (
          SELECT DISTINCT schoolyear 
          FROM tabular.educ_enrollment_by_year_districts
        )
        SELECT CONCAT(LEFT(MIN(schoolyear), 4), '-', RIGHT(MAX(schoolyear), 2)) AS latest_year
        FROM years;`;
        const years = await fetchLatestYear(queryString);
        if (!years || years.length === 0) return "";
        return `${years[0].split("-")[0]}-${"20" + years[0].split("-")[1]}`;
      },
      datasetLinks: { "Enrollment by School Year (School Districts)": 320 },
      transformer: (tables, chart) => {
        const rows = tables["tabular.educ_enrollment_by_year_districts"];
        if (rows.length < 1) {
          return [];
        }
        const data = rows.reduce(
          (acc, district) =>
            acc.concat(
              Object.keys(district).reduce(
                (group, key) =>
                  key == "district" || key == "districtid" || key == "schoolyear"
                    ? group
                    : group.concat([
                        {
                          x: `${district.schoolyear} ${district.district}`,
                          y: district[key],
                          z: chart.labels[key].label,
                          order: chart.labels[key].order,
                        },
                      ]),
                [],
              ),
            ),
          [],
        );
        return data;
      },
      subregionDataQuery: (subregionId) => {
        // School enrollment data is complex - it requires spatial joins to get districts
        // For now, returning empty query as this needs special handling for subregions
        const queryString = ``;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        // School enrollment data is complex - it requires spatial joins to get districts
        // For now, returning empty query as this needs special handling for RPA regions
        const queryString = ``;
        return queryString;
      },
    },
    edu_attainment_by_race: {
      type: "grouped-bar",
      title: "Educational Attainment by Race",
      tooltip: { type: "percentAndCount" },
      xAxis: {
        label: "Level of Education",
        format: format.string.default,
        sort: (a, b) => {
          const order = [
            "Less than high school diploma",
            "High school diploma",
            "Some college or associate degree",
            "Bachelor degree or higher",
          ];
          return order.indexOf(a) - order.indexOf(b);
        },
      },
      yAxis: {
        label: "Attainment (%)",
        format: (d) => {
          if (d == null || isNaN(d)) return "";
          const num = Number(d);
          return `${num.toFixed(1)}%`;
        },
      },
      tables: {
        "tabular.c15002_educational_attainment_by_race_acs_m": {
          yearCol: "acs_year",
          columns: [
            "acs_year",
            "nhwlh",
            "nhwlh_me",
            "nhwlh_p",
            "nhwlh_mep",
            "nhwhs",
            "nhwhs_me",
            "nhwhs_p",
            "nhwhs_mep",
            "nhwsc",
            "nhwsc_me",
            "nhwsc_p",
            "nhwsc_mep",
            "nhwbd",
            "nhwbd_me",
            "nhwbd_p",
            "nhwbd_mep",
            "aalh",
            "aalh_me",
            "aalh_p",
            "aalh_mep",
            "aahs",
            "aahs_me",
            "aahs_p",
            "aahs_mep",
            "aasc",
            "aasc_me",
            "aasc_p",
            "aasc_mep",
            "aabd",
            "aabd_me",
            "aabd_p",
            "aabd_mep",
            "nalh",
            "nalh_me",
            "nalh_p",
            "nalh_mep",
            "nahs",
            "nahs_me",
            "nahs_p",
            "nahs_mep",
            "nasc",
            "nasc_me",  
            "nasc_p",
            "nasc_mep",
            "nabd",
            "nabd_me",  
            "nabd_p",
            "nabd_mep",
            "aslh",
            "aslh_me",
            "aslh_p",
            "aslh_mep",
            "ashs",
            "ashs_me",  
            "ashs_p",
            "ashs_mep",
            "assc", 
            "assc_me",    
            "assc_p",
            "assc_mep",
            "asbd",
            "asbd_me",
            "asbd_p",
            "asbd_mep",
            "pilh",
            "pilh_me",
            "pihs",
            "pihs_me",
            "pihs_p",
            "pihs_mep",
            "pisc",
            "pisc_me",
            "pisc_p",
            "pisc_mep",
            "pibd",
            "pibd_me",
            "pibd_p",
            "pibd_mep",
            "othlh",
            "othlh_me",
            "othlh_p",
            "othlh_mep",
            "othhs",
            "othhs_me", 
            "othhs_p",
            "othhs_mep",
            "othsc",
            "othsc_me",
            "othsc_p",
            "othsc_mep",
            "othbd",
            "othbd_me",
            "othbd_p",
            "othbd_mep",
            "mltlh",
            "mltlh_me",
            "mltlh_p",
            "mltlh_mep",
            "mlths",
            "mlths_me",
            "mlths_p",
            "mlths_mep",
            "mltsc",
            "mltsc_me",
            "mltsc_p",
            "mltsc_mep",
            "mltbd",
            "mltbd_me",
            "mltbd_p",
            "mltbd_mep",
            "latlh",
            "latlh_me",
            "latlh_p",
            "latlh_mep",
            "laths",
            "laths_me",
            "laths_p",
            "laths_mep",
            "latsc",
            "latsc_me",
            "latsc_p",
            "latsc_mep",
            "latbd",  
            "latbd_me",
            "latbd_p",
            "latbd_mep",
          ],  
        },
      },
      labels: {
        lh: "Less than high school diploma",
        hs: "High school diploma",
        sc: "Some college or associate degree",
        bd: "Bachelor degree or higher",
        nhw: "Non-Hispanic White",
        aa: "Black or African American",
        na: "American Indian and Alaska Native",
        as: "Asian",
        pi: "Pacific Islander",
        oth: "Other race",
        mlt: "Multi-race",
        lat: "Hispanic or Latino",
      },
      colors: {
        nhw: colors.CHART.EXTENDED.get("YELLOW"),
        aa: colors.CHART.EXTENDED.get("DARK_RED"),
        na: colors.CHART.EXTENDED.get("BLUE"),
        as: colors.CHART.EXTENDED.get("TEAL_GREEN"),
        pi: colors.CHART.EXTENDED.get("LIGHT_GREEN"),
        oth: colors.CHART.EXTENDED.get("CYAN"),
        mlt: colors.CHART.EXTENDED.get("LIGHT_BLUE"),
        lat: colors.CHART.EXTENDED.get("PINK"),
      },
      source: "American Community Survey",
      timeframe: async () => {
        let queryString = `SELECT acs_year as latest_year FROM tabular.c15002_educational_attainment_by_race_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 1`;
        const years = await fetchLatestYear(queryString);
        return formatYearRange(years);
      },
      datasetLinks: { "Educational Attainment by Race (Municipal)": 202 },
      transformer: (tables, chart) => {
        const eduData = tables["tabular.c15002_educational_attainment_by_race_acs_m"];
        if (!eduData || eduData.length < 1) return [];
  
        const row = eduData[eduData.length - 1] 
        const raceKeys = ["nhw", "aa", "na", "as", "pi", "oth", "mlt", "lat"];
        const eduKeys = ["lh", "hs", "sc", "bd"];

        const toNumber = (v) => {
          if (v == null || v === "") return 0;
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        const toMeNumber = (v) => {
          if (v == null || v === "") return undefined;
          const n = Number(v);
          return Number.isFinite(n) ? n : undefined;
        };

        // One bar per (education level, race). Bars are colored by race.
        return raceKeys.reduce((raceAcc, race, raceIdx) => {
          return raceAcc.concat(
            eduKeys.reduce((eduAcc, edu) => {
              return eduAcc.concat([
                {
                  x: chart.labels[edu],
                  y: toNumber(row[`${race}${edu}_p`]), // attainment percent (0-100)
                  z: chart.labels[race],
                  me: toMeNumber(row[`${race}${edu}_mep`]), // percent margin of error
                  count: toNumber(row[`${race}${edu}`]),
                  countMarginOfError: toMeNumber(row[`${race}${edu}_me`]),
                  color: chart.colors?.[race],
                  order: raceIdx,
                },
              ]);
            }, []),
          );
        }, []);
      },
      subregionDataQuery: (subregionId) => {
        const selectList = eduAttainmentByRaceColumns.join(",");
        const queryString = `
          SELECT
            ${selectList}
          FROM tabular.c15002_educational_attainment_by_race_acs_m
          WHERE muni_id = ${subregionId}
          ORDER BY acs_year DESC
          LIMIT 1
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
          SELECT 
            e.acs_year,
            SUM(e.nhwlh) as nhwlh, SUM(e.nhwlh_me) as nhwlh_me, SUM(e.nhwlh_p) as nhwlh_p, SUM(e.nhwlh_mep) as nhwlh_mep,
            SUM(e.nhwhs) as nhwhs, SUM(e.nhwhs_me) as nhwhs_me, SUM(e.nhwhs_p) as nhwhs_p, SUM(e.nhwhs_mep) as nhwhs_mep,
            SUM(e.nhwsc) as nhwsc, SUM(e.nhwsc_me) as nhwsc_me, SUM(e.nhwsc_p) as nhwsc_p, SUM(e.nhwsc_mep) as nhwsc_mep,
            SUM(e.nhwbd) as nhwbd, SUM(e.nhwbd_me) as nhwbd_me, SUM(e.nhwbd_p) as nhwbd_p, SUM(e.nhwbd_mep) as nhwbd_mep,
            SUM(e.aalh) as aalh, SUM(e.aalh_me) as aalh_me, SUM(e.aalh_p) as aalh_p, SUM(e.aalh_mep) as aalh_mep,
            SUM(e.aahs) as aahs, SUM(e.aahs_me) as aahs_me, SUM(e.aahs_p) as aahs_p, SUM(e.aahs_mep) as aahs_mep,
            SUM(e.aasc) as aasc, SUM(e.aasc_me) as aasc_me, SUM(e.aasc_p) as aasc_p, SUM(e.aasc_mep) as aasc_mep,
            SUM(e.aabd) as aabd, SUM(e.aabd_me) as aabd_me, SUM(e.aabd_p) as aabd_p, SUM(e.aabd_mep) as aabd_mep,
            SUM(e.nalh) as nalh, SUM(e.nalh_me) as nalh_me, SUM(e.nalh_p) as nalh_p, SUM(e.nalh_mep) as nalh_mep,
            SUM(e.nahs) as nahs, SUM(e.nahs_me) as nahs_me, SUM(e.nahs_p) as nahs_p, SUM(e.nahs_mep) as nahs_mep,
            SUM(e.nasc) as nasc, SUM(e.nasc_me) as nasc_me, SUM(e.nasc_p) as nasc_p, SUM(e.nasc_mep) as nasc_mep,
            SUM(e.nabd) as nabd, SUM(e.nabd_me) as nabd_me, SUM(e.nabd_p) as nabd_p, SUM(e.nabd_mep) as nabd_mep,
            SUM(e.aslh) as aslh, SUM(e.aslh_me) as aslh_me, SUM(e.aslh_p) as aslh_p, SUM(e.aslh_mep) as aslh_mep,
            SUM(e.ashs) as ashs, SUM(e.ashs_me) as ashs_me, SUM(e.ashs_p) as ashs_p, SUM(e.ashs_mep) as ashs_mep,
            SUM(e.assc) as assc, SUM(e.assc_me) as assc_me, SUM(e.assc_p) as assc_p, SUM(e.assc_mep) as assc_mep,
            SUM(e.asbd) as asbd, SUM(e.asbd_me) as asbd_me, SUM(e.asbd_p) as asbd_p, SUM(e.asbd_mep) as asbd_mep,
            SUM(e.pilh) as pilh, SUM(e.pilh_me) as pilh_me, SUM(e.pilh_p) as pilh_p, SUM(e.pilh_mep) as pilh_mep,
            SUM(e.pihs) as pihs, SUM(e.pihs_me) as pihs_me, SUM(e.pihs_p) as pihs_p, SUM(e.pihs_mep) as pihs_mep,
            SUM(e.pisc) as pisc, SUM(e.pisc_me) as pisc_me, SUM(e.pisc_p) as pisc_p, SUM(e.pisc_mep) as pisc_mep,
            SUM(e.pibd) as pibd, SUM(e.pibd_me) as pibd_me, SUM(e.pibd_p) as pibd_p, SUM(e.pibd_mep) as pibd_mep,
            SUM(e.othlh) as othlh, SUM(e.othlh_me) as othlh_me, SUM(e.othlh_p) as othlh_p, SUM(e.othlh_mep) as othlh_mep,
            SUM(e.othhs) as othhs, SUM(e.othhs_me) as othhs_me, SUM(e.othhs_p) as othhs_p, SUM(e.othhs_mep) as othhs_mep,
            SUM(e.othsc) as othsc, SUM(e.othsc_me) as othsc_me, SUM(e.othsc_p) as othsc_p, SUM(e.othsc_mep) as othsc_mep,
            SUM(e.othbd) as othbd, SUM(e.othbd_me) as othbd_me, SUM(e.othbd_p) as othbd_p, SUM(e.othbd_mep) as othbd_mep,
            SUM(e.mltlh) as mltlh, SUM(e.mltlh_me) as mltlh_me, SUM(e.mltlh_p) as mltlh_p, SUM(e.mltlh_mep) as mltlh_mep,
            SUM(e.mlths) as mlths, SUM(e.mlths_me) as mlths_me, SUM(e.mlths_p) as mlths_p, SUM(e.mlths_mep) as mlths_mep,
            SUM(e.mltsc) as mltsc, SUM(e.mltsc_me) as mltsc_me, SUM(e.mltsc_p) as mltsc_p, SUM(e.mltsc_mep) as mltsc_mep,
            SUM(e.mltbd) as mltbd, SUM(e.mltbd_me) as mltbd_me, SUM(e.mltbd_p) as mltbd_p, SUM(e.mltbd_mep) as mltbd_mep,
            SUM(e.latlh) as latlh, SUM(e.latlh_me) as latlh_me, SUM(e.latlh_p) as latlh_p, SUM(e.latlh_mep) as latlh_mep,
            SUM(e.laths) as laths, SUM(e.laths_me) as laths_me, SUM(e.laths_p) as laths_p, SUM(e.laths_mep) as laths_mep,
            SUM(e.latsc) as latsc, SUM(e.latsc_me) as latsc_me, SUM(e.latsc_p) as latsc_p, SUM(e.latsc_mep) as latsc_mep,
            SUM(e.latbd) as latbd, SUM(e.latbd_me) as latbd_me, SUM(e.latbd_p) as latbd_p, SUM(e.latbd_mep) as latbd_mep
          FROM tabular.c15002_educational_attainment_by_race_acs_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
          AND e.acs_year = (
            SELECT MAX(acs_year)
            FROM tabular.c15002_educational_attainment_by_race_acs_m
          )
          GROUP BY e.acs_year
        `;
        return queryString;
      },
    },
  },
  governance: {
    tax_levy: {
      type: "pie",
      title: "Share of Tax Revenue by Source",
      xAxis: { label: "Year" },
      yAxis: { label: "Attainment" },
      tables: {
        "tabular.econ_municipal_taxes_revenue_m": {
          yearCol: "fy",
          latestYearOnly: true,
          columns: ["fy", "res_taxes", "os_taxes", "comm_taxes", "ind_taxes", "p_prop_tax", "tot_rev"],
        },
      },
      labels: {
        res_taxes: "Residential",
        os_taxes: "Open Space",
        comm_taxes: "Commercial",
        ind_taxes: "Industrial",
        p_prop_tax: "Personal Property",
        other: "Non-Property",
      },
      source: "MA Dept. of Revenue",
      timeframe: async () => {
        let queryString = `SELECT fy as latest_year FROM tabular.econ_municipal_taxes_revenue_m GROUP BY fy ORDER BY fy DESC LIMIT 1`;
        const years = await fetchLatestYear(queryString);
        return years[0];
      },
      datasetLinks: {
        "Municipal General Fund Revenue and Taxes (Municipal)": 383,
      },
      transformer: (tables, chart) => {
        const taxData = tables["tabular.econ_municipal_taxes_revenue_m"];
        if (taxData.length < 1) {
          return [];
        }
        const row = taxData[0];
        const directRev = ["res_taxes", "os_taxes", "comm_taxes", "ind_taxes", "p_prop_tax"];
        /*  const withImplied = Object.assign(row, {
          other: row.tot_rev - directRev.reduce((sum, k) => sum + row[k], 0),
        }); */
        const withImplied = Object.assign({}, row, {
          other: row.tot_rev - directRev.reduce((sum, k) => sum + (row[k] || 0), 0),
        });
        return Object.keys(chart.labels).map((key) => ({
          value: withImplied[key],
          label: chart.labels[key],
        }));
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
            SELECT 
              fy,
              res_taxes,
              os_taxes,
              comm_taxes,
              ind_taxes,
              p_prop_tax,
               tot_rev
          FROM tabular.econ_municipal_taxes_revenue_m
          WHERE muni_id  = '${subregionId}'
          AND fy = (
              SELECT MAX(fy) 
              FROM tabular.econ_municipal_taxes_revenue_m
              WHERE muni_id IN (
                  SELECT muni_id 
                  FROM tabular._datakeys_muni_all 
                  WHERE subrg_id = ${subregionId}
              )
          )
        `;
        return queryString;
      },
    },
  },
  environment: {
    water_usage_per_cap: {
      type: "line",
      title: "Water Usage per Capita",
      xAxis: { label: "Year", format: format.number.integer, ticks: 7 },
      yAxis: {
        label: "Resident Gallons per Capita Day",
        format: format.number.nearestTenth,
        min: 0,
      },
      tables: {
        "tabular.env_dep_reviewed_water_demand_m": {
          columns: ["rgpcd2009", "rgpcd2010", "rgpcd2011", "rgpcd2012", "rgpcd2013", "rgpcd2014", "rgpcd2015"],
        },
      },
      labels: {},
      source: "MassDEP",
      timeframe: "2009-15",
      datasetLinks: { "Annual Average Residential Water Use (Municipal)": 260 },
      transformer: (tables, chart) => {
        const waterData = tables["tabular.env_dep_reviewed_water_demand_m"];
        if (waterData.length < 1) {
          return [
            {
              label: "Water Useage per Capita",
              values: [],
            },
          ];
        }
        const row = waterData[0];
        const pairs = [
          [2009, "rgpcd2009"],
          [2010, "rgpcd2010"],
          [2011, "rgpcd2011"],
          [2012, "rgpcd2012"],
          [2013, "rgpcd2013"],
          [2014, "rgpcd2014"],
          [2015, "rgpcd2015"],
        ];
        return [
          {
            label: "Water Usage per Capita",
            values: pairs.reduce((acc, [year, key]) => (row[key] ? acc.concat([[year, row[key]]]) : acc), []),
          },
        ];
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT
            SUM(w.rgpcd2009) as rgpcd2009,
            SUM(w.rgpcd2010) as rgpcd2010,
            SUM(w.rgpcd2011) as rgpcd2011,
            SUM(w.rgpcd2012) as rgpcd2012,
            SUM(w.rgpcd2013) as rgpcd2013,
            SUM(w.rgpcd2014) as rgpcd2014,
            SUM(w.rgpcd2015) as rgpcd2015
          FROM tabular.env_dep_reviewed_water_demand_m w
          JOIN tabular._datakeys_muni_all k ON w.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
          SELECT
            SUM(w.rgpcd2009) as rgpcd2009,
            SUM(w.rgpcd2010) as rgpcd2010,
            SUM(w.rgpcd2011) as rgpcd2011,
            SUM(w.rgpcd2012) as rgpcd2012,
            SUM(w.rgpcd2013) as rgpcd2013,
            SUM(w.rgpcd2014) as rgpcd2014,
            SUM(w.rgpcd2015) as rgpcd2015
          FROM tabular.env_dep_reviewed_water_demand_m w
          JOIN tabular._datakeys_muni_all k ON w.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
        `;
        return queryString;
      },
    },
    energy_usage_gas: {
      type: "stacked-area",
      title: "Thermal Energy Usage (Gas, oil, etc.)",
      xAxis: { label: "Year", format: format.number.ignoreFloat, ticks: 3 },
      yAxis: { label: "Energy Costs ($)" },
      tables: {
        "tabular.energy_masssave_elec_gas_ci_consumption_m": {
          yearCol: "cal_year",
          columns: ["cal_year", "sector", "mwh_use", "therm_use"],
        },
        "tabular.energy_masssave_elec_gas_res_li_consumption_m": {
          yearCol: "cal_year",
          columns: ["cal_year", "sector", "mwh_use", "therm_use"],
        },
      },
      labels: {
        therm_use: "Annual Therm Usage",
      },
      source: "MassSave",
      timeframe: async () => {
        let queryString = `WITH years AS (
    SELECT DISTINCT cal_year 
    FROM tabular.energy_masssave_elec_gas_ci_consumption_m
)
SELECT CONCAT(MIN(cal_year), '-', MAX(cal_year)) AS latest_year FROM years;`;
        const years = await fetchLatestYear(queryString);

        return years[0];
      },
      datasetLinks: {
        "MassSave Comm & Industrial Incentives and Savings (Municipal)": 251,
        "MassSave Res & Low Income Incentives and Savings (Municipal)": 252,
      },
      transformer: (tables, chart) => {
        const commData = tables["tabular.energy_masssave_elec_gas_ci_consumption_m"];
        const resData = tables["tabular.energy_masssave_elec_gas_res_li_consumption_m"];
        const rows = commData.concat(resData);
        if (rows.length < 1) {
          return [];
        }
        const data = rows.reduce(
          (acc, row) =>
            acc.concat([
              {
                x: row.cal_year,
                y: row.therm_use,
                z: `${row.sector} ${chart.labels.therm_use}`,
              },
            ]),
          [],
        );
        return data;
      },
      subregionDataQuery: (subregionId) => {
        const queryString1 = `
          SELECT
            e.cal_year,
            e.sector,
            SUM(e.mwh_use) as mwh_use,
            SUM(e.therm_use) as therm_use
          FROM tabular.energy_masssave_elec_gas_ci_consumption_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
          GROUP BY e.cal_year, e.sector
          ORDER BY e.cal_year
        `;
        const queryString2 = `
          SELECT
            e.cal_year,
            e.sector,
            SUM(e.mwh_use) as mwh_use,
            SUM(e.therm_use) as therm_use
          FROM tabular.energy_masssave_elec_gas_res_li_consumption_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
          GROUP BY e.cal_year, e.sector
          ORDER BY e.cal_year
        `;
        return [queryString1, queryString2];
      },
      rparegionDataQuery: (rpaId) => {
        const queryString1 = `
          SELECT
            e.cal_year,
            e.sector,
            SUM(e.mwh_use) as mwh_use,
            SUM(e.therm_use) as therm_use
          FROM tabular.energy_masssave_elec_gas_ci_consumption_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
          GROUP BY e.cal_year, e.sector
          ORDER BY e.cal_year
        `;
        const queryString2 = `
          SELECT
            e.cal_year,
            e.sector,
            SUM(e.mwh_use) as mwh_use,
            SUM(e.therm_use) as therm_use
          FROM tabular.energy_masssave_elec_gas_res_li_consumption_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
          GROUP BY e.cal_year, e.sector
          ORDER BY e.cal_year
        `;
        return [queryString1, queryString2];
      },
    },
    energy_usage_electricity: {
      type: "stacked-area",
      title: "Electrical Energy Usage",
      xAxis: { label: "Year", format: format.number.ignoreFloat },
      yAxis: { label: "Energy Costs ($)" },
      tables: {
        "tabular.energy_masssave_elec_gas_ci_consumption_m": {
          yearCol: "cal_year",
          columns: ["cal_year", "sector", "mwh_use", "therm_use"],
        },
        "tabular.energy_masssave_elec_gas_res_li_consumption_m": {
          yearCol: "cal_year",
          columns: ["cal_year", "sector", "mwh_use", "therm_use"],
        },
      },
      labels: {
        mwh_use: "Annual MWh Usage",
      },
      source: "MassSave",
      timeframe: async () => {
        let queryString = `WITH years AS (
    SELECT DISTINCT cal_year 
    FROM tabular.energy_masssave_elec_gas_ci_consumption_m
)
SELECT CONCAT(MIN(cal_year), '-', MAX(cal_year)) AS latest_year FROM years;`;
        const years = await fetchLatestYear(queryString);
        return years[0];
      },
      datasetLinks: {
        "MassSave Comm & Industrial Incentives and Savings (Municipal)": 251,
        "MassSave Res & Low Income Incentives and Savings (Municipal)": 252,
      },
      transformer: (tables, chart) => {
        const commData = tables["tabular.energy_masssave_elec_gas_ci_consumption_m"];
        const resData = tables["tabular.energy_masssave_elec_gas_res_li_consumption_m"];
        const rows = commData.concat(resData);
        if (rows.length < 1) {
          return [];
        }
        return rows.reduce(
          (acc, row) =>
            row.mwh_use
              ? acc.concat([
                  {
                    x: row.cal_year,
                    y: row.mwh_use,
                    z: `${row.sector} ${chart.labels.mwh_use}`,
                  },
                ])
              : acc,
          [],
        );
      },
      subregionDataQuery: (subregionId) => {
        const queryString1 = `
          SELECT
            e.cal_year,
            e.sector,
            SUM(e.mwh_use) as mwh_use,
            SUM(e.therm_use) as therm_use
          FROM tabular.energy_masssave_elec_gas_ci_consumption_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
          GROUP BY e.cal_year, e.sector
          ORDER BY e.cal_year
        `;
        const queryString2 = `
          SELECT
            e.cal_year,
            e.sector,
            SUM(e.mwh_use) as mwh_use,
            SUM(e.therm_use) as therm_use
          FROM tabular.energy_masssave_elec_gas_res_li_consumption_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
          GROUP BY e.cal_year, e.sector
          ORDER BY e.cal_year
        `;
        return [queryString1, queryString2];
      },
      rparegionDataQuery: (rpaId) => {
        const queryString1 = `
          SELECT
            e.cal_year,
            e.sector,
            SUM(e.mwh_use) as mwh_use,
            SUM(e.therm_use) as therm_use
          FROM tabular.energy_masssave_elec_gas_ci_consumption_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
          GROUP BY e.cal_year, e.sector
          ORDER BY e.cal_year
        `;
        const queryString2 = `
          SELECT
            e.cal_year,
            e.sector,
            SUM(e.mwh_use) as mwh_use,
            SUM(e.therm_use) as therm_use
          FROM tabular.energy_masssave_elec_gas_res_li_consumption_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
          GROUP BY e.cal_year, e.sector
          ORDER BY e.cal_year
        `;
        return [queryString1, queryString2];
      },
    },
  },
  housing: {
    cost_burden: {
      type: "grouped-bar",
      title: "Housing Cost Burden",
      tooltip: { type: "percentAndCount" },
      xAxis: { label: "Cost Burden Categories" },
      yAxis: {
        label: "Owner-Renter Ratio",
        format: format.number.integerPercent,
      },
      tables: {
        "tabular.b25091_b25070_costburden_acs_m": {
          yearCol: "acs_year",
          years: async () => {
            let queryString = `SELECT DISTINCT(acs_year) as latest_year FROM tabular.b25091_b25070_costburden_acs_m ORDER BY acs_year DESC LIMIT 1`;
            const years = await fetchLatestYear(queryString);
            return years;
          },
          columns: costBurdenColumns,
        },
      },
      labels: {
        not_cb: "Not Cost Burdened",
        p3050: "Paying 30-50% of Income",
        "p50+": "Paying 50%+ of Income",
        owner: "Owner Occupied",
        renter: "Renter Occupied",
      },
      source: "American Community Survey",
      timeframe: async () => {
        let queryString = `SELECT DISTINCT acs_year as latest_year FROM tabular.b25091_b25070_costburden_acs_m ORDER BY acs_year DESC LIMIT 1`;
        const years = await fetchLatestYear(queryString);
        return formatYearRange(years);
      },
      datasetLinks: { "Cost Burdened Households (Municipal)": 185 },
      transformer: (tables, chart) => {
        const costData = tables["tabular.b25091_b25070_costburden_acs_m"];
        if (costData.length < 1) {
          return [];
        }
        const row = costData[0];
        return [
          { // % of Owner not cost burdened
            x: chart.labels.not_cb,
            y: row.o_notcb_p,
            // Percentage MOE
            me: row.o_notcbmep,
            count: row.o_notcb,
            // Count MOE
            countMarginOfError: row.o_notcbme,
            z: chart.labels.owner,
          },
          { // % of Renter not cost burdened
            x: chart.labels.not_cb,
            y: row.r_notcb_p,
            me: row.r_notcbmep,
            count: row.r_notcb,
            countMarginOfError: row.r_notcbme,
            z: chart.labels.renter,
          },
          { // %  of Owner paying 30-50% of income 
            x: chart.labels.p3050,
            y: row.ocb3050_p,
            me: row.ocb3050mep,
            count: row.ocb3050,
            countMarginOfError: row.ocb3050me,
            z: chart.labels.owner,
          },
          { // % of Renter paying 30-50% of income 
            x: chart.labels.p3050,
            y: row.rcb3050_p,
            me: row.rcb3050mep,
            count: row.rcb3050,
            countMarginOfError: row.rcb3050me,
            z: chart.labels.renter,
          },
          { // % of Owner paying 50%+ of income
            x: chart.labels["p50+"],
            y: row.o_cb50_p,
            me: row.o_cb50_mep,
            count: row.o_cb50,
            countMarginOfError: row.o_cb50me,
            z: chart.labels.owner,
          },
          { // % of Renter paying 50%+ of income
            x: chart.labels["p50+"],
            y: row.r_cb50_p,
            me: row.r_cb50_mep,
            count: row.r_cb50,
            countMarginOfError: row.r_cb50me,
            z: chart.labels.renter,
          },
        ];
      },
      subregionDataQuery: (subregionId) => {
        const selectList = costBurdenColumns.join(",");
        const queryString = `
        SELECT
            ${selectList}
        FROM tabular.b25091_b25070_costburden_acs_m
        WHERE muni_id = '${subregionId}'
        AND acs_year = (
            SELECT MAX(acs_year) 
            FROM tabular.b25091_b25070_costburden_acs_m
        )
        `;
        return queryString;
      },
    },
    units_permitted: {
      type: "stacked-area",
      title: "Housing Units Permitted",
      xAxis: {
        label: "Year",
        format: format.string.default,
        sort: (a, b) => parseInt(a) - parseInt(b),
      },
      yAxis: { label: "Units Permitted" },
      tables: {
        "tabular.hous_building_permits_m": {
          yearCol: "cal_year",
          where: "cal_year >= 2001 AND cal_year <= 2023 order by cal_year",
          columns: ["cal_year", "months_rep", "sf_units", "mf_units"],
        },
      },
      labels: {
        sf_units: "Single Family Units",
        mf_units: "Multi Family Units",
      },
      source: "Census Building Permit Survey",
      caveat: "*Ignoring years for which the municipality did not report all 12 months.",
      timeframe: async () => {
        let queryString = `WITH years AS (
            SELECT DISTINCT cal_year 
            FROM tabular.hous_building_permits_m 
            WHERE cal_year >= 2001 
        )
        SELECT CONCAT(MIN(cal_year), '-', MAX(cal_year)) AS latest_year
        FROM years;`;
        const years = await fetchLatestYear(queryString);
        return years[0];
      },
      datasetLinks: { "Building Permits by Type and Year (Municipal)": 384 },
      transformer: (tables, chart) => {
        const [offset, numYears] = [2001, 23];
        const permitData = tables["tabular.hous_building_permits_m"].filter((row) => row.months_rep === 12);
        const tableDef = chart.tables["tabular.hous_building_permits_m"];
        if (permitData.length < 1) {
          return [];
        }
        let rowIndex = 0;
        const allData = new Array(numYears);
        for (let yearIndex = 0; yearIndex < numYears; yearIndex += 1) {
          if (permitData[rowIndex] && permitData[rowIndex][tableDef.yearCol] == offset + yearIndex) {
            allData[yearIndex] = permitData[rowIndex];
            rowIndex += 1;
          } else {
            allData[yearIndex] = {
              [tableDef.yearCol]: `${offset + yearIndex}*`,
              mf_units: 0,
              sf_units: 0,
            };
          }
        }
        return allData.reduce(
          (acc, year) =>
            acc.concat([
              {
                x: String(year[tableDef.yearCol]),
                y: year.mf_units,
                z: chart.labels.mf_units,
              },
              {
                x: String(year[tableDef.yearCol]),
                y: year.sf_units,
                z: chart.labels.sf_units,
              },
            ]),
          [],
        );
      },
      subregionDataQuery: (subregionId) => {
        const queryString=`
        SELECT
            cal_year,
            12 as months_rep,
            sf_units
            mf_units
          FROM tabular.hous_building_permits_m where muni_id ='${subregionId}'
		  and cal_year >=2001 and cal_year <=2023 
        `
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        //TODO: check the logic for rparegionDataQuery for the correct query string
        const queryString = `
          SELECT
            h.cal_year,
            12 as months_rep,
            SUM(h.sf_units) as sf_units,
            SUM(h.mf_units) as mf_units
          FROM tabular.hous_building_permits_m h
          JOIN tabular._datakeys_muni_all k ON h.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
            AND h.cal_year >= 2001 
            AND h.cal_year <= 2023
            AND h.months_rep = 12
          GROUP BY h.cal_year
          ORDER BY h.cal_year
        `;
        return queryString;
      },
    },
  },
  "public-health": {
    premature_mortality_rate: {
      type: "stacked-bar",
      title: "Premature Mortality Rate by Race",
      xAxis: { label: "Race" },
      yAxis: { 
        label: "Age Adjusted Rate per 100,000",
        format: (d) => {
          if (d == null || d === '') return d;
          const num = Number(d);
          if (isNaN(num)) return d;
          // Only show 2 decimals if there is a decimal part
          return num % 1 === 0 ? num.toString() : num.toFixed(2);
        }
      },
      tables: {
        "tabular.health_premature_mortality_race_m": {
          yearCol: "years",
          years: async () => {
            let queryString = `select distinct(years) as latest_year from tabular.health_premature_mortality_race_m order by years desc limit 1`;
            const years = await fetchLatestYear(queryString);
            return years;
          },
          columns: [
            "years",
            "whi_art",
            "whi_artlci",
            "whi_artuci",
            "aa_art",
            "aa_artlci",
            "aa_artuci",
            "api_art",
            "api_artlci",
            "api_artuci",
            "na_art",
            "na_artlci",
            "na_artuci",
            "oth_art",
            "oth_artlci",
            "oth_artuci",
            "lat_art",
            "lat_artlci",
            "lat_artuci",
          ],
        },
      },
      abbreviations: {
        whi_art: "W",
        aa_art: "B & AA",
        api_art: "A & PA",
        na_art: "NA",
        oth_art: "Other",
        lat_art: "H & L",
      },
      labels: {
        whi_art: "White (W)",
        aa_art: "Black and African American (B & AA)",
        api_art: "Asian and Pacific Islander (A & PA)",
        na_art: "Native American (NA)",
        oth_art: "Other (Other)",
        lat_art: "Hispanic and Latino (H & L)",
      },
      colors: {
        whi_art: colors.CHART.EXTENDED.get("YELLOW"),
        aa_art: colors.CHART.EXTENDED.get("DARK_RED"),
        api_art: colors.CHART.EXTENDED.get("TEAL_GREEN"),
        na_art: colors.CHART.EXTENDED.get("CYAN"),
        oth_art: colors.CHART.EXTENDED.get("BLUE"),
        lat_art: colors.CHART.EXTENDED.get("PINK"),
      },
      source: "MA Dept. of Public Health",
      timeframe: async () => {
        let queryString = `select distinct(years) as latest_year from tabular.health_premature_mortality_race_m order by years desc limit 1`;
        const years = await fetchLatestYear(queryString);
        return years[0] + " 5-year averages";
      },
      datasetLinks: { "Premature Mortality (Municipal)": 386 },
      transformer: (tables, chart) => {
        const premoData = tables["tabular.health_premature_mortality_race_m"];
        if (premoData.length < 1) {
          return [];
        }
        const row = premoData[0];
        const raceKeys = ["whi_art", "aa_art", "api_art", "na_art", "oth_art", "lat_art"];
        return raceKeys.reduce(
          (acc, key) =>
            acc.concat([
              {
                x: chart.abbreviations[key],
                y: row[key] || 0,
                z: chart.labels[key],
                color: chart.colors[key],
              },
            ]),
          [],
        );
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT 
            h.years,
            AVG(h.whi_art) as whi_art,
            AVG(h.aa_art) as aa_art,
            AVG(h.api_art) as api_art,
            AVG(h.na_art) as na_art,
            AVG(h.oth_art) as oth_art,
            AVG(h.lat_art) as lat_art
          FROM tabular.health_premature_mortality_race_m h
          JOIN tabular._datakeys_muni_all k ON h.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
            AND h.years = (
              SELECT MAX(years)
              FROM tabular.health_premature_mortality_race_m
            )
          GROUP BY h.years
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
          SELECT 
            h.years,
            AVG(h.whi_art) as whi_art,
            AVG(h.aa_art) as aa_art,
            AVG(h.api_art) as api_art,
            AVG(h.na_art) as na_art,
            AVG(h.oth_art) as oth_art,
            AVG(h.lat_art) as lat_art
          FROM tabular.health_premature_mortality_race_m h
          JOIN tabular._datakeys_muni_all k ON h.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
            AND h.years = (
              SELECT MAX(years)
              FROM tabular.health_premature_mortality_race_m
            )
          GROUP BY h.years
        `;
        return queryString;
      },
    },
    hospitalizations: {
      type: "stacked-bar",
      title: "Hypertension Hospitalizations by Race",
      xAxis: { label: "Cause", format: format.string.default },
      yAxis: {
        label: "Age Adjusted Rate per 100,000",
        format: (d) => {
          if (d == null || d === '') return '';
          const num = parseFloat(d);
          if (isNaN(num)) return d;
          // Only show 2 decimals if there is a decimal part
          if (num % 1 === 0) {
            return num.toFixed(0);
          }
          return num.toFixed(2);
        }
      },
      tables: {
        // TODO: Heart failure data not loaded at this time.
        // 'tabular.health_hospitalizations_heart_failure_m': {
        //   yearCol: 'cal_years',
        //   columns: [
        //     'cal_years',
        //     'whi_num',
        //     'aa_num',
        //     'api_num',
        //     'na_num',
        //     'oth_num',
        //     'lat_num',
        //   ],
        // },
        "tabular.health_hospitalizations_hypertension_m": {
          yearCol: "cal_years",
          years: async () => {
            let queryString = `select distinct(cal_years) as latest_year from tabular.health_hospitalizations_hypertension_m order by cal_years desc limit 1`;
            const years = await fetchLatestYear(queryString);
            return years;
          },
          columns: ["cal_years", "whi_arte", "aa_arte", "api_arte", "na_arte", "oth_arte", "lat_arte"],
        },
      },
      abbreviations: {
        whi_arte: "W",
        aa_arte: "B & AA",
        api_arte: "A & PA",
        na_arte: "NA",
        oth_arte: "Other",
        lat_arte: "H & L",
      },
      labels: {
        whi_arte: "White (W)",
        aa_arte: "Black and African American (B & AA)",
        api_arte: "Asian and Pacific Islander (A & PA)",
        na_arte: "Native American (NA)",
        oth_arte: "Other (Other)",
        lat_arte: "Hispanic and Latino (H & L)",
      },
      colors: {
        whi_arte: colors.CHART.EXTENDED.get("YELLOW"),
        aa_arte: colors.CHART.EXTENDED.get("DARK_RED"),
        api_arte: colors.CHART.EXTENDED.get("TEAL_GREEN"),
        na_arte: colors.CHART.EXTENDED.get("CYAN"),
        oth_arte: colors.CHART.EXTENDED.get("BLUE"),
        lat_arte: colors.CHART.EXTENDED.get("PINK"),
      },
      source: "MA Dept. of Public Health",
      timeframe: async () => {
        let queryString = `select distinct(cal_years) as latest_year from tabular.health_hospitalizations_hypertension_m order by cal_years desc limit 1`;
        const years = await fetchLatestYear(queryString);
        return years[0] + " 5-year averages";
      },
      datasetLinks: {
        "Hypertension Related Hospitalizations (Municipal)": 385,
      },
      transformer: (tables, chart) => {
        const hyperData = tables["tabular.health_hospitalizations_hypertension_m"];
        if (hyperData.length < 1) {
          return [];
        }
        const row = hyperData[0];
        const raceKeys = ["whi_arte", "aa_arte", "api_arte", "na_arte", "oth_arte", "lat_arte"];
        return raceKeys.reduce(
          (acc, key) =>
            acc.concat([
              {
                x: chart.abbreviations[key],
                y: row[key],
                z: chart.labels[key],
                color: chart.colors[key],
              },
            ]),
          [],
        );
        return [];
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT 
            h.cal_years,
            h.whi_arte,
            h.aa_arte,
            h.api_arte,
            h.na_arte,
            h.oth_arte,
            h.lat_arte
          FROM tabular.health_hospitalizations_hypertension_m h
          JOIN tabular._datakeys_muni_all k ON h.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
            AND h.cal_years = (
              SELECT MAX(cal_years)
              FROM tabular.health_hospitalizations_hypertension_m
            )
          ORDER BY h.muni_id
          LIMIT 1
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
          SELECT 
            h.cal_years,
            h.whi_arte,
            h.aa_arte,
            h.api_arte,
            h.na_arte,
            h.oth_arte,
            h.lat_arte
          FROM tabular.health_hospitalizations_hypertension_m h
          JOIN tabular._datakeys_muni_all k ON h.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
            AND h.cal_years = (
              SELECT MAX(cal_years)
              FROM tabular.health_hospitalizations_hypertension_m
            )
          ORDER BY h.muni_id
          LIMIT 1
        `;
        return queryString;
      },
    },
  },
  transportation: {
    daily_vmt: {
      type: "stacked-area",
      title: "Daily Vehicle Miles Traveled per Household",
      xAxis: { label: "Year", format: format.string.default, ticks: 3 },
      yAxis: { label: "Daily household vehicle miles traveled" },
      tables: {
        "tabular.trans_mavc_public_summary_m": {
          columns: ["quarter", "hh_est", "pass_vmt", "comm_vmt"],
        },
      },
      labels: {
        pass_vmt_hh: "Passenger vehicles",
        comm_vmt_hh: "Commercial vehicles",
      },
      source: "MAPC and MA RMV",
      timeframe: async () => {
        let queryString = `WITH years AS (
            SELECT DISTINCT quarter 
            FROM tabular.trans_mavc_public_summary_m
        )
        SELECT CONCAT(LEFT(MIN(quarter), 4), '-', LEFT(MAX(quarter), 4)) AS latest_year
        FROM years;`;
        const years = await fetchLatestYear(queryString);
        return years[0];
      },
      datasetLinks: {
        "Massachusetts Vehicle Municipal Summary Statistics (Municipal)": 330,
      },
      transformer: (tables, chart) => {
        const vmtData = tables["tabular.trans_mavc_public_summary_m"];
        if (vmtData.length < 1) {
          return [];
        }
        const quarterToYear = (quarter) => {
          const [year, fourth] = quarter.split("_q");
          return parseInt(year) + parseInt(fourth) / 4;
        };
        return vmtData.reduce(
          (acc, row) =>
            acc.concat([
              {
                x: quarterToYear(row.quarter),
                y: row.pass_vmt / row.hh_est,
                z: chart.labels.pass_vmt_hh,
              },
              {
                x: quarterToYear(row.quarter),
                y: row.comm_vmt / row.hh_est,
                z: chart.labels.comm_vmt_hh,
              },
            ]),
          [],
        );
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT
            t.quarter,
            SUM(t.hh_est) as hh_est,
            SUM(t.pass_vmt) as pass_vmt,
            SUM(t.comm_vmt) as comm_vmt
          FROM tabular.trans_mavc_public_summary_m t
          JOIN tabular._datakeys_muni_all k ON t.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
          GROUP BY t.quarter
          ORDER BY t.quarter
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
          SELECT
            t.quarter,
            SUM(t.hh_est) as hh_est,
            SUM(t.pass_vmt) as pass_vmt,
            SUM(t.comm_vmt) as comm_vmt
          FROM tabular.trans_mavc_public_summary_m t
          JOIN tabular._datakeys_muni_all k ON t.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}'
          GROUP BY t.quarter
          ORDER BY t.quarter
        `;
        return queryString;
      },
    },
    commute_to_work: {
      type: "pie",
      title: "Commute to Work",
      tables: {
        "tabular.b08301_means_transportation_to_work_by_residence_acs_m": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: commuteToWorkColumns,
        },
      },
      labels: {
        ctvsngl: "Drive alone to work",
        carpool: "Carpool",
        pub: "Public transportation",
        taxi: "Taxi",
        mcycle: "Motorcycle",
        bicycle: "Bicycle",
        walk: "Walk",
        other: "Other",
      },
      source: "American Community Survey",
      timeframe: async () => {
        let queryString = `select distinct(acs_year) as latest_year from tabular.b08301_means_transportation_to_work_by_residence_acs_m order by acs_year desc limit 1`;
        const years = await fetchLatestYear(queryString);
        return formatYearRange(years);
      },
      datasetLinks: { "Transportation to Work from Residence (Municpal)": 38 },
      transformer: (tables, chart) => {
        const commData = tables["tabular.b08301_means_transportation_to_work_by_residence_acs_m"];
        if (commData.length < 1) {
          return [];
        }
        const row = commData[0];
       
        return Object.keys(chart.labels).map((key) => ({
          value: row[key],
          label: chart.labels[key],
          count: row[key],
          countMarginOfError: row[`${key}me`] !== undefined ? row[`${key}me`] : row[`${key}_me`]
          
        }));
      },
      subregionDataQuery: (subregionId) => {
        const selectList = commuteToWorkColumns.join(", ");
        const queryString = `
          SELECT ${selectList}
          FROM tabular.b08301_means_transportation_to_work_by_residence_acs_m
          WHERE muni_id = '${subregionId}'
          ORDER BY acs_year DESC
          LIMIT 1
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
       /*  const queryString = `
          SELECT 
           
          FROM tabular.b08301_means_transportation_to_work_by_residence_acs_m c
          JOIN tabular._datakeys_muni_all k ON c.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}' 
            AND c.acs_year = (
              SELECT MAX(acs_year) 
              FROM tabular.b08301_means_transportation_to_work_by_residence_acs_m
            )
          GROUP BY c.acs_year
        `;
        return queryString; */
      },
    },
  },
  "digital-equity": {
    no_computer_access: {
      type: "gauge",
      title: "Percent Household Has No Computer Devices",
      minValue: 0,
      maxValue: 100,
      valueColor: "#44aa44",
      backgroundColor: "#e0e0e0",
      showUnit: true,
      unit: "%",
      showLabels: true,
      valueFormat: (d) => d.toFixed(1),
      width: 500,
      height: 400,
      tables: {
        "tabular.s2801_computer_internet_acs_m_noint": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: ["acs_year", "muni_id", "municipal", "nocmp_p", "nocmp_mp"],
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            // fetch muni county and massachusetts for view/download data
            const queryString = `
              WITH city_county_id AS (
                    SELECT county_id
                    FROM tabular._datakeys_muni_all
                    WHERE muni_name ILIKE '${municipalityFormatted}%'
                ),
                latest_data AS (
                    SELECT *
                    FROM tabular.s2801_computer_internet_acs_m
                    WHERE acs_year = (SELECT MAX(acs_year) FROM tabular.s2801_computer_internet_acs_m)
                )
                SELECT acs_year, muni_id, municipal, nocmp, nocmpm, nocmp_p, nocmp_mp
                FROM latest_data t
                WHERE t.muni_id IN (SELECT county_id FROM city_county_id)
                  OR t.municipal ILIKE '${municipalityFormatted}%'
                  OR t.muni_id = 353
            `;
            
            const response = await fetch(`${tabular_api}${encodeURIComponent(queryString)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const payload = (await response.json()) || {};
            const rows = payload.rows || [];

            // Sort rows by muni_id ascending
            rows.sort((a, b) => {
              const aId = Number(a.muni_id);
              const bId = Number(b.muni_id);
              if (Number.isNaN(aId) || Number.isNaN(bId)) {
                return 0;
              }
              return aId - bId;
            });

            dispatchUpdate(rows);
          },
        },
      },
      source: "American Community Survey (ACS)",
      datasetLinks: {
        "Computers and Internet Subscriptions (Municipal)": 455,
      },
      timeframe: async () => {
        const queryString = `SELECT acs_year as latest_year FROM tabular.s2801_computer_internet_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 1`;
        const years = await fetchLatestYear(queryString);
        return years[0] || "N/A";
      },
      transformer: (tables, chart) => {
        const data = tables["tabular.s2801_computer_internet_acs_m_noint"];
        if (!data || data.length < 1) {
          return [{ value: 0, marginOfError: null }];
        }
        const row = data[0];
        const noComputer = parseFloat(row.nocmp_p) || 0;
        const marginOfError = row.nocmp_mp !== null && row.nocmp_mp !== undefined ? parseFloat(row.nocmp_mp) : null;
        const value = Math.max(0, Math.min(100, noComputer));
        const count = row.nocmp !== null && row.nocmp !== undefined ? parseFloat(row.nocmp) : null;
        const countMarginOfError = row.nocmpm !== null && row.nocmpm !== undefined ? parseFloat(row.nocmpm) : null;
        return [{ value, marginOfError, count, countMarginOfError }];
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT 
            acs_year,
            muni_id,
            municipal,
            nocmp,
            nocmpm,
            nocmp_p,
            nocmp_mp
          FROM tabular.s2801_computer_internet_acs_m
          WHERE muni_id = '${subregionId}'
            AND acs_year = (
              SELECT MAX(acs_year)
              FROM tabular.s2801_computer_internet_acs_m
            )
        `;
        return queryString;
      },
    },
    internet_access: {
      type: "gauge",
      title: "Percent Household Has No Internet",
      minValue: 0,
      maxValue: 100,
      valueColor: "#44aa44",
      backgroundColor: "#e0e0e0",
      showUnit: true,
      unit: "%",
      showLabels: true,
      valueFormat: (d) => d.toFixed(1),
      width: 500,
      height: 400,
      tables: {
        "tabular.s2801_computer_internet_acs_m_no_internet": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: ["acs_year", "muni_id", "municipal", "noint_p", "noint_mp"],
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            // Fetch selected municipality and Massachusetts (muni_id = 353) for gauge + view/download data
            const queryString = `
            WITH city_county_id AS (
                  SELECT county_id
                  FROM tabular._datakeys_muni_all
                  WHERE muni_name ILIKE '${municipalityFormatted}%'
              ),
              latest_data AS (
                  SELECT *
                  FROM tabular.s2801_computer_internet_acs_m
                  WHERE acs_year = (SELECT MAX(acs_year) FROM tabular.s2801_computer_internet_acs_m)
              )
              SELECT acs_year, muni_id, municipal,noint, nointm, noint_p, noint_mp
              FROM latest_data t
              WHERE t.muni_id IN (SELECT county_id FROM city_county_id)
                OR t.municipal ILIKE '${municipalityFormatted}%'
                OR t.muni_id = 353
          `;
            const response = await fetch(`${tabular_api}${encodeURIComponent(queryString)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const payload = (await response.json()) || {};
            const rows = payload.rows || [];

            rows.sort((a, b) => {
              const aId = Number(a.muni_id);
              const bId = Number(b.muni_id);
              if (Number.isNaN(aId) || Number.isNaN(bId)) {
                return 0;
              }
              return aId - bId;
            });
            dispatchUpdate(rows);
          },
        },
      },
      source: "American Community Survey (ACS)",
      datasetLinks: {
        "Computers and Internet Subscriptions (Municipal)": 455,
      },
      timeframe: async () => {
        const queryString = `SELECT acs_year as latest_year FROM tabular.s2801_computer_internet_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 1`;
        const years = await fetchLatestYear(queryString);
        return years[0] || "N/A";
      },
      transformer: (tables, chart) => {
        const data = tables["tabular.s2801_computer_internet_acs_m_no_internet"];
        if (!data || data.length < 1) {
          return [{ value: 0, marginOfError: null }];
        }
        const row = data[0];
        const noInternet =
          row.noint_p !== null && row.noint_p !== undefined
            ? parseFloat(row.noint_p)
            : 0;
        const marginOfError =
          row.noint_mp !== null && row.noint_mp !== undefined
            ? parseFloat(row.noint_mp)
            : null;
        const value = isNaN(noInternet) ? 0 : Math.max(0, Math.min(100, noInternet));
        const count = row.noint !== null && row.noint !== undefined ? parseFloat(row.noint) : null;
        const countMarginOfError =
          row.nointm !== null && row.nointm !== undefined ? parseFloat(row.nointm) : null;
        return [{ value, marginOfError, count, countMarginOfError }];
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT 
            acs_year,
            muni_id,
            municipal,
            noint,
            nointm,
            noint_p,
            noint_mp
          FROM tabular.s2801_computer_internet_acs_m
          WHERE muni_id = '${subregionId}'
            AND acs_year = (
              SELECT MAX(acs_year)
              FROM tabular.s2801_computer_internet_acs_m
            )
        `;
        return queryString;
      },
    },
    smartphone_only: {
      type: "gauge",
      title: "Percent Has One or More Types of Computing Devices: Smartphone Only",
      minValue: 0,
      maxValue: 100,
      valueColor: "#44aa44",
      backgroundColor: "#e0e0e0",
      showUnit: true,
      unit: "%",
      showLabels: true,
      valueFormat: (d) => d.toFixed(1),
      width: 500,
      height: 400,
      tables: {
        "tabular.s2801_computer_internet_acs_m_smartphone": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: ["acs_year", "muni_id", "municipal", "moblo_p", "moblo_mp"],
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            
            const municipalityFormatted = municipality.replace("-", " ");
           // fetch muni ,county and massachusetts for view/download data
            const queryString = `
              WITH city_county_id AS (
                    SELECT county_id
                    FROM tabular._datakeys_muni_all
                    WHERE muni_name ILIKE '${municipalityFormatted}%'
                ),
                latest_data AS (
                    SELECT *
                    FROM tabular.s2801_computer_internet_acs_m
                    WHERE acs_year = (SELECT MAX(acs_year) FROM tabular.s2801_computer_internet_acs_m)
                )
                SELECT acs_year, muni_id, municipal, moblo, moblom, moblo_p, moblo_mp
                FROM latest_data t
                WHERE t.muni_id IN (SELECT county_id FROM city_county_id)
                  OR t.municipal ILIKE '${municipalityFormatted}%'
                  OR t.muni_id = 353
            `;
            const response = await fetch(`${tabular_api}${encodeURIComponent(queryString)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const payload = (await response.json()) || {};
            const rows = payload.rows || [];
            rows.sort((a, b) => {
              const aId = Number(a.muni_id);
              const bId = Number(b.muni_id);
              if (Number.isNaN(aId) || Number.isNaN(bId)) {
                return 0;
              }
              return aId - bId;
            });

            dispatchUpdate(rows);
          },
        },
      },
      source: "American Community Survey (ACS)",
      datasetLinks: {
        "Computers and Internet Subscriptions (Municipal)": 455,
      },
      timeframe: async () => {
        const queryString = `SELECT acs_year as latest_year FROM tabular.s2801_computer_internet_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 1`;
        const years = await fetchLatestYear(queryString);
        return years[0] || "N/A";
      },
      transformer: (tables, chart) => {
        const data = tables["tabular.s2801_computer_internet_acs_m_smartphone"];
        if (!data || data.length < 1) {
          return [{ value: 0, marginOfError: null }];
        }
        const row = data[0];
        const smartphoneOnly = row.moblo_p !== null && row.moblo_p !== undefined ? parseFloat(row.moblo_p) : 0;
        const marginOfError = row.moblo_mp !== null && row.moblo_mp !== undefined ? parseFloat(row.moblo_mp) : null;
        const value = isNaN(smartphoneOnly) ? 0 : Math.max(0, Math.min(100, smartphoneOnly));
        const marginOfErrorSafe = isNaN(marginOfError) ? null : marginOfError;
        const count = row.moblo !== null && row.moblo !== undefined ? parseFloat(row.moblo) : null;
        const countMarginOfError =
          row.moblom !== null && row.moblom !== undefined ? parseFloat(row.moblom) : null;
        return [{ value, marginOfError: marginOfErrorSafe, count, countMarginOfError }];
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT 
            acs_year,
            muni_id,
            municipal,
            moblo,
            moblom,
            moblo_p,
            moblo_mp
          FROM tabular.s2801_computer_internet_acs_m
          WHERE muni_id = '${subregionId}'
            AND acs_year = (
              SELECT MAX(acs_year)
              FROM tabular.s2801_computer_internet_acs_m
            )
        `;
        return queryString;
      },
    },
    internet_usage_by_income: {
      type: "stacked-bar",
      title: "Internet Usage by Income Level",
      tooltip: { type: "percentAndCount" },
      xAxis: {
        label: "Household Income Level",
        format: format.string.default,
        sort: (a, b) => {
          const order = ["Below $20000", "$20000 - $74999", "$75000+"];
          return order.indexOf(a) - order.indexOf(b);
        },
      },
      yAxis: { 
        label: "Percent of Household", 
        format: (d) => {
          if (d == null || isNaN(d)) return "";
          const num = Number(d);
          return `${num.toFixed(1)}%`;
        }
      },
      tables: {
        // Use a dedicated cache key so we always fetch income columns (gauges use same table but different columns and would otherwise overwrite cache)
        "tabular.s2801_computer_internet_acs_m_income": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: internetUsageByIncomeColumns,
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            const selectList = internetUsageByIncomeColumns.join(",");
            const queryString = `
              SELECT ${selectList}
              FROM tabular.s2801_computer_internet_acs_m
              WHERE municipal ilike '${municipalityFormatted}%'
                AND acs_year = (SELECT MAX(acs_year) FROM tabular.s2801_computer_internet_acs_m)
            `;
            const response = await fetch(`${tabular_api}${encodeURIComponent(queryString)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const payload = (await response.json()) || {};
            dispatchUpdate(payload.rows || []);
          },
        },
      },
      labels: {
        "dial-up only": "Dial-up only",
        "no internet": "No internet",
      },
      datasetLinks: { "Computers and Internet Subscriptions (Municipal)": 455 },
      source: "American Community Survey (ACS)",
      timeframe: async () => {
        const queryString = `SELECT acs_year as latest_year FROM tabular.s2801_computer_internet_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 1`;
        const years = await fetchLatestYear(queryString);
        return years[0] ? formatYearRange(years[0]) : "N/A";
      },
      transformer: (tables, chart) => {
        const data = tables["tabular.s2801_computer_internet_acs_m_income"];
        if (!data || data.length < 1) {
          return [];
        }
        const row = data[0];
        const parse = (v) => {
          if (v == null || v === "" || v === undefined) return 0;
          const parsed = parseFloat(v);
          return isNaN(parsed) ? 0 : parsed;
        };
        const parseMe = (v) => {
          if (v == null || v === "" || v === undefined) return undefined;
          const parsed = parseFloat(v);
          return isNaN(parsed) ? undefined : parsed;
        };
        const categories = [
          {
            x: "Below $20000",
            dialUp: "lt20dia_p",
            noInternet: "lt20nin_p",
            dialUpMe: "lt20dia_mp",
            noInternetMe: "lt20nin_mp",
            dialUpCount: "lt20dia",
            noInternetCount: "lt20nin",
            dialUpCountMe: "lt20diam",
            noInternetCountMe: "lt20ninm",
          },
          {
            x: "$20000 - $74999",
            dialUp: "i2074di_p",
            noInternet: "i2074ni_p",
            dialUpMe: "i2074di_mp",
            noInternetMe: "i2074ni_mp",
            dialUpCount: "i2074di",
            noInternetCount: "i2074ni",
            dialUpCountMe: "i2074dim",
            noInternetCountMe: "i2074nim",
          },
          {
            x: "$75000+",
            dialUp: "mt74dia_p",
            noInternet: "mt74nin_p",
            dialUpMe: "mt74dia_mp",
            noInternetMe: "mt74nin_mp",
            dialUpCount: "mt74dia",
            noInternetCount: "mt74nin",
            dialUpCountMe: "mt74diam",
            noInternetCountMe: "mt74ninm",
          },
        ];
        const dialUpLabel = chart.labels && chart.labels["dial-up only"] ? chart.labels["dial-up only"] : "Dial-up only";
        const noInternetLabel = chart.labels && chart.labels["no internet"] ? chart.labels["no internet"] : "No internet";
        const zOrder = { [dialUpLabel]: 0, [noInternetLabel]: 1 };
        const parseCount = (v) => {
          if (v == null || v === "" || v === undefined) return undefined;
          const parsed = parseFloat(v);
          return isNaN(parsed) ? undefined : parsed;
        };
        return categories.flatMap((cat) => [
          {
            x: cat.x,
            y: parse(row[cat.dialUp]),
            z: dialUpLabel,
            order: zOrder[dialUpLabel],
            me: parseMe(row[cat.dialUpMe]),
            count: parseCount(row[cat.dialUpCount]),
            countMarginOfError: parseCount(row[cat.dialUpCountMe]),
          },
          {
            x: cat.x,
            y: parse(row[cat.noInternet]),
            z: noInternetLabel,
            order: zOrder[noInternetLabel],
            me: parseMe(row[cat.noInternetMe]),
            count: parseCount(row[cat.noInternetCount]),
            countMarginOfError: parseCount(row[cat.noInternetCountMe]),
          },
        ]);
      },
      subregionDataQuery: (subregionId) => {
        const selectList = internetUsageByIncomeColumns.join(",");
        const queryString = `
          SELECT
            ${selectList}
          FROM tabular.s2801_computer_internet_acs_m
          WHERE muni_id = '${subregionId}'
            AND acs_year = (
              SELECT MAX(acs_year)
              FROM tabular.s2801_computer_internet_acs_m
            )
        `;
        return queryString;
      },
    },
    internet_subscription_types: {
      type: "grouped-bar",
      title: "Internet Subscription Types",
      tooltip: { type: "percentAndCount" }, // Used by GroupedBarChart to format percent + margin-of-error + counts
      xAxis: {
        label: "Subscription Type",
        format: format.string.default,
        sort: (a, b) => {
          const order = ["Broadband (Cable, DSL)", "Cellular Plan", "dial-up"];
          return order.indexOf(a) - order.indexOf(b);
        },
      },
      yAxis: {
        label: "Percent (%)",
        format: (d) => {
          if (d == null || isNaN(d)) return "";
          const num = Number(d);
          return `${num.toFixed(1)}%`;
        }
      },
      tables: {
        "tabular.s2801_computer_internet_acs_m_subscription": {
          yearCol: "acs_year",
          latestYearOnly: false,
          years: async () => {
            let queryString = `SELECT distinct(acs_year) as latest_year FROM tabular.s2801_computer_internet_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 2`;
            const years = await fetchLatestYear(queryString);
            return years;
          },
          columns: internetSubscriptionTypesColumns,
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            const selectList = internetSubscriptionTypesColumns.join(",");
            const queryString = `SELECT ${selectList}
            FROM tabular.s2801_computer_internet_acs_m
            WHERE municipal ilike '${municipalityFormatted}%'
            ORDER BY acs_year DESC limit 2`;
            const response = await fetch(`${tabular_api}${encodeURIComponent(queryString)}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const payload = (await response.json()) || {};
            dispatchUpdate(payload.rows || []);
          },
        },
      },
      labels: {
        "2019-2023": "2019-2023",
        "2020-2024": "2020-2024",
      },
      datasetLinks: { "Computers and Internet Subscriptions (Municipal)": 455 },
      source: "American Community Survey (ACS)",
      timeframe: async () => {
        let queryString = `SELECT acs_year as latest_year FROM tabular.s2801_computer_internet_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 2`;
        const years = await fetchLatestYear(queryString);
        if (!years || years.length < 2) return "";
        const [latest, previous] = years;
        return `${previous} and ${latest}`;
      },
      transformer: (tables, chart) => {
        const data = tables["tabular.s2801_computer_internet_acs_m_subscription"];
        if (!data || data.length < 1) {
          return [];
        }
        const formatYearRange = (yearStr) => {
          if (yearStr === '2020-24') return '2020-2024';
          if (yearStr === '2019-23') return '2019-2023';
          const [start, end] = yearStr.split("-");
          return `${start}-20${end}`;
        };
        const subscriptionTypes = [
          {
            x: "Broadband (Cable, DSL)",
            column: "bbfib_p",
            meColumn: "bbfib_mp",
            countColumn: "bbfib",
            countMeColumn: "bbfibm",
          },
          {
            x: "Cellular Plan",
            column: "cdpinto_p",
            meColumn: "cdpinto_mp",
            countColumn: "cdpinto",
            countMeColumn: "cdpintom",
          },
          {
            x: "dial-up",
            column: "dialo_p",
            meColumn: "dialo_mp",
            countColumn: "dialo",
            countMeColumn: "dialom",
          },
        ];
        return data.flatMap((row) => {
          const yearRange = formatYearRange(row.acs_year);
          return subscriptionTypes.map((type) => ({
            x: type.x,
            y: row[type.column],
            z: yearRange,
            me: row[type.meColumn],
            count: row[type.countColumn],
            countMarginOfError: row[type.countMeColumn],
            order: yearRange === "2020-2024" ? 0 : 1,
          }));
        });
      },
      subregionDataQuery: (subregionId) => {
        const selectList = internetSubscriptionTypesColumns.join(",");
        const queryString = `
          SELECT ${selectList}
          FROM tabular.s2801_computer_internet_acs_m
          WHERE muni_id = '${subregionId}'
            AND acs_year IN (SELECT DISTINCT (acs_year) FROM tabular.s2801_computer_internet_acs_m ORDER BY acs_year DESC LIMIT 2)
          ORDER BY acs_year DESC
        `;
        return queryString;
      },
    },
  },
  "municipal-finances": {
    fund_revenue:{
      type: "tree-map",
      title: "Fund Revenue Breakdown",
      tooltip: { type: "percentAndCount" },
      tables: {
        "tabular.muni_finance_m": (() => {
          const columnList = ["fiscal_yr", "tot_rev", "tax_levy", "state_aid", "loc_recpts", "all_other"];
          return {
            yearCol: "fiscal_yr",
            latestYearOnly: true,
            columns: columnList,
            specialFetch: async (municipality, dispatchUpdate) => {
              const api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
              const muniName = String(municipality || "").replace(/'/g, "''");
              const selectList = columnList.join(",");
              const queryString = `
                SELECT ${selectList}
                FROM tabular.muni_finance_m
                WHERE muni_name ILIKE '${muniName}'
                  AND fiscal_yr = (
                    SELECT MAX(fiscal_yr)
                    FROM tabular.muni_finance_m
                    WHERE muni_name ILIKE '${muniName}'
                  )
              `;
              const response = await fetch(`${api}${queryString}`);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const payload = (await response.json()) || {};
              dispatchUpdate(payload.rows || []);
            },
          };
        })(),
      },
      timeframe: async () => {
        let queryString = `SELECT fiscal_yr as latest_year FROM tabular.muni_finance_m GROUP BY fiscal_yr ORDER BY fiscal_yr DESC LIMIT 1`;
        const years = await fetchLatestYear(queryString);
        return years[0];
      },
      transformer: (tables, chart) => {
        const data = tables["tabular.muni_finance_m"];
        if (!data || data.length < 1) {
          return [];
        }
        const row = data[0];
        return [{ value: row.tot_rev, label: "Total Revenues", group: "Fund Revenue" }, 
          { value: row.tax_levy, label: "Tax Levy", group: "Fund Revenue" }, 
          { value: row.state_aid, label: "State Aid", group: "Fund Revenue" }, 
          { value: row.loc_recpts, label: "Local Receipt", group: "Fund Revenue" }, 
          { value: row.all_other, label: "All Other", group: "Fund Revenue" }];
      },
      source:"MA Dept of Revenue",
      datasetLinks: { "Dept of Revenue Municipal Finance": 502 },
      xAxis: {
        label: "Fund Revenue",
        format: format.string.default,
      },
    }
 
  },
};

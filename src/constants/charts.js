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

export default {
  demographics: {
    race_ethnicity: {
      type: "stacked-bar",
      title: "Race and Ethnicity",
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
            "nhaa",
            "nhaa_me",
            "nhna",
            "nhna_me",
            "nhas",
            "nhas_me",
            "nhpi",
            "nhpi_me",
            "nhoth",
            "nhoth_me",
            "nhmlt",
            "lat",
            "lat_me",
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
        const groupings = {
          nhwhi: { value: row.nhwhi, me: row.nhwhi_me },
          nhaa: { value: row.nhaa, me: row.nhaa_me },
          nhas: { value: row.nhas, me: row.nhas_me },
          nhpi: { value: row.nhpi, me: row.nhpi_me },
          nhoth: { value: row.nhoth, me: row.nhoth_me },
          nhmlt: { value: row.nhmlt, me: row.lat_me },
          nhna: { value: row.nhna, me: row.nhna_me },
          lat: { value: row.lat, me: row.lat_me },
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
                  },
                ]),
          [],
        );
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
                select 
              acs_year,
              nhwhi,
              nhaa,
              nhna,
              nhas,
              nhpi,
              nhoth,
              nhmlt,
              lat 
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
              nhwhi,
              nhaa,
              nhna,
              nhas,
              nhpi,
              nhoth,
              nhmlt,
              lat 
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
          columns: [
            "years",
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
            "race_eth"
          ],
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
          WHERE k.subrg_id = '${subregionId}'
            AND d.race_eth = 'All Race/Ethnicity'
          GROUP BY d.years
          ORDER BY d.years DESC
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
          columns: ["acs_year", "emp", "unemp", "clf", "clf_me", "emp_me", "unemp_me"],
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
            SUM(emp) AS emp,
            SUM(unemp) AS unemp
        FROM tabular.b23025_employment_acs_m 
        WHERE muni_id  = '${subregionId}'
        AND acs_year IN (
            SELECT DISTINCT acs_year 
            FROM tabular.b23025_employment_acs_m
            WHERE muni_id IN (
                SELECT muni_id 
                FROM tabular._datakeys_muni_all 
                WHERE subrg_id = ${subregionId}
            )
            ORDER BY acs_year DESC
            LIMIT 2
        )
        GROUP BY acs_year
        ORDER BY acs_year DESC;
        `;
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
      type: "stacked-bar",
      title: "Educational Attainment by Race",
      xAxis: {
        label: async () => {
          let queryString = `SELECT acs_year as latest_year FROM tabular.c15002_educational_attainment_by_race_acs_m GROUP BY acs_year ORDER BY acs_year DESC LIMIT 1`;
          const years = await fetchLatestYear(queryString);
          return formatYearRange(years);
        },
      },
      yAxis: { label: "Attainment", format: format.number.percentage }, // to do
      tables: {
        "tabular.c15002_educational_attainment_by_race_acs_m": {
          yearCol: "acs_year",
          columns: [
            "acs_year",
            "nhwlh",
            "nhwlh_me",
            "nhwhs",
            "nhwhs_me",
            "nhwsc",
            "nhwsc_me",
            "nhwbd",
            "nhwbd_me",
            "aalh",
            "aalh_me",
            "aahs",
            "aahs_me",
            "aasc",
            "aasc_me",
            "aabd",
            "aabd_me",
            "nalh",
            "nalh_me",
            "nahs",
            "nahs_me",
            "nasc",
            "nasc_me",
            "nabd",
            "nabd_me",
            "aslh",
            "aslh_me",
            "ashs",
            "ashs_me",
            "assc",
            "assc_me",
            "asbd",
            "asbd_me",
            "pilh",
            "pilh_me",
            "pihs",
            "pihs_me",
            "pisc",
            "pisc_me",
            "pibd",
            "pibd_me",
            "othlh",
            "othlh_me",
            "othhs",
            "othhs_me",
            "othsc",
            "othsc_me",
            "othbd",
            "othbd_me",
            "mltlh",
            "mltlh_me",
            "mlths",
            "mlths_me",
            "mltsc",
            "mltsc_me",
            "mltbd",
            "mltbd_me",
            "latlh",
            "latlh_me",
            "laths",
            "laths_me",
            "latsc",
            "latsc_me",
            "latbd",
            "latbd_me",
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
        if (eduData.length < 1) {
          return [];
        }
        const row = eduData.find((entry) => entry.acs_year === "2019-23"); // to do
        const raceKeys = ["nhw", "aa", "na", "as", "pi", "oth", "mlt", "lat"];
        const eduKeys = ["lh", "hs", "sc", "bd"];
        const totals = eduKeys.reduce(
          (obj, edu) =>
            Object.assign(obj, {
              [edu]: raceKeys.reduce((sum, k) => sum + row[`${k}${edu}`], 0),
            }),
          {},
        );
        const consolidatedRow = eduKeys.reduce(
          (obj, edu) =>
            Object.assign(obj, {
              [`nhw${edu}`]: row[`nhw${edu}`] / totals[edu],
              [`aa${edu}`]: row[`aa${edu}`] / totals[edu],
              [`na${edu}`]: row[`na${edu}`] / totals[edu],
              [`as${edu}`]: row[`as${edu}`] / totals[edu],
              [`pi${edu}`]: row[`pi${edu}`] / totals[edu],
              [`oth${edu}`]: row[`oth${edu}`] / totals[edu],
              [`mlt${edu}`]: row[`mlt${edu}`] / totals[edu],
              [`lat${edu}`]: row[`lat${edu}`] / totals[edu],
            }),
          {},
        );
        return raceKeys.reduce(
          (raceAcc, race) =>
            raceAcc.concat(
              eduKeys.reduce(
                (eduAcc, edu) =>
                  eduAcc.concat([
                    {
                      x: chart.labels[edu],
                      y: consolidatedRow[`${race}${edu}`],
                      z: chart.labels[race],
                      me: row[`${race}${edu}_me`],
                      totpop: totals[edu],
                    },
                  ]),
                [],
              ),
            ),
          [],
        );
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT 
            e.acs_year,
            SUM(e.nhwlh) as nhwlh, SUM(e.nhwhs) as nhwhs, SUM(e.nhwsc) as nhwsc, SUM(e.nhwbd) as nhwbd,
            SUM(e.aalh) as aalh, SUM(e.aahs) as aahs, SUM(e.aasc) as aasc, SUM(e.aabd) as aabd,
            SUM(e.nalh) as nalh, SUM(e.nahs) as nahs, SUM(e.nasc) as nasc, SUM(e.nabd) as nabd,
            SUM(e.aslh) as aslh, SUM(e.ashs) as ashs, SUM(e.assc) as assc, SUM(e.asbd) as asbd,
            SUM(e.pilh) as pilh, SUM(e.pihs) as pihs, SUM(e.pisc) as pisc, SUM(e.pibd) as pibd,
            SUM(e.othlh) as othlh, SUM(e.othhs) as othhs, SUM(e.othsc) as othsc, SUM(e.othbd) as othbd,
            SUM(e.mltlh) as mltlh, SUM(e.mlths) as mlths, SUM(e.mltsc) as mltsc, SUM(e.mltbd) as mltbd,
            SUM(e.latlh) as latlh, SUM(e.laths) as laths, SUM(e.latsc) as latsc, SUM(e.latbd) as latbd
          FROM tabular.c15002_educational_attainment_by_race_acs_m e
          JOIN tabular._datakeys_muni_all k ON e.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
          AND e.acs_year = (
            SELECT MAX(acs_year)
            FROM tabular.c15002_educational_attainment_by_race_acs_m
          )
          GROUP BY e.acs_year
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
          SELECT 
            e.acs_year,
            SUM(e.nhwlh) as nhwlh, SUM(e.nhwhs) as nhwhs, SUM(e.nhwsc) as nhwsc, SUM(e.nhwbd) as nhwbd,
            SUM(e.aalh) as aalh, SUM(e.aahs) as aahs, SUM(e.aasc) as aasc, SUM(e.aabd) as aabd,
            SUM(e.nalh) as nalh, SUM(e.nahs) as nahs, SUM(e.nasc) as nasc, SUM(e.nabd) as nabd,
            SUM(e.aslh) as aslh, SUM(e.ashs) as ashs, SUM(e.assc) as assc, SUM(e.asbd) as asbd,
            SUM(e.pilh) as pilh, SUM(e.pihs) as pihs, SUM(e.pisc) as pisc, SUM(e.pibd) as pibd,
            SUM(e.othlh) as othlh, SUM(e.othhs) as othhs, SUM(e.othsc) as othsc, SUM(e.othbd) as othbd,
            SUM(e.mltlh) as mltlh, SUM(e.mlths) as mlths, SUM(e.mltsc) as mltsc, SUM(e.mltbd) as mltbd,
            SUM(e.latlh) as latlh, SUM(e.laths) as laths, SUM(e.latsc) as latsc, SUM(e.latbd) as latbd
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
      type: "stacked-bar",
      title: "Housing Cost Burden",
      xAxis: { label: "Cost Burden Categories" },
      yAxis: {
        label: "Owner-Renter Ratio",
        format: format.number.integerPercentage,
      },
      tables: {
        "tabular.b25091_b25070_costburden_acs_m": {
          yearCol: "acs_year",
          years: async () => {
            let queryString = `SELECT DISTINCT(acs_year) as latest_year FROM tabular.b25091_b25070_costburden_acs_m ORDER BY acs_year DESC LIMIT 1`;
            const years = await fetchLatestYear(queryString);
            return years;
          },
          columns: ["acs_year", "occv2", "cb", "o_notcb" ,"o_notcbmep", "r_notcb", "r_notcbme","ocb3050","ocb3050me", "rcb3050", "rcb3050me", "cb_3050", "cb_3050_me", "o_cb50", "o_cb50me", "r_cb50","r_cb50_mep", "cb_50","cb_50_me"],
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
          {
            x: chart.labels.not_cb,
            y: row.o_notcb / (row.occv2 - row.cb),
            me: row.o_notcbmep ,
            z: chart.labels.owner,
          },
          {
            x: chart.labels.not_cb,
            y: row.r_notcb / (row.occv2 - row.cb),
            me: row.r_notcbme,
            z: chart.labels.renter,
          },
          {
            x: chart.labels.p3050,
            y: row.ocb3050 / row.cb_3050,
            me: row.ocb3050me,
            z: chart.labels.owner,
          },
          {
            x: chart.labels.p3050,
            y: row.rcb3050 / row.cb_3050,
            me: row.rcb3050me,
            z: chart.labels.renter,
          },
          {
            x: chart.labels["p50+"],
            y: row.o_cb50 / row.cb_50,
            me: row.o_cb50me,
            z: chart.labels.owner,
          },
          {
            x: chart.labels["p50+"],
            y: row.r_cb50 / row.cb_50,
            me: row.r_cb50_mep,
            z: chart.labels.renter,
          },
        ];
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
             SELECT 
            acs_year,
             occv2,
             cb,
             o_notcb,
             r_notcb,
             ocb3050,
             rcb3050,
             cb_3050,
             o_cb50,
             r_cb50,
            cb_50
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
        const queryString = `
          SELECT
            h.cal_year,
            12 as months_rep,
            SUM(h.sf_units) as sf_units,
            SUM(h.mf_units) as mf_units
          FROM tabular.hous_building_permits_m h
          JOIN tabular._datakeys_muni_all k ON h.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}'
            AND h.cal_year >= 2001 
            AND h.cal_year <= 2023
            AND h.months_rep = 12
          GROUP BY h.cal_year
          ORDER BY h.cal_year
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
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
          columns: ["acs_year", "ctvsngl","ctvsnglme", "carpool", "carpoolme", "pub", "pub_me", "taxi", "taxi_me", "mcycle", "mcycle_me", "bicycle", "bicycleme", "walk", "walk_me", "other", "other_me"],
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
          me: row[`${key}me`] !== undefined ? row[`${key}me`] : row[`${key}_me`]
        }));
      },
      subregionDataQuery: (subregionId) => {
        const queryString = `
          SELECT 
            c.acs_year,
            SUM(c.ctvsngl) as ctvsngl,
            SUM(c.carpool) as carpool,
            SUM(c.pub) as pub,
            SUM(c.taxi) as taxi,
            SUM(c.mcycle) as mcycle,
            SUM(c.bicycle) as bicycle,
            SUM(c.walk) as walk,
            SUM(c.other) as other
          FROM tabular.b08301_means_transportation_to_work_by_residence_acs_m c
          JOIN tabular._datakeys_muni_all k ON c.muni_id = k.muni_id
          WHERE k.subrg_id = '${subregionId}' 
            AND c.acs_year = (
              SELECT MAX(acs_year) 
              FROM tabular.b08301_means_transportation_to_work_by_residence_acs_m
            )
          GROUP BY c.acs_year
        `;
        return queryString;
      },
      rparegionDataQuery: (rpaId) => {
        const queryString = `
          SELECT 
            c.acs_year,
            SUM(c.ctvsngl) as ctvsngl,
            SUM(c.carpool) as carpool,
            SUM(c.pub) as pub,
            SUM(c.taxi) as taxi,
            SUM(c.mcycle) as mcycle,
            SUM(c.bicycle) as bicycle,
            SUM(c.walk) as walk,
            SUM(c.other) as other
          FROM tabular.b08301_means_transportation_to_work_by_residence_acs_m c
          JOIN tabular._datakeys_muni_all k ON c.muni_id = k.muni_id
          WHERE k.region_id = '${rpaId}' 
            AND c.acs_year = (
              SELECT MAX(acs_year) 
              FROM tabular.b08301_means_transportation_to_work_by_residence_acs_m
            )
          GROUP BY c.acs_year
        `;
        return queryString;
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
        "tabular.s2801_computer_internet_acs_m": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: ["acs_year", "muni_id", "municipal", "nocmp_p", "nocmp_mp"],
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            // Fetch selected municipality and Massachusetts (muni_id = 353) for view/download data
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
                SELECT acs_year, muni_id, municipal, nocmp_p, nocmp_mp
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
            dispatchUpdate(payload.rows || []);
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
        const data = tables["tabular.s2801_computer_internet_acs_m"];
        if (!data || data.length < 1) {
          return [{ value: 0, marginOfError: null }];
        }
        const row = data[0];
        const noComputer = parseFloat(row.nocmp_p) || 0;
        const marginOfError = row.nocmp_mp !== null && row.nocmp_mp !== undefined ? parseFloat(row.nocmp_mp) : null;
        const value = Math.max(0, Math.min(100, noComputer));
        return [{ value, marginOfError }];
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
        "tabular.s2801_computer_internet_acs_m": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: ["acs_year", "muni_id", "municipal", "noint_p", "noint_mp"],
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            // Fetch selected municipality and Massachusetts (muni_id = 353) for view/download data
            const queryString = `
              SELECT acs_year, muni_id, municipal, noint_p, noint_mp, nocmp_p, nocmp_mp, moblo_p, moblo_mp
              FROM tabular.s2801_computer_internet_acs_m
              WHERE (municipal ILIKE '${municipalityFormatted}%' OR muni_id = 353)
                AND acs_year = (SELECT MAX(acs_year) FROM tabular.s2801_computer_internet_acs_m)
              ORDER BY CASE WHEN muni_id = 353 THEN 1 ELSE 0 END, municipal
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
        const data = tables["tabular.s2801_computer_internet_acs_m"];
        if (!data || data.length < 1) {
          return [{ value: 0, marginOfError: null }];
        }
        const row = data[0];
        // Check if noint_p exists, if not try alternative field names
        const noInternet = row.noint_p !== null && row.noint_p !== undefined 
          ? parseFloat(row.noint_p) 
          : (row.nocmp_p !== null && row.nocmp_p !== undefined ? parseFloat(row.nocmp_p) : 0);
        const marginOfError = row.noint_mp !== null && row.noint_mp !== undefined ? parseFloat(row.noint_mp) : null;
        const value = isNaN(noInternet) ? 0 : Math.max(0, Math.min(100, noInternet));
        return [{ value, marginOfError }];
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
        "tabular.s2801_computer_internet_acs_m": {
          yearCol: "acs_year",
          latestYearOnly: true,
          columns: ["acs_year", "muni_id", "municipal", "moblo_p", "moblo_mp"],
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            // Fetch selected municipality and Massachusetts (muni_id = 353) for view/download data
            const queryString = `
              SELECT acs_year, muni_id, municipal, noint_p, noint_mp, nocmp_p, nocmp_mp, moblo_p, moblo_mp
              FROM tabular.s2801_computer_internet_acs_m
              WHERE (municipal ILIKE '${municipalityFormatted}%' OR muni_id = 353)
                AND acs_year = (SELECT MAX(acs_year) FROM tabular.s2801_computer_internet_acs_m)
              ORDER BY CASE WHEN muni_id = 353 THEN 1 ELSE 0 END, municipal
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
        const data = tables["tabular.s2801_computer_internet_acs_m"];
        if (!data || data.length < 1) {
          return [{ value: 0, marginOfError: null }];
        }
        const row = data[0];
        const smartphoneOnly = row.moblo_p !== null && row.moblo_p !== undefined ? parseFloat(row.moblo_p) : 0;
        const marginOfError = row.moblo_mp !== null && row.moblo_mp !== undefined ? parseFloat(row.moblo_mp) : null;
        const value = isNaN(smartphoneOnly) ? 0 : Math.max(0, Math.min(100, smartphoneOnly));
        return [{ value, marginOfError }];
      },
    },
    internet_usage_by_income: {
      type: "stacked-bar",
      title: "Internet Usage by Income Level",
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
          columns: [
            "acs_year",
            "municipal",
            "lt20dia_p",
            "lt20nin_p",
            "lt20dia_mp",
            "lt20nin_mp",
            "i2074di_p",
            "i2074ni_p",
            "i2074di_mp",
            "i2074ni_mp",
            "mt74dia_p",
            "mt74nin_p",
            "mt74dia_mp",
            "mt74nin_mp",
          ],
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            const queryString = `SELECT acs_year, municipal, lt20dia_p, lt20nin_p, lt20dia_mp, lt20nin_mp, i2074di_p, i2074ni_p, i2074di_mp, i2074ni_mp, mt74dia_p, mt74nin_p, mt74dia_mp, mt74nin_mp FROM tabular.s2801_computer_internet_acs_m WHERE municipal ilike '${municipalityFormatted}%' AND acs_year = (SELECT MAX(acs_year) FROM tabular.s2801_computer_internet_acs_m)`;
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
          { x: "Below $20000", dialUp: "lt20dia_p", noInternet: "lt20nin_p", dialUpMe: "lt20dia_mp", noInternetMe: "lt20nin_mp" },
          { x: "$20000 - $74999", dialUp: "i2074di_p", noInternet: "i2074ni_p", dialUpMe: "i2074di_mp", noInternetMe: "i2074ni_mp" },
          { x: "$75000+", dialUp: "mt74dia_p", noInternet: "mt74nin_p", dialUpMe: "mt74dia_mp", noInternetMe: "mt74nin_mp" },
        ];
        const dialUpLabel = chart.labels && chart.labels["dial-up only"] ? chart.labels["dial-up only"] : "Dial-up only";
        const noInternetLabel = chart.labels && chart.labels["no internet"] ? chart.labels["no internet"] : "No internet";
        const zOrder = { [dialUpLabel]: 0, [noInternetLabel]: 1 };
        return categories.flatMap((cat) => [
          { x: cat.x, y: parse(row[cat.dialUp]), z: dialUpLabel, order: zOrder[dialUpLabel], me: parseMe(row[cat.dialUpMe]) },
          { x: cat.x, y: parse(row[cat.noInternet]), z: noInternetLabel, order: zOrder[noInternetLabel], me: parseMe(row[cat.noInternetMe]) },
        ]);
      },
    },
    internet_subscription_types: {
      type: "grouped-bar",
      title: "Internet Subscription Types",
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
            const queryString = `SELECT DISTINCT acs_year as latest_year FROM tabular.s2801_computer_internet_acs_m WHERE acs_year IN ('2020-24', '2015-19') ORDER BY acs_year DESC`;
            const years = await fetchLatestYear(queryString);
            return years.filter(y => y === '2020-24' || y === '2015-19');
          },
          columns: [
            "acs_year",
            "municipal",
            "dialo_p",
            "dialo_mp",
            "cdpinto_p",
            "cdpinto_mp",
            "bbfib_p",
            "bbfib_mp",
          ],
          specialFetch: async (municipality, dispatchUpdate) => {
            const tabular_api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&query=`;
            const municipalityFormatted = municipality.replace("-", " ");
            const queryString = `SELECT acs_year, municipal, dialo_p, dialo_mp, cdpinto_p, cdpinto_mp, bbfib_p, bbfib_mp FROM tabular.s2801_computer_internet_acs_m WHERE municipal ilike '${municipalityFormatted}%' AND acs_year IN ('2020-24', '2015-19') ORDER BY acs_year DESC`;
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
        "2020-2024": "2020-2024",
        "2015-2019": "2015-2019",
      },
      datasetLinks: { "Computers and Internet Subscriptions (Municipal)": 455 },
      source: "American Community Survey (ACS)",
      timeframe: async () => {
        return "2015-2019 and 2020-2024";
      },
      transformer: (tables, chart) => {
        const data = tables["tabular.s2801_computer_internet_acs_m_subscription"];
        if (!data || data.length < 1) {
          return [];
        }
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
        const formatYearRange = (yearStr) => {
          if (yearStr === '2020-24') return '2020-2024';
          if (yearStr === '2015-19') return '2015-2019';
          const [start, end] = yearStr.split("-");
          return `${start}-20${end}`;
        };
        const subscriptionTypes = [
          { x: "Broadband (Cable, DSL)", column: "bbfib_p", meColumn: "bbfib_mp" },
          { x: "Cellular Plan", column: "cdpinto_p", meColumn: "cdpinto_mp" },
          { x: "dial-up", column: "dialo_p", meColumn: "dialo_mp" },
        ];
        return data.flatMap((row) => {
          const yearRange = formatYearRange(row.acs_year);
          return subscriptionTypes.map((type) => ({
            x: type.x,
            y: parse(row[type.column]),
            z: yearRange,
            me: parseMe(row[type.meColumn]),
            order: yearRange === "2020-2024" ? 0 : 1,
          }));
        });
      },
    },
  },
};

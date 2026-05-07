import React from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useParams } from "react-router-dom";
import { css } from "@emotion/react";
import MoonLoader from "react-spinners/MoonLoader";
import { fetchDatasets } from "../reducers/datasetSlice";
import DatasetHeader from "../components/partials/DatasetHeader";
import DatasetTable from "../components/partials/DatasetTable";
import { isDatasetInventoryCatalog } from "../utils/datasetInventoryRow";
import {
  parseDatasetViewShareSearch,
  resolveGeographiesFromUrl,
  resolveYearsFromUrl,
} from "../utils/datasetViewShareQuery";

const override = css`
  height: 3.5rem;
  margin-bottom: 0.5rem;
  width: 3.5rem;
`;

class DataViewerClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentPage: 1,
      loading: true,
      rowsPerPage: 25,
      selectedColumns: [], // Will be initialized with all columns
      marginColumnsByBase: {},
      availableGeographies: [],
      selectedGeographies: [],
      geographyColumn: null,
      linkInventoryRows: false,
    };
    this.updateSelectedYears = this.updateSelectedYears.bind(this);
    this.updateSelectedColumns = this.updateSelectedColumns.bind(this);
    this.updatePage = this.updatePage.bind(this);
    this.updateRowsPerPage = this.updateRowsPerPage.bind(this);
    this.loadDatasetData = this.loadDatasetData.bind(this);
    this.updateSelectedGeographies = this.updateSelectedGeographies.bind(this);
    this.hasLoaded = false; // Flag to prevent duplicate API calls in StrictMode
  }

  getMarginColumnsByBase(columnKeys = []) {
    const byName = new Set((columnKeys || []).map((c) => String(c?.name || "")));
    const pairs = {};
    const byAlias = {};
    (columnKeys || []).forEach((col) => {
      const alias = String(col?.alias || "").trim().toLowerCase();
      if (alias) byAlias[alias] = String(col?.name || "");
    });

    const normalizeAliasMetric = (text) =>
      String(text || "")
        .toLowerCase()
        .replace(/\s*;\s*(estimate|margin of error)\s*$/i, "")
        .replace(/\s*,\s*(estimate|margin of error)\s*$/i, "")
        .trim();

    // From MOE field name → possible base names; see DatasetHeader ColumnSelectorDropdown (keep in sync).
    // Percent MOE for *_p: either *_mep or *mep (glued), e.g. bd3u_mep↔bd3u_p and noncitzmep↔noncitz_p.
    const getBaseCandidates = (name) => {
      const candidates = [];
      const n = String(name || "");

      if (n.endsWith("_mep")) {
        candidates.push(n.slice(0, -4) + "_p");
      } else if (/mep$/i.test(n)) {
        candidates.push(n.slice(0, -3) + "_p");
      }
      if (n.endsWith("_mp")) {
        candidates.push(n.slice(0, -3) + "_p");
        candidates.push(n.slice(0, -3));
      }
      if (n.endsWith("_me")) {
        candidates.push(n.slice(0, -3));
      } else if (/[0-9][a-z0-9_]*me$/i.test(n)) {
        candidates.push(n.slice(0, -2));
      }
      if (n.endsWith("_moe")) {
        candidates.push(n.slice(0, -4));
      }
      if (
        n.endsWith("_m") &&
        !n.endsWith("_me") &&
        !n.endsWith("_mp") &&
        !n.endsWith("_moe") &&
        !n.endsWith("_mep")
      ) {
        candidates.push(n.slice(0, -2));
      }

      return [...new Set(candidates.filter(Boolean))];
    };

    const isMarginColumn = (col) => {
      const name = String(col?.name || "");
      const alias = String(col?.alias || "").toLowerCase();
      const details = String(col?.details || "").toLowerCase();
      const hintFromMetadata = alias.includes("margin of error") || details.includes("margin of error");
      const suffixHint =
        /(?:_mp|_me|_moe|_mep|_m)$/i.test(name) ||
        /[0-9][a-z0-9_]*me$/i.test(name) ||
        /[a-z0-9_]mep$/i.test(name);
      if (!hintFromMetadata && !suffixHint) return { isMargin: false, base: null };

      // Prefer alias-based pairing for ACS-style labels:
      // "X; margin of error" -> "X; estimate"
      if (alias.includes("margin of error")) {
        const estimateAlias = alias.replace("margin of error", "estimate").replace(/\s+/g, " ").trim();
        if (byAlias[estimateAlias]) {
          return { isMargin: true, base: byAlias[estimateAlias] };
        }
        const normalized = normalizeAliasMetric(alias);
        const matchedBase = (columnKeys || []).find((candidate) => {
          const a = String(candidate?.alias || "").toLowerCase();
          const isEstimate = /\bestimate\b/i.test(a) || (!/\bmargin of error\b/i.test(a) && !!a);
          return isEstimate && normalizeAliasMetric(a) === normalized;
        });
        if (matchedBase?.name) {
          return { isMargin: true, base: matchedBase.name };
        }
      }

      const base = getBaseCandidates(name).find((candidate) => byName.has(candidate));
      return { isMargin: true, base: base || null };
    };

    (columnKeys || []).forEach((col) => {
      const name = String(col?.name || "");
      const result = isMarginColumn(col);
      if (!result?.isMargin || !result.base || !name) return;
      if (!pairs[result.base]) pairs[result.base] = [];
      pairs[result.base].push(name);
    });

    return pairs;
  }

  getVisibleColumnKeys(columnKeys = []) {
    const isMarginColumn = (col) => {
      const name = String(col?.name || "");
      const alias = String(col?.alias || "").toLowerCase();
      const details = String(col?.details || "").toLowerCase();
      return (
        alias.includes("margin of error") ||
        details.includes("margin of error") ||
        /(?:_mp|_me|_moe|_mep|_m)$/i.test(name) ||
        /[0-9][a-z0-9_]*me$/i.test(name) ||
        /[a-z0-9_]mep$/i.test(name)
      );
    };
    return (columnKeys || []).filter((col) => !isMarginColumn(col));
  }

  expandSelectedWithMargins(selectedBaseColumns = [], marginColumnsByBase = {}) {
    const next = [...selectedBaseColumns];
    selectedBaseColumns.forEach((base) => {
      const margins = marginColumnsByBase?.[base] || [];
      margins.forEach((m) => {
        if (!next.includes(m)) next.push(m);
      });
    });
    return next;
  }

  componentDidMount() {
    // Prevent duplicate API calls in React.StrictMode
    if (this.hasLoaded) {
      return;
    }
    this.hasLoaded = true;

    // Check if datasets are already loaded, if not fetch them
    if (this.props.datasets.length === 0) {
      this.props.fetchDatasets().then(() => {
        this.loadDatasetData();
      });
    } else {
      this.loadDatasetData();
    }
  }

  loadDatasetData() {
    const dataset = this.props.datasets.filter((datasetObj) => +datasetObj.seq_id === +this.props.params.id)[0];
    if (!dataset) {
      this.setState({ loading: false, error: "Dataset not found" });
      return;
    }

    // construct the query for the data in the table and handle some special cases.
    let limit = 15000;
    if (dataset.table_name === "econ_es202_naics_4d_m" || dataset.table_name === "econ_es202_naics_2d_m" || dataset.table_name === "econ_es202_naics_3d_m") {
      // these tables are large and need a much higher limit
      // TODO: setup backend pagination and only fetch 25 results at a time?
      limit = 460000 ;
    }
    let tableQueryUrl = `/api?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}&limit=${limit}`;
    if (dataset.yearcolumn) {
      tableQueryUrl = `${tableQueryUrl}&orderByColumn=${dataset.yearcolumn}&orderByDirection=DESC`;
    }
    if (dataset.table_name === "_data_browser") {
      // filter on active datasets if viewing the data browser
      tableQueryUrl = `${tableQueryUrl}&active=true`;
    }
    const tableQuery = axios.get(tableQueryUrl);

    const metadataQuery = axios.get(
      `/api/metadata?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}`,
    );

    const queries = [tableQuery, metadataQuery];
    if (dataset.yearcolumn) {
      const yearQuery = axios.get(
        `/api/?token=${import.meta.env.VITE_MAPC_API_TOKEN}&distinctColumn=${dataset.yearcolumn}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}&limit=50`,
      );
      queries.push(yearQuery);
    }

    if (dataset.schemaname === "tabular") {
      axios
        .all(queries)
        .then((response) => {
          const tableResults = response[0].data.rows;
          const metadata = Object.values(response[1].data)[0];
          const yearResults = queries.length === 3 ? response[2].data.rows : [];

          // Validate metadata structure
          const universeData = metadata.find((row) => row.name === "universe");
          const descriptionData = metadata.find((row) => row.name === "descriptn");
          const columnKeys = metadata
            .filter((object) => tableResults[0] && Object.keys(tableResults[0]).includes(object.name))
            .filter((header) => header.name !== "seq_id");

          // Initialize geography filter for municipal (_m) tables
          let geographyColumn = null;
          let availableGeographies = [];
          if (dataset.table_name && dataset.table_name.endsWith("_m")) {
            const candidateColumns = ["muni_name", "municipal", "muni"];
            geographyColumn = candidateColumns.find((col) => tableResults[0] && col in tableResults[0]) || null;
            if (geographyColumn) {
              const geoSet = new Set();
              tableResults.forEach((row) => {
                if (row[geographyColumn]) {
                  geoSet.add(row[geographyColumn]);
                }
              });
              availableGeographies = Array.from(geoSet).sort((a, b) => String(a).localeCompare(String(b)));
            }
          }

          // Process the distinct year data
          const distinctYears = yearResults.map((year) => Object.values(year)[0]).sort().reverse();

          const visibleColumnKeys = this.getVisibleColumnKeys(columnKeys);
          const marginColumnsByBase = this.getMarginColumnsByBase(columnKeys);
          const selectedBaseColumns = visibleColumnKeys.map((col) => col.name);
          let selectedColumns = this.expandSelectedWithMargins(selectedBaseColumns, marginColumnsByBase);
          let selectedGeographies = availableGeographies;
          let selectedYears = distinctYears.length ? [distinctYears[0]] : [];

          const parsedShare = parseDatasetViewShareSearch(this.props.location?.search ?? "");
          if (parsedShare.baseColumnNames?.length) {
            const visibleSet = new Set(visibleColumnKeys.map((c) => c.name));
            const validBases = parsedShare.baseColumnNames.filter((n) => visibleSet.has(n));
            if (validBases.length) {
              selectedColumns = this.expandSelectedWithMargins(validBases, marginColumnsByBase);
            }
          }
          const geoOverride = resolveGeographiesFromUrl(parsedShare, availableGeographies);
          if (geoOverride) selectedGeographies = geoOverride;
          const yearOverride = resolveYearsFromUrl(parsedShare, distinctYears);
          if (yearOverride) selectedYears = yearOverride;

          this.setState({
            availableYears: distinctYears,
            rows: tableResults,
            universe: universeData ? universeData.details : "",
            description: descriptionData ? descriptionData.details : "",
            columnKeys: columnKeys,
            selectedColumns,
            marginColumnsByBase,
            metadata,
            selectedYears,
            table: dataset.table_name,
            schema: dataset.schemaname,
            database: dataset.db_name,
            title: dataset.menu3,
            source: dataset.source,
            queryYearColumn: dataset.yearcolumn,
            updatedAt: dataset.updated,
            geographyColumn,
            availableGeographies,
            selectedGeographies,
            linkInventoryRows: isDatasetInventoryCatalog(dataset),
            loading: false,
          });
        })
        .catch((error) => {
          this.setState({ loading: false, error: "Please try again later" });
          console.error("Error:", error);
        });
    } else {
      axios
        .all(queries)
        .then(async (response) => {
          const tableResults = response[0].data.rows;
          const metadata = Object.values(response[1].data)[0];
          const yearResults = queries.length === 3 ? response[2].data.rows : [];

          try {
            // process the metadata
            const columns = Object.keys(tableResults[0] || {});
            const sortedMetadata = metadata.documentation.metadata.eainfo.detailed.attr
              .map((attribute) => ({
                name: attribute.attrlabl,
                alias: attribute.attalias,
              }))
              .filter((header) => columns.includes(header.name))
              .filter((header) => header.name !== "shape");

            // Process the distinct year data
            const distinctYears = yearResults.map((year) => Object.values(year)[0]).sort().reverse();

            const visibleColumnKeys = this.getVisibleColumnKeys(sortedMetadata);
            const marginColumnsByBase = this.getMarginColumnsByBase(sortedMetadata);
            const selectedBaseColumns = visibleColumnKeys.map((col) => col.name);
            let selectedColumns = this.expandSelectedWithMargins(selectedBaseColumns, marginColumnsByBase);
            let selectedYears = distinctYears.length ? [distinctYears[0]] : [];

            const parsedShare = parseDatasetViewShareSearch(this.props.location?.search ?? "");
            if (parsedShare.baseColumnNames?.length) {
              const visibleSet = new Set(visibleColumnKeys.map((c) => c.name));
              const validBases = parsedShare.baseColumnNames.filter((n) => visibleSet.has(n));
              if (validBases.length) {
                selectedColumns = this.expandSelectedWithMargins(validBases, marginColumnsByBase);
              }
            }
            const yearOverride = resolveYearsFromUrl(parsedShare, distinctYears);
            if (yearOverride) selectedYears = yearOverride;

            this.setState({
              availableYears: distinctYears,
              rows: tableResults,
              description: metadata.documentation.metadata.dataIdInfo.idPurp || "",
              columnKeys: sortedMetadata,
              selectedColumns,
              marginColumnsByBase,
              metadata,
              selectedYears,
              table: dataset.table_name,
              schema: dataset.schemaname,
              database: dataset.db_name,
              title: dataset.menu3,
              source: dataset.source,
              queryYearColumn: dataset.yearcolumn,
              updatedAt: dataset.updated,
              linkInventoryRows: isDatasetInventoryCatalog(dataset),
              loading: false,
            });
          } catch (error) {
            this.setState({
              loading: false,
              error: "Error parsing metadata",
            });
            console.error("Error parsing metadata:", error);
          }
        })
        .catch((error) => {
          this.setState({ loading: false, error: "Error fetching datasets" });
          console.error("Error:", error);
        });
    }
  }

  componentWillUnmount() {
    // Reset the flag when component unmounts
    this.hasLoaded = false;
  }

  updateSelectedYears(e, year) {
    this.setState((prevState) => {
      if (prevState.selectedYears.includes(year)) {
        const index = prevState.selectedYears.indexOf(year);
        const front = prevState.selectedYears.slice(0, index);
        const back = prevState.selectedYears.slice(index + 1);
        const newArray = front.concat(back);
        return { selectedYears: newArray };
      }
      return { selectedYears: [...prevState.selectedYears, year] };
    });
  }

  updateSelectedColumns(columnName) {
    this.setState((prevState) => {
      const marginColumns = prevState.marginColumnsByBase?.[columnName] || [];
      if (prevState.selectedColumns.includes(columnName)) {
        const next = prevState.selectedColumns.filter((col) => col !== columnName && !marginColumns.includes(col));
        return { selectedColumns: next };
      }
      const next = [...prevState.selectedColumns, columnName];
      marginColumns.forEach((col) => {
        if (!next.includes(col)) next.push(col);
      });
      return { selectedColumns: next };
    });
  }

  updatePage(newPage) {
    this.setState({ currentPage: newPage });
  }

  updateRowsPerPage(rowsPerPage) {
    this.setState({ rowsPerPage, currentPage: 1 }); // Reset to page 1 when changing rows per page
  }

  updateSelectedGeographies(geoName) {
    this.setState((prevState) => {
      const { selectedGeographies, availableGeographies } = prevState;
      if (!availableGeographies || availableGeographies.length === 0) {
        return prevState;
      }

      // Toggle selection
      const isSelected = selectedGeographies.includes(geoName);
      let nextSelection;

      if (isSelected) {
        nextSelection = selectedGeographies.filter((g) => g !== geoName);
      } else {
        nextSelection = [...selectedGeographies, geoName];
      }

      return { selectedGeographies: nextSelection, currentPage: 1 };
    });
  }

  render() {
    let pageContents;

    if (this.state.loading) {
      pageContents = (
        <div className="moonloader__wrapper">
          <MoonLoader size="56px" css={override} color="#767676" loading={this.state.loading} />
          Fetching Data
        </div>
      );
    } else if (this.state.error) {
      pageContents = (
        <div className="error-message">
          <p>{this.state.error}</p>
        </div>
      );
    } else {
      pageContents = (
        <section className="datasets">
          <DatasetHeader
            availableYears={this.state.availableYears}
            columnKeys={this.state.columnKeys}
            datasetId={this.props.params.id}
            database={this.state.database}
            description={this.state.description}
            metadata={this.state.metadata}
            queryYearColumn={this.state.queryYearColumn}
            schema={this.state.schema}
            selectedColumns={this.state.selectedColumns}
            selectedYears={this.state.selectedYears}
            availableGeographies={this.state.availableGeographies}
            selectedGeographies={this.state.selectedGeographies}
            updateSelectedGeographies={this.updateSelectedGeographies}
            geographyColumn={this.state.geographyColumn}
            rowsPerPage={this.state.rowsPerPage}
            updateRowsPerPage={this.updateRowsPerPage}
            source={this.state.source}
            table={this.state.table}
            title={this.state.title}
            updateSelectedColumns={this.updateSelectedColumns}
            updateSelectedYears={this.updateSelectedYears}
            universe={this.state.universe}
            updatedAt={this.state.updatedAt}
          />
          <DatasetTable
            currentPage={this.state.currentPage}
            columnKeys={this.state.columnKeys}
            rows={this.state.rows}
            queryYearColumn={this.state.queryYearColumn}
            rowsPerPage={this.state.rowsPerPage}
            selectedColumns={this.state.selectedColumns}
            selectedYears={this.state.selectedYears}
            selectedGeographies={this.state.selectedGeographies}
            geographyColumn={this.state.geographyColumn}
            linkRowsToDatasetView={this.state.linkInventoryRows}
            updatePage={this.updatePage}
            metadata={this.state.metadata}
          />
        </section>
      );
    }

    return <>{pageContents}</>;
  }
}

const DataViewerPage = () => {
  const params = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const datasets = useSelector((state) => state.dataset.cache);

  return (
    <DataViewerClass
      params={params}
      location={location}
      datasets={datasets}
      fetchDatasets={() => dispatch(fetchDatasets())}
    />
  );
};

export default DataViewerPage;

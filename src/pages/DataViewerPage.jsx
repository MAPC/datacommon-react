import React from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { css } from "@emotion/react";
import MoonLoader from "react-spinners/MoonLoader";
import { fetchDatasets } from "../reducers/datasetSlice";
import DatasetHeader from "../components/partials/DatasetHeader";
import DatasetTable from "../components/partials/DatasetTable";
import DatasetMapPreview from "../components/partials/DatasetMapPreview";
import { isDatasetInventoryCatalog } from "../utils/datasetInventoryRow";
import {
  buildDatasetViewShareSearchParams,
  parseDatasetViewShareSearch,
  resolveCarriedMapDimensions,
  resolveCarriedMapVariable,
  resolveGeographiesFromUrl,
  resolveYearsFromUrl,
} from "../utils/datasetViewShareQuery";
import { syncPreviewColumnOrder } from "../utils/datasetTablePreview";
import {
  detectDatasetGeographyType,
  isMapPreviewSupported,
  resolveTableGeographyColumn,
} from "../utils/datasetMapPreview";
import { findDatasetGeographyGroup } from "../utils/manageDatasets";

const override = css`
  height: 3.5rem;
  margin-bottom: 0.5rem;
  width: 3.5rem;
`;

function viewModeFromLocation(location, params) {
  if (params?.viewMode === "map") return "map";
  if ((location?.pathname || "").endsWith("/map")) return "map";
  return "table";
}

function geographyLevelsWithMapSupport(levels, datasets) {
  return (levels || []).map((level) => {
    const sibling = (datasets || []).find((row) => +row.seq_id === +level.id);
    const geographyType = sibling
      ? detectDatasetGeographyType(sibling.table_name, sibling.geography, { menu1: sibling.menu1 })
      : null;
    return { ...level, mapSupported: isMapPreviewSupported(geographyType) };
  });
}

function datasetViewerPath(datasetId, viewMode, search = "") {
  const base =
    viewMode === "map"
      ? `/browser/datasets/${datasetId}/map`
      : `/browser/datasets/${datasetId}`;
  return `${base}${search || ""}`;
}

function yearInList(years = [], year) {
  return (years || []).some((available) => String(available) === String(year));
}

function resolveMapYear(candidate, availableYears = []) {
  const years = availableYears || [];
  if (!years.length) return candidate ?? null;
  if (candidate != null) {
    const match = years.find((year) => String(year) === String(candidate));
    if (match != null) return match;
  }
  return years[0];
}

class DataViewerClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentPage: 1,
      loading: true,
      rowsPerPage: 10,
      selectedColumns: [], // Will be initialized with all columns
      marginColumnsByBase: {},
      availableGeographies: [],
      selectedGeographies: [],
      geographyColumn: null,
      linkInventoryRows: false,
      previewColumnOrder: [],
      columnFilters: [],
      viewMode: viewModeFromLocation(props.location, props.params),
      mapVariable: null,
      mapYear: null,
      geographicFrame: "mapc",
      mapDimensionSelections: {},
      geographyType: null,
      menu1: null,
    };
    this.updateSelectedYears = this.updateSelectedYears.bind(this);
    this.updateSelectedColumns = this.updateSelectedColumns.bind(this);
    this.showHiddenColumns = this.showHiddenColumns.bind(this);
    this.updatePage = this.updatePage.bind(this);
    this.updateRowsPerPage = this.updateRowsPerPage.bind(this);
    this.loadDatasetData = this.loadDatasetData.bind(this);
    this.updateSelectedGeographies = this.updateSelectedGeographies.bind(this);
    this.onPreviewColumnOrderChange = this.onPreviewColumnOrderChange.bind(this);
    this.onResetPreviewLayout = this.onResetPreviewLayout.bind(this);
    this.onViewModeChange = this.onViewModeChange.bind(this);
    this.onGeographyLevelChange = this.onGeographyLevelChange.bind(this);
    this.onMapVariableChange = this.onMapVariableChange.bind(this);
    this.onGeographicFrameChange = this.onGeographicFrameChange.bind(this);
    this.onMapDimensionSelectionsChange = this.onMapDimensionSelectionsChange.bind(this);
    this.addFilterToList = this.addFilterToList.bind(this);
    this.removeFilterFromList = this.removeFilterFromList.bind(this);
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

  /** Base + all paired margin columns when hiding either side from the table or column picker. */
  getColumnsToRemoveWhenDeselecting(columnName, marginColumnsByBase = {}) {
    const toRemove = new Set([columnName]);
    const marginsForBase = marginColumnsByBase[columnName] || [];
    marginsForBase.forEach((m) => toRemove.add(m));

    if (!marginsForBase.length) {
      for (const [base, margins] of Object.entries(marginColumnsByBase)) {
        if (margins.includes(columnName)) {
          toRemove.add(base);
          margins.forEach((m) => toRemove.add(m));
          break;
        }
      }
    }

    return toRemove;
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
    // these tables are large and need a much higher limit
    // TODO: setup backend pagination and only fetch 25 results at a time?
    if (
      dataset.table_name === "econ_es202_naics_4d_m" ||
      dataset.table_name === "econ_es202_naics_2d_m" ||
      dataset.table_name === "econ_es202_naics_3d_m" ||
      String(dataset.table_name || "").startsWith("educ_")
    ) {
      limit = 460000;
    }
    let tableQueryUrl = `/api?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}&limit=${limit}`;
    if (dataset.yearcolumn) {
      tableQueryUrl = `${tableQueryUrl}&orderByColumn=${dataset.yearcolumn}&orderByDirection=DESC`;
    }
    // Handle only showing select columns in the _data_browser
    if (dataset.table_name == "_data_browser") {
      const browserColumns = ["seq_id", "menu1", "menu2", "menu3", "geography", "source", "active", "updated"];
      tableQueryUrl = `${tableQueryUrl}&columns=${browserColumns.join(',')}`
    }
    const tableQuery = axios.get(tableQueryUrl);

    const metadataQuery = axios.get(
      `/api/metadata?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}&useNewMetadata=true`,
    );

    const queries = [tableQuery, metadataQuery];
    if (dataset.yearcolumn) {
      const yearQuery = axios.get(
        `/api/?token=${import.meta.env.VITE_MAPC_API_TOKEN}&distinctColumn=${dataset.yearcolumn}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}&limit=50`,
      );
      queries.push(yearQuery);
    }

    // fetch and process the data.
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
          .filter((header) => header.name !== "seq_id") // never show seq_id even if it's in metadata
          .filter((header) => header.name !== "shape"); // never show shape even if it's in metadata

        // Process the distinct year data
        const distinctYears = yearResults.map((year) => Object.values(year)[0]).sort().reverse();

        const visibleColumnKeys = this.getVisibleColumnKeys(columnKeys);
        const marginColumnsByBase = this.getMarginColumnsByBase(columnKeys);
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
        const keptTableYears = (this.state.selectedYears || []).filter((year) =>
          yearInList(distinctYears, year),
        );
        if (yearOverride && viewModeFromLocation(this.props.location, this.props.params) !== "map") {
          selectedYears = yearOverride;
        } else if (keptTableYears.length) {
          selectedYears = keptTableYears;
        }

        // Geography from `_data_browser.geography`, or Boundaries category (own `shape`).
        let selectedGeographies = [];
        let availableGeographies = [];
        let geographyColumn = null;
        const geographyType = detectDatasetGeographyType(
          dataset.table_name,
          dataset.geography,
          { menu1: dataset.menu1, sampleRow: tableResults[0] },
        );
        if (dataset.schemaname === "tabular") {
          if (geographyType === "municipal") {
            geographyColumn = resolveTableGeographyColumn(tableResults[0]);
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

          selectedGeographies = availableGeographies;
          const geoOverride = resolveGeographiesFromUrl(parsedShare, availableGeographies);
          if (geoOverride) selectedGeographies = geoOverride;
        }

        const wantMap =
          viewModeFromLocation(this.props.location, this.props.params) === "map" &&
          isMapPreviewSupported(geographyType);
        const mapYear = resolveMapYear(
          wantMap
            ? yearOverride?.[0] ?? this.state.mapYear
            : this.state.mapYear ?? selectedYears[0],
          distinctYears,
        );
        let mapVariable = null;
        let mapDimensionSelections = {};
        let geographicFrame = parsedShare.geographicFrame || this.state.geographicFrame || "mapc";
        if (wantMap) {
          mapVariable = resolveCarriedMapVariable(
            parsedShare.mapVariable || this.state.mapVariable,
            columnKeys,
            this.state.columnKeys,
          );
          mapDimensionSelections = resolveCarriedMapDimensions(
            {
              ...(this.state.mapDimensionSelections || {}),
              ...(parsedShare.mapDimensionSelections || {}),
            },
            columnKeys,
          );
        }

        const previewColumnOrder = syncPreviewColumnOrder([], selectedColumns, columnKeys);

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
          mapYear,
          table: dataset.table_name,
          schema: dataset.schemaname,
          database: dataset.db_name,
          title: findDatasetGeographyGroup(this.props.datasets, dataset.seq_id)?.title,
          source: dataset.source,
          menu1: dataset.menu1 || null,
          queryYearColumn: dataset.yearcolumn,
          updatedAt: dataset.updated,
          geographyColumn,
          geographyType,
          availableGeographies,
          selectedGeographies,
          linkInventoryRows: isDatasetInventoryCatalog(dataset),
          previewColumnOrder,
          viewMode: wantMap ? "map" : "table",
          mapVariable,
          geographicFrame,
          mapDimensionSelections,
          loading: false,
        });

        if (
          viewModeFromLocation(this.props.location, this.props.params) === "map" &&
          !isMapPreviewSupported(geographyType) &&
          this.props.navigate
        ) {
          this.props.navigate(
            datasetViewerPath(this.props.params.id, "table", this.props.location?.search || ""),
            { replace: true },
          );
        }

      }).catch((error) => {
        this.setState({ loading: false, error: "Please try again later" });
        console.error("Error:", error);
      });
  }

  componentWillUnmount() {
    // Reset the flag when component unmounts
    this.hasLoaded = false;
  }

  updateSelectedYears(e, year) {
    this.setState((prevState) => {
      // Map choropleth is single-year and must not change table year filters.
      if (prevState.viewMode === "map") {
        return { mapYear: year };
      }
      const selected = prevState.selectedYears || [];
      if (yearInList(selected, year)) {
        return {
          selectedYears: selected.filter((current) => String(current) !== String(year)),
        };
      }
      return { selectedYears: [...selected, year] };
    });
  }

  updateSelectedColumns(columnName) {
    this.setState((prevState) => {
      const marginColumnsByBase = prevState.marginColumnsByBase || {};
      let selectedColumns;
      if (prevState.selectedColumns.includes(columnName)) {
        const toRemove = this.getColumnsToRemoveWhenDeselecting(columnName, marginColumnsByBase);
        selectedColumns = prevState.selectedColumns.filter((col) => !toRemove.has(col));
      } else {
        const marginColumns = marginColumnsByBase[columnName] || [];
        selectedColumns = [...prevState.selectedColumns, columnName];
        marginColumns.forEach((col) => {
          if (!selectedColumns.includes(col)) selectedColumns.push(col);
        });
      }
      const previewColumnOrder = syncPreviewColumnOrder(
        prevState.previewColumnOrder,
        selectedColumns,
        prevState.columnKeys,
      );
      return { selectedColumns, previewColumnOrder };
    });
  }

  showHiddenColumns(columnNames) {
    if (!columnNames?.length) return;

    this.setState((prevState) => {
      const marginColumnsByBase = prevState.marginColumnsByBase || {};
      let selectedColumns = [...prevState.selectedColumns];

      columnNames.forEach((columnName) => {
        if (selectedColumns.includes(columnName)) return;
        selectedColumns.push(columnName);
        (marginColumnsByBase[columnName] || []).forEach((col) => {
          if (!selectedColumns.includes(col)) selectedColumns.push(col);
        });
      });

      const previewColumnOrder = syncPreviewColumnOrder(
        prevState.previewColumnOrder,
        selectedColumns,
        prevState.columnKeys,
      );
      return { selectedColumns, previewColumnOrder };
    });
  }

  onPreviewColumnOrderChange(previewColumnOrder) {
    this.setState({ previewColumnOrder });
  }

  onResetPreviewLayout() {
    this.setState((prevState) => ({
      previewColumnOrder: syncPreviewColumnOrder([], prevState.selectedColumns, prevState.columnKeys),
      currentPage: 1,
    }));
  }

  componentDidUpdate(prevProps) {
    if (String(prevProps.params.id) !== String(this.props.params.id)) {
      this.setState({ loading: true, error: undefined, currentPage: 1, rows: [] });
      this.loadDatasetData();
      return;
    }

    const prevMode = viewModeFromLocation(prevProps.location, prevProps.params);
    const nextMode = viewModeFromLocation(this.props.location, this.props.params);
    if (prevMode === nextMode) return;

    this.setState((prevState) => {
      if (nextMode === "map") {
        if (!isMapPreviewSupported(prevState.geographyType)) {
          return prevState;
        }
        return {
          viewMode: "map",
          mapYear: resolveMapYear(prevState.mapYear, prevState.availableYears),
        };
      }
      return { viewMode: "table" };
    });
  }

  onGeographyLevelChange(nextDatasetId) {
    if (nextDatasetId == null || String(nextDatasetId) === String(this.props.params.id)) return;
    const sibling = this.props.datasets.find((datasetObj) => +datasetObj.seq_id === +nextDatasetId);
    const geographyType = sibling
      ? detectDatasetGeographyType(sibling.table_name, sibling.geography, { menu1: sibling.menu1 })
      : null;
    if (this.state.viewMode === "map" && !isMapPreviewSupported(geographyType)) return;
    const currentSearch = this.props.location?.search || "";
    const embed = new URLSearchParams(currentSearch).get("embed") === "1";
    const shareParams = buildDatasetViewShareSearchParams({
      embed,
      viewMode: this.state.viewMode,
      mapVariable: this.state.mapVariable,
      geographicFrame: this.state.geographicFrame,
      mapDimensionSelections: this.state.mapDimensionSelections,
      columnKeys: this.state.columnKeys,
      selectedColumns: this.state.selectedColumns,
      availableGeographies: [],
      selectedGeographies: [],
      availableYears: this.state.availableYears,
      selectedYears:
        this.state.viewMode === "map" && this.state.mapYear != null
          ? [this.state.mapYear]
          : this.state.selectedYears,
      queryYearColumn: this.state.queryYearColumn,
    });
    const qs = shareParams.toString();
    const search = qs ? `?${qs}` : "";
    if (this.props.navigate) {
      this.props.navigate(datasetViewerPath(nextDatasetId, this.state.viewMode, search));
    }
  }

  onViewModeChange(viewMode) {
    this.setState((prevState) => {
      if (viewMode === "map") {
        return {
          viewMode,
          mapYear: resolveMapYear(prevState.mapYear, prevState.availableYears),
        };
      }
      return { viewMode };
    }, () => {
      const datasetId = this.props.params.id;
      const currentSearch = this.props.location?.search || "";
      const embed = new URLSearchParams(currentSearch).get("embed") === "1";
      const shareParams = buildDatasetViewShareSearchParams({
        embed,
        viewMode,
        mapVariable: this.state.mapVariable,
        geographicFrame: this.state.geographicFrame,
        mapDimensionSelections: this.state.mapDimensionSelections,
        columnKeys: this.state.columnKeys,
        selectedColumns: this.state.selectedColumns,
        availableGeographies: this.state.availableGeographies,
        selectedGeographies: this.state.selectedGeographies,
        availableYears: this.state.availableYears,
        selectedYears:
          viewMode === "map" && this.state.mapYear != null
            ? [this.state.mapYear]
            : this.state.selectedYears,
        queryYearColumn: this.state.queryYearColumn,
      });
      const qs = shareParams.toString();
      const search = qs ? `?${qs}` : "";
      if (this.props.navigate) {
        this.props.navigate(datasetViewerPath(datasetId, viewMode, search));
      }
    });
  }

  onMapVariableChange(mapVariable) {
    this.setState({ mapVariable });
  }

  onGeographicFrameChange(geographicFrame) {
    this.setState({ geographicFrame });
  }

  onMapDimensionSelectionsChange(mapDimensionSelections) {
    this.setState({ mapDimensionSelections: mapDimensionSelections || {} });
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

  addFilterToList(filter) {
    const newFilters = [...this.state.columnFilters];
    newFilters.push(filter);

    this.setState({ columnFilters: newFilters });
  }

  removeFilterFromList(filter) {
    const newFilters = this.state.columnFilters.filter(f => {
      return f.columnKey !== filter.columnKey ||
        f.filterType !== filter.filterType ||
        f.textValue !== filter.textValue;
    });

    this.setState({ columnFilters: newFilters });
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
      const mapPreviewSupported = isMapPreviewSupported(this.state.geographyType);
      const geographyGroup = findDatasetGeographyGroup(this.props.datasets, this.props.params.id);
      const geographyLevels = geographyLevelsWithMapSupport(
        geographyGroup?.levels || [],
        this.props.datasets,
      );
      const headerYears =
        this.state.viewMode === "map" && this.state.queryYearColumn
          ? this.state.mapYear != null
            ? [this.state.mapYear]
            : []
          : this.state.selectedYears;
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
            selectedYears={headerYears}
            availableGeographies={this.state.availableGeographies}
            selectedGeographies={this.state.selectedGeographies}
            updateSelectedGeographies={this.updateSelectedGeographies}
            geographyColumn={this.state.geographyColumn}
            geographyLevels={geographyLevels}
            onGeographyLevelChange={this.onGeographyLevelChange}
            rowsPerPage={this.state.rowsPerPage}
            numberOfRows={this.state.rows.length}
            updateRowsPerPage={this.updateRowsPerPage}
            source={this.state.source}
            table={this.state.table}
            title={this.state.title}
            columnFilters={this.state.columnFilters}
            removeColumnFilter={this.removeFilterFromList}
            updateSelectedColumns={this.updateSelectedColumns}
            updateSelectedYears={this.updateSelectedYears}
            universe={this.state.universe}
            updatedAt={this.state.updatedAt}
            viewMode={this.state.viewMode}
            onViewModeChange={this.onViewModeChange}
            mapPreviewSupported={mapPreviewSupported}
            mapVariable={this.state.mapVariable}
            geographicFrame={this.state.geographicFrame}
            mapDimensionSelections={this.state.mapDimensionSelections}
            geographyType={this.state.geographyType}
          />
          {this.state.viewMode === "map" && mapPreviewSupported ? (
            <DatasetMapPreview
              rows={this.state.rows}
              columnKeys={this.state.columnKeys}
              queryYearColumn={this.state.queryYearColumn}
              selectedYears={headerYears}
              geographyColumn={this.state.geographyColumn}
              selectedGeographies={this.state.selectedGeographies}
              availableGeographies={this.state.availableGeographies}
              columnFilters={this.state.columnFilters}
              geographyType={this.state.geographyType}
              mapVariable={this.state.mapVariable}
              onMapVariableChange={this.onMapVariableChange}
              geographicFrame={this.state.geographicFrame}
              onGeographicFrameChange={this.onGeographicFrameChange}
              mapDimensionSelections={this.state.mapDimensionSelections}
              onMapDimensionSelectionsChange={this.onMapDimensionSelectionsChange}
              menu1={this.state.menu1}
              title={this.state.title}
              source={this.state.source}
              datasetId={this.props.params.id}
              database={this.state.database}
              schema={this.state.schema}
              table={this.state.table}
            />
          ) : (
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
              updateSelectedColumns={this.updateSelectedColumns}
              showHiddenColumns={this.showHiddenColumns}
              addNewColumnFilter={this.addFilterToList}
              columnFilters={this.state.columnFilters}
              previewColumnOrder={this.state.previewColumnOrder}
              onPreviewColumnOrderChange={this.onPreviewColumnOrderChange}
              onResetPreviewLayout={this.onResetPreviewLayout}
            />
          )}
        </section>
      );
    }

    return <>{pageContents}</>;
  }
}

const DataViewerPage = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const datasets = useSelector((state) => state.dataset.cache);

  return (
    <DataViewerClass
      params={params}
      location={location}
      navigate={navigate}
      datasets={datasets}
      fetchDatasets={() => dispatch(fetchDatasets())}
    />
  );
};

export default DataViewerPage;

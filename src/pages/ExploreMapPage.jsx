import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams, Outlet } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion, faFileLines, faMap, faTable } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import html2canvas from "html2canvas";
import mapboxgl from "mapbox-gl";
import MoonLoader from "react-spinners/MoonLoader";
import "mapbox-gl/dist/mapbox-gl.css";

import DataStoryEditor from "../components/partials/DataStoryEditor";
import DatasetMapPreview from "../components/partials/DatasetMapPreview";
import DatasetSearchBar from "../components/partials/DatasetSearchBar";
import { prioritized as prioritizedCategories } from "../constants/categories";
import exploreTileGrid from "../assets/images/exploreMap/tile-grid.png";
import { MAP_CONFIG } from "../constants/mapConfig";
import { fetchDatasets } from "../reducers/datasetSlice";
import {
  dataStoryUrlMax,
  buildDataStoryPayload,
  dataStorySharePath,
  decodeDataStory,
  encodeDataStory,
  sanitizeStoryHtml,
} from "../utils/dataStory";
import { compressDatasetsByGeography, findDatasetGeographyGroup, stripGeographyFromTitle } from "../utils/manageDatasets";
import { pickDatasetOfTheWeek } from "../utils/featuredDataset";
import {
  detectDatasetGeographyType,
  isMapPreviewSupported,
  resolveTableGeographyColumn,
} from "../utils/datasetMapPreview";

function rowLimitForTable(tableName) {
  if (
    tableName === "econ_es202_naics_4d_m" ||
    tableName === "econ_es202_naics_2d_m" ||
    tableName === "econ_es202_naics_3d_m" ||
    String(tableName || "").startsWith("educ_")
  ) {
    return 460000;
  }
  return 15000;
}

const TOPIC_PAGE_SIZE = 6;
const TOPIC_GEOGRAPHY_LABELS = {
  municipal: "Municipal",
  census_tracts: "Census tract",
  boundary: "Boundary",
};

function mapViewTypeForDataset(dataset) {
  const geographyType = detectDatasetGeographyType(dataset?.table_name, dataset?.geography, {
    menu1: dataset?.menu1,
  });
  return isMapPreviewSupported(geographyType) ? geographyType : null;
}

function shortSourceName(source) {
  const text = String(source || "").trim();
  const match = text.match(/\(([^)]+)\)\s*$/);
  if (match && match[1].trim().length <= 20) return match[1].trim();
  return text;
}

function defaultFeaturedRow(featured) {
  const rows = featured?.datasets || [];
  if (!rows.length) return null;
  if (rows.length === 1) return rows[0];
  const pair = (featured.geoIdPairs || []).find((item) => item.geography);
  if (!pair) return rows[0];
  return rows.find((row) => String(row.seq_id || row.id) === String(pair.id)) || rows[0];
}

const MAP_READY_TIMEOUT_MS = 30000;

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

/**
 * Resolve true once the year data overlay is gone and Mapbox reports idle
 * (tiles and choropleth rendered) on two checks in a row.
 */
async function waitForMapReady(shell, timeoutMs = MAP_READY_TIMEOUT_MS) {
  const isReady = () => {
    if (shell.querySelector(".dataset-map-preview__loading")) return false;
    const map = shell.querySelector(".dataset-map-preview__map");
    return map?.getAttribute("data-map-ready") === "true";
  };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isReady()) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      await nextFrame();
      await nextFrame();
      if (isReady()) return true;
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 200));
    }
  }
  return false;
}

function SearchLoadingSpinner() {
  return (
    <span className="explore-map__search-loading" role="status" aria-label="Loading datasets">
      <MoonLoader size={16} color="#1F4E46" aria-hidden="true" />
    </span>
  );
}

function introDatasetLabel(dataset) {
  return String(dataset?.menu3 || dataset?.table_name || "").trim();
}

function ExploreBasemap() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_CONFIG.style,
      bounds: MAP_CONFIG.bounds,
      fitBoundsOptions: { padding: 24 },
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    return () => map.remove();
  }, []);

  return <div className="explore-map__basemap" ref={containerRef} />;
}

function applyStoryToMapState(prev, story) {
  const matchedYear = (prev.availableYears || []).find((item) => String(item) === String(story.year));
  return {
    ...prev,
    mapVariable: story.mapVar || prev.mapVariable,
    mapYear: matchedYear != null ? matchedYear : prev.mapYear,
    geographicFrame: story.geoFrame || prev.geographicFrame || "mapc",
    mapDimensionSelections: story.dims || {},
  };
}

const ExploreMapPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token } = useParams();
  const datasets = useSelector((state) => state.dataset.cache);
  const noDupesDatasets = useSelector((state) => state.dataset.noDupesDatasets);
  const status = useSelector((state) => state.dataset.status);
  const datasetsLoading = status === "idle" || status === "loading";
  const [searchParams, setSearchParams] = useSearchParams();
  const [mapState, setMapState] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [mapError, setMapError] = useState("");
  const [controlsHost, setControlsHost] = useState(null);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyBody, setStoryBody] = useState("");
  const [storyRevision, setStoryRevision] = useState(0);
  const [storyHydrated, setStoryHydrated] = useState(() => !token);
  const [storyError, setStoryError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareError, setShareError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [printImage, setPrintImage] = useState("");
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyViewOpen, setStoryViewOpen] = useState(true);
  const storyApplyRef = useRef(null);
  const mapStateRef = useRef(null);
  const storyTitleRef = useRef("");
  const storyBodyRef = useRef("");
  const printRequestedRef = useRef(false);
  const previousTitleRef = useRef("");
  const storyDialogRef = useRef(null);
  const tokenRef = useRef(token);
  const pendingStoryOpenRef = useRef(false);
  const introResultsRef = useRef([]);
  const introPickRef = useRef(null);
  const [introQuery, setIntroQuery] = useState("");
  const [introTopic, setIntroTopic] = useState("");
  const [topicLimit, setTopicLimit] = useState(TOPIC_PAGE_SIZE);

  const datasetId = searchParams.get("dataset");
  mapStateRef.current = mapState;
  storyTitleRef.current = storyTitle;
  storyBodyRef.current = storyBody;
  tokenRef.current = token;

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDatasets());
    }
  }, [status, dispatch]);

  useEffect(() => {
    if (!token) {
      setStoryHydrated(true);
      setStoryError("");
      return undefined;
    }

    let cancelled = false;
    decodeDataStory(token).then((story) => {
      if (cancelled) return;
      if (!story) {
        storyApplyRef.current = null;
        setStoryError("This data story link is invalid or incomplete.");
        setStoryHydrated(true);
        return;
      }

      setStoryError("");
      setStoryViewOpen(true);
      const titleChanged = storyTitleRef.current !== story.title;
      const bodyChanged = storyBodyRef.current !== story.body;
      setStoryTitle(story.title);
      setStoryBody(story.body);
      if (titleChanged || bodyChanged) setStoryRevision((current) => current + 1);

      const loadedMap = mapStateRef.current;
      const sameDataset = loadedMap && String(loadedMap.datasetId) === String(story.dataset);
      if (sameDataset) {
        storyApplyRef.current = null;
        setMapState((prev) => (prev ? applyStoryToMapState(prev, story) : prev));
      } else {
        storyApplyRef.current = story;
      }

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (next.get("dataset") === String(story.dataset)) return prev;
        next.set("dataset", String(story.dataset));
        return next;
      }, { replace: true });
      setStoryHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [token, setSearchParams]);

  const mappableDatasets = useMemo(() => {
    const byTable = new Map();
    (datasets || []).forEach((dataset) => {
      const tableName = dataset?.table_name;
      if (!tableName || byTable.has(tableName)) return;
      if (!mapViewTypeForDataset(dataset)) return;
      byTable.set(tableName, dataset);
    });
    return [...byTable.values()];
  }, [datasets]);
  const searchPlaceholder = datasetsLoading
    ? "Loading datasets…"
    : `Search ${mappableDatasets.length} datasets by table name or title, e.g. housing`;

  const exploreTopics = useMemo(() => {
    const groups = new Map();
    (datasets || []).forEach((row) => {
      const category = String(row?.menu1 || "").trim();
      if (!category || !row?.table_name || !mapViewTypeForDataset(row)) return;
      if (!groups.has(category)) groups.set(category, new Map());
      const tables = groups.get(category);
      if (!tables.has(row.table_name)) tables.set(row.table_name, row);
    });
    const priority = [...prioritizedCategories.keys()].filter((name) => groups.has(name));
    const rest = [...groups.keys()].filter((name) => !prioritizedCategories.has(name)).sort((a, b) => a.localeCompare(b));
    const geographyOrder = Object.keys(TOPIC_GEOGRAPHY_LABELS);
    return [...priority, ...rest].map((category) => ({
      category,
      datasets: compressDatasetsByGeography([...groups.get(category).values()])
        .map((group) => ({
          tableName: group.table_name,
          title: String(group.menu3 || group.table_name),
          maps: group.datasets
            .map((row) => ({ id: row.seq_id || row.id, type: mapViewTypeForDataset(row) }))
            .sort((a, b) => geographyOrder.indexOf(a.type) - geographyOrder.indexOf(b.type)),
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    }));
  }, [datasets]);
  const activeTopic = exploreTopics.find((topic) => topic.category === introTopic) || exploreTopics[0];
  const topicRows = (activeTopic?.datasets || []).slice(0, topicLimit);

  const datasetOfTheWeek = useMemo(() => {
    // The datasets homepage can feature a table with no choropleth. Explore picks
    // its own weekly dataset from tables that can open on the map.
    const catalog = datasets?.length ? datasets : noDupesDatasets;
    const mappable = (catalog || []).filter((row) => mapViewTypeForDataset(row));
    const featured = pickDatasetOfTheWeek(mappable);
    const preferred = defaultFeaturedRow(featured);
    const row = preferred && mapViewTypeForDataset(preferred)
      ? preferred
      : (featured?.datasets || []).find((item) => mapViewTypeForDataset(item));
    if (!row) return null;
    const pair = (featured.geoIdPairs || []).find((item) => String(item.id) === String(row.seq_id || row.id));
    return {
      id: row.seq_id || row.id,
      title: row.menu3 || featured.menu3 || "Dataset of the week",
      source: row.source || featured.source || "",
      sourceLabel: shortSourceName(row.source || featured.source),
      geography: pair?.geography || "",
    };
  }, [datasets, noDupesDatasets]);

  const geographyLevels = useMemo(() => {
    if (!datasetId || !datasets.length) return [];
    const group = findDatasetGeographyGroup(datasets, datasetId);
    return (group?.levels || [])
      .map((level) => {
        const sibling = datasets.find((row) => +row.seq_id === +level.id);
        return { ...level, mapSupported: Boolean(sibling && mapViewTypeForDataset(sibling)) };
      })
      .filter((level) => level.mapSupported);
  }, [datasets, datasetId]);

  useEffect(() => {
    if (!datasetId) {
      setMapState(null);
      setLoadingMap(false);
      setMapError("");
      return undefined;
    }
    if (status !== "succeeded") return undefined;
    // Wait until a shared story is decoded so the choropleth uses its saved variable and year.
    if (tokenRef.current && !storyHydrated) return undefined;

    const dataset = datasets.find((row) => String(row.seq_id) === String(datasetId));
    const geographyType = dataset ? mapViewTypeForDataset(dataset) : null;

    if (!dataset || !geographyType) {
      setMapState(null);
      setLoadingMap(false);
      setMapError("Choose a dataset that has a map view.");
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoadingMap(true);
    setMapError("");

    const limit = rowLimitForTable(dataset.table_name);
    let tableQueryUrl = `/api?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}&limit=${limit}`;
    if (dataset.yearcolumn) {
      tableQueryUrl = `${tableQueryUrl}&orderByColumn=${dataset.yearcolumn}&orderByDirection=DESC`;
    }

    const requests = [
      axios.get(tableQueryUrl, { signal: controller.signal }),
      axios.get(
        `/api/metadata?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}&useNewMetadata=true`,
        { signal: controller.signal },
      ),
    ];
    if (dataset.yearcolumn) {
      requests.push(
        axios.get(
          `/api/?token=${import.meta.env.VITE_MAPC_API_TOKEN}&distinctColumn=${dataset.yearcolumn}&database=${dataset.db_name}&schema=${dataset.schemaname}&table=${dataset.table_name}&limit=50`,
          { signal: controller.signal },
        ),
      );
    }

    axios
      .all(requests)
      .then((response) => {
        if (cancelled) return;
        const tableResults = response[0].data.rows || [];
        const metadata = Object.values(response[1].data)[0] || [];
        const yearResults = requests.length === 3 ? response[2].data.rows : [];
        const distinctYears = yearResults.map((year) => Object.values(year)[0]).sort().reverse();
        const columnKeys = metadata
          .filter((object) => tableResults[0] && Object.keys(tableResults[0]).includes(object.name))
          .filter((header) => header.name !== "seq_id")
          .filter((header) => header.name !== "shape");

        let availableGeographies = [];
        let geographyColumn = null;
        if (dataset.schemaname === "tabular" && geographyType === "municipal") {
          geographyColumn = resolveTableGeographyColumn(tableResults[0]);
          if (geographyColumn) {
            const geoSet = new Set();
            tableResults.forEach((row) => {
              if (row[geographyColumn]) geoSet.add(row[geographyColumn]);
            });
            availableGeographies = Array.from(geoSet).sort((a, b) => String(a).localeCompare(String(b)));
          }
        }

        const group = findDatasetGeographyGroup(datasets, dataset.seq_id);
        const pendingStory = storyApplyRef.current;
        const useStory = pendingStory && String(pendingStory.dataset) === String(dataset.seq_id);
        if (useStory) storyApplyRef.current = null;
        const storyYear = useStory
          ? distinctYears.find((item) => String(item) === String(pendingStory.year))
          : null;
        setMapState({
          rows: tableResults,
          columnKeys,
          queryYearColumn: dataset.yearcolumn || "",
          availableYears: distinctYears,
          mapYear: storyYear ?? distinctYears[0] ?? null,
          geographyColumn,
          availableGeographies,
          selectedGeographies: availableGeographies,
          geographyType,
          menu1: dataset.menu1 || null,
          title: stripGeographyFromTitle(group?.title || dataset.menu3),
          source: dataset.source,
          datasetId: dataset.seq_id,
          database: dataset.db_name,
          schema: dataset.schemaname,
          table: dataset.table_name,
          mapVariable: useStory ? pendingStory.mapVar : null,
          geographicFrame: useStory && pendingStory.geoFrame ? pendingStory.geoFrame : "mapc",
          mapDimensionSelections: useStory ? pendingStory.dims : {},
        });
        setLoadingMap(false);
      })
      .catch((error) => {
        if (cancelled || axios.isCancel?.(error) || error?.code === "ERR_CANCELED") return;
        console.error(error);
        setMapState(null);
        setLoadingMap(false);
        setMapError("The map data could not be loaded. Try another dataset.");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [datasetId, datasets, status, storyHydrated]);

  const clearShareFeedback = useCallback(() => {
    setShareMessage("");
    setShareError("");
    setShareUrl("");
  }, []);

  const selectDataset = (id, { openStory = false } = {}) => {
    pendingStoryOpenRef.current = openStory;
    storyApplyRef.current = null;
    clearShareFeedback();
    const nextId = id ? String(id) : "";
    if (nextId && nextId !== String(datasetId || "")) {
      setLoadingMap(true);
      setMapError("");
    }
    if (token) {
      navigate(nextId ? `/explore?dataset=${encodeURIComponent(nextId)}` : "/explore");
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (!nextId) next.delete("dataset");
    else next.set("dataset", nextId);
    setSearchParams(next);
  };

  useEffect(() => {
    if (!pendingStoryOpenRef.current) return undefined;
    if (mapError) {
      pendingStoryOpenRef.current = false;
      return undefined;
    }
    if (loadingMap || !mapState?.datasetId) return undefined;
    if (String(mapState.datasetId) !== String(datasetId || "")) return undefined;
    pendingStoryOpenRef.current = false;
    setStoryOpen(true);
    return undefined;
  }, [loadingMap, mapState, mapError, datasetId]);

  const handleIntroSearchChange = useCallback(({ results }) => {
    introResultsRef.current = results || [];
  }, []);

  const handleIntroQueryChange = (value) => {
    setIntroQuery(value);
    const picked = introPickRef.current;
    if (picked && value.trim() !== introDatasetLabel(picked)) {
      introPickRef.current = null;
    }
  };

  const handleIntroPick = (dataset) => {
    introPickRef.current = dataset || null;
    setIntroQuery(introDatasetLabel(dataset));
  };

  const openFirstSearchResult = () => {
    const first = introResultsRef.current[0];
    if (!introQuery.trim() || !first) {
      document.getElementById("explore-intro-search")?.focus();
      return;
    }
    selectDataset(first.seq_id || first.id);
  };

  const submitIntroSearch = () => {
    const picked = introPickRef.current;
    const query = introQuery.trim();
    if (picked && query && query === introDatasetLabel(picked)) {
      selectDataset(picked.seq_id || picked.id);
      return;
    }
    openFirstSearchResult();
  };

  const focusBrowseTopics = () => {
    document.getElementById("explore-browse-topics")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleShareStory = async () => {
    if (!mapState?.datasetId || sharing) return;
    setSharing(true);
    setShareError("");
    setShareMessage("");
    try {
      const payload = buildDataStoryPayload({
        dataset: mapState.datasetId,
        mapVar: mapState.mapVariable,
        year: mapState.mapYear,
        geoFrame: mapState.geographicFrame,
        dims: mapState.mapDimensionSelections,
        title: storyTitle,
        body: storyBody,
      });
      if (!payload) {
        setShareError("Choose a dataset before sharing a data story.");
        return;
      }
      const encoded = await encodeDataStory(payload);
      const path = dataStorySharePath(encoded, payload.dataset);
      const url = `${window.location.origin}${path}`;
      if (url.length > dataStoryUrlMax) {
        setShareError("This story is too long to share as a link. Shorten the text and try again.");
        return;
      }
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch (error) {
        copied = false;
      }
      setShareUrl(url);
      setShareMessage(copied ? "Link copied." : "Copy the story link below.");
      navigate(path, { replace: true });
    } catch (error) {
      console.error(error);
      setShareError("The share link could not be created.");
    } finally {
      setSharing(false);
    }
  };

  const handleExportPdf = async () => {
    const shell = document.getElementById("top-level-map-container");
    if (!shell || pdfBusy) return;
    setPdfBusy(true);
    setPdfMessage("");
    const mapReady = await waitForMapReady(shell);
    if (!mapReady) {
      setPdfMessage("The map is still loading. Try Export PDF again in a moment.");
      setPdfBusy(false);
      return;
    }
    const controls = document.getElementById("layer-button-controls-container");
    const zoomControl = shell.querySelector(".mapboxgl-ctrl-bottom-right");
    if (controls) controls.style.visibility = "hidden";
    if (zoomControl) zoomControl.style.visibility = "hidden";
    try {
      const canvas = await html2canvas(shell, {
        useCORS: true,
        backgroundColor: "#ffffff",
        scale: Math.min(2, window.devicePixelRatio || 1),
        logging: false,
      });
      previousTitleRef.current = document.title;
      document.title = `${storyTitle.trim() || mapState?.title || "Data story"} - DataCommon`;
      printRequestedRef.current = true;
      setPrintImage(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error(error);
      setPdfMessage("The map image could not be captured. Use the browser print dialog and choose Save as PDF.");
      window.print();
    } finally {
      if (controls) controls.style.visibility = "";
      if (zoomControl) zoomControl.style.visibility = "";
      setPdfBusy(false);
    }
  };

  useEffect(() => {
    if (!printImage || !printRequestedRef.current) return undefined;
    printRequestedRef.current = false;
    document.body.classList.add("is-data-story-print");
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [printImage]);

  useEffect(() => {
    if (!storyOpen) return undefined;
    storyDialogRef.current?.focus();
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setStoryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [storyOpen]);

  useEffect(() => {
    const restore = () => {
      document.body.classList.remove("is-data-story-print");
      if (previousTitleRef.current) {
        document.title = previousTitleRef.current;
        previousTitleRef.current = "";
      }
      setPrintImage("");
    };
    window.addEventListener("afterprint", restore);
    return () => window.removeEventListener("afterprint", restore);
  }, []);

  const selectedDataset = datasets.find((row) => String(row.seq_id) === String(datasetId));
  const selectedTableName = stripGeographyFromTitle(selectedDataset?.menu3 || mapState?.title || "");
  const mapSelectedYears = useMemo(
    () => (mapState?.mapYear != null ? [mapState.mapYear] : []),
    [mapState?.mapYear],
  );
  const mapColumnFilters = useMemo(() => [], []);
  const handleMapVariableChange = useCallback((mapVariable) => {
    setMapState((prev) => {
      if (!prev || prev.mapVariable === mapVariable) return prev;
      return { ...prev, mapVariable };
    });
    if (mapStateRef.current && mapStateRef.current.mapVariable !== mapVariable) {
      clearShareFeedback();
    }
  }, [clearShareFeedback]);
  const handleGeographicFrameChange = useCallback((geographicFrame) => {
    setMapState((prev) => {
      if (!prev || prev.geographicFrame === geographicFrame) return prev;
      return { ...prev, geographicFrame };
    });
    if (mapStateRef.current && mapStateRef.current.geographicFrame !== geographicFrame) {
      clearShareFeedback();
    }
  }, [clearShareFeedback]);
  const handleDimensionSelectionsChange = useCallback((mapDimensionSelections) => {
    setMapState((prev) => {
      if (!prev) return prev;
      const next = mapDimensionSelections || {};
      const current = prev.mapDimensionSelections || {};
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (
        currentKeys.length === nextKeys.length
        && nextKeys.every((key) => current[key] === next[key])
      ) {
        return prev;
      }
      return { ...prev, mapDimensionSelections: next };
    });
    const current = mapStateRef.current?.mapDimensionSelections || {};
    const next = mapDimensionSelections || {};
    const currentKeys = Object.keys(current);
    const nextKeys = Object.keys(next);
    const unchanged = currentKeys.length === nextKeys.length
      && nextKeys.every((key) => current[key] === next[key]);
    if (mapStateRef.current && !unchanged) clearShareFeedback();
  }, [clearShareFeedback]);

  const storyDisplayTitle = storyTitle.trim() || mapState?.title || "Data story";
  const storyPrintHtml = sanitizeStoryHtml(storyBody);
  const showStarter = !datasetId && !(token && !storyHydrated);
  const showSharedStory = Boolean(token) && storyHydrated && !storyError && !storyOpen
    && Boolean(mapState) && !loadingMap && Boolean(storyTitle.trim() || storyPrintHtml);

  return (
    <>
    {showStarter ? (
      <section className="route explore-intro">
        <div className="explore-intro__hero">
          <div className="container explore-intro__hero-grid">
            <div className="explore-intro__copy">
              <h1>Explore on the map</h1>
              <p className="explore-intro__lead">
                Explore DataCommon datasets through interactive choropleth maps and turn data into compelling stories. Start with our Dataset of the Week or search for a dataset that interests you. Choose a geography, visualize patterns, uncover insights, and create a customized data story to share your findings.
              </p>
              <label className="explore-intro__search-label" htmlFor="explore-intro-search">
                What do you want to look into?
              </label>
              <div className="explore-intro__search-row">
                <div className={`explore-map__search-bar explore-intro__search${datasetsLoading ? " is-loading" : ""}`}>
                  <DatasetSearchBar
                    inputId="explore-intro-search"
                    className="explore-map__dataset-search"
                    datasets={mappableDatasets}
                    placeholder={searchPlaceholder}
                    query={introQuery}
                    onQueryChange={handleIntroQueryChange}
                    onSearchChange={handleIntroSearchChange}
                    onPick={handleIntroPick}
                    onSubmit={submitIntroSearch}
                    confirmSelection
                    maxResults={10}
                    maxWidth="100%"
                    maxHeight="40vh"
                  />
                  {datasetsLoading && <SearchLoadingSpinner />}
                </div>
                <button
                  type="button"
                  className="explore-intro__search-button"
                  data-prevent-dataset-search-clear
                  onClick={submitIntroSearch}
                >
                  Search
                </button>
              </div>
              {status === "failed" && <p className="explore-map__status explore-map__status--error">Datasets could not be loaded.</p>}
              {storyError && <p className="explore-map__status explore-map__status--error">{storyError}</p>}
            </div>
            {datasetOfTheWeek && (
              <article className="explore-intro__feature" aria-labelledby="explore-dataset-of-the-week">
                <img className="explore-intro__mosaic" src={exploreTileGrid} alt="" />
                <div className="explore-intro__feature-body">
                  <p className="explore-intro__badge">Dataset of the week</p>
                  <h2 id="explore-dataset-of-the-week">{datasetOfTheWeek.title}</h2>
                  <p
                    className="explore-intro__feature-source"
                    title={datasetOfTheWeek.source || undefined}
                  >
                    {[datasetOfTheWeek.geography, datasetOfTheWeek.sourceLabel ? `Source: ${datasetOfTheWeek.sourceLabel}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="explore-intro__feature-actions">
                    <button
                      type="button"
                      className="explore-intro__button"
                      onClick={() => selectDataset(datasetOfTheWeek.id)}
                    >
                      <FontAwesomeIcon icon={faMap} aria-hidden="true" />
                      Open on the map
                    </button>
                    <button
                      type="button"
                      className="explore-intro__button explore-intro__button--outline"
                      onClick={() => selectDataset(datasetOfTheWeek.id, { openStory: true })}
                    >
                      <FontAwesomeIcon icon={faFileLines} aria-hidden="true" />
                      Start a data story
                    </button>
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>
        <section className="explore-intro__steps" aria-labelledby="explore-intro-steps">
          <div className="container">
            <div className="explore-intro__steps-header">
              <h2 id="explore-intro-steps">From question to story in three steps</h2>
            </div>
            <ol className="explore-intro__step-list">
              <li>
                <span className="explore-intro__step-number">1</span>
                <h3>Pick a dataset</h3>
                <p>Search by table name or title, or start from a topic.</p>
                <button type="button" className="explore-intro__text-link" onClick={focusBrowseTopics}>
                  Browse topics →
                </button>
              </li>
              <li>
                <span className="explore-intro__step-number">2</span>
                <h3>Shape the map</h3>
                <p>Select a geography, year, and data variable to create your choropleth map. Click any area to explore its data values.</p>
                {datasetOfTheWeek && (
                  <button
                    type="button"
                    className="explore-intro__text-link"
                    onClick={() => selectDataset(datasetOfTheWeek.id)}
                  >
                    Try it with the dataset of the week →
                  </button>
                )}
              </li>
              <li>
                <span className="explore-intro__step-number">3</span>
                <h3>Create a data story</h3>
                <p>Add your maps with insights, then share the link with your team or community.</p>
                {datasetOfTheWeek && (
                  <button
                    type="button"
                    className="explore-intro__text-link"
                    onClick={() => selectDataset(datasetOfTheWeek.id, { openStory: true })}
                  >
                    See how data stories work →
                  </button>
                )}
              </li>
            </ol>
          </div>
        </section>
        <section className="explore-intro__browse" aria-labelledby="explore-browse-topics">
          <div className="container">
            <div className="explore-intro__browse-head">
              <h2 id="explore-browse-topics">Browse by topic</h2>
              <span className="explore-intro__help">
                <button type="button" aria-label="About these topics" aria-describedby="explore-browse-topics-tip">
                  <FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" />
                </button>
                <span id="explore-browse-topics-tip" role="tooltip" className="explore-intro__help-tooltip">
                  Only include datasets that support map visualization for each topic.
                </span>
              </span>
            </div>
            {activeTopic && (
              <div className="explore-intro__topics-layout">
                <nav className="explore-intro__topic-nav" aria-label="Topics">
                  <p className="explore-intro__topic-nav-label">Topics</p>
                  <ul>
                    {exploreTopics.map(({ category, datasets: rows }) => {
                      const selected = activeTopic.category === category;
                      return (
                        <li key={category}>
                          <button
                            type="button"
                            className={selected ? "is-selected" : ""}
                            aria-pressed={selected}
                            onClick={() => {
                              setIntroTopic(category);
                              setTopicLimit(TOPIC_PAGE_SIZE);
                            }}
                          >
                            <span>{category}</span>
                            <span className="explore-intro__topic-count" title={`${rows.length} datasets`}>
                              {rows.length}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="explore-intro__topic-panel">
                  <div className="explore-intro__topic-panel-head">
                    <h3>{activeTopic.category}</h3>
                    <span className="explore-intro__topic-showing" aria-live="polite">
                      <span className="explore-intro__topic-showing-long">
                        Showing {topicRows.length} of {activeTopic.datasets.length} datasets
                      </span>
                      <span className="explore-intro__topic-showing-short" aria-hidden="true">
                        {topicRows.length} of {activeTopic.datasets.length}
                      </span>
                    </span>
                  </div>
                  <ul className="explore-intro__topic-results">
                    {topicRows.map((dataset) => (
                      <li key={dataset.tableName} className="explore-intro__dataset-card">
                        <span className="explore-intro__dataset-text">
                          <span className="explore-intro__dataset-name">{dataset.title}</span>
                          <span className="explore-intro__table-name">{dataset.tableName}</span>
                        </span>
                        <span className="explore-intro__map-options">
                          {dataset.maps.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className="explore-intro__map-option"
                              aria-label={`View ${dataset.title} map by ${TOPIC_GEOGRAPHY_LABELS[option.type]}`}
                              onClick={() => selectDataset(option.id)}
                            >
                              <FontAwesomeIcon icon={faMap} aria-hidden="true" />
                              {TOPIC_GEOGRAPHY_LABELS[option.type]}
                            </button>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {topicRows.length < activeTopic.datasets.length && (
                    <button
                      type="button"
                      className="explore-intro__show-more"
                      onClick={() => setTopicLimit((limit) => limit + TOPIC_PAGE_SIZE)}
                    >
                      Show more
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </section>
    ) : (
    <div className="explore-map">
      <aside className="explore-map__picker" aria-label="Choose a dataset">
        <h1>Explore on the map</h1>
        <div className={`explore-map__search-bar${datasetsLoading ? " is-loading" : ""}`}>
          <DatasetSearchBar
            className="explore-map__dataset-search"
            datasets={mappableDatasets}
            placeholder={datasetsLoading ? searchPlaceholder : "Search by table name or title"}
            onSelect={(dataset) => selectDataset(dataset?.seq_id || dataset?.id)}
            maxResults={10}
            maxWidth="100%"
            maxHeight="40vh"
          />
          {datasetsLoading && <SearchLoadingSpinner />}
        </div>

        {status === "failed" && <p className="explore-map__status explore-map__status--error">Datasets could not be loaded.</p>}
        {mapError && <p className="explore-map__status explore-map__status--error">{mapError}</p>}
        {storyError && <p className="explore-map__status explore-map__status--error">{storyError}</p>}

        {selectedTableName && (
          <p className="explore-map__selected">{selectedTableName}</p>
        )}

        {!loadingMap && mapState && (
          <div className="explore-map__story-actions">
            <div className="explore-map__story-button-wrap">
              <button
                type="button"
                className="explore-map__story-button"
                aria-describedby="explore-map-story-tip"
                onClick={() => setStoryOpen(true)}
              >
                Create a data story
              </button>
              <span id="explore-map-story-tip" role="tooltip" className="explore-map__story-tooltip">
                Create a data story with customized title, content, and key insights. Export it as a PDF or generate a shareable link.
              </span>
            </div>
            <a
              className="explore-map__dataset-link"
              href={`/browser/datasets/${mapState.datasetId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faTable} aria-hidden="true" />
              <span>Open this dataset</span>
            </a>
          </div>
        )}

        {loadingMap && (
          <div className="explore-map__side-loading" role="status" aria-live="polite">
            <MoonLoader size={36} color="#767676" />
            <span>Loading data…</span>
          </div>
        )}

        {!loadingMap && mapState && (geographyLevels.length > 1 || mapState.availableYears?.length > 0) && (
          <div className="explore-map__filters">
            {geographyLevels.length > 1 && (
              <div className="explore-map__years">
                <span>Geography</span>
                <ul>
                  {geographyLevels.map((level) => {
                    const isSelected = String(level.id) === String(datasetId);
                    return (
                      <li key={level.id}>
                        <button
                          type="button"
                          className={isSelected ? "is-selected" : ""}
                          onClick={() => selectDataset(level.id)}
                        >
                          {level.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {mapState.availableYears?.length > 0 && (
              <div className="explore-map__years explore-map__years--dropdown">
                <label htmlFor="explore-map-year">Year</label>
                <select
                  id="explore-map-year"
                  className="explore-map__year-select"
                  value={mapState.mapYear != null ? String(mapState.mapYear) : ""}
                  onChange={(event) => {
                    const year = mapState.availableYears.find((item) => String(item) === event.target.value);
                    if (year == null) return;
                    clearShareFeedback();
                    setMapState((prev) => (prev ? { ...prev, mapYear: year } : prev));
                  }}
                >
                  {mapState.availableYears.map((year) => (
                    <option key={String(year)} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {mapState && (
          <div className="datasets explore-map__controls" ref={setControlsHost} hidden={loadingMap || undefined} />
        )}
      </aside>

      <div className="explore-map__stage">
      {!mapState && <ExploreBasemap />}
      {loadingMap && (
        <div className="explore-map__loading-mask" role="status" aria-live="polite" aria-label="Loading map">
          <MoonLoader size={42} color="#767676" />
          <span>Loading map…</span>
        </div>
      )}
      {showSharedStory && (
        <section className="explore-map__story-view" aria-labelledby="explore-story-view-title">
          <div className="explore-map__story-view-head">
            <h2 id="explore-story-view-title">
              <FontAwesomeIcon icon={faFileLines} aria-hidden="true" />
              {storyDisplayTitle}
            </h2>
            <div className="explore-map__story-view-actions">
              <button type="button" onClick={() => setStoryOpen(true)}>
                Edit story
              </button>
              {storyPrintHtml && (
                <button
                  type="button"
                  aria-expanded={storyViewOpen}
                  aria-controls="explore-story-view-body"
                  onClick={() => setStoryViewOpen((open) => !open)}
                >
                  {storyViewOpen ? "Hide story" : "Show story"}
                </button>
              )}
            </div>
          </div>
          {storyViewOpen && storyPrintHtml && (
            <div
              id="explore-story-view-body"
              className="explore-map__story-view-body"
              dangerouslySetInnerHTML={{ __html: storyPrintHtml }}
            />
          )}
        </section>
      )}
      {mapState && (
        <section className="datasets explore-map__viewer">
          <DatasetMapPreview
            rows={mapState.rows}
            columnKeys={mapState.columnKeys}
            queryYearColumn={mapState.queryYearColumn}
            selectedYears={mapSelectedYears}
            geographyColumn={mapState.geographyColumn}
            selectedGeographies={mapState.selectedGeographies}
            availableGeographies={mapState.availableGeographies}
            columnFilters={mapColumnFilters}
            geographyType={mapState.geographyType}
            mapVariable={mapState.mapVariable}
            onMapVariableChange={handleMapVariableChange}
            geographicFrame={mapState.geographicFrame}
            onGeographicFrameChange={handleGeographicFrameChange}
            mapDimensionSelections={mapState.mapDimensionSelections}
            onMapDimensionSelectionsChange={handleDimensionSelectionsChange}
            menu1={mapState.menu1}
            title={mapState.title}
            source={mapState.source}
            datasetId={mapState.datasetId}
            database={mapState.database}
            schema={mapState.schema}
            table={mapState.table}
            sidePanelsHost={controlsHost}
          />
        </section>
      )}
      </div>
    </div>
    )}
    {storyOpen && storyHydrated && (
      <div
        className="data-story-modal"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setStoryOpen(false);
        }}
      >
        <div
          className="data-story-modal__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="data-story-heading"
          tabIndex={-1}
          ref={storyDialogRef}
        >
          <button
            type="button"
            className="data-story-modal__close"
            aria-label="Close data story"
            onClick={() => setStoryOpen(false)}
          >
            ×
          </button>
          <DataStoryEditor
            title={storyTitle}
            bodyHtml={storyBody}
            revision={storyRevision}
            shareUrl={shareUrl}
            shareMessage={shareMessage}
            shareError={shareError}
            pdfMessage={pdfMessage}
            busy={sharing}
            pdfBusy={pdfBusy}
            canShare={!loadingMap && Boolean(mapState)}
            canExport={!loadingMap && Boolean(mapState)}
            onTitleChange={(value) => {
              if (value === storyTitleRef.current) return;
              clearShareFeedback();
              setStoryTitle(value);
            }}
            onBodyChange={(value) => {
              if (value === storyBodyRef.current) return;
              clearShareFeedback();
              setStoryBody(value);
            }}
            onShare={handleShareStory}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>
    )}
    <article className="data-story-sheet" aria-hidden="true">
      <h1>{storyDisplayTitle}</h1>
      {storyPrintHtml && (
        <div className="data-story-sheet__body" dangerouslySetInnerHTML={{ __html: storyPrintHtml }} />
      )}
      {printImage && (
        <img className="data-story-sheet__map" src={printImage} alt="" />
      )}
      <div className="data-story-sheet__meta">
        <span>Source: {mapState?.source || "Unknown"}</span>
        <span>Years: {mapState?.mapYear != null ? String(mapState.mapYear) : "N/A"}</span>
        {mapState?.datasetId != null && mapState?.datasetId !== "" && mapState?.title && (
          <span className="data-story-sheet__meta-link">
            Link to:
            {" "}
            <a href={`/browser/datasets/${mapState.datasetId}/map`}>{mapState.title}</a>
          </span>
        )}
      </div>
    </article>
    <Outlet />
    </>
  );
};

export default ExploreMapPage;

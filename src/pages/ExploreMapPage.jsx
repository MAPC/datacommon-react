import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import MoonLoader from "react-spinners/MoonLoader";
import "mapbox-gl/dist/mapbox-gl.css";

import DatasetMapPreview from "../components/partials/DatasetMapPreview";
import DatasetSearchBar from "../components/partials/DatasetSearchBar";
import { MAP_CONFIG } from "../constants/mapConfig";
import { fetchDatasets } from "../reducers/datasetSlice";
import { findDatasetGeographyGroup } from "../utils/manageDatasets";
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

function mapViewTypeForDataset(dataset) {
  const geographyType = detectDatasetGeographyType(dataset?.table_name, dataset?.geography, {
    menu1: dataset?.menu1,
  });
  return isMapPreviewSupported(geographyType) ? geographyType : null;
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

const ExploreMapPage = () => {
  const dispatch = useDispatch();
  const datasets = useSelector((state) => state.dataset.cache);
  const status = useSelector((state) => state.dataset.status);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mapState, setMapState] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [mapError, setMapError] = useState("");
  const [controlsHost, setControlsHost] = useState(null);

  const datasetId = searchParams.get("dataset");

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDatasets());
    }
  }, [status, dispatch]);

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
        setMapState({
          rows: tableResults,
          columnKeys,
          queryYearColumn: dataset.yearcolumn || "",
          availableYears: distinctYears,
          mapYear: distinctYears[0] ?? null,
          geographyColumn,
          availableGeographies,
          selectedGeographies: availableGeographies,
          geographyType,
          menu1: dataset.menu1 || null,
          title: group?.title || dataset.menu3,
          source: dataset.source,
          datasetId: dataset.seq_id,
          database: dataset.db_name,
          schema: dataset.schemaname,
          table: dataset.table_name,
          mapVariable: null,
          geographicFrame: "mapc",
          mapDimensionSelections: {},
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
  }, [datasetId, datasets, status]);

  const selectDataset = (id) => {
    const nextId = id ? String(id) : "";
    if (nextId && nextId !== String(datasetId || "")) {
      setLoadingMap(true);
      setMapError("");
    }
    const next = new URLSearchParams(searchParams);
    if (!nextId) next.delete("dataset");
    else next.set("dataset", nextId);
    setSearchParams(next);
  };

  const selectedDataset = datasets.find((row) => String(row.seq_id) === String(datasetId));
  const selectedTableName = selectedDataset?.menu3 || mapState?.title || "";
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
  }, []);
  const handleGeographicFrameChange = useCallback((geographicFrame) => {
    setMapState((prev) => {
      if (!prev || prev.geographicFrame === geographicFrame) return prev;
      return { ...prev, geographicFrame };
    });
  }, []);
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
  }, []);

  return (
    <div className="explore-map">
      <aside className="explore-map__picker" aria-label="Choose a dataset">
        <h1>Explore on the map</h1>
        <div className="explore-map__search-bar">
          <DatasetSearchBar
            className="explore-map__dataset-search"
            datasets={mappableDatasets}
            placeholder={`Search ${mappableDatasets.length} datasets ...`}
            onSelect={(dataset) => selectDataset(dataset?.seq_id || dataset?.id)}
            maxResults={10}
            maxWidth="100%"
            maxHeight="40vh"
          />
        </div>

        {status === "loading" && <p className="explore-map__status">Loading datasets…</p>}
        {status === "failed" && <p className="explore-map__status explore-map__status--error">Datasets could not be loaded.</p>}
        {mapError && <p className="explore-map__status explore-map__status--error">{mapError}</p>}

        {selectedTableName && (
          <p className="explore-map__selected">{selectedTableName}</p>
        )}

        {loadingMap && (
          <div className="explore-map__side-loading" role="status" aria-live="polite">
            <MoonLoader size={36} color="#767676" />
            <span>Loading data…</span>
          </div>
        )}

        {!loadingMap && mapState && geographyLevels.length > 1 && (
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

        {!loadingMap && mapState?.availableYears?.length > 0 && (
          <div className="explore-map__years">
            <span>Year</span>
            <ul>
              {mapState.availableYears.map((year) => (
                <li key={String(year)}>
                  <button
                    type="button"
                    className={String(mapState.mapYear) === String(year) ? "is-selected" : ""}
                    onClick={() => setMapState((prev) => (prev ? { ...prev, mapYear: year } : prev))}
                  >
                    {year}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mapState && (
          <div className="datasets explore-map__controls" ref={setControlsHost} hidden={loadingMap || undefined} />
        )}

        {!loadingMap && mapState && (
          <a className="explore-map__dataset-link" href={`/browser/datasets/${mapState.datasetId}/map`}>
            Open this dataset map
          </a>
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
  );
};

export default ExploreMapPage;

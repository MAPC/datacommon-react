import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import locations from "../../constants/locations";
import { fetchYears } from "../../constants/charts";
import { selectRPAregionData } from "../../reducers/rparegionSlice";

const resultCache = new Map();
const aliasCache = new Map();

// Region-row columns that identify a row rather than hold a value.
const ID_COLUMNS = ["municipal", "muni_id", "muni_name", "seq_id"];

const toNumber = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toCell = (value) => {
  if (value == null || value === "") return null;
  return toNumber(value) ?? String(value);
};

const muniKey = (id) => String(Number(id));

function sumRows(rows, keys) {
  return Object.fromEntries(
    keys.map((key) => {
      const values = rows.map((row) => toNumber(row[key])).filter((value) => value != null);
      return [key, values.length ? values.reduce((a, b) => a + b, 0) : null];
    }),
  );
}

/** Value columns of the region's "view data" table for this source. */
function valueColumnsOf(regionRows, source) {
  const first = regionRows?.[0];
  if (!first) return null;
  const skip = new Set([...ID_COLUMNS, source.yearCol, ...(source.exclude || [])]);
  return Object.keys(first).filter((column) => !skip.has(column));
}

async function fetchRows(source, columns, filters) {
  return (
    await Promise.all(
      source.tables.map(async (table) => {
        let api = `${locations.BROWSER_API}?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&schema=tabular&table=${table}`;
        api = `${api}&columns=muni_id,${columns.join(",")}&filters=${filters}`;
        const response = await fetch(api);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const payload = (await response.json()) || {};
        return payload.rows || [];
      }),
    )
  ).flat();
}

const yearColumnOf = (source) => ({ key: source.yearCol, column: source.yearCol, isYear: true });

/**
 * Every year's rows for the region and each member, one table row per source row, like the region's
 * long "view data" table.
 */
async function fetchAllYears(source, valueColumns, muniIds, regionId) {
  const ids = source.regionRow === false ? muniIds : [regionId, ...muniIds];
  const filters = [source.filters, ids.map((id) => `muni_id:${id}`).join(",")].filter(Boolean).join(",");
  const allRows = await fetchRows(source, [source.yearCol, ...valueColumns], filters);
  const rows = source.minYear ? allRows.filter((row) => Number(row[source.yearCol]) >= source.minYear) : allRows;
  const order = [source.yearCol, ...(source.orderBy || [])];
  const compareOrder = (a, b) => {
    for (const column of order) {
      const diff = String(a[column] ?? "").localeCompare(String(b[column] ?? ""), undefined, { numeric: true });
      if (diff) return diff;
    }
    return 0;
  };
  const regionKey = muniKey(regionId);
  const records = [...rows].sort(compareOrder).map((row) => {
    const key = muniKey(row.muni_id);
    const fill = key === regionKey ? source.regionFill || {} : {};
    return {
      muniKey: key,
      values: {
        [source.yearCol]: row[source.yearCol] == null ? null : String(row[source.yearCol]),
        ...Object.fromEntries(valueColumns.map((column) => [column, toCell(row[column]) ?? fill[column] ?? null])),
      },
    };
  });
  return {
    columns: [yearColumnOf(source), ...valueColumns.map((column) => ({ key: column, column }))],
    records,
    region: null,
  };
}

async function fetchSource(source, valueColumns, muniIds, regionId) {
  if (source.allYears) return fetchAllYears(source, valueColumns, muniIds, regionId);

  const [year] = await fetchYears(
    "tabular",
    source.tables[0],
    source.yearCol,
    1,
    "DESC",
    source.filters ? `filters=${source.filters}` : "",
  );
  if (year == null) return { year: null, columns: [], byMuni: new Map(), region: null };

  const useRegionRow = source.regionRow !== false;
  const ids = useRegionRow ? [...muniIds, regionId] : muniIds;
  const idFilters = ids.map((id) => `muni_id:${id}`).join(",");
  const filters = [`${source.yearCol}:${year}`, source.filters, idFilters].filter(Boolean).join(",");
  const rows = await fetchRows(source, valueColumns, filters);
  const columns = valueColumns.map((column) => ({ key: column, column }));

  // Kept as text so years are not number-formatted (e.g. "2,025").
  const withYear = (values) => (values ? { [source.yearCol]: String(year), ...values } : null);
  const byMuni = new Map();
  rows.forEach((row) => {
    const key = muniKey(row.muni_id);
    if (byMuni.has(key)) return;
    byMuni.set(key, withYear(Object.fromEntries(valueColumns.map((column) => [column, toCell(row[column])]))));
  });

  const memberRows = muniIds.map((id) => byMuni.get(muniKey(id))).filter(Boolean);
  const region = useRegionRow
    ? byMuni.get(muniKey(regionId)) || null
    : memberRows.length
      ? withYear(sumRows(memberRows, columns.map((c) => c.key)))
      : null;
  return { year, columns: [yearColumnOf(source), ...columns], byMuni, region };
}

function fetchChartCommunities(config, valueColumns, muniIds, regionId) {
  const cacheKey = `${regionId}:${config.id}`;
  if (!resultCache.has(cacheKey)) {
    const request = fetchSource(config.source, valueColumns, muniIds, regionId);
    request.catch(() => resultCache.delete(cacheKey));
    resultCache.set(cacheKey, request);
  }
  return resultCache.get(cacheKey);
}

/** Column aliases from the dataset metadata, as used by the "view data" table. */
function fetchColumnAliases(tableKey) {
  if (!tableKey || !tableKey.includes(".")) return Promise.resolve({});
  if (!aliasCache.has(tableKey)) {
    const firstDot = tableKey.indexOf(".");
    const schema = tableKey.slice(0, firstDot);
    const table = tableKey.slice(firstDot + 1);
    const request = fetch(
      `/api/metadata?token=${import.meta.env.VITE_MAPC_API_TOKEN}&database=ds&schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}&useNewMetadata=true`,
    )
      .then((response) => {
        if (!response.ok) throw new Error(`Metadata HTTP error: ${response.status}`);
        return response.json();
      })
      .then((json) => {
        const container = json?.data ?? json;
        const list = Array.isArray(container) ? container : Object.values(container || {})[0];
        const aliases = {};
        (Array.isArray(list) ? list : []).forEach((col) => {
          const alias = typeof col?.alias === "string" ? col.alias.trim() : "";
          if (alias) aliases[String(col.name)] = alias;
        });
        return aliases;
      })
      .catch((error) => {
        console.error("Failed to fetch column aliases for table:", tableKey, error);
        aliasCache.delete(tableKey);
        return {};
      });
    aliasCache.set(tableKey, request);
  }
  return aliasCache.get(tableKey);
}

function formatValue(value) {
  if (value == null) return "—";
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value;
}

const compareValues = (a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)));

const profileSlug = (name) => name.toLowerCase().replace(/\s+/g, "-");

const csvCell = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const NAME_SORT = "__name";
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];
const DEFAULT_PAGE_SIZE = 200;
const COPY_LABEL = "Copy to Clipboard";

const CommunityValuesModal = ({ show, onClose, title, config, regionId, regionRows, metadataTableKey }) => {
  const rparegionData = useSelector(selectRPAregionData);
  const municipalities = useMemo(() => rparegionData[regionId]?.municipalities || [], [rparegionData, regionId]);
  const regionName = rparegionData[regionId]?.rpa_name || "Region";

  const [state, setState] = useState({ key: null, results: null, error: null });
  const [aliases, setAliases] = useState({});
  const [sort, setSort] = useState({ key: NAME_SORT, direction: "asc" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // Text typed into the page-number box; null shows the current page.
  const [pageInput, setPageInput] = useState(null);
  const [copyStatus, setCopyStatus] = useState(COPY_LABEL);
  const closeButtonRef = useRef(null);
  const scrollRef = useRef(null);

  const muniIds = useMemo(() => municipalities.map((muni) => muni.muni_id), [municipalities]);
  const requestKey = `${regionId}:${config.id}`;
  const valueColumnsKey = (valueColumnsOf(regionRows, config.source) || []).join(",");

  useEffect(() => {
    if (!show || !muniIds.length || !valueColumnsKey) return undefined;
    let cancelled = false;
    setState((prev) => (prev.key === requestKey ? prev : { key: requestKey, results: null, error: null }));
    fetchChartCommunities(config, valueColumnsKey.split(","), muniIds, regionId)
      .then((results) => {
        if (!cancelled) setState({ key: requestKey, results, error: null });
      })
      .catch((error) => {
        console.error("Error fetching community values:", error);
        if (!cancelled) setState({ key: requestKey, results: null, error: "Community values could not be loaded." });
      });
    return () => {
      cancelled = true;
    };
  }, [show, config, valueColumnsKey, muniIds, regionId, requestKey]);

  useEffect(() => {
    if (!show) return undefined;
    let cancelled = false;
    fetchColumnAliases(metadataTableKey).then((next) => {
      if (!cancelled) setAliases(next);
    });
    return () => {
      cancelled = true;
    };
  }, [show, metadataTableKey]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!show) return undefined;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [show]);

  const results = state.key === requestKey ? state.results : null;

  const columns = useMemo(() => {
    if (!results) return [];
    return results.columns.map((c) => ({ key: c.key, label: aliases[c.column] || c.column }));
  }, [results, aliases]);

  const rows = useMemo(() => {
    if (!results) return [];
    if (results.records) {
      const regionKey = muniKey(regionId);
      const names = new Map(municipalities.map((muni) => [muniKey(muni.muni_id), muni.muni_name]));
      names.set(regionKey, regionName);
      return results.records
        .filter((record) => names.has(record.muniKey))
        .map((record, index) => ({
          id: `${record.muniKey}-${index}`,
          name: names.get(record.muniKey),
          isRegion: record.muniKey === regionKey,
          values: record.values,
        }));
    }
    return municipalities.map((muni) => {
      const values = results.byMuni.get(muniKey(muni.muni_id)) || {};
      return {
        id: muni.muni_id,
        name: muni.muni_name,
        values: Object.fromEntries(columns.map((column) => [column.key, values[column.key] ?? null])),
      };
    });
  }, [results, municipalities, columns, regionId, regionName]);

  const regionValues = results?.region;
  const isLong = Boolean(results?.records);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (row) =>
      row.name.toLowerCase().includes(needle) ||
      (isLong && Object.values(row.values).some((value) => typeof value === "string" && value.toLowerCase().includes(needle)));
    const filtered = needle ? rows.filter(matches) : rows;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (a.isRegion !== b.isRegion) return a.isRegion ? -1 : 1;
      if (sort.key === NAME_SORT) return a.name.localeCompare(b.name) * direction;
      const av = a.values[sort.key];
      const bv = b.values[sort.key];
      if (av == null && bv == null) return a.name.localeCompare(b.name);
      if (av == null) return 1;
      if (bv == null) return -1;
      return compareValues(av, bv) * direction;
    });
  }, [rows, query, sort, isLong]);

  useEffect(() => setPage(0), [query, sort, requestKey, pageSize]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page]);

  if (!show) return null;

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * pageSize;
  const pageRows = visibleRows.slice(pageStart, pageStart + pageSize);
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage >= pageCount - 1;

  const goToPage = (index) => {
    setPageInput(null);
    setPage(Math.min(Math.max(index, 0), pageCount - 1));
  };

  const onPageInputChange = (value) => {
    setPageInput(value);
    const number = parseInt(value, 10);
    if (number >= 1 && number <= pageCount) setPage(number - 1);
  };

  const onPageInputBlur = () => {
    const number = parseInt(pageInput, 10);
    if (!Number.isNaN(number)) goToPage(number - 1);
    else setPageInput(null);
  };

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === NAME_SORT ? "asc" : "desc" },
    );
  };

  const sortIndicator = (key) => {
    const active = sort.key === key;
    return (
      <span
        aria-hidden="true"
        className={`community-values-modal__sort${active ? " community-values-modal__sort--active" : ""}`}
      >
        {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
      </span>
    );
  };

  const ariaSort = (key) => {
    if (sort.key !== key) return "none";
    return sort.direction === "asc" ? "ascending" : "descending";
  };

  const toCsv = () => {
    const header = ["Municipality", ...columns.map((c) => c.label)];
    const toCells = (name, values) => [name, ...columns.map((c) => values[c.key] ?? "")];
    const lines = [
      header,
      ...(regionValues ? [toCells(regionName, regionValues)] : []),
      ...visibleRows.map((r) => toCells(r.name, r.values)),
    ];
    return lines.map((line) => line.map(csvCell).join(",")).join("\n");
  };

  const flashCopyStatus = (status) => {
    setCopyStatus(status);
    setTimeout(() => setCopyStatus(COPY_LABEL), 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toCsv());
      flashCopyStatus("Copied!");
    } catch (error) {
      console.error("Failed to copy:", error);
      flashCopyStatus("Failed to copy");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([toCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^\w]+/g, "_")}_${regionName.replace(/[^\w]+/g, "_")}_communities.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div
      className="community-values-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="community-values-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-values-modal-title"
      >
        <div className="community-values-modal__header">
          <div className="community-values-modal__heading">
            <h2 id="community-values-modal-title" className="community-values-modal__title">
              {title}
            </h2>
            <button
              type="button"
              className="community-values-modal__copy"
              onClick={handleCopy}
              disabled={!results || copyStatus !== COPY_LABEL}
            >
              {copyStatus}
            </button>
            <button
              type="button"
              className="community-values-modal__download"
              onClick={handleDownload}
              disabled={!results}
              title="Download as CSV"
            >
              Download Data
            </button>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="community-values-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="community-values-modal__toolbar">
          <input
            type="search"
            className="community-values-modal__search"
            aria-label={config.source.searchPlaceholder || "Find a community"}
            placeholder={config.source.searchPlaceholder || "Find a community"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {state.error && state.key === requestKey ? (
          <p className="community-values-modal__status">{state.error}</p>
        ) : !results ? (
          <p className="community-values-modal__status">Loading community values…</p>
        ) : (
          <div className="community-values-modal__scroll" ref={scrollRef}>
            <table className="community-values-modal__table">
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort(NAME_SORT)} className="community-values-modal__name">
                    <button type="button" onClick={() => toggleSort(NAME_SORT)}>
                      <span>Municipality</span>
                      {sortIndicator(NAME_SORT)}
                    </button>
                  </th>
                  {columns.map((column) => (
                    <th key={column.key} scope="col" aria-sort={ariaSort(column.key)}>
                      <button type="button" onClick={() => toggleSort(column.key)}>
                        <span>{column.label}</span>
                        {sortIndicator(column.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regionValues && (
                  <tr className="community-values-modal__total">
                    <th scope="row" className="community-values-modal__name">
                      {regionName}
                    </th>
                    {columns.map((column) => (
                      <td key={column.key}>{formatValue(regionValues[column.key])}</td>
                    ))}
                  </tr>
                )}
                {pageRows.map((row) => (
                  <tr key={row.id} className={row.isRegion ? "community-values-modal__total" : undefined}>
                    <th scope="row" className="community-values-modal__name">
                      {row.isRegion ? (
                        row.name
                      ) : (
                        <a
                          href={`/profile/${profileSlug(row.name)}/${config.topic}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {row.name}
                        </a>
                      )}
                    </th>
                    {columns.map((column) => (
                      <td key={column.key}>{formatValue(row.values[column.key])}</td>
                    ))}
                  </tr>
                ))}
                {!visibleRows.length && (
                  <tr>
                    <td colSpan={columns.length + 1} className="community-values-modal__empty">
                      No {isLong ? "row" : "community"} matches “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {results && visibleRows.length > PAGE_SIZE_OPTIONS[0] && (
          <div className="community-values-modal__pagination">
            <div className="community-values-modal__pagination-info">
              <span className="pagination-count-text">
                Displaying {(pageStart + 1).toLocaleString("en-US")} to{" "}
                {(pageStart + pageRows.length).toLocaleString("en-US")} of {visibleRows.length.toLocaleString("en-US")}{" "}
                records
              </span>
              <label className="community-values-modal__page-size">
                Rows per page:
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="pagination-nav-container">
              <div className={`button-wrapper lift${isFirstPage ? " disabled" : ""}`}>
                <button
                  type="button"
                  title="First"
                  aria-label="First page"
                  className="datatable__button"
                  onClick={() => !isFirstPage && goToPage(0)}
                >
                  &lt;&lt;
                </button>
                <span className="separator" />
                <button
                  type="button"
                  title="Previous"
                  aria-label="Previous page"
                  className="datatable__button"
                  onClick={() => !isFirstPage && goToPage(currentPage - 1)}
                >
                  &lt;
                </button>
              </div>
              <div className="page-counter">
                <input
                  className="page-number-input"
                  type="number"
                  title="Enter a number to jump to that page"
                  aria-label="Page number"
                  min={1}
                  max={pageCount}
                  step={1}
                  value={pageInput ?? currentPage + 1}
                  onChange={(event) => onPageInputChange(event.target.value)}
                  onBlur={onPageInputBlur}
                />
                <span className="separator" />
                {pageCount.toLocaleString("en-US")}
              </div>
              <div className={`button-wrapper lift${isLastPage ? " disabled" : ""}`}>
                <button
                  type="button"
                  title="Next"
                  aria-label="Next page"
                  className="datatable__button"
                  onClick={() => !isLastPage && goToPage(currentPage + 1)}
                >
                  &gt;
                </button>
                <span className="separator" />
                <button
                  type="button"
                  title="Last"
                  aria-label="Last page"
                  className="datatable__button"
                  onClick={() => !isLastPage && goToPage(pageCount - 1)}
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

CommunityValuesModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  config: PropTypes.shape({
    id: PropTypes.string.isRequired,
    topic: PropTypes.string.isRequired,
    source: PropTypes.object.isRequired,
  }).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regionRows: PropTypes.arrayOf(PropTypes.object),
  metadataTableKey: PropTypes.string,
};

export default CommunityValuesModal;

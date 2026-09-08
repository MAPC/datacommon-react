import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import {
  ALL_DATASET_GEOGRAPHY_FILTERS,
  DATASET_GEOGRAPHY_LABELS,
  compressDatasetsByGeography,
  getDatasetGeography,
} from "../../utils/manageDatasets";
import { formatUpdated } from "../../utils/formatUpdated";

const PickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(11, 18, 32, 0.56);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const PickerDialog = styled.div`
  width: min(980px, 100%);
  max-height: min(88vh, 900px);
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
`;

const PickerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
`;

const PickerTitle = styled.h3`
  margin: 0;
  color: #333;
  font-size: 1.1rem;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  color: #333;

  &:hover {
    background: #f5f5f5;
  }
`;

const PickerBody = styled.div`
  padding: 0.75rem 1rem 1rem 1rem;
  overflow-y: auto;
`;

const Label = styled.label`
  display: block;
  font-size: 0.9375rem;
  color: #555;
  margin-bottom: 0.35rem;
`;

const PickerHint = styled.p`
  margin: 0.65rem 0 0.25rem;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #555;
`;

const Search = styled.input`
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  background: #fff;

  &:focus {
    outline: none;
    border-color: #6fc68e;
    box-shadow: 0 0 0 3px rgba(111, 198, 142, 0.14);
  }
`;

const GeographyBar = styled.div`
  margin-top: 0.65rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
`;

const GeographyPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const GeographyPill = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #867676;
  border: 1px solid #867676;
  border-radius: 12px;
  padding: 4px 8px 6px;
  line-height: 14px;
  font-size: 0.85rem;
  background: #fff;
  cursor: pointer;

  &:hover {
    color: #463e3e;
    border-color: #463e3e;
  }

  &.selected {
    color: #4ea56c;
    border-color: #4ea56c;

    &:hover {
      color: #367a4e;
      border-color: #367a4e;
    }
  }
`;

const PickerCountBar = styled.div`
  margin-top: 0.5rem;
  margin-bottom: 0.1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  padding: 0.5rem 0.7rem;
  background: linear-gradient(180deg, #f8faf8 0%, #f0f4f1 100%);
  border: 1px solid rgba(47, 107, 68, 0.12);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #2c2c2c;
`;

const PickerCountNum = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #1b5c36;
  letter-spacing: -0.01em;
`;

const PickerCountMeta = styled.span`
  display: inline-block;
  font-size: 0.86rem;
  color: #5c6560;
  font-weight: 500;

  ${PickerCountNum} {
    color: #2a6b45;
  }
`;

const PickerCountSep = styled.span`
  color: #b8c0bb;
  font-weight: 500;
  user-select: none;
`;

const PickerLimitWarn = styled.span`
  color: #b00020;
  font-weight: 600;
`;

const PickerDatasetList = styled.div`
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PickerInventoryCard = styled.div`
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const PickerCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
`;

const PickerCardTitle = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #333;
  line-height: 1.35;
  min-width: 0;
  flex: 1;
`;

const PickerCardBody = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem 1.5rem;
`;

const PickerCardInfo = styled.div`
  flex: 1 1 12rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const PickerInfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.35rem 0.5rem;
  font-size: 0.9rem;
  line-height: 1.45;
`;

const PickerInfoLabel = styled.span`
  font-weight: 600;
  color: #333;
  flex-shrink: 0;
`;

const PickerGeographies = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
`;

const PickerGeographyPill = styled.button`
  color: ${(p) => (p.$added ? "#2e7d32" : "#4ea56c")};
  border: 1px solid ${(p) => (p.$added ? "#a5d6a7" : "#4ea56c")};
  background: ${(p) => (p.$added ? "#e8f5e9" : "#fff")};
  border-radius: 12px;
  padding: 4px 10px 6px;
  line-height: 1.1;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.disabled && !p.$added ? 0.5 : 1)};

  &:hover:not(:disabled) {
    color: #367a4e;
    border-color: #367a4e;
  }
`;

const PickerCardMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0.4rem;
  min-width: min(15rem, 100%);
  text-align: right;
`;

const PickerLastUpdatedLabel = styled.span`
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.1rem;
`;

const PickerLastUpdatedList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  width: 100%;
  min-width: 0;
  max-width: 15rem;
`;

const PickerLastUpdatedRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  font-size: 0.8rem;
  line-height: 1.4;
`;

const PickerLastUpdatedGeo = styled.span`
  color: #888;
  text-align: left;
  flex: 1 1 auto;
  min-width: 0;
`;

const PickerLastUpdatedDate = styled.span`
  color: #555;
  font-weight: 500;
  text-align: right;
  font-variant-numeric: tabular-nums;
  flex: 0 0 auto;
`;

const PickerLastUpdatedValue = styled.span`
  display: block;
  text-align: right;
  color: #555;
  font-size: 0.88rem;
`;

const PickerSelectButton = styled.button`
  box-sizing: border-box;
  width: 6.25rem;
  max-width: 100%;
  min-height: 2rem;
  border: none;
  background: ${(p) => (p.$added ? "#e8f5e9" : "rgba(111, 198, 142, 0.2)")};
  color: ${(p) => (p.$added ? "#2e7d32" : "#2f6b44")};
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  font-weight: 700;
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  flex-shrink: 0;
  font-family: inherit;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  opacity: ${(p) => (p.disabled && !p.$added ? 0.55 : 1)};
`;

const PickerSelectControl = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const PickerSelectMenu = styled.ul`
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 30;
  margin: 0;
  padding: 0.3rem 0;
  list-style: none;
  min-width: 11rem;
  max-width: min(16rem, 70vw);
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
`;

const PickerSelectMenuButton = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: ${(p) => (p.$added ? "#e8f5e9" : "#fff")};
  padding: 0.5rem 0.9rem;
  font: inherit;
  font-size: 0.9rem;
  color: ${(p) => (p.$added ? "#2e7d32" : "#333")};
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};

  &:hover:not(:disabled) {
    background: rgba(111, 198, 142, 0.12);
  }
`;

const Mono = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
`;

const PickerEmpty = styled.p`
  color: #888;
  font-size: 0.9rem;
  padding: 1.5rem 0;
  text-align: center;
`;

function getPickerLastUpdatedView(compressed) {
  const pairs = compressed?.geoIdPairs;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return { kind: "single", text: formatUpdated(compressed?.updated) };
  }
  const rows = pairs.map((p) => ({
    key: String(p.id),
    label: p.geography || "Dataset",
    display: formatUpdated(p.updated),
  }));
  if (rows.length > 1) {
    return { kind: "list", rows };
  }
  return { kind: "single", text: rows[0].display };
}

const DatasetInventoryPicker = ({
  datasets,
  alreadyAddedTableNames,
  remainingSlots = Number.POSITIVE_INFINITY,
  maxTables,
  allowedGeographies,
  onSelect,
  onClose,
  onLimitReached,
}) => {
  const [pickerQuery, setPickerQuery] = useState("");
  const [selectedGeoFilters, setSelectedGeoFilters] = useState(["all"]);
  const [pickerSelectMenuKey, setPickerSelectMenuKey] = useState(null);

  const availableGeoFilters = useMemo(() => {
    if (!allowedGeographies?.length) return ALL_DATASET_GEOGRAPHY_FILTERS;
    return ALL_DATASET_GEOGRAPHY_FILTERS.filter((geo) => allowedGeographies.includes(geo));
  }, [allowedGeographies]);
  const hideGeographyBar = availableGeoFilters.length <= 1;

  const inventoryDatasets = useMemo(() => {
    const all = datasets || [];
    if (!allowedGeographies?.length) return all;
    return all.filter((d) => allowedGeographies.includes(getDatasetGeography(d)));
  }, [datasets, allowedGeographies]);
  const tableById = useMemo(() => {
    const map = new Map();
    inventoryDatasets.forEach((d) => {
      map.set(String(d.seq_id ?? d.id), d.table_name);
    });
    return map;
  }, [inventoryDatasets]);

  const isTableAdded = (datasetId) => {
    const tableName = tableById.get(String(datasetId));
    return tableName ? alreadyAddedTableNames.has(tableName) : false;
  };

  const geoFilterActive =
    selectedGeoFilters.length === 0 || !selectedGeoFilters.includes("all");

  const onGeoFilterClick = (geoVal) => {
    let next = [...selectedGeoFilters];
    if (next.includes("all")) {
      next = [...availableGeoFilters];
    }
    if (!next.includes(geoVal)) {
      next = [...next, geoVal];
    } else {
      next = next.filter((gf) => gf !== geoVal);
    }
    if (availableGeoFilters.every((geo) => next.includes(geo))) {
      next = ["all"];
    }
    setSelectedGeoFilters(next);
  };

  const filteredDatasets = useMemo(() => {
    const query = pickerQuery.trim();
    let list = [...inventoryDatasets];

    if (!selectedGeoFilters.includes("all")) {
      list = list.filter((d) => selectedGeoFilters.some((g) => getDatasetGeography(d) === g));
    }

    if (!query) return list;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedQuery, "i");

    const filtered = list.filter((d) => {
      const name = String(d.menu3 || "");
      const table = String(d.table_name || "");
      return searchRegex.test(name) || searchRegex.test(table);
    });

    filtered.sort((a, b) => {
      const aName = String(a.menu3 || "");
      const bName = String(b.menu3 || "");
      const aNameMatch = searchRegex.test(aName);
      const bNameMatch = searchRegex.test(bName);

      if (aNameMatch && bNameMatch) return aName.localeCompare(bName);
      if (aNameMatch) return -1;
      if (bNameMatch) return 1;
      return aName.localeCompare(bName);
    });

    return filtered;
  }, [inventoryDatasets, pickerQuery, selectedGeoFilters]);

  const filteredCompressedDatasets = useMemo(() => {
    const compressed = compressDatasetsByGeography(filteredDatasets);
    return compressed.sort((a, b) => String(a.menu3 || "").localeCompare(String(b.menu3 || "")));
  }, [filteredDatasets]);

  const inventoryHighlightMatches = useMemo(() => {
    const query = pickerQuery.trim();
    if (!query) return {};

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedQuery, "i");
    const highlights = {};

    filteredCompressedDatasets.forEach((cd) => {
      const tableName = String(cd.table_name || "");
      const menu3 = String(cd.menu3 || "");
      if (!searchRegex.test(menu3) && !searchRegex.test(tableName)) return;

      const cardId = cd.seq_id;
      highlights[cardId] = [];

      if (searchRegex.test(menu3)) {
        const highlightRegex = new RegExp(escapedQuery, "gi");
        menu3.replace(highlightRegex, (matched, offset) => {
          highlights[cardId].push({
            key: "menu3",
            indices: [[offset, offset + matched.length - 1]],
          });
          return matched;
        });
      }

      if (searchRegex.test(tableName)) {
        const highlightRegex = new RegExp(escapedQuery, "gi");
        tableName.replace(highlightRegex, (matched, offset) => {
          highlights[cardId].push({
            key: "table_name",
            indices: [[offset, offset + matched.length - 1]],
          });
          return matched;
        });
      }
    });

    return highlights;
  }, [filteredCompressedDatasets, pickerQuery]);

  const renderInventoryHighlightedText = (text, datasetId, key) => {
    if (!text) return null;
    const matches = inventoryHighlightMatches[datasetId]?.filter((m) => m.key === key);
    if (!matches?.length) return text;

    const allIndices = matches
      .flatMap((m) => m.indices || [])
      .sort((a, b) => a[0] - b[0]);

    const segments = [];
    let lastIndex = 0;
    allIndices.forEach(([start, end], idx) => {
      if (start > lastIndex) {
        segments.push(<span key={`inv-plain-${datasetId}-${key}-${idx}`}>{text.slice(lastIndex, start)}</span>);
      }
      segments.push(
        <mark key={`inv-hi-${datasetId}-${key}-${idx}`} style={{ backgroundColor: "#ffec99", padding: 0 }}>
          {text.slice(start, end + 1)}
        </mark>,
      );
      lastIndex = end + 1;
    });
    if (lastIndex < text.length) {
      segments.push(<span key={`inv-plain-${datasetId}-${key}-end`}>{text.slice(lastIndex)}</span>);
    }
    return <>{segments}</>;
  };

  const handleSelectDataset = (datasetId) => {
    if (isTableAdded(datasetId)) return;
    if (remainingSlots <= 0) {
      onLimitReached?.();
      return;
    }
    if (allowedGeographies?.length) {
      const match = inventoryDatasets.find((d) => String(d.seq_id ?? d.id) === String(datasetId));
      if (!match || !allowedGeographies.includes(getDatasetGeography(match))) return;
    }
    onSelect(String(datasetId));
  };

  const handlePickerSelectSingle = (compressed) => {
    if (!compressed?.datasets?.length) return;
    const geos = compressed.geoIdPairs?.filter((p) => p.geography) || [];
    if (geos.length === 1) {
      handleSelectDataset(String(geos[0].id));
      return;
    }
    if (compressed.datasets.length === 1) {
      handleSelectDataset(String(compressed.datasets[0].seq_id ?? compressed.datasets[0].id));
    }
  };

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key !== "Escape") return;
      if (pickerSelectMenuKey) {
        setPickerSelectMenuKey(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose, pickerSelectMenuKey]);

  useEffect(() => {
    if (pickerSelectMenuKey == null) return undefined;
    const closeOnOutside = (e) => {
      if (e.target?.closest?.("[data-picker-select-control]")) return;
      setPickerSelectMenuKey(null);
    };
    document.addEventListener("mousedown", closeOnOutside, true);
    return () => document.removeEventListener("mousedown", closeOnOutside, true);
  }, [pickerSelectMenuKey]);

  return (
    <PickerOverlay onClick={onClose}>
      <PickerDialog onClick={(e) => e.stopPropagation()}>
        <PickerHeader>
          <PickerTitle>Select a dataset from Data Inventory</PickerTitle>
          <CloseButton type="button" onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} aria-hidden />
          </CloseButton>
        </PickerHeader>
        <PickerBody>
          <Label htmlFor="dataset-picker-search">Search inventory</Label>
          <Search
            id="dataset-picker-search"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search by dataset title or table name..."
          />
          {hideGeographyBar ? (
            allowedGeographies?.includes("municipal") && (
              <PickerHint>Only municipal datasets can be added to this download.</PickerHint>
            )
          ) : (
            <GeographyBar>
              <GeographyPills role="group" aria-label="Filter by geography">
                {availableGeoFilters.map((geo) => {
                  const selected =
                    selectedGeoFilters.includes(geo) || selectedGeoFilters.includes("all");
                  return (
                    <GeographyPill
                      key={geo}
                      type="button"
                      className={selected ? "selected" : ""}
                      aria-pressed={selected}
                      onClick={() => onGeoFilterClick(geo)}
                    >
                      {DATASET_GEOGRAPHY_LABELS[geo]}
                      {selected && <span aria-hidden>✓</span>}
                    </GeographyPill>
                  );
                })}
              </GeographyPills>
              <GeographyPill
                type="button"
                className={selectedGeoFilters.length === 0 ? "selected" : ""}
                onClick={() =>
                  selectedGeoFilters.length === 0
                    ? setSelectedGeoFilters(["all"])
                    : setSelectedGeoFilters([])
                }
              >
                {selectedGeoFilters.length === 0 ? "Select all geographies" : "Clear all geographies"}
                <span aria-hidden>{selectedGeoFilters.length !== 0 ? "X" : "✓"}</span>
              </GeographyPill>
            </GeographyBar>
          )}
          <PickerCountBar role="status" aria-live="polite">
            <span>
              <PickerCountNum>{inventoryDatasets.length.toLocaleString()}</PickerCountNum>
              {inventoryDatasets.length === 1 ? " dataset" : " datasets"}
            </span>
            {pickerQuery.trim() || geoFilterActive ? (
              <>
                <PickerCountSep aria-hidden>·</PickerCountSep>
                <PickerCountMeta>
                  <PickerCountNum>{filteredDatasets.length.toLocaleString()}</PickerCountNum>{" "}
                  {filteredDatasets.length === 1 ? "dataset matches" : "datasets match"}
                </PickerCountMeta>
              </>
            ) : null}
            {remainingSlots <= 0 && (
              <>
                <PickerCountSep aria-hidden>·</PickerCountSep>
                <PickerLimitWarn>Table limit reached ({maxTables})</PickerLimitWarn>
              </>
            )}
          </PickerCountBar>
          <PickerDatasetList>
            {filteredCompressedDatasets.map((compressed) => {
              const cardId = compressed.seq_id;
              const cardKey = String(cardId);
              const geos = compressed.geoIdPairs?.filter((pair) => pair.geography) || [];
              const multipleGeos = geos.length > 1;
              const fallbackAdded = Boolean(
                compressed.datasets?.some((d) => alreadyAddedTableNames.has(d.table_name)),
              );
              const allGeosAdded = geos.length > 0 ? geos.every((geo) => isTableAdded(geo.id)) : fallbackAdded;
              const singleAdded = !multipleGeos && (geos[0] ? isTableAdded(geos[0].id) : fallbackAdded);
              return (
                <PickerInventoryCard key={cardKey}>
                  <PickerCardHeader>
                    <PickerCardTitle>
                      {renderInventoryHighlightedText(compressed.menu3 || "", cardId, "menu3") || "Untitled"}
                    </PickerCardTitle>
                    {multipleGeos ? (
                      <PickerSelectControl data-picker-select-control>
                        <PickerSelectButton
                          type="button"
                          $added={allGeosAdded}
                          disabled={allGeosAdded}
                          aria-haspopup="listbox"
                          aria-expanded={pickerSelectMenuKey === cardKey}
                          aria-label="Select dataset by geography"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPickerSelectMenuKey((k) => (k === cardKey ? null : cardKey));
                          }}
                        >
                          {allGeosAdded ? "Added" : <>Select <span aria-hidden="true">▼</span></>}
                        </PickerSelectButton>
                        {pickerSelectMenuKey === cardKey && (
                          <PickerSelectMenu role="listbox" aria-label="Choose geography">
                            {geos.map((geo) => {
                              const added = isTableAdded(geo.id);
                              return (
                                <li key={String(geo.id)} role="none">
                                  <PickerSelectMenuButton
                                    type="button"
                                    role="option"
                                    $added={added}
                                    disabled={added}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectDataset(String(geo.id));
                                      setPickerSelectMenuKey(null);
                                    }}
                                  >
                                    {added ? `✓ ${geo.geography}` : geo.geography}
                                  </PickerSelectMenuButton>
                                </li>
                              );
                            })}
                          </PickerSelectMenu>
                        )}
                      </PickerSelectControl>
                    ) : (
                      <PickerSelectButton
                        type="button"
                        $added={singleAdded}
                        disabled={singleAdded}
                        onClick={() => handlePickerSelectSingle(compressed)}
                      >
                        {singleAdded ? "Added" : "Select"}
                      </PickerSelectButton>
                    )}
                  </PickerCardHeader>
                  <PickerCardBody>
                    <PickerCardInfo>
                      <PickerInfoRow>
                        <PickerInfoLabel>Table:</PickerInfoLabel>
                        <span style={{ color: "#555" }}>
                          <Mono>
                            {renderInventoryHighlightedText(
                              compressed.table_name || "",
                              cardId,
                              "table_name",
                            )}
                          </Mono>
                        </span>
                      </PickerInfoRow>
                      <PickerInfoRow>
                        <PickerInfoLabel>Source:</PickerInfoLabel>
                        <span style={{ color: "#555" }}>{compressed.source || "N/A"}</span>
                      </PickerInfoRow>
                      {geos.length > 0 && (
                        <PickerInfoRow>
                          <PickerInfoLabel>Geographies:</PickerInfoLabel>
                          <PickerGeographies>
                            {geos.map((geo) => {
                              const added = isTableAdded(geo.id);
                              return (
                                <PickerGeographyPill
                                  key={String(geo.id)}
                                  type="button"
                                  $added={added}
                                  disabled={added}
                                  onClick={() => handleSelectDataset(String(geo.id))}
                                >
                                  {added ? `✓ ${geo.geography}` : geo.geography}
                                </PickerGeographyPill>
                              );
                            })}
                          </PickerGeographies>
                        </PickerInfoRow>
                      )}
                    </PickerCardInfo>
                    <PickerCardMeta>
                      <div style={{ width: "100%" }}>
                        <PickerLastUpdatedLabel>Last updated</PickerLastUpdatedLabel>
                        {(() => {
                          const view = getPickerLastUpdatedView(compressed);
                          if (view.kind === "single") {
                            return <PickerLastUpdatedValue>{view.text}</PickerLastUpdatedValue>;
                          }
                          return (
                            <PickerLastUpdatedList>
                              {view.rows.map((r) => (
                                <PickerLastUpdatedRow key={r.key}>
                                  <PickerLastUpdatedGeo>{r.label}</PickerLastUpdatedGeo>
                                  <PickerLastUpdatedDate>{r.display}</PickerLastUpdatedDate>
                                </PickerLastUpdatedRow>
                              ))}
                            </PickerLastUpdatedList>
                          );
                        })()}
                      </div>
                    </PickerCardMeta>
                  </PickerCardBody>
                </PickerInventoryCard>
              );
            })}
            {filteredCompressedDatasets.length === 0 && (
              <PickerEmpty>
                {pickerQuery.trim() || geoFilterActive
                  ? "No datasets match your search"
                  : "No datasets available."}
              </PickerEmpty>
            )}
          </PickerDatasetList>
        </PickerBody>
      </PickerDialog>
    </PickerOverlay>
  );
};

DatasetInventoryPicker.propTypes = {
  datasets: PropTypes.array.isRequired,
  alreadyAddedTableNames: PropTypes.instanceOf(Set).isRequired,
  remainingSlots: PropTypes.number,
  maxTables: PropTypes.number,
  allowedGeographies: PropTypes.arrayOf(PropTypes.string),
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onLimitReached: PropTypes.func,
};

export default DatasetInventoryPicker;

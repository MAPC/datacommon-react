import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { fetchDatasets } from "../reducers/datasetSlice";
import DatasetSearchBar from "../components/partials/DatasetSearchBar";
import MetadataModal from "../components/partials/MetadataModal";
import ExportApiSection from "../components/api/ExportApiSection";
import QueryApiSection from "../components/api/QueryApiSection";
import axios from "axios";

const PageContainer = styled.section`
  background: #fff;
`;

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem 1rem;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.875rem;
  font-weight: 700;
  color: #333;
`;

const SubTitle = styled.p`
  margin: 0 0 1.5rem 0;
  color: #555;
  line-height: 1.5;
  max-width: 72ch;
`;

const ControlsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1rem;

  @media (max-width: 740px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

/** Same flex basis so “Find a dataset” and “Choose from Data Inventory” sit in aligned columns. */
const DatasetChoiceColumn = styled.div`
  flex: 1 1 auto;
  min-width: min(100%, 260px);
  max-width: min(680px, 100%);
`;

const OrBetween = styled.span`
  flex: 0 0 auto;
  align-self: center;
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
  padding: 0 0.15rem;
  margin-bottom: 0.35rem;

  @media (max-width: 910px) {
    width: 100%;
    text-align: center;
    margin: 0.15rem 0;
  }
`;

const CompactDatasetSearchBar = styled(DatasetSearchBar)`
  && {
    max-width: min(680px, 100%);
    min-width: 240px;
    margin: 0;
    z-index: 20;
  }

  input {
    padding: 0.55em 1.1em !important;
    font-size: 1.05rem !important;
    font-weight: 300 !important;
  }

  &&::after {
    height: 4px;
    bottom: -4px;
  }

  ul {
    top: 50px !important;
  }

  @media (max-width: 768px) {
    && {
      max-width: 100%;
      width: 100%;
    }

    input {
      padding: 0.5em 1em !important;
      font-size: 1rem !important;
    }

    ul {
      top: 44px !important;
    }
  }
`;

const Label = styled.label`
  display: block;
  font-size: 0.9375rem;
  color: #555;
  margin-bottom: 0.35rem;
`;

const Select = styled.select`
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

const DatasetPickerButton = styled.button`
  background: linear-gradient(90deg, #64c08d, #5aba8c);
  color: #fff;
  border: none;
  padding: 0.55em 1.1em;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.05rem;
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  line-height: 1.25;

  &:hover {
    opacity: 0.92;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    min-height: 44px;
  }
`;

const SelectedDatasetStatus = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-height: 36px;
  margin-top: 0.45rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  background: #fff;
  width: 100%;
  box-sizing: border-box;
`;

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
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: #fff;
  border-radius: 8px;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  font-weight: 600;
`;

const PickerBody = styled.div`
  padding: 0.75rem 1rem 1rem 1rem;
  overflow-y: auto;
`;

const PickerDatasetList = styled.div`
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
`;

const PickerDatasetCard = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 0.85rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
`;

const PickerDatasetMeta = styled.div`
  min-width: 0;
`;

const PickerDatasetName = styled.div`
  color: #222;
  font-weight: 700;
  margin-bottom: 0.3rem;
`;

const PickerDatasetDetails = styled.div`
  color: #555;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const PickerSelectButton = styled.button`
  border: none;
  background: rgba(111, 198, 142, 0.2);
  color: #2f6b44;
  border-radius: 8px;
  padding: 0.45rem 0.8rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1.75rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: ${(p) => (p.$active ? "rgba(111, 198, 142, 0.18)" : "#fff")};
  color: ${(p) => (p.$active ? "#2f6b44" : "#333")};
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;

  &:hover {
    border-color: rgba(47, 107, 68, 0.35);
  }
`;

const Card = styled.div`
  margin-top: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 1.25rem;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
`;

const CardTitle = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #333;
`;

const Small = styled.p`
  margin: 0.35rem 0 0.75rem 0;
  color: #666;
  font-size: 0.95rem;
  line-height: 1.55;
`;

const DocSection = styled.div`
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
`;

const CodeExamplesSection = styled.div`
  margin-top: 1.25rem;
`;

const CodeExamplesDisclosure = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  text-align: left;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: ${(p) => (p.$expanded ? "10px 10px 0 0" : "10px")};
  border-bottom: ${(p) => (p.$expanded ? "none" : "1px solid rgba(0, 0, 0, 0.1)")};
  padding: 0.65rem 0.85rem;
  background: ${(p) => (p.$expanded ? "#fbfcfb" : "#fff")};
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  font: inherit;
  color: inherit;

  &:hover {
    border-color: rgba(47, 107, 68, 0.3);
    background: #f8faf9;
  }
`;

const CodeExamplesDisclosureText = styled.span`
  display: block;
  min-width: 0;
`;

const CodeExamplesDisclosureTitle = styled.span`
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: #1f4e46;
  margin-bottom: 0.2rem;
`;

const CodeExamplesDisclosureHint = styled.span`
  display: block;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.45;
`;

const CodeExamplesChevron = styled.span`
  flex-shrink: 0;
  margin-top: 0.15rem;
  font-size: 0.7rem;
  color: #5a5a5a;
  transition: transform 0.15s ease;
  transform: rotate(${(p) => (p.$expanded ? "0deg" : "-90deg")});
`;

const CodeExamplePanel = styled.div`
  margin-top: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-top: none;
  border-radius: 0 0 10px 10px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`;

const CodeExampleToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.45rem 0.55rem;
  background: linear-gradient(to bottom, #fbfcfb, #f4f7f5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
`;

const CodeExampleTabGroup = styled.div`
  display: flex;
  gap: 0.3rem;
  padding: 2px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 8px;
`;

const CodeExampleTab = styled.button`
  border: none;
  background: ${(p) => (p.$active ? "#fff" : "transparent")};
  color: ${(p) => (p.$active ? "#1f4e46" : "#5a5a5a")};
  padding: 0.32rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8125rem;
  box-shadow: ${(p) => (p.$active ? "0 1px 2px rgba(0,0,0,0.06)" : "none")};

  &:hover {
    color: ${(p) => (p.$active ? "#1f4e46" : "#333")};
  }
`;

const CodeExampleToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-left: auto;
`;

const ExampleCopyButton = styled.button`
  border: 1px solid rgba(47, 107, 68, 0.35);
  background: #fff;
  color: #1f4e46;
  padding: 0.32rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8125rem;

  &:hover {
    background: rgba(111, 198, 142, 0.12);
    border-color: rgba(47, 107, 68, 0.5);
  }
`;

const ExampleCodeBody = styled.pre`
  margin: 0;
  padding: 0.85rem 1rem 1rem;
  background: #f6f7f8;
  color: #2d3748;
  overflow-x: auto;
  font-size: 0.78rem;
  line-height: 1.65;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre;
  word-break: normal;
  max-height: min(260px, 42vh);
  tab-size: 4;

  @media (min-width: 640px) {
    font-size: 0.805rem;
  }
`;

const DocSubTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f4e46;
`;

const ParamTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  color: #444;

  th,
  td {
    text-align: left;
    padding: 0.5rem 0.65rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    vertical-align: top;
  }

  th {
    color: #333;
    font-weight: 600;
    width: 28%;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

const InlineRow = styled.div`
  display: grid;
  grid-template-columns: minmax(9.5rem, 12rem) 1fr;
  gap: 1rem;
  align-items: start;
  margin-top: 0.75rem;

  @media (max-width: 740px) {
    grid-template-columns: 1fr;
  }
`;

const FormatSelect = styled(Select)`
  padding: 0.45rem 0.55rem;
  font-size: 0.875rem;
`;

const CodeBlock = styled.pre`
  margin: 0.75rem 0 0.5rem 0;
  padding: 0.9rem 1rem;
  background: #f5f5f5;
  color: #1f4e46;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-left: 3px solid #6fc68e;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  overflow: auto;
  font-size: 0.85rem;
  line-height: 1.55;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  word-break: break-all;
`;

const CopyRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const CopyStatus = styled.span`
  font-size: 0.8rem;
  color: #2f6b44;
  font-weight: 600;
  margin-right: 0.25rem;
`;

const CopyButton = styled.button`
  background: linear-gradient(90deg, #64c08d, #5aba8c);
  color: #fff;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;

  &:hover {
    opacity: 0.92;
  }
`;

const GenerateButton = styled(CopyButton)`
  transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
  box-shadow: ${(p) => (p.$generated ? "0 0 0 3px rgba(111, 198, 142, 0.25)" : "none")};
  background: ${(p) => (p.$generated ? "linear-gradient(90deg, #4aa877, #3f9e74)" : "linear-gradient(90deg, #64c08d, #5aba8c)")};

  &:active {
    transform: translateY(1px);
  }
`;

const YearSection = styled.div`
  margin-top: 0.9rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 0.65rem 0.7rem;
  background: #fcfcfc;
`;

const YearLabel = styled(Label)`
  font-size: 0.8125rem;
  margin-bottom: 0;
  color: #5a5a5a;
`;

const YearHelpText = styled.p`
  margin: 0.3rem 0 0;
  color: #666;
  font-size: 0.85rem;
  line-height: 1.45;
`;

const YearHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.05rem;
  margin-bottom: 0.35rem;
`;

const YearActions = styled.div`
  display: flex;
  gap: 0.35rem;
`;

const YearActionButton = styled.button`
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: #fff;
  color: #333;
  border-radius: 6px;
  padding: 0.15rem 0.4rem;
  font-size: 0.72rem;
  cursor: pointer;

  &:hover {
    border-color: rgba(47, 107, 68, 0.5);
    color: #1f4e46;
  }
`;

const YearsGrid = styled.div`
  margin-top: 0.5rem;
  display: block;
  max-height: 170px;
  overflow-y: auto;
`;

const YearPillList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const YearPill = styled.button`
  border: 1px solid #767676;
  border-radius: 5px;
  color: #767676;
  cursor: pointer;
  display: inline-block;
  margin: 0 3px 5px 0;
  padding: 0.08em 0.42em 0.12em;
  font-size: 0.8rem;
  background: #fff;
  transition: color 0.14s, border-color 0.14s, border-width 0.14s, font-weight 0.14s, opacity 0.14s;

  &:hover {
    opacity: 0.8;
  }

  &.selected {
    border-color: #6fc68e;
    border-width: 2px;
    color: #6fc68e;
    font-weight: 700;
  }
`;

const QueryBuilderSection = styled.div`
  margin-top: 0.9rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 0.75rem;
  background: #fcfcfc;
`;

const QueryTopRow = styled.div`
  display: grid;
  grid-template-columns: minmax(9rem, 12rem) minmax(9rem, 12rem);
  gap: 0.75rem;
  align-items: end;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const QueryInput = styled.textarea`
  width: 100%;
  min-height: 170px;
  margin-top: 0.45rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.5;
  background: #fff;
  resize: vertical;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

  &:focus {
    outline: none;
    border-color: #6fc68e;
    box-shadow: 0 0 0 3px rgba(111, 198, 142, 0.14);
  }
`;

const FieldValue = styled.div`
  width: 100%;
  min-height: 38px;
  padding: 0.45rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
`;

const QueryActionRow = styled.div`
  margin-top: 0.7rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const QueryHintList = styled.ul`
  margin: 0.65rem 0 0;
  padding-left: 1rem;
  color: #5f5f5f;
  font-size: 0.84rem;
  line-height: 1.5;
`;

const QueryModeRow = styled.div`
  display: flex;
  gap: 0.45rem;
  margin-top: 0.7rem;
  flex-wrap: wrap;
`;

const QueryModeButton = styled.button`
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: ${(p) => (p.$active ? "rgba(111, 198, 142, 0.18)" : "#fff")};
  color: ${(p) => (p.$active ? "#1f4e46" : "#333")};
  padding: 0.36rem 0.7rem;
  border-radius: 7px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.82rem;
`;

const BasicLimitHint = styled.p`
  margin: 0.22rem 0 0;
  color: #777;
  font-size: 0.78rem;
  line-height: 1.45;
`;

const BasicBuilderGrid = styled.div`
  margin-top: 0.6rem;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 0.7rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ColumnDropdownWrap = styled.div`
  position: relative;
`;

const ColumnDropdownButton = styled.button`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 0.88rem;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
`;

const ColumnDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  width: min(420px, 90vw);
  z-index: 30;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
  padding: 0.6rem;
`;

const ColumnDropdownHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
`;

const ColumnDropdownList = styled.div`
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  padding: 0.35rem;
`;

const ColumnOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.2rem 0.25rem;
  font-size: 0.84rem;
  color: #333;
  cursor: pointer;
`;

const SecondaryButton = styled.button`
  background: #fff;
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.18);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;

  &:hover {
    border-color: rgba(0, 0, 0, 0.28);
  }
`;

const Mono = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
`;

/** Public DataCommon API token (required by the backend). */
const DATACOMMON_API_TOKEN = "datacommon";
const DATACOMMON_BASE_URL = "https://datacommon.mapc.org";

const EXPORT_FORMATS = {
  csv: {
    label: "CSV",
    isGeospatial: true,
    isTabular: true,
  },
  json: {
    label: "JSON",
    isGeospatial: false,
    isTabular: true,
  },
  shapefile: {
    label: "Shapefile",
    isGeospatial: true,
    isTabular: false,
  },
  geojson: {
    label: "GeoJSON",
    isGeospatial: true,
    isTabular: false,
  },
};

/**
 * Omit `years` when nothing is selected (full export) or when every catalogued year is selected
 * (full export). Only append `years=` for a strict subset.
 */
function shouldOmitYearsFromExportUrl(selectedYears, allAvailableYears) {
  if (!selectedYears?.length) return true;
  if (!allAvailableYears?.length) return false;
  const selected = new Set(selectedYears.map((y) => String(y)));
  const catalog = new Set(allAvailableYears.map((y) => String(y)));
  if (selected.size !== catalog.size) return false;
  for (const y of catalog) {
    if (!selected.has(y)) return false;
  }
  return true;
}

function buildExportUrl({ database, schema, table, format, years, allAvailableYears, columns }) {
  const params = new URLSearchParams();
  params.set("token", DATACOMMON_API_TOKEN);
  params.set("database", database || "");
  params.set("schema", schema || "");
  params.set("table", table || "");
  params.set("format", format || "csv");

  if (!shouldOmitYearsFromExportUrl(years || [], allAvailableYears || [])) {
    params.set("years", (years || []).map((y) => String(y)).join(","));
  }
  if (columns?.length) params.set("columns", columns.join(","));

  return `${DATACOMMON_BASE_URL}/api/export?${params.toString()}`;
}

function buildQueryUrl({ database, query }) {
  const params = new URLSearchParams();
  params.set("token", DATACOMMON_API_TOKEN);
  params.set("database", database || "ds");
  params.set("query", query || "SELECT * FROM tabular.some_table LIMIT 100");

  return `${DATACOMMON_BASE_URL}/api?${params.toString()}`;
}

function extractMetadataColumnsFromResponse(responseData) {
  const byName = new Map();

  const upsert = (nameValue, descriptionValue) => {
    const name = String(nameValue || "").trim();
    if (!name) return;
    const description = String(descriptionValue || "").trim();
    const prev = byName.get(name);
    if (!prev) {
      byName.set(name, { name, description });
      return;
    }
    if (!prev.description && description) {
      byName.set(name, { name, description });
    }
  };

  const collectFromRows = (rows) => {
    if (!Array.isArray(rows)) return;
    rows.forEach((row) => {
      const name =
        row?.column_name || row?.column || row?.field || row?.name || row?.attname || row?.Field || row?.COLUMN_NAME || row?.attrlabl;
      const description = row?.description || row?.desc || row?.column_description || row?.comment || row?.attrdef;
      upsert(name, description);
    });
  };

  // Format 1: { rows: [...] }
  collectFromRows(responseData?.rows);

  // Format 2: { someKey: [ ... ] } (tabular metadata)
  Object.values(responseData || {}).forEach((value) => {
    collectFromRows(value);
  });

  // Format 3: gisdata/towndata nested docs
  const firstMeta = Object.values(responseData || {})[0];
  const attrs = firstMeta?.documentation?.metadata?.eainfo?.detailed?.attr;
  collectFromRows(attrs);

  return Array.from(byName.values());
}

async function copyText(text) {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (e) {
    // ignore; fallback below
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.top = "-1000px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

const ApiPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cache: datasets, noDupesDatasets } = useSelector((state) => state.dataset);

  const initialDatasetId = searchParams.get("datasetId");

  const [pickerQuery, setPickerQuery] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState(initialDatasetId || "");
  const [activeTab, setActiveTab] = useState("export");
  const [exportFormat, setExportFormat] = useState("csv");
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [exportExampleLang, setExportExampleLang] = useState("python");
  const [exportExamplesExpanded, setExportExamplesExpanded] = useState(false);
  const [queryJustGenerated, setQueryJustGenerated] = useState(false);
  const [queryMode, setQueryMode] = useState("basic");
  const [queryColumns, setQueryColumns] = useState([]);
  const [querySelectColumn, setQuerySelectColumn] = useState([]);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");
  const [queryLimit, setQueryLimit] = useState("100");
  const [querySql, setQuerySql] = useState("");
  const [queryUrl, setQueryUrl] = useState("");
  const [isMetadataPopupOpen, setIsMetadataPopupOpen] = useState(false);
  const columnMenuRef = useRef(null);

  useEffect(() => {
    if (!datasets || datasets.length === 0) {
      dispatch(fetchDatasets());
    }
  }, [dispatch, datasets]);

  // Match Data Inventory total/count logic (dedupe by table_name via dataset slice).
  const inventoryDatasets = useMemo(() => noDupesDatasets || datasets || [], [noDupesDatasets, datasets]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
        setIsColumnMenuOpen(false);
        setIsMetadataPopupOpen(false);
      }
    };
    if (isPickerOpen || isMetadataPopupOpen) {
      window.addEventListener("keydown", onEscape);
    }
    return () => window.removeEventListener("keydown", onEscape);
  }, [isPickerOpen, isMetadataPopupOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setIsColumnMenuOpen(false);
      }
    };
    if (isColumnMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isColumnMenuOpen]);

  // If a user navigates directly with ?datasetId=... update local state
  useEffect(() => {
    if (initialDatasetId && initialDatasetId !== selectedDatasetId) {
      setSelectedDatasetId(initialDatasetId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDatasetId]);

  const filteredDatasets = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    const list = inventoryDatasets;
    if (!query) return list;
    return list.filter((d) => {
      const name = String(d.menu3 || "").toLowerCase();
      const table = String(d.table_name || "").toLowerCase();
      const source = String(d.source || "").toLowerCase();
      return name.includes(query) || table.includes(query) || source.includes(query);
    });
  }, [inventoryDatasets, pickerQuery]);

  const selectedDataset = useMemo(() => {
    if (!selectedDatasetId) return null;
    return inventoryDatasets.find((d) => String(d.seq_id) === String(selectedDatasetId)) || null;
  }, [inventoryDatasets, selectedDatasetId]);

  const datasetBasics = useMemo(() => {
    if (!selectedDataset) return null;
    return {
      title: selectedDataset.menu3 || "",
      source: selectedDataset.source || "",
      database: selectedDataset.db_name || "",
      schema: selectedDataset.schemaname || "",
      table: selectedDataset.table_name || "",
      yearcolumn: selectedDataset.yearcolumn || "",
    };
  }, [selectedDataset]);

  useEffect(() => {
    // Reset year selections when dataset changes.
    setAvailableYears([]);
    setSelectedYears([]);

    if (!datasetBasics?.yearcolumn || !datasetBasics?.database || !datasetBasics?.schema || !datasetBasics?.table) {
      return;
    }

    const loadYears = async () => {
      try {
        const response = await axios.get("/api/", {
          params: {
            token: DATACOMMON_API_TOKEN,
            distinctColumn: datasetBasics.yearcolumn,
            database: datasetBasics.database,
            schema: datasetBasics.schema,
            table: datasetBasics.table,
            limit: 100,
          },
        });
        const years = (response?.data?.rows || [])
          .map((row) => Object.values(row)[0])
          .filter((year) => year !== null && year !== undefined && String(year).trim() !== "")
          .sort((a, b) => String(b).localeCompare(String(a)));
        setAvailableYears(years);
        // Default to all years selected; users can deselect to narrow export.
        setSelectedYears(years);
      } catch (error) {
        // Keep the page usable even if year metadata fails.
        setAvailableYears([]);
        setSelectedYears([]);
      }
    };

    loadYears();
  }, [datasetBasics]);

  const availableExportFormats = useMemo(() => {
    const tableIsGeospatial = datasetBasics?.database === "towndata" || datasetBasics?.database === "gisdata";
    return Object.entries(EXPORT_FORMATS)
      .filter(([, config]) => config.isGeospatial === tableIsGeospatial || (!tableIsGeospatial && config.isTabular))
      .map(([format, config]) => ({ value: format, label: config.label }));
  }, [datasetBasics]);

  useEffect(() => {
    if (!availableExportFormats.length) return;
    const isCurrentFormatAvailable = availableExportFormats.some((format) => format.value === exportFormat);
    if (!isCurrentFormatAvailable) {
      setExportFormat(availableExportFormats[0].value);
    }
  }, [availableExportFormats, exportFormat]);

  const exportUrl = useMemo(() => {
    if (!datasetBasics) return "";
    return buildExportUrl({
      database: datasetBasics.database,
      schema: datasetBasics.schema,
      table: datasetBasics.table,
      format: exportFormat,
      years: selectedYears,
      allAvailableYears: availableYears,
    });
  }, [datasetBasics, exportFormat, selectedYears, availableYears]);

  const suggestedExportFilename = useMemo(() => {
    const ext = exportFormat === "shapefile" ? "zip" : exportFormat;
    return `datacommon_export.${ext}`;
  }, [exportFormat]);

  const pythonExportExample = useMemo(() => {
    if (!exportUrl) return "";
    const urlLit = JSON.stringify(exportUrl);
    const readDataLine =
      exportFormat === "json"
        ? "data = pd.read_json(url)"
        : exportFormat === "csv"
          ? "data = pd.read_csv(url)"
          : `data = pd.read_csv(url)  # tabular only; for ${exportFormat} try geopandas.read_file(url)`;
    return `# Install required packages (run once)
# pip install pandas requests matplotlib seaborn

import pandas as pd
import requests
import matplotlib.pyplot as plt
import seaborn as sns

# Read data from DataCommon API
url = ${urlLit}
${readDataLine}

# View data structure and first few rows
print("Data shape:", data.shape)
print("\\nColumn names:")
print(data.columns.tolist())
print("\\nFirst few rows:")
print(data.head())

# Basic data info
print("\\nData info:")
print(data.info())

# Summary statistics
print("\\nSummary statistics:")
print(data.describe())

# Example visualization (uncomment to use)
# plt.figure(figsize=(10, 6))
# sns.histplot(data['column_name'])
# plt.title('Distribution of Column Name')
# plt.show()`;
  }, [exportUrl, exportFormat]);

  const rExportExample = useMemo(() => {
    if (!exportUrl) return "";
    const urlLit = JSON.stringify(exportUrl);
    const pathLit = JSON.stringify(suggestedExportFilename);
    return `export_url <- ${urlLit}
dest <- file.path(getwd(), ${pathLit})
download.file(export_url, dest, mode = "wb", quiet = TRUE)
message("Saved to ", normalizePath(dest, winslash = "/"))`;
  }, [exportUrl, suggestedExportFilename]);

  const queryDatabase = useMemo(() => datasetBasics?.database || "ds", [datasetBasics]);

  const starterQuerySql = useMemo(() => {
    if (!datasetBasics?.schema || !datasetBasics?.table) return "SELECT * FROM tabular.some_table LIMIT 100";
    const fqTable = `${datasetBasics.schema}.${datasetBasics.table}`;
    if (datasetBasics.yearcolumn) {
      return `SELECT *\nFROM ${fqTable}\nORDER BY ${datasetBasics.yearcolumn} DESC\nLIMIT 100`;
    }
    return `SELECT *\nFROM ${fqTable}\nLIMIT 100`;
  }, [datasetBasics]);

  useEffect(() => {
    if (!datasetBasics?.database || !datasetBasics?.schema || !datasetBasics?.table) {
      setQueryColumns([]);
      return;
    }

    const loadColumns = async () => {
      try {
        const response = await axios.get("/api/metadata", {
          params: {
            token: DATACOMMON_API_TOKEN,
            database: datasetBasics.database,
            schema: datasetBasics.schema,
            table: datasetBasics.table,
          },
        });
        const details = extractMetadataColumnsFromResponse(response?.data);
        setQueryColumns(details.map((d) => d.name));
      } catch (error) {
        setQueryColumns([]);
      }
    };

    loadColumns();
  }, [datasetBasics]);

  const basicQuerySql = useMemo(() => {
    if (!datasetBasics?.schema || !datasetBasics?.table) return "SELECT * FROM tabular.some_table";
    const fqTable = `${datasetBasics.schema}.${datasetBasics.table}`;
    const selectExpr = Array.isArray(querySelectColumn) && querySelectColumn.length > 0 ? querySelectColumn.join(", ") : "*";
    let sql = `SELECT ${selectExpr}\nFROM ${fqTable}`;
    const limitTrim = String(queryLimit ?? "").trim();
    if (limitTrim === "") {
      return sql;
    }
    if (!/^\d+$/.test(limitTrim)) {
      sql += `\nLIMIT 100`;
      return sql;
    }
    const limitNum = Number.parseInt(limitTrim, 10);
    const safeLimit = limitNum > 0 ? limitNum : 100;
    sql += `\nLIMIT ${safeLimit}`;
    return sql;
  }, [
    datasetBasics,
    querySelectColumn,
    queryLimit,
  ]);

  useEffect(() => {
    const nextSql = starterQuerySql;
    setQueryMode("basic");
    setQuerySelectColumn([]);
    setIsColumnMenuOpen(false);
    setColumnSearchQuery("");
    setQueryLimit("100");
    setQuerySql(nextSql);
    setQueryUrl("");
    setQueryJustGenerated(false);
    setIsMetadataPopupOpen(false);
  }, [datasetBasics, starterQuerySql, queryDatabase]);

  const handleSwitchQueryMode = (mode) => {
    setQueryMode(mode);
    if (mode === "advanced") {
      setQuerySql((prev) => (String(prev || "").trim() ? prev : basicQuerySql));
    }
  };

  const filteredQueryColumns = useMemo(() => {
    const q = columnSearchQuery.trim().toLowerCase();
    if (!q) return queryColumns;
    return queryColumns.filter((col) => col.toLowerCase().includes(q));
  }, [queryColumns, columnSearchQuery]);

  const selectedColumnsLabel = useMemo(() => {
    if (querySelectColumn.length === 0) return "All columns";
    if (querySelectColumn.length === 1) return querySelectColumn[0];
    return `${querySelectColumn.length} columns selected`;
  }, [querySelectColumn]);

  const toggleQuerySelectColumn = (column) => {
    setQuerySelectColumn((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column],
    );
  };

  const selectAllQueryColumns = () => {
    setQuerySelectColumn(queryColumns);
  };

  const clearQuerySelectedColumns = () => {
    setQuerySelectColumn([]);
  };

  const curlFor = (url) => {
    if (!url) return "";
    return `curl -s "${url}"`;
  };

  const handleDatasetChange = (nextId) => {
    setSelectedDatasetId(nextId);
    const next = new URLSearchParams(searchParams);
    if (nextId) {
      next.set("datasetId", nextId);
    } else {
      next.delete("datasetId");
    }
    setSearchParams(next, { replace: true });
  };

  const handleDatasetSelectFromPicker = (nextId) => {
    handleDatasetChange(nextId);
    setIsPickerOpen(false);
  };

  const toggleYear = (yearValue) => {
    setSelectedYears((prev) => {
      const yearKey = String(yearValue);
      if (prev.some((y) => String(y) === yearKey)) {
        return prev.filter((y) => String(y) !== yearKey);
      }
      return [...prev, yearValue];
    });
  };

  const selectAllYears = () => {
    setSelectedYears(availableYears);
  };

  const clearAllYears = () => {
    setSelectedYears([]);
  };

  const handleGenerateQueryUrl = () => {
    const sqlForUrl = queryMode === "basic" ? basicQuerySql : querySql;
    const next = buildQueryUrl({
      database: queryDatabase,
      query: sqlForUrl,
    });
    if (queryMode === "basic") {
      setQuerySql(sqlForUrl);
    }
    setQueryUrl(next);
    setQueryJustGenerated(true);
    window.setTimeout(() => {
      setQueryJustGenerated(false);
    }, 1200);
  };

  const handleCopy = async (text, type) => {
    await copyText(text);
    const statusByType = {
      curl: "curl copied!",
      url: "URL copied!",
      python: "Python copied!",
      r: "R copied!",
    };
    setCopyStatus(statusByType[type] || "Copied!");
    window.setTimeout(() => {
      setCopyStatus("");
    }, 1800);
  };

  const apiSectionUi = {
    Card,
    CardTitle,
    Small,
    Mono,
    InlineRow,
    Label,
    FormatSelect,
    YearSection,
    YearHelpText,
    YearHeader,
    YearLabel,
    YearActions,
    YearActionButton,
    YearsGrid,
    YearPillList,
    YearPill,
    CodeBlock,
    CopyRow,
    CopyStatus,
    SecondaryButton,
    CopyButton,
    CodeExamplesSection,
    CodeExamplesDisclosure,
    CodeExamplesDisclosureText,
    CodeExamplesDisclosureTitle,
    CodeExamplesDisclosureHint,
    CodeExamplesChevron,
    CodeExamplePanel,
    CodeExampleToolbar,
    CodeExampleTabGroup,
    CodeExampleTab,
    CodeExampleToolbarRight,
    ExampleCopyButton,
    ExampleCodeBody,
    DocSection,
    DocSubTitle,
    ParamTable,
    QueryBuilderSection,
    QueryTopRow,
    FieldValue,
    QueryModeRow,
    QueryModeButton,
    BasicBuilderGrid,
    ColumnDropdownWrap,
    ColumnDropdownButton,
    ColumnDropdownMenu,
    ColumnDropdownHeader,
    Search,
    ColumnDropdownList,
    ColumnOption,
    BasicLimitHint,
    QueryInput,
    QueryActionRow,
    GenerateButton,
  };

  return (
    <PageContainer className="route api">
      <Inner>
        <Title>API</Title>
        <SubTitle>
          Choose a dataset to build export and query URLs you can paste into a browser, curl, or your own code.
          Adjust format and years and copy examples when you need them.
        </SubTitle>

        <ControlsRow>
          <DatasetChoiceColumn>
            <Label>Find a dataset</Label>
            <CompactDatasetSearchBar
              datasets={inventoryDatasets}
              placeholder={`Search ${inventoryDatasets.length} datasets ...`}
              onSelect={(dataset) => {
                handleDatasetChange(String(dataset.seq_id || dataset.id));
              }}
              onSearchChange={({ query }) => setPickerQuery(query || "")}
              maxResults={10}
              maxWidth="min(680px, 100%)"
              maxHeight="38vh"
              maxHeightMobile="30vh"
            />
          </DatasetChoiceColumn>
          <OrBetween>or</OrBetween>
          <DatasetChoiceColumn>
            <Label>Choose from Data Inventory</Label>
            <DatasetPickerButton type="button" onClick={() => setIsPickerOpen(true)}>
              Browse Datasets
            </DatasetPickerButton>
          </DatasetChoiceColumn>
        </ControlsRow>
        <SelectedDatasetStatus role="status" aria-live="polite">
          {datasetBasics ? (
            <>
              <strong style={{ color: "#333" }}>{datasetBasics.title}</strong>
              <span style={{ color: "#999" }}>|</span>
              <Mono>{datasetBasics.table}</Mono>
            </>
          ) : (
            <span style={{ color: "#777" }}>No dataset selected yet</span>
          )}
        </SelectedDatasetStatus>

        {isPickerOpen && (
          <PickerOverlay
            onClick={() => {
              setIsPickerOpen(false);
            }}
          >
            <PickerDialog
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <PickerHeader>
                <PickerTitle>Select a dataset from Data Inventory</PickerTitle>
                <CloseButton type="button" onClick={() => setIsPickerOpen(false)}>
                  Close
                </CloseButton>
              </PickerHeader>
              <PickerBody>
                <Label htmlFor="dataset-picker-search">Search inventory</Label>
                <Search
                  id="dataset-picker-search"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search by title, table name, or source..."
                />
                <Small style={{ marginTop: "0.6rem" }}>
                  {filteredDatasets.length} dataset{filteredDatasets.length === 1 ? "" : "s"} found
                </Small>
                <PickerDatasetList>
                  {filteredDatasets.slice(0, 120).map((d) => (
                    <PickerDatasetCard key={String(d.seq_id)}>
                      <PickerDatasetMeta>
                        <PickerDatasetName>{d.menu3}</PickerDatasetName>
                        <PickerDatasetDetails>
                          <Mono>{d.table_name}</Mono>
                          <br />
                          Source: {d.source || "N/A"}
                        </PickerDatasetDetails>
                      </PickerDatasetMeta>
                      <PickerSelectButton
                        type="button"
                        onClick={() => handleDatasetSelectFromPicker(String(d.seq_id))}
                      >
                        Select
                      </PickerSelectButton>
                    </PickerDatasetCard>
                  ))}
                </PickerDatasetList>
                {filteredDatasets.length > 120 && (
                  <Small style={{ marginTop: "0.75rem" }}>
                    Showing first 120 results. Refine your search to narrow down.
                  </Small>
                )}
              </PickerBody>
            </PickerDialog>
          </PickerOverlay>
        )}

        <Tabs role="tablist" aria-label="API type">
          <TabButton type="button" $active={activeTab === "export"} onClick={() => setActiveTab("export")}>
            Export API
          </TabButton>
          <TabButton type="button" $active={activeTab === "query"} onClick={() => setActiveTab("query")}>
            Query API
          </TabButton>
        </Tabs>

        {!datasetBasics ? (
          <Card>
            <CardTitle>Select a dataset to generate requests</CardTitle>
          </Card>
        ) : activeTab === "export" ? (
          <ExportApiSection
            ui={apiSectionUi}
            datasetBasics={datasetBasics}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            availableExportFormats={availableExportFormats}
            availableYears={availableYears}
            selectedYears={selectedYears}
            toggleYear={toggleYear}
            selectAllYears={selectAllYears}
            clearAllYears={clearAllYears}
            exportUrl={exportUrl}
            copyStatus={copyStatus}
            handleCopy={handleCopy}
            curlFor={curlFor}
            exportExamplesExpanded={exportExamplesExpanded}
            setExportExamplesExpanded={setExportExamplesExpanded}
            exportExampleLang={exportExampleLang}
            setExportExampleLang={setExportExampleLang}
            suggestedExportFilename={suggestedExportFilename}
            pythonExportExample={pythonExportExample}
            rExportExample={rExportExample}
            DATACOMMON_BASE_URL={DATACOMMON_BASE_URL}
            DATACOMMON_API_TOKEN={DATACOMMON_API_TOKEN}
          />
        ) : (
          <QueryApiSection
            ui={apiSectionUi}
            DATACOMMON_API_TOKEN={DATACOMMON_API_TOKEN}
            DATACOMMON_BASE_URL={DATACOMMON_BASE_URL}
            queryDatabase={queryDatabase}
            queryMode={queryMode}
            handleSwitchQueryMode={handleSwitchQueryMode}
            selectedColumnsLabel={selectedColumnsLabel}
            columnMenuRef={columnMenuRef}
            isColumnMenuOpen={isColumnMenuOpen}
            setIsColumnMenuOpen={setIsColumnMenuOpen}
            selectAllQueryColumns={selectAllQueryColumns}
            clearQuerySelectedColumns={clearQuerySelectedColumns}
            columnSearchQuery={columnSearchQuery}
            setColumnSearchQuery={setColumnSearchQuery}
            filteredQueryColumns={filteredQueryColumns}
            querySelectColumn={querySelectColumn}
            toggleQuerySelectColumn={toggleQuerySelectColumn}
            selectedDataset={selectedDataset}
            setIsMetadataPopupOpen={setIsMetadataPopupOpen}
            queryLimit={queryLimit}
            setQueryLimit={setQueryLimit}
            basicQuerySql={basicQuerySql}
            querySql={querySql}
            setQuerySql={setQuerySql}
            handleGenerateQueryUrl={handleGenerateQueryUrl}
            queryJustGenerated={queryJustGenerated}
            queryUrl={queryUrl}
            copyStatus={copyStatus}
            handleCopy={handleCopy}
            curlFor={curlFor}
          />
        )}

        {isMetadataPopupOpen && selectedDataset && (
          <MetadataModal
            show={isMetadataPopupOpen}
            handleClose={() => setIsMetadataPopupOpen(false)}
            dataset={selectedDataset}
          />
        )}
      </Inner>
    </PageContainer>
  );
};

export default ApiPage;


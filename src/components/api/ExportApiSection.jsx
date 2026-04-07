import React from "react";

const ExportApiSection = ({
  ui,
  datasetBasics,
  exportFormat,
  setExportFormat,
  availableExportFormats,
  availableYears,
  selectedYears,
  toggleYear,
  selectAllYears,
  clearAllYears,
  exportUrl,
  copyStatus,
  handleCopy,
  curlFor,
  exportExamplesExpanded,
  setExportExamplesExpanded,
  exportExampleLang,
  setExportExampleLang,
  suggestedExportFilename,
  pythonExportExample,
  rExportExample,
  DATACOMMON_BASE_URL,
  DATACOMMON_API_TOKEN,
}) => {
  const {
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
  } = ui;

  return (
    <Card>
      <CardTitle>Export API</CardTitle>
      <Small>
        Best for downloads (CSV/GeoJSON/etc). This uses <Mono>/api/export</Mono> and returns a file response.
      </Small>

      <InlineRow>
        <div>
          <Label htmlFor="api-export-format">Format</Label>
          <FormatSelect id="api-export-format" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            {availableExportFormats.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </FormatSelect>
        </div>
        <div>
          <Label>Dataset</Label>
          <div style={{ color: "#555", lineHeight: 1.45 }}>
            <strong style={{ color: "#333" }}>{datasetBasics.title}</strong>
            <div style={{ fontSize: "0.9rem" }}>
              <Mono>{datasetBasics.database}</Mono> / <Mono>{datasetBasics.schema}</Mono> / <Mono>{datasetBasics.table}</Mono>
            </div>
          </div>
        </div>
      </InlineRow>

      <YearSection>
        {!datasetBasics?.yearcolumn ? (
          <YearHelpText>
            This dataset does not have a year column, so <Mono>years=</Mono> is not available.
          </YearHelpText>
        ) : (
          <>
            <YearHeader>
              <YearLabel>Years</YearLabel>
              {availableYears.length > 0 && (
                <YearActions>
                  <YearActionButton type="button" onClick={selectAllYears}>
                    Select all
                  </YearActionButton>
                  <YearActionButton type="button" onClick={clearAllYears}>
                    Clear all
                  </YearActionButton>
                </YearActions>
              )}
            </YearHeader>
            {availableYears.length > 0 ? (
              <YearsGrid>
                <YearPillList>
                  {availableYears.map((year) => {
                    const selected = selectedYears.some((selectedYear) => String(selectedYear) === String(year));
                    return (
                      <li key={String(year)} style={{ display: "inline" }}>
                        <YearPill type="button" className={selected ? "selected" : ""} onClick={() => toggleYear(year)}>
                          {String(year)}
                        </YearPill>
                      </li>
                    );
                  })}
                </YearPillList>
              </YearsGrid>
            ) : (
              <YearHelpText style={{ marginTop: "0.25rem" }}>
                No years found for this dataset, so export URL will include all data.
              </YearHelpText>
            )}
          </>
        )}
      </YearSection>

      <CodeBlock>{exportUrl}</CodeBlock>
      <CopyRow>
        {copyStatus && <CopyStatus>{copyStatus}</CopyStatus>}
        <SecondaryButton type="button" onClick={() => handleCopy(curlFor(exportUrl), "curl")}>
          Copy curl
        </SecondaryButton>
        <CopyButton type="button" onClick={() => handleCopy(exportUrl, "url")}>
          Copy URL
        </CopyButton>
      </CopyRow>

      <CodeExamplesSection>
        <CodeExamplesDisclosure
          type="button"
          $expanded={exportExamplesExpanded}
          aria-expanded={exportExamplesExpanded}
          aria-controls="export-code-examples-panel"
          id="export-code-examples-disclosure"
          onClick={() => setExportExamplesExpanded((open) => !open)}
        >
          <CodeExamplesDisclosureText>
            <CodeExamplesDisclosureTitle>Code examples</CodeExamplesDisclosureTitle>
            <CodeExamplesDisclosureHint>
              Python loads the export URL with pandas; R saves to <Mono>{suggestedExportFilename}</Mono>.
            </CodeExamplesDisclosureHint>
          </CodeExamplesDisclosureText>
          <CodeExamplesChevron $expanded={exportExamplesExpanded} aria-hidden>
            ▼
          </CodeExamplesChevron>
        </CodeExamplesDisclosure>
        {exportExamplesExpanded && (
          <CodeExamplePanel id="export-code-examples-panel" role="region" aria-labelledby="export-code-examples-disclosure">
            <CodeExampleToolbar>
              <CodeExampleTabGroup role="tablist" aria-label="Example language">
                <CodeExampleTab
                  type="button"
                  role="tab"
                  aria-selected={exportExampleLang === "python"}
                  id="export-ex-tab-python"
                  $active={exportExampleLang === "python"}
                  onClick={() => setExportExampleLang("python")}
                >
                  Python
                </CodeExampleTab>
                <CodeExampleTab
                  type="button"
                  role="tab"
                  aria-selected={exportExampleLang === "r"}
                  id="export-ex-tab-r"
                  $active={exportExampleLang === "r"}
                  onClick={() => setExportExampleLang("r")}
                >
                  R
                </CodeExampleTab>
              </CodeExampleTabGroup>
              <CodeExampleToolbarRight>
                {copyStatus && (copyStatus === "Python copied!" || copyStatus === "R copied!") && (
                  <CopyStatus>{copyStatus}</CopyStatus>
                )}
                <ExampleCopyButton
                  type="button"
                  onClick={() => handleCopy(exportExampleLang === "python" ? pythonExportExample : rExportExample, exportExampleLang)}
                >
                  Copy code
                </ExampleCopyButton>
              </CodeExampleToolbarRight>
            </CodeExampleToolbar>
            <ExampleCodeBody role="tabpanel" aria-labelledby={exportExampleLang === "python" ? "export-ex-tab-python" : "export-ex-tab-r"}>
              {exportExampleLang === "python" ? pythonExportExample : rExportExample}
            </ExampleCodeBody>
          </CodeExamplePanel>
        )}
      </CodeExamplesSection>

      <DocSection>
        <DocSubTitle>Documentation</DocSubTitle>
        <Small style={{ marginTop: 0, marginBottom: "0.65rem" }}>
          <strong>Endpoint:</strong> <Mono>GET {DATACOMMON_BASE_URL}/api/export</Mono>
          <br />
          Returns a file download. Use the same <Mono>token</Mono>, <Mono>database</Mono>, <Mono>schema</Mono>, <Mono>table</Mono>, and{" "}
          <Mono>format</Mono> values as in the URL above.
        </Small>
        <ParamTable>
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Mono>token</Mono>
              </td>
              <td>
                Required. Public token: <Mono>{DATACOMMON_API_TOKEN}</Mono>.
              </td>
            </tr>
            <tr>
              <td>
                <Mono>database</Mono>, <Mono>schema</Mono>, <Mono>table</Mono>
              </td>
              <td>Required. Identify the dataset (see values above).</td>
            </tr>
            <tr>
              <td>
                <Mono>format</Mono>
              </td>
              <td>
                Required. File type: <Mono>csv</Mono>, <Mono>json</Mono> (tabular), or <Mono>geojson</Mono>, <Mono>shapefile</Mono>{" "}
                (geospatial). Allowed values depend on dataset type.
              </td>
            </tr>
            <tr>
              <td>
                <Mono>years</Mono>
              </td>
              <td>
                Optional when the dataset has a year column. Omit the parameter for a full export (no years selected, or every
                catalogued year selected). Pass a comma-separated subset to limit rows.
              </td>
            </tr>
          </tbody>
        </ParamTable>
      </DocSection>
    </Card>
  );
};

export default ExportApiSection;

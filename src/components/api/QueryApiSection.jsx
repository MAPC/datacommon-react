import React from "react";

const QueryApiSection = ({
  ui,
  DATACOMMON_API_TOKEN,
  DATACOMMON_BASE_URL,
  queryDatabase,
  queryMode,
  handleSwitchQueryMode,
  selectedColumnsLabel,
  columnMenuRef,
  isColumnMenuOpen,
  setIsColumnMenuOpen,
  selectAllQueryColumns,
  clearQuerySelectedColumns,
  columnSearchQuery,
  setColumnSearchQuery,
  filteredQueryColumns,
  querySelectColumn,
  toggleQuerySelectColumn,
  selectedDataset,
  setIsMetadataPopupOpen,
  queryLimit,
  setQueryLimit,
  basicQuerySql,
  querySql,
  setQuerySql,
  handleGenerateQueryUrl,
  queryJustGenerated,
  queryUrl,
  copyStatus,
  handleCopy,
  curlFor,
}) => {
  const {
    Card,
    CardTitle,
    QueryBuilderSection,
    QueryTopRow,
    Label,
    FieldValue,
    Mono,
    QueryModeRow,
    QueryModeButton,
    BasicBuilderGrid,
    ColumnDropdownWrap,
    ColumnDropdownButton,
    ColumnDropdownMenu,
    ColumnDropdownHeader,
    Small,
    SecondaryButton,
    Search,
    ColumnDropdownList,
    ColumnOption,
    BasicLimitHint,
    QueryInput,
    QueryActionRow,
    GenerateButton,
    CodeBlock,
    CopyRow,
    CopyStatus,
    CopyButton,
    DocSection,
    DocSubTitle,
    ParamTable,
  } = ui;

  return (
    <Card>
      <CardTitle>Query API</CardTitle>

      <QueryBuilderSection>
        <QueryTopRow>
          <div>
            <Label>Token</Label>
            <FieldValue>
              <Mono>{DATACOMMON_API_TOKEN}</Mono>
            </FieldValue>
          </div>
          <div>
            <Label>Database</Label>
            <FieldValue>
              <Mono>{queryDatabase}</Mono>
            </FieldValue>
          </div>
        </QueryTopRow>

        <Label style={{ marginTop: "0.7rem", marginBottom: "0.15rem" }}>Query Mode</Label>
        <QueryModeRow>
          <QueryModeButton type="button" $active={queryMode === "basic"} onClick={() => handleSwitchQueryMode("basic")}>
            Basic builder
          </QueryModeButton>
          <QueryModeButton type="button" $active={queryMode === "advanced"} onClick={() => handleSwitchQueryMode("advanced")}>
            Advanced SQL
          </QueryModeButton>
        </QueryModeRow>

        {queryMode === "basic" ? (
          <>
            <BasicBuilderGrid>
              <div>
                <Label style={{ marginBottom: "0.2rem" }}>Select columns</Label>
                <ColumnDropdownWrap ref={columnMenuRef}>
                  <ColumnDropdownButton type="button" onClick={() => setIsColumnMenuOpen((prev) => !prev)}>
                    <span>{selectedColumnsLabel}</span>
                    <span>{isColumnMenuOpen ? "▲" : "▼"}</span>
                  </ColumnDropdownButton>
                  {isColumnMenuOpen && (
                    <ColumnDropdownMenu>
                      <ColumnDropdownHeader>
                        <Small style={{ margin: 0, fontWeight: 600 }}>{selectedColumnsLabel}</Small>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <SecondaryButton type="button" onClick={selectAllQueryColumns}>
                            Select all
                          </SecondaryButton>
                          <SecondaryButton type="button" onClick={clearQuerySelectedColumns}>
                            Clear
                          </SecondaryButton>
                        </div>
                      </ColumnDropdownHeader>
                      <Search
                        as="input"
                        value={columnSearchQuery}
                        onChange={(e) => setColumnSearchQuery(e.target.value)}
                        placeholder="Search columns..."
                        style={{ marginBottom: "0.45rem" }}
                      />
                      <ColumnDropdownList>
                        {filteredQueryColumns.map((col) => (
                          <ColumnOption key={col}>
                            <input type="checkbox" checked={querySelectColumn.includes(col)} onChange={() => toggleQuerySelectColumn(col)} />
                            <span>{col}</span>
                          </ColumnOption>
                        ))}
                        {filteredQueryColumns.length === 0 && <Small style={{ margin: 0, color: "#777" }}>No matching columns.</Small>}
                      </ColumnDropdownList>
                    </ColumnDropdownMenu>
                  )}
                </ColumnDropdownWrap>
                <Small style={{ marginTop: "0.28rem", marginBottom: 0 }}>Leave empty to select all columns.</Small>
                {selectedDataset && (
                  <div style={{ marginTop: "0.35rem" }}>
                    <SecondaryButton type="button" onClick={() => setIsMetadataPopupOpen(true)}>
                      View metadata (column reference)
                    </SecondaryButton>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="basic-limit" style={{ marginBottom: "0.2rem" }}>
                  Limit
                </Label>
                <Search
                  as="input"
                  id="basic-limit"
                  type="number"
                  value={queryLimit}
                  onChange={(e) => setQueryLimit(e.target.value)}
                  placeholder="Leave blank for all rows"
                />
                <BasicLimitHint>
                  Optional. If specified, applies a SQL LIMIT to restrict the number of rows returned by the API. Leave blank to return
                  all rows (no limit). Invalid or non-positive values will default to LIMIT 100. Use a smaller value during testing for
                  faster results.
                </BasicLimitHint>
              </div>
            </BasicBuilderGrid>

            <Label style={{ marginTop: "0.75rem", marginBottom: "0.2rem" }}>Generated SQL preview</Label>
            <QueryInput as="pre" readOnly aria-live="polite">
              {basicQuerySql}
            </QueryInput>
          </>
        ) : (
          <>
            <Label htmlFor="query-sql" style={{ marginTop: "0.7rem", marginBottom: "0.15rem" }}>
              SQL Query
            </Label>
            <QueryInput
              id="query-sql"
              value={querySql}
              onChange={(e) => setQuerySql(e.target.value)}
              placeholder="SELECT * FROM tabular.some_table LIMIT 100"
            />
          </>
        )}
        <QueryActionRow>
          <GenerateButton type="button" onClick={handleGenerateQueryUrl} $generated={queryJustGenerated}>
            {queryJustGenerated ? "Generated!" : "Generate URL"}
          </GenerateButton>
        </QueryActionRow>
      </QueryBuilderSection>

      {queryUrl ? (
        <>
          <Small style={{ marginTop: "1rem" }}>
            <strong>Query URL</strong>
          </Small>
          <CodeBlock>{queryUrl}</CodeBlock>
          <CopyRow>
            {copyStatus && <CopyStatus>{copyStatus}</CopyStatus>}
            <SecondaryButton type="button" onClick={() => handleCopy(curlFor(queryUrl), "curl")}>
              Copy curl
            </SecondaryButton>
            <CopyButton type="button" onClick={() => handleCopy(queryUrl, "url")}>
              Copy URL
            </CopyButton>
          </CopyRow>
        </>
      ) : (
        <Small style={{ marginTop: "0.8rem", marginBottom: "0.2rem" }}>
          Click <strong>Generate URL</strong> to create the query URL.
        </Small>
      )}

      <DocSection>
        <DocSubTitle>Documentation</DocSubTitle>
        <Small style={{ marginTop: 0, marginBottom: "0.65rem" }}>
          <strong>Endpoint:</strong> <Mono>GET {DATACOMMON_BASE_URL}/api/</Mono>
          <br />
          Returns JSON rows. Use the same <Mono>token</Mono>, <Mono>database</Mono>, and <Mono>query</Mono> values as in the URL above.
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
                Required. Public token value is <Mono>{DATACOMMON_API_TOKEN}</Mono>.
              </td>
            </tr>
            <tr>
              <td>
                <Mono>database</Mono>
              </td>
              <td>
                Required. Identifies which database executes the SQL query (for example, tabular datasets use <Mono>ds</Mono>; spatial
                datasets may use <Mono>gisdata</Mono> or <Mono>towndata</Mono>). This value is automatically populated from the selected
                dataset in Data Inventory.
              </td>
            </tr>
            <tr>
              <td>
                <Mono>query</Mono>
              </td>
              <td>
                Required. SQL query string. Include schema in table names, e.g. <Mono>SELECT * FROM tabular.hous_building_permits_m LIMIT 100</Mono>.
              </td>
            </tr>
          </tbody>
        </ParamTable>
      </DocSection>
    </Card>
  );
};

export default QueryApiSection;

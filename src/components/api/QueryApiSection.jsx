import React from "react";

/** GET URLs with a very long query params may hit browser or proxy limits. */
const LONG_GET_URL_CHARS = 2048;
const VERY_LONG_GET_URL_CHARS = 8192;

const QueryApiSection = ({
  ui,
  DATACOMMON_API_TOKEN,
  DATACOMMON_BASE_URL,
  queryDatabase,
  selectedDataset,
  setIsMetadataPopupOpen,
  querySql,
  setQuerySql,
  handleGenerateQueryUrl,
  queryJustGenerated,
  queryUrl,
  copyStatus,
  handleCopy,
}) => {
  const {
    Card,
    CardTitle,
    QueryBuilderSection,
    QueryTopRow,
    Label,
    FieldValue,
    Mono,
    Small,
    SecondaryButton,
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

        <Label htmlFor="query-sql" style={{ marginTop: "0.7rem", marginBottom: "0.15rem" }}>
          SQL query
        </Label>
        <QueryInput
          id="query-sql"
          value={querySql}
          onChange={(e) => setQuerySql(e.target.value)}
          placeholder="SELECT * FROM tabular.some_table LIMIT 100"
        />
        {selectedDataset && (
          <div style={{ marginTop: "0.35rem" }}>
            <SecondaryButton type="button" onClick={() => setIsMetadataPopupOpen(true)}>
              View metadata (column reference)
            </SecondaryButton>
          </div>
        )}

        <QueryActionRow>
          <GenerateButton type="button" onClick={handleGenerateQueryUrl} $generated={queryJustGenerated}>
            {queryJustGenerated ? "Ready!" : "Get API endpoint"}
          </GenerateButton>
        </QueryActionRow>
      </QueryBuilderSection>

      {queryUrl ? (
        <>
          <Label style={{ marginTop: "1rem", marginBottom: "0.25rem" }}>API endpoint</Label>
          <CodeBlock role="region" aria-label="Query API endpoint URL">
            {queryUrl}
          </CodeBlock>
          {queryUrl.length >= LONG_GET_URL_CHARS && (
            <Small
              style={{
                marginTop: "0.45rem",
                marginBottom: 0,
                color: queryUrl.length >= VERY_LONG_GET_URL_CHARS ? "#9a3412" : "#92400e",
                fontSize: "0.9rem",
                lineHeight: 1.45,
              }}
            >
              <strong>Long URL ({queryUrl.length.toLocaleString()} characters).</strong> The <Mono>query</Mono> value is
              URL-encoded, so many columns greatly increase length. If the request fails in the browser, shorten the SQL
              (fewer columns or <Mono>SELECT *</Mono>).
            </Small>
          )}
          <CopyRow>
            {copyStatus && <CopyStatus>{copyStatus}</CopyStatus>}
            <CopyButton type="button" onClick={() => handleCopy(queryUrl, "url")}>
              Copy URL
            </CopyButton>
          </CopyRow>
        </>
      ) : (
        <Small style={{ marginTop: "0.8rem", marginBottom: "0.2rem" }}>
          Click <strong>Get API endpoint</strong> to build the request URL.
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
                Required. SQL query string. Include schema in table names, e.g.{" "}
                <Mono>SELECT * FROM tabular.hous_building_permits_m LIMIT 100</Mono>.
              </td>
            </tr>
          </tbody>
        </ParamTable>
      </DocSection>
    </Card>
  );
};

export default QueryApiSection;

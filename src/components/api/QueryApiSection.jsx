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
              <strong>Long URL ({queryUrl.length.toLocaleString()} characters).</strong> If the request fails in the browser, 
              shorten the URL (fewer columns or filters).
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
          Returns JSON rows. Use the same <Mono>token</Mono>, <Mono>database</Mono>, <Mono>schema</Mono>, and <Mono>table</Mono> values as in the URL above.
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
                <Mono>schema</Mono>
              </td>
              <td>
                Required. The name of the database schema that contains the dataset. This value is automatically populated from the selected
                dataset in Data Inventory.
              </td>
            </tr>
            <tr>
              <td>
                <Mono>table</Mono>
              </td>
              <td>
                Required. The name of the database table that corresponds to the dataset. This value is automatically populated from the selected
                dataset in Data Inventory.
              </td>
            </tr>
            <tr>
              <td>
                <Mono>columns</Mono>
              </td>
              <td>
                Optional. A comma separated list of column names to fetch. e.g.{" "}
                <Mono>columns=col1,col2,col3</Mono>.
              </td>
            </tr>
            <tr>
              <td>
                <Mono>filters</Mono>
              </td>
              <td>
                Optional. A comma separated list of filters to limit the data being returned. Filters can be of the form:
                <div><Mono>column:value</Mono> for a direct EQUALS or IN comparison{" "}</div>
                <div><Mono>column~value</Mono> for a fuzzy ILIKE comparison{" "}</div>
                <div><Mono>column!!</Mono> for an IS NOT NULL filter on the column{" "}</div>
                <div>e.g.<Mono>filters=col1:value1,col1:value2,col2:value3,col3~fuzzyMatch,col4!!</Mono></div>
              </td>
            </tr>
            <tr>
              <td>
                <Mono>limit</Mono>
              </td>
              <td>
                Optional. A limit on the number of rows returned by the query. 
              </td>
            </tr>
          </tbody>
        </ParamTable>
      </DocSection>
    </Card>
  );
};

export default QueryApiSection;

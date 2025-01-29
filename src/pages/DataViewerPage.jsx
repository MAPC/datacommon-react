import React from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { css } from "@emotion/react";
import MoonLoader from "react-spinners/MoonLoader";
import { fetchDatasets } from "../reducers/datasetSlice";
import DatasetHeader from "../components/partials/DatasetHeader";
import DatasetTable from "../components/partials/DatasetTable";
import { parseXml } from "../utils/xml";

const override = css`
  height: 3.5rem;
  margin-bottom: 0.5rem;
  width: 3.5rem;
`;

class DataViewerClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentPage: 1,
      loading: true,
    };
    this.updateSelectedYears = this.updateSelectedYears.bind(this);
    this.updatePage = this.updatePage.bind(this);
  }

  componentDidMount() {
    const queryBase = "https://prql.mapc.org/";
    const queryToken = {
      ds: "96608389a2545f7adac815ea258ad27e",
      gisdata: "5e567e555ab7a2d22effa249e81cb903",
      towndata: "679f04f0eb9830c655334ab644479116",
    };

    this.props.fetchDatasets().then(() => {
      const dataset = this.props.datasets.filter(
        (datasetObj) => +datasetObj.seq_id === +this.props.params.id
      )[0];
      let headerQuery;
      console.log(dataset);
      if (!dataset) {
        this.setState({ loading: false, error: "Dataset not found" });
        return;
      }

      const tableQuery = axios.get(
        `${queryBase}?token=${
          queryToken[dataset.db_name]
        }&query=SELECT * FROM ${dataset.schemaname}.${dataset.table_name} ${
          dataset.yearcolumn ? `ORDER BY ${dataset.yearcolumn} DESC` : ""
        } LIMIT 15000`
      );
    
      // to do change way to call api 
      // to do need to check which database is being used
      switch (dataset.db_name) {
        case "gisdata":
          headerQuery = axios.get(
            `/api/?token=gisToken&query=SELECT name,definition,documentation FROM  gdb_items WHERE name = '${dataset.db_name}.mapc.${dataset.table_name}'`
          );
          break;
        case "towndata":
          headerQuery = axios.get(
            `/api/?token=townToken&query=SELECT name,definition,documentation FROM  gdb_items WHERE name = '${dataset.db_name}.mapc.${dataset.table_name}'`
          );
          break;
        default:
          headerQuery = axios.get(
            `/api/?token=testToken&query=SELECT * FROM ${dataset.db_name}.metadata.${dataset.table_name} ORDER BY orderid`
          );
      }

      if (dataset.schemaname === "tabular") {
        if (dataset.yearcolumn) {
          console.log("tabular");
          console.log(
            `${queryBase}?query=select distinct(${dataset.yearcolumn}) from ${
              dataset.schemaname
            }.${dataset.table_name} LIMIT 50&token=${
              queryToken[dataset.db_name]
            }`
          );

          const yearQuery = axios.get(
            `${queryBase}?query=select distinct(${dataset.yearcolumn}) from ${
              dataset.schemaname
            }.${dataset.table_name} LIMIT 50&token=${
              queryToken[dataset.db_name]
            }`
          );
          axios
            .all([yearQuery, tableQuery, headerQuery])
            .then((response) => {
              const yearResults = response[0];
              const tableResults = response[1];
              const metadata = Object.values(response[2].data);
              // Validate metadata structure
              const universeData = metadata.find(
                (row) => row.name === "universe"
              );
              const descriptionData = metadata.find(
                (row) => row.name === "descriptn"
              );

              this.setState({
                availableYears: yearResults.data.rows
                  .map((year) => Object.values(year)[0])
                  .sort()
                  .reverse(),
                rows: tableResults.data.rows,
                universe: universeData ? universeData.details : "",
                description: descriptionData ? descriptionData.details : "",
                columnKeys: metadata
                  .filter(
                    (object) =>
                      tableResults.data.rows[0] &&
                      Object.keys(tableResults.data.rows[0]).includes(
                        object.name
                      )
                  )
                  .filter((header) => header.name !== "seq_id"),
                metadata,
                selectedYears: [
                  yearResults.data.rows
                    .map((year) => Object.values(year)[0])
                    .sort()
                    .reverse()[0],
                ],
                table: dataset.table_name,
                schema: dataset.schemaname,
                database: dataset.db_name,
                title: dataset.menu3,
                source: dataset.source,
                queryYearColumn: dataset.yearcolumn,
                loading: false,
              });
            })
            .catch((error) => {
              this.setState({ loading: false, error: "Error loading dataset" });
              console.error("Error:", error);
            });
        } else {
          axios
            .all([tableQuery, headerQuery])
            .then((response) => {
              const tableResults = response[0];
              const metadata = Object.values(response[1].data)[0];
              // Validate metadata structure
              const universeData = metadata.find(
                (row) => row.name === "universe"
              );
              const descriptionData = metadata.find(
                (row) => row.name === "descriptn"
              );

              this.setState({
                rows: tableResults.data.rows,
                universe: universeData ? universeData.details : "",
                description: descriptionData ? descriptionData.details : "",
                columnKeys: metadata
                  .filter(
                    (object) =>
                      tableResults.data.rows[0] &&
                      Object.keys(tableResults.data.rows[0]).includes(
                        object.name
                      )
                  )
                  .filter((header) => header.name !== "seq_id"),
                metadata,
                table: dataset.table_name,
                schema: dataset.schemaname,
                database: dataset.db_name,
                title: dataset.menu3,
                source: dataset.source,
                queryYearColumn: dataset.yearcolumn,
                loading: false,
              });
            })
            .catch((error) => {
              this.setState({ loading: false, error: "Error loading dataset" });
              console.error("Error:", error);
            });
        }
      } else {
        axios
          .all([tableQuery, headerQuery])
          .then(async (response) => {
            const tableResults = response[0];

            try {
              const documentation = await parseXml(
                response[1].data[0].documentation
              );
              const definition = await parseXml(response[1].data[0].definition);
              const metadata = {
                documentation,
                definition,
              };
              const columns = Object.keys(tableResults.data.rows[0] || {});
              const sortedMetadata =
                metadata.documentation.metadata.eainfo.detailed.attr
                  .map((attribute) => ({
                    name: attribute.attrlabl,
                    alias: attribute.attalias,
                  }))
                  .filter((header) => columns.includes(header.name))
                  .filter((header) => header.name !== "shape");

              this.setState({
                rows: tableResults.data.rows,
                columnKeys: sortedMetadata,
                metadata,
                description:
                  metadata.documentation.metadata.dataIdInfo.idPurp || "",
                schema: dataset.schemaname,
                source: dataset.source,
                database: dataset.db_name,
                table: dataset.table_name,
                title: dataset.menu3,
                loading: false,
              });
            } catch (error) {
              this.setState({
                loading: false,
                error: "Error parsing metadata",
              });
              console.error("Error parsing metadata:", error);
            }
          })
          .catch((error) => {
            this.setState({ loading: false, error: "Error fetching datasets" });
            console.error("Error:", error);
          });
      }
    });
  }

  updateSelectedYears(e, year) {
    this.setState((prevState) => {
      if (prevState.selectedYears.includes(year)) {
        const index = prevState.selectedYears.indexOf(year);
        const front = prevState.selectedYears.slice(0, index);
        const back = prevState.selectedYears.slice(index + 1);
        const newArray = front.concat(back);
        return { selectedYears: newArray };
      }
      prevState.selectedYears.push(year);
      return { selectedYears: prevState.selectedYears };
    });
  }

  updatePage(e, action, numOfPages = 1) {
    this.setState((prevState) => {
      let updatedPage;
      if (action === "Forward") {
        updatedPage = prevState.currentPage + 1;
      } else if (action === "Backward") {
        updatedPage = prevState.currentPage - 1;
      } else if (action === "Beginning") {
        updatedPage = 1;
      } else if (action === "End") {
        updatedPage = numOfPages;
      }
      return { currentPage: updatedPage };
    });
  }

  render() {
    let pageContents;

    if (this.state.loading) {
      pageContents = (
        <div className="moonloader__wrapper">
          <MoonLoader
            size="56px"
            css={override}
            color="#767676"
            loading={this.state.loading}
          />
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
      pageContents = (
        <section className="datasets">
          <DatasetHeader
            availableYears={this.state.availableYears}
            database={this.state.database}
            description={this.state.description}
            metadata={this.state.metadata}
            queryYearColumn={this.state.queryYearColumn}
            schema={this.state.schema}
            selectedYears={this.state.selectedYears}
            source={this.state.source}
            table={this.state.table}
            title={this.state.title}
            updateSelectedYears={this.updateSelectedYears}
            universe={this.state.universe}
          />
          <DatasetTable
            currentPage={this.state.currentPage}
            columnKeys={this.state.columnKeys}
            rows={this.state.rows}
            queryYearColumn={this.state.queryYearColumn}
            selectedYears={this.state.selectedYears}
            updatePage={this.updatePage}
            metadata={this.state.metadata}
          />
        </section>
      );
    }

    return <>{pageContents}</>;
  }
}

const DataViewerPage = () => {
  const params = useParams();
  const dispatch = useDispatch();
  const datasets = useSelector((state) => state.dataset.cache);

  return (
    <DataViewerClass
      params={params}
      datasets={datasets}
      fetchDatasets={() => dispatch(fetchDatasets())}
    />
  );
};

export default DataViewerPage;

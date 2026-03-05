import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import Tab from "./Tab";
import Dropdown from "./field/Dropdown";
import MunicipalityPolygon from "./MunicipalityPolygon";
import tabs from "../constants/tabs";
import charts from "../constants/charts";
import descriptions from "../constants/descriptions";
import capitalize from "../utils/capitalize";
import { fetchChartData } from "../reducers/chartSlice";
import StackedBarChart from "../containers/visualizations/StackedBarChart";
import GroupedBarChart from "../containers/visualizations/GroupedBarChart";
import StackedAreaChart from "../containers/visualizations/StackedAreaChart";
import ChartDetails from "./visualizations/ChartDetails";
import PieChart from "../containers/visualizations/PieChart";
import LineChart from "../containers/visualizations/LineChart";
import GaugeChart from "../containers/visualizations/GaugeChart";
import DownloadAllChartsButton from "./field/DownloadAllChartsButton";
import DataTableModal from "./field/DataTableModal";
import { store } from "../store";

const CommunityProfilesView = ({ name, municipalFeature, muniSlug }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { muni, tab } = useParams();
  const [activeTab, setActiveTab] = useState(tab || "demographics");
  const [modalConfig, setModalConfig] = useState({
    show: false,
    data: null,
    title: "",
  });

  const handleShowModal = (data, title) => {
    setModalConfig({
      show: true,
      data,
      title,
    });
  };

  const handleCloseModal = () => {
    setModalConfig({
      show: false,
      data: null,
      title: "",
    });
  };

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (charts[activeTab]) {
      Object.values(charts[activeTab]).forEach((chart) => dispatch(fetchChartData({ chartInfo: chart, municipality: muni })));
    }
  }, [activeTab, muni, dispatch]);

  const handlePrintCharts = async () => {
    // Check if all chart data is already loaded
    const state = store.getState();
    const allTables = [];
    
    // Get all table names from charts
    Object.values(charts).forEach((category) => {
      Object.values(category).forEach((chartInfo) => {
        Object.keys(chartInfo.tables).forEach((tableName) => {
          allTables.push(tableName);
        });
      });
    });

    // Check if all data is already available
    const allDataLoaded = allTables.every((tableName) => {
      const data = state.chart.cache[tableName]?.[muni];
      return data && data.length > 0;
    });

    // Only fetch data if not all data is loaded
    if (!allDataLoaded) {
      const fetchPromises = [];
      
      Object.values(charts).forEach((category) => {
        Object.values(category).forEach((chartInfo) => {
          fetchPromises.push(
            dispatch(fetchChartData({ chartInfo: chartInfo, municipality: muni }))
          );
        });
      });

      // Wait for all data to be loaded
      await Promise.all(fetchPromises);
    }
    
    // Add print-specific CSS to show all tabs for printing
    const printStyle = document.createElement('style');
    printStyle.textContent = `
      @media print {
        .tab {
          display: block !important;
        }
        .tab:not(.active) {
          display: block !important;
        }
        .tabs {
          display: none !important;
        }
        .dropdown-wrapper {
          display: none !important;
        }
        .button-group {
          display: none !important;
        }
        .chart-wrapper .button-group {
          display: none !important;
        }
        .chart-wrapper button {
          display: none !important;
        }
        .tab__row {
          display: flex !important;
          flex-wrap: wrap !important;
        }
        .tab__row .chart-wrapper {
          width: 50% !important;
          box-sizing: border-box !important;
          padding: 0 10px !important;
        }
        .chart-wrapper svg {
          width: 100% !important;
          height: auto !important;
        }
        .tab__row--after-gauges {
          margin-top: 2.5em !important;
        }
      }
    `;
    document.head.appendChild(printStyle);
    
    // Small delay to ensure charts are rendered with data
    setTimeout(() => {
      window.print();
      // Clean up the print style after printing
      setTimeout(() => {
        document.head.removeChild(printStyle);
      }, 1000);
    }, 500);
  };

  return (
    <article className="component CommunityProfiles">
      <div className="page-header">
        <div className="container back-link">
          <Link to="/communities">{"< Back"}</Link>
        </div>
        <div className="container">
          <header>
            <h2>{capitalize(name)}</h2>
          </header>
          <section className="about">
            <div className="outline">
              <MunicipalityPolygon feature={municipalFeature} />
            </div>
            <div className="description-wrapper">
              <p className="description">{descriptions[muniSlug.toLowerCase()] || "No description available."}</p>
              <div className="button-group">
                <button onClick={handlePrintCharts} type="button" className="print-button">
                  Print charts
                </button>
                <DownloadAllChartsButton muni={muni} datatype={'municipality'} />
              </div>
            </div>
          </section>
        </div>
      </div>
      <div className="data">
        <div className="container tab-selection">
          <ul className="tabs">
            {tabs.map((tabItem) => (
              <li key={tabItem.value} className={tabItem.value === activeTab ? "active" : ""}>
                <Link to={`/profile/${muniSlug}/${tabItem.value}`} onClick={() => setActiveTab(tabItem.value)}>
                  {tabItem.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="dropdown-wrapper">
            <Dropdown
              value={activeTab}
              options={tabs}
              onChange={(e) => {
                const newTab = e.target.value;
                setActiveTab(newTab);
                navigate(`/profile/${muniSlug}/${newTab}`, { replace: true });
              }}
            />
          </div>
        </div>
        <div className="box">
          <div className="container">
            <Tab active={activeTab === "demographics"}>
              <header className="print-header">
                <h3>Demographics</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.demographics.race_ethnicity} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts.demographics.race_ethnicity} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts.demographics.pop_by_age} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts.demographics.pop_by_age} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "economy"}>
              <header className="print-header">
                <h3>Economy</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.economy.resident_employment} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts.economy.resident_employment} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts.economy.emp_by_sector} muni={muni} onViewData={handleShowModal}>
                  <StackedAreaChart chart={charts.economy.emp_by_sector} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "education"}>
              <header className="print-header">
                <h3>Education</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.education.school_enrollment} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts.education.school_enrollment} muni={muni} horizontal />
                </ChartDetails>
                <ChartDetails chart={charts.education.edu_attainment_by_race} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts.education.edu_attainment_by_race} muni={muni} horizontal wrapLeftLabel />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "governance"}>
              <header className="print-header">
                <h3>Governance</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.governance.tax_levy} muni={muni} onViewData={handleShowModal}>
                  <PieChart chart={charts.governance.tax_levy} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "environment"}>
              <header className="print-header">
                <h3>Environment</h3>
              </header>
              <div className="tab__row tab__row--break">
                <ChartDetails chart={charts.environment.water_usage_per_cap} muni={muni} onViewData={handleShowModal}>
                  <LineChart chart={charts.environment.water_usage_per_cap} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts.environment.energy_usage_gas} muni={muni} onViewData={handleShowModal}>
                  <StackedAreaChart chart={charts.environment.energy_usage_gas} muni={muni} />
                </ChartDetails>
              </div>
              <div className="tab__row">
                <ChartDetails chart={charts.environment.energy_usage_electricity} muni={muni} onViewData={handleShowModal}>
                  <StackedAreaChart chart={charts.environment.energy_usage_electricity} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "housing"}>
              <header className="print-header">
                <h3>Housing</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.housing.cost_burden} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts.housing.cost_burden} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts.housing.units_permitted} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts.housing.units_permitted} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "public-health"}>
              <header className="print-header">
                <h3>Public Health</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts["public-health"].premature_mortality_rate} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts["public-health"].premature_mortality_rate} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts["public-health"].hospitalizations} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts["public-health"].hospitalizations} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "transportation"}>
              <header className="print-header">
                <h3>Transportation</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.transportation.daily_vmt} muni={muni} onViewData={handleShowModal}>
                  <StackedAreaChart chart={charts.transportation.daily_vmt} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts.transportation.commute_to_work} muni={muni} onViewData={handleShowModal}>
                  <PieChart chart={charts.transportation.commute_to_work} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "digital-equity"}>
              <header className="print-header">
                <h3>Digital Equity</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts["digital-equity"].no_computer_access} muni={muni} onViewData={handleShowModal}>
                  <GaugeChart chart={charts["digital-equity"].no_computer_access} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts["digital-equity"].internet_access} muni={muni} onViewData={handleShowModal}>
                  <GaugeChart chart={charts["digital-equity"].internet_access} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts["digital-equity"].smartphone_only} muni={muni} onViewData={handleShowModal}>
                  <GaugeChart chart={charts["digital-equity"].smartphone_only} muni={muni} />
                </ChartDetails>
              </div>
              <div className="tab__row tab__row--after-gauges">
                <ChartDetails chart={charts["digital-equity"].internet_usage_by_income} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts["digital-equity"].internet_usage_by_income} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts["digital-equity"].internet_subscription_types} muni={muni} onViewData={handleShowModal}>
                  <GroupedBarChart chart={charts["digital-equity"].internet_subscription_types} muni={muni} />
                </ChartDetails>
              </div>
              <div className="tab__row digital-equity-map">
                <div className="chart-wrapper" style={{ maxWidth: "100%", flex: "0 0 100%" }}>
                  <div className="chart-body">
                    <iframe
                      title="Digital Equity Map"
                      src="https://experience.arcgis.com/experience/a7122a3c5c2d4b62a4ac63f3eee3f79e/"
                      width="100%"
                      height="600"
                      style={{ border: "none" }}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </Tab>
          </div>
        </div>
      </div>

      <DataTableModal show={modalConfig.show} handleClose={handleCloseModal} data={modalConfig.data} title={modalConfig.title} muni={muni} />
    </article>
  );
};

export default CommunityProfilesView;

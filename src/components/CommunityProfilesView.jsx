import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import StackedAreaChart from "../containers/visualizations/StackedAreaChart";
import ChartDetails from "./visualizations/ChartDetails";
import PieChart from "../containers/visualizations/PieChart";
import LineChart from "../containers/visualizations/LineChart";
import DownloadAllChartsButton from './field/DownloadAllChartsButton';
import DataTableModal from './field/DataTableModal';

const CommunityProfilesView = ({ name, municipalFeature, muniSlug }) => {
  const dispatch = useDispatch();
  const { muni, tab } = useParams();
  const [activeTab, setActiveTab] = useState(tab || 'demographics');
  const [modalConfig, setModalConfig] = useState({
    show: false,
    data: null,
    title: ''
  });

  const handleShowModal = (data, title) => {
    setModalConfig({
      show: true,
      data,
      title
    });
  };

  const handleCloseModal = () => {
    setModalConfig({
      show: false,
      data: null,
      title: ''
    });
  };

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (charts[activeTab]) {
      Object.values(charts[activeTab]).forEach((chart) =>
        dispatch(fetchChartData({ chartInfo: chart, municipality: muni }))
      );
    } 
  }, [activeTab, muni, dispatch]);

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
              <p className="description">
                {descriptions[muniSlug.toLowerCase()] ||
                  "No description available."}
              </p>
              <div className="button-group">
                <button
                  onClick={() => window.print()}
                  type="button"
                  className="print-button"
                >
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
              <li 
                key={tabItem.value} 
                className={tabItem.value === activeTab ? "active" : ""}
              >
                <Link 
                  to={`/profile/${muniSlug}/${tabItem.value}`}
                  onClick={() => setActiveTab(tabItem.value)}
                >
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
                setActiveTab(e.target.value);
                dispatch(
                  fetchChartData({ 
                    chartInfo: charts[e.target.value], 
                    municipality: muni 
                  })
                );
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
                <ChartDetails 
                  chart={charts.demographics.race_ethnicity} 
                  muni={muni}
                  onViewData={handleShowModal}
                >
                  <StackedBarChart
                    chart={charts.demographics.race_ethnicity}
                    muni={muni}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts.demographics.pop_by_age} 
                  muni={muni}
                  onViewData={handleShowModal}
                >
                  <StackedBarChart
                    chart={charts.demographics.pop_by_age}
                    muni={muni}
                  />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "economy"}>
              <header className="print-header">
                <h3>Economy</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.economy.resident_employment} muni={muni}  onViewData={handleShowModal}>
                  <StackedBarChart
                    chart={charts.economy.resident_employment}
                    muni={muni}
                  />
                </ChartDetails>
                <ChartDetails chart={charts.economy.emp_by_sector} muni={muni} onViewData={handleShowModal}>
                  <StackedAreaChart
                    chart={charts.economy.emp_by_sector}
                    muni={muni}
                  />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "education"}>
              <header className="print-header">
                <h3>Education</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.education.school_enrollment} muni={muni}  onViewData={handleShowModal}>
                  <StackedBarChart
                    chart={charts.education.school_enrollment}
                    muni={muni}
                    horizontal
                  />
                </ChartDetails>
                <ChartDetails chart={charts.education.edu_attainment_by_race} muni={muni}  onViewData={handleShowModal}>
                  <StackedBarChart
                    chart={charts.education.edu_attainment_by_race}
                    muni={muni}
                    horizontal
                    wrapLeftLabel
                  />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "governance"}>
              <header className="print-header">
                <h3>Governance</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.governance.tax_levy} muni={muni}  onViewData={handleShowModal}>
                  <PieChart chart={charts.governance.tax_levy} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "environment"}>
              <header className="print-header">
                <h3>Environment</h3>
              </header>
              <div className="tab__row tab__row--break">
                <ChartDetails chart={charts.environment.water_usage_per_cap} muni={muni}  onViewData={handleShowModal}>
                  <LineChart
                    chart={charts.environment.water_usage_per_cap}
                    muni={muni}
                  />
                </ChartDetails>
                <ChartDetails chart={charts.environment.energy_usage_gas} muni={muni}  onViewData={handleShowModal}>
                  <StackedAreaChart
                    chart={charts.environment.energy_usage_gas}
                    muni={muni}
                  />
                </ChartDetails>
              </div>
              <div className="tab__row">
                <ChartDetails chart={charts.environment.energy_usage_electricity} muni={muni}  onViewData={handleShowModal}>
                  <StackedAreaChart
                    chart={charts.environment.energy_usage_electricity}
                    muni={muni}
                  />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "housing"}>
              <header className="print-header">
                <h3>Housing</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.housing.cost_burden} muni={muni}  onViewData={handleShowModal}>
                  <StackedBarChart
                    chart={charts.housing.cost_burden}
                    muni={muni}
                  />
                </ChartDetails>
                <ChartDetails chart={charts.housing.units_permitted} muni={muni}  onViewData={handleShowModal}  >
                  <StackedBarChart
                    chart={charts.housing.units_permitted}
                    muni={muni}
                  />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "public-health"}>
              <header className="print-header">
                <h3>Public Health</h3>
              </header>
              <div className="tab__row">
                <ChartDetails
                  chart={charts["public-health"].premature_mortality_rate}
                  muni={muni}
                  onViewData={handleShowModal}
                >
                  <StackedBarChart
                    chart={charts["public-health"].premature_mortality_rate}
                    muni={muni}
                  />
                </ChartDetails>
                <ChartDetails chart={charts["public-health"].hospitalizations} muni={muni}  onViewData={handleShowModal}>
                  <StackedBarChart
                    chart={charts["public-health"].hospitalizations}
                    muni={muni}
                  />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "transportation"}>
              <header className="print-header">
                <h3>Transportation</h3>
              </header>
              <div className="tab__row">
                <ChartDetails chart={charts.transportation.daily_vmt} muni={muni} onViewData={handleShowModal}>
                  <StackedAreaChart
                    chart={charts.transportation.daily_vmt}
                    muni={muni}
                  />
                </ChartDetails>
                <ChartDetails chart={charts.transportation.commute_to_work} muni={muni} onViewData={handleShowModal}>
                  <PieChart
                    chart={charts.transportation.commute_to_work}
                    muni={muni}
                  />
                </ChartDetails>
              </div>
            </Tab>
          </div>
        </div>
      </div>

      <DataTableModal
        show={modalConfig.show}
        handleClose={handleCloseModal}
        data={modalConfig.data}
        title={modalConfig.title}
        muni={muni}
      />
    </article>
  );
};

export default CommunityProfilesView;

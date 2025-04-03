import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import styled from 'styled-components';
import Tab from "./Tab";
import Dropdown from "./field/Dropdown";
import tabs from "../constants/tabs";
import charts from "../constants/charts";
import { fetchSubregionChartData, fetchSubregionData, selectSubregionData } from "../reducers/subregionSlice";
import StackedBarChart from "../containers/visualizations/StackedBarChart";
import StackedAreaChart from "../containers/visualizations/StackedAreaChart";
import ChartDetails from "./visualizations/ChartDetails";
import PieChart from "../containers/visualizations/PieChart";
import LineChart from "../containers/visualizations/LineChart";
import DownloadAllChartsButton from './field/DownloadAllChartsButton';
import DataTableModal from './field/DataTableModal';

// Styled Components
const MunicipalitiesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 1rem;
  margin-bottom: 1rem;
  height: 100px;
  overflow-y: auto;
  padding: 10px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const MunicipalitiesRow = styled.div`
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
  width: 100%;
  min-height: 35px;
`;

const MunicipalityLinkWrapper = styled.div`
  flex: 0 0 calc((100% - 72px) / 10); /* (100% - (9 * 8px gaps)) / 10 items */
  min-width: 90px;
`;

const StyledLink = styled(Link)`
  color: #0066cc;
  text-decoration: none;
  padding: 6px 24px 6px 8px;
  border-radius: 4px;
  background-color: #f5f5f5;
  font-size: 13px;
  white-space: nowrap;
  border: 1px solid #e0e0e0;
  transition: all 0.2s ease;
  text-align: center;
  width: 100%;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;

  &::after {
    content: "↗";
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    opacity: 0.7;
  }

  &:hover {
    background-color: #e5e5e5;
    text-decoration: underline;
    border-color: #ccc;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    
    &::after {
      opacity: 1;
    }
  }
`;

const SUBREGIONS = {
  355: 'Inner Core Committee [ICC]',
  356: 'Minuteman Advisory Group on Interlocal Coordination [MAGIC]',
  357: 'MetroWest Regional Collaborative [MWRC]',
  358: 'North Shore Task Force [NSTF]',
  359: 'North Suburban Planning Council [NSPC]',
  360: 'South Shore Coalition [SSC]',
  361: 'South West Advisory Planning Committee [SWAP]',
  362: 'Three Rivers Interlocal Council [TRIC]'
};

const chunkArray = (array, size) => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

const SubregionProfilesView = () => {
  const dispatch = useDispatch();
  const { subregionId, tab } = useParams();
  const [activeTab, setActiveTab] = useState(tab || 'demographics');
  const [modalConfig, setModalConfig] = useState({
    show: false,
    data: null,
    title: ''
  });

  const subregionData = useSelector(selectSubregionData);
  const municipalities = subregionData[subregionId]?.municipalities || [];

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  // Effect for fetching subregion data
  useEffect(() => {
    dispatch(fetchSubregionData());
  }, [dispatch]);

  // Effect for fetching chart data
  useEffect(() => {
    if (charts[activeTab]) {
      Object.values(charts[activeTab]).forEach((chart) =>
        dispatch(fetchSubregionChartData({ subregionId: subregionId, chartInfo: chart }))
      );
    } 
  }, [activeTab, subregionId, dispatch]);

    
 
  const handleShowModal = (data, title) =>{
    setModalConfig({
      show: true,
      data: data,
      title: `${title} (Aggregated)`
    });
  }

  const handleCloseModal = () => {
    setModalConfig({
      show: false,
      data: null,
      title: ''
    });
  };

  if (!subregionId || !SUBREGIONS[subregionId]) {
    return <div>Subregion not found</div>;
  }

  return (
    <article className="component CommunityProfiles">
      <div className="page-header">
        <div className="container back-link">
          <Link to="/communities">{"< Back"}</Link>
        </div>
        <div className="container">
          <header>
            <h2>{SUBREGIONS[subregionId]}</h2>
          </header>
          <section className="about">
            <div className="description-wrapper">
              <p className="description">
                This subregion contains {municipalities.length} municipalities. The charts below show aggregated data for all municipalities in this subregion.
              </p>
              <MunicipalitiesList>
                {chunkArray(municipalities, 10).map((row, rowIndex) => (
                  <MunicipalitiesRow key={rowIndex}>
                    {row.map(muni => (
                      <MunicipalityLinkWrapper key={muni.muni_id}>
                        <StyledLink 
                          to={`/profile/${muni.muni_name.toLowerCase().replace(/\s+/g, '-')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {muni.muni_name}
                        </StyledLink>
                      </MunicipalityLinkWrapper>
                    ))}
                  </MunicipalitiesRow>
                ))}
              </MunicipalitiesList>
              <div className="button-group">
                <button
                  onClick={() => window.print()}
                  type="button"
                  className="print-button"
                >
                  Print charts
                </button>
                <DownloadAllChartsButton muni={subregionId} isSubregion />
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
                  to={`/profile/subregion/${subregionId}/${tabItem.value}`}
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
              onChange={(e) => setActiveTab(e.target.value)}
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
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts.demographics.race_ethnicity}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts.demographics.pop_by_age} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts.demographics.pop_by_age}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
              </div>
            </Tab>

            <Tab active={activeTab === "economy"}>
              <header className="print-header">
                <h3>Economy</h3>
              </header>
              <div className="tab__row">
                <ChartDetails 
                  chart={charts.economy.resident_employment} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts.economy.resident_employment}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts.economy.emp_by_sector} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedAreaChart
                    chart={charts.economy.emp_by_sector}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
              </div>
            </Tab>

            <Tab active={activeTab === "education"}>
              <header className="print-header">
                <h3>Education</h3>
              </header>
              <div className="tab__row">
                <ChartDetails 
                  chart={charts.education.school_enrollment} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts.education.school_enrollment}
                    muni={subregionId}
                    horizontal={true}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts.education.edu_attainment_by_race} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts.education.edu_attainment_by_race}
                    muni={subregionId}
                    horizontal={true}
                    wrapLeftLabel={true}
                    isSubregion={true}
                  />
                </ChartDetails>
              </div>
            </Tab>

            <Tab active={activeTab === "governance"}>
              <header className="print-header">
                <h3>Governance</h3>
              </header>
              <div className="tab__row">
                <ChartDetails 
                  chart={charts.governance.tax_levy} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <PieChart 
                    chart={charts.governance.tax_levy} 
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
              </div>
            </Tab>

            <Tab active={activeTab === "environment"}>
              <header className="print-header">
                <h3>Environment</h3>
              </header>
              <div className="tab__row tab__row--break">
                <ChartDetails 
                  chart={charts.environment.water_usage_per_cap} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <LineChart
                    chart={charts.environment.water_usage_per_cap}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts.environment.energy_usage_gas} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedAreaChart
                    chart={charts.environment.energy_usage_gas}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
              </div>
              <div className="tab__row">
                <ChartDetails 
                  chart={charts.environment.energy_usage_electricity} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedAreaChart
                    chart={charts.environment.energy_usage_electricity}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
              </div>
            </Tab>

            <Tab active={activeTab === "housing"}>
              <header className="print-header">
                <h3>Housing</h3>
              </header>
              <div className="tab__row">
                <ChartDetails 
                  chart={charts.housing.cost_burden} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts.housing.cost_burden}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts.housing.units_permitted} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts.housing.units_permitted}
                    muni={subregionId}
                    isSubregion={true}
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
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts["public-health"].premature_mortality_rate}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts["public-health"].hospitalizations} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart
                    chart={charts["public-health"].hospitalizations}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
              </div>
            </Tab>

            <Tab active={activeTab === "transportation"}>
              <header className="print-header">
                <h3>Transportation</h3>
              </header>
              <div className="tab__row">
                <ChartDetails 
                  chart={charts.transportation.daily_vmt} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedAreaChart
                    chart={charts.transportation.daily_vmt}
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts.transportation.commute_to_work} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <PieChart
                    chart={charts.transportation.commute_to_work}
                    muni={subregionId}
                    isSubregion={true}
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
        muni={subregionId}
        isSubregion={true}
      />
    </article>
  );
};

export default React.memo(SubregionProfilesView); 
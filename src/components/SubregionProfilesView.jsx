import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import styled, { createGlobalStyle } from 'styled-components';
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
import GaugeChart from "../containers/visualizations/GaugeChart";
import GroupedBarChart from "../containers/visualizations/GroupedBarChart";
import DownloadAllChartsButton from './field/DownloadAllChartsButton';
import DataTableModal from './field/DataTableModal';

// Global Print Styles
const PrintStyles = createGlobalStyle`
  @media print {
    .hide-on-print {
      display: none !important;
    }
    
    .chart-details-buttons {
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
      max-width: 100% !important;
      height: auto !important;
    }
  }
`;

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

  @media print {
    height: auto;
    overflow: visible;
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
  padding: 6px 18px 6px 8px;
  border-radius: 4px;
  background-color: #f5f5f5;
  font-size: 12px;
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
    right: 3px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 9px;
    opacity: 0.5;
  }

  &:hover {
    background-color: #e5e5e5;
    text-decoration: underline;
    border-color: #ccc;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    
    &::after {
      opacity: 0.8;
    }
  }

  @media print {
    &::after {
      display: none;
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
  const availableTabs = tabs;
  const sanitizeTab = (value) =>
    value ? value : "demographics";
  const [activeTab, setActiveTab] = useState(sanitizeTab(tab));
  const [modalConfig, setModalConfig] = useState({
    show: false,
    data: null,
    title: '',
    tableKey: ''
  });

  const subregionData = useSelector(selectSubregionData);
  const subregionCache = useSelector(state => state.subregion.cache);
  const municipalities = subregionData[subregionId]?.municipalities || [];
  
  const subregionName = SUBREGIONS[subregionId] || subregionId;

  useEffect(() => {
    setActiveTab(sanitizeTab(tab));
  }, [tab]);

  // Effect for fetching chart data
  useEffect(() => {
    if (charts[activeTab]) {
      Object.values(charts[activeTab]).forEach((chart) =>
        dispatch(fetchSubregionChartData({ subregionId: subregionId, chartInfo: chart }))
      );
    } 
  }, [activeTab, subregionId, dispatch]);

  const handleShowModal = (data, title, tableKey = '') => {
    setModalConfig({
      show: true,
      data: data,
      title: `${title} (Aggregated)`,
      tableKey,
    });
  }

  const handleCloseModal = () => {
    setModalConfig({
      show: false,
      data: null,
      title: '',
      tableKey: ''
    });
  };

  const handlePrint = async () => {
    // Get all charts for all tabs
    const allTabs = Object.keys(charts);
    const allCharts = [];
    
    allTabs.forEach(tabKey => {
      if (charts[tabKey]) {
        Object.values(charts[tabKey]).forEach(chart => {
          allCharts.push(chart);
        });
      }
    });

    // Dispatch fetch for all charts
    const promises = allCharts.map(chart => 
      dispatch(fetchSubregionChartData({ subregionId: subregionId, chartInfo: chart }))
    );

    // Wait for all data to load
    await Promise.all(promises);

    // Small delay to ensure rendering is complete
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <>
      <PrintStyles />
      <article className="component CommunityProfiles">
        <div className="page-header">
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
                  onClick={handlePrint}
                  type="button"
                  className="print-button"
                >
                  Print charts
                </button>
                <div className="hide-on-print">
                  <DownloadAllChartsButton 
                    muni={subregionId} 
                    datatype={'subregion'}
                    displayName={subregionName}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="data">
        <div className="container tab-selection">
          <ul className="tabs">
            {availableTabs.map((tabItem) => (
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
              options={availableTabs}
              onChange={(e) => setActiveTab(sanitizeTab(e.target.value))}
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
                  <GroupedBarChart
                    chart={charts.education.edu_attainment_by_race}
                    muni={subregionId}
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
                  <GroupedBarChart
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
            <Tab active={activeTab === "digital-equity"}>
              <header className="print-header">
                <h3>Digital Equity</h3>
              </header>
              <div className="tab__row">
                <ChartDetails 
                  chart={charts["digital-equity"].no_computer_access} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <GaugeChart 
                    chart={charts["digital-equity"].no_computer_access} 
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts["digital-equity"].internet_access} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <GaugeChart 
                    chart={charts["digital-equity"].internet_access} 
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts["digital-equity"].smartphone_only} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <GaugeChart 
                    chart={charts["digital-equity"].smartphone_only} 
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
              </div>
              <div className="tab__row">
                <ChartDetails 
                  chart={charts["digital-equity"].internet_usage_by_income} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <StackedBarChart 
                    chart={charts["digital-equity"].internet_usage_by_income} 
                    muni={subregionId}
                    isSubregion={true}
                  />
                </ChartDetails>
                <ChartDetails 
                  chart={charts["digital-equity"].internet_subscription_types} 
                  muni={subregionId}
                  onViewData={handleShowModal}
                  isSubregion={true}
                >
                  <GroupedBarChart 
                    chart={charts["digital-equity"].internet_subscription_types} 
                    muni={subregionId}
                    isSubregion={true}
                  />
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
              <div className="tab__row digital-equity-resources">
                <div className="chart-wrapper" style={{ maxWidth: "100%", flex: "0 0 100%" }}>
                  <div className="digital-equity-resources__content">
                    <h4 className="digital-equity-resources__title">Additional Digital Equity Resources</h4>
                    <ul className="digital-equity-resources__list">
                      <li>
                        <a
                          href="https://broadband.masstech.org/internetforall"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          MBI Internet for All MA Digital Equity Plan
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://broadbandmap.fcc.gov/data-download/nationwide-data?version=jun2025&pubDataVer=jun2025"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          FCC Broadband Serviceable Locations (BSL) Data
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://broadband.masstech.org/municipal"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Municipal Digital Equity Plans
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://www.digitalinclusion.org/research-data/"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          National Digital Inclusion Alliance Data and Research
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
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
          tableKey={modalConfig.tableKey}
          isSubregion={true}
        />
      </article>
    </>
  );
};

export default React.memo(SubregionProfilesView); 
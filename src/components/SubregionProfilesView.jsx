import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Tab from "./Tab";
import Dropdown from "./field/Dropdown";
import tabs from "../constants/tabs";
import charts from "../constants/charts";
import { selectSubregionData, selectMunicipalitiesBySubregion, selectSubregionChartData, fetchMissingMunicipalityData } from "../reducers/subregionSlice";
import StackedBarChart from "../containers/visualizations/StackedBarChart";
import StackedAreaChart from "../containers/visualizations/StackedAreaChart";
import ChartDetails from "./visualizations/ChartDetails";
import PieChart from "../containers/visualizations/PieChart";
import LineChart from "../containers/visualizations/LineChart";
import DownloadAllChartsButton from './field/DownloadAllChartsButton';
import DataTableModal from './field/DataTableModal';
import { createSelector } from '@reduxjs/toolkit';

const styles = {
  municipalitiesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '1rem',
    marginBottom: '1rem'
  },
  municipalityLink: {
    color: '#0066cc',
    textDecoration: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5',
    fontSize: '14px',
    '&:hover': {
      backgroundColor: '#e5e5e5',
      textDecoration: 'underline'
    }
  }
};

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

// Create base selectors
const selectChartState = state => state.chart.cache;
const selectSubregionState = state => state.subregion.data;

// Create memoized selector for chart data
const makeChartDataSelector = (activeTab, subregionId) => createSelector(
  [selectChartState, selectSubregionState],
  (chartCache, subregionData) => {
    if (!charts[activeTab]) {
      return {};
    }

    // Create stable reference for each table's data
    return Object.values(charts[activeTab]).reduce((acc, chart) => {
      const tableName = Object.keys(chart.tables)[0];
      if (!acc[tableName]) {
        acc[tableName] = [];
      }
      return acc;
    }, {});
  }
);

const SubregionProfilesView = () => {
  const dispatch = useDispatch();
  const { subregionId, tab } = useParams();
  const [activeTab, setActiveTab] = useState(tab || 'demographics');
  const [modalConfig, setModalConfig] = useState({
    show: false,
    data: null,
    title: ''
  });

  // Create memoized selector instance
  const chartDataSelector = React.useMemo(
    () => makeChartDataSelector(activeTab, subregionId),
    [activeTab, subregionId]
  );

  // Use memoized selector
  const municipalityData = useSelector(chartDataSelector);

  const municipalities = useSelector(
    state => state.subregion.data[subregionId]?.municipalities || []
  );

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  // Effect for fetching municipality data
  useEffect(() => {
    if (!charts[activeTab] || !municipalities.length) return;

    Object.values(charts[activeTab]).forEach((chart) => {
      dispatch(fetchMissingMunicipalityData({ 
        chartInfo: chart, 
        municipalities,
        subregionId,
        tableName: Object.keys(chart.tables)[0]
      }));
    });
  }, [activeTab, municipalities, subregionId, dispatch]);
 
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

  const renderCharts = () => {
    if (!charts[activeTab]) return null;
    
    return Object.entries(charts[activeTab]).map(([key, chart]) => {
      let ChartComponent;
      switch (chart.type) {
        case 'stacked-bar':
          ChartComponent = StackedBarChart;
          break;
        case 'stacked-area':
          ChartComponent = StackedAreaChart;
          break;
        case 'pie':
          ChartComponent = PieChart;
          break;
        case 'line':
          ChartComponent = LineChart;
          break;
        default:
          ChartComponent = StackedBarChart;
      }
     
      return (
        <ChartDetails 
          key={key}
          chart={chart}
          muni={subregionId}
          onViewData={handleShowModal}
          isSubregion={true}
        >
          <ChartComponent
            chart={chart}
            muni={SUBREGIONS[subregionId]}
            horizontal={chart.horizontal}
            isSubregion={true}
          />
        </ChartDetails>
      );
    });
  };

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
              <div style={styles.municipalitiesList}>
                {municipalities.map(muni => (
                  <Link 
                    key={muni.muni_id} 
                    to={`/profile/${muni.muni_name.toLowerCase().replace(/\s+/g, '-')}`}
                    style={styles.municipalityLink}
                  >
                    {muni.muni_name}
                  </Link>
                ))}
              </div>
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
            {tabs.map((tabItem) => (
              <Tab key={tabItem.value} active={activeTab === tabItem.value}>
                <header className="print-header">
                  <h3>{tabItem.label}</h3>
                </header>
                <div className="tab__row">
                  {activeTab === tabItem.value && renderCharts()}
                </div>
              </Tab>
            ))}
          </div>
        </div>
      </div>

      <DataTableModal
        show={modalConfig.show}
        handleClose={handleCloseModal}
        data={modalConfig.data}
        title={modalConfig.title}
        muni={subregionId}
        isSubregion
      />
    </article>
  );
};

export default React.memo(SubregionProfilesView); 
import { useEffect, useState } from "react";
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
import InternetSpeedTest from "./visualizations/InternetSpeedTest";
import StackedBarChart from "../containers/visualizations/StackedBarChart";
import GroupedBarChart from "../containers/visualizations/GroupedBarChart";
import StackedAreaChart from "../containers/visualizations/StackedAreaChart";
import ChartDetails from "./visualizations/ChartDetails";
import PieChart from "../containers/visualizations/PieChart";
import LineChart from "../containers/visualizations/LineChart";
import GaugeChart from "../containers/visualizations/GaugeChart";
import MultiGaugeChart from "../containers/visualizations/MultiGaugeChart";
import ProfileMetricChart from "../containers/visualizations/ProfileMetricChart";
import TreeMap from "../containers/visualizations/TreeMap";
import MunicipalFinanceOverridesMap from "./visualizations/MunicipalFinanceOverridesMap";
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
    tableKey: "",
  });

  const handleShowModal = (data, title, tableKey = "") => {
    setModalConfig({
      show: true,
      data,
      title,
      tableKey,
    });
  };

  const handleCloseModal = () => {
    setModalConfig({
      show: false,
      data: null,
      title: "",
      tableKey: "",
    });
  };

  const getChartsForTab = (tabKey) => {
    const tabConfig = charts[tabKey];
    if (!tabConfig) return [];
    // Most tabs are a map of charts; some may be a single chart object.
    if (tabConfig.tables) return [tabConfig];
    return Object.values(tabConfig).filter((chartConfig) => chartConfig?.tables);
  };

  const getAllChartConfigs = () =>
    Object.values(charts).flatMap((tabConfig) => {
      if (!tabConfig || typeof tabConfig !== "object") return [];
      if (tabConfig.tables) return [tabConfig];
      return Object.values(tabConfig).filter((chartConfig) => chartConfig?.tables);
    });

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    getChartsForTab(activeTab).forEach((chart) => dispatch(fetchChartData({ chartInfo: chart, municipality: muni })));
  }, [activeTab, muni, dispatch]);

  const handlePrintCharts = async () => {
    // Check if all chart data is already loaded
    const state = store.getState();
    const allTables = [];
    
    // Get all table names from charts
    getAllChartConfigs().forEach((chartInfo) => {
      Object.keys(chartInfo.tables).forEach((tableName) => {
        allTables.push(tableName);
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
      
      getAllChartConfigs().forEach((chartInfo) => {
        fetchPromises.push(
          dispatch(fetchChartData({ chartInfo, municipality: muni }))
        );
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
        .digital-equity-speed-stats .chart-details-buttons {
          display: none !important;
        }
        .digital-equity-speed-stats button {
          display: none !important;
        }
        .digital-equity-speed-stats-row--nodata {
          display: none !important;
        }
        /* Hide additional resource link blocks on print */
        .tab__row.digital-equity-resources,
        .tab__row.digital-equity-resources *,
        .tab__row.municipal-finances-resources,
        .tab__row.municipal-finances-resources * {
          display: none !important;
        }
        /* Hide any chart panels that only show "Data not available." */
        .chart-wrapper:has(.missing-data) {
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
        .chart-wrapper:not(.chart-wrapper--stat-tile) svg {
          width: 100% !important;
          height: auto !important;
        }
        .chart-wrapper--stat-tile {
          width: 33.333% !important;
          max-width: 33.333% !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .chart-wrapper--stat-tile svg {
          display: none !important;
        }
        .chart-wrapper--stat-tile .profile-metric__panel {
          min-height: 0 !important;
          padding: 0.5rem 0.75rem !important;
          box-shadow: none !important;
        }
        /* Treemap needs full row in print or it gets clipped. */
        .tab__row .chart-wrapper:has(.chart.TreeMap) {
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .chart.TreeMap .svg-wrapper,
        .chart.TreeMap svg {
          overflow: visible !important;
        }
        .chart.TreeMap,
        .chart.TreeMap * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .chart.TreeMap > div:last-child {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 0.5rem 0.75rem !important;
          color: #111 !important;
        }
        .chart.TreeMap > div:last-child span[aria-hidden] {
          border: 1px solid rgba(0, 0, 0, 0.25) !important;
        }
        .tab__row--after-gauges {
          margin-top: 2.5em !important;
        }
        /* Municipal finance profile metrics: compact stat cards for print */
        .ProfileMetricChart .profile-metric__label {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
        }
        .ProfileMetricChart .profile-metric__value {
          font-size: 1rem !important;
          line-height: 1.25 !important;
          font-weight: 700 !important;
        }
        .ProfileMetricChart .profile-metric__empty {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
        }
        .chart-wrapper--stat-tile .profile-metric__stat-header {
          margin-bottom: 1rem !important;
        }
        .chart-wrapper--stat-tile .metadata {
          margin-top: 1rem !important;
        }
        .chart.TreeMap .treemap-legend {
          margin-top: 1rem !important;
        }
        /* Hide municipal finance override map on print */
        .tab__row--full-width-map {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printStyle);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.head.removeChild(printStyle);
      }, 1000);
    }, 500);
  };

  return (
    <article className="component CommunityProfiles">
      <div className="page-header">
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
                <DownloadAllChartsButton muni={muni} datatype={'municipality'} displayName={name} />
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
              <InternetSpeedTest municipalityName={name} onViewData={handleShowModal} />
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
                  <GroupedBarChart chart={charts.education.edu_attainment_by_race} muni={muni} />
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
                  <GroupedBarChart chart={charts.housing.cost_burden} muni={muni} />
                </ChartDetails>
                <ChartDetails chart={charts.housing.units_permitted} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts.housing.units_permitted} muni={muni} />
                </ChartDetails>
              </div>
            </Tab>
            <Tab active={activeTab === "municipal-finance"}>
              <header className="print-header">
                <h3>Municipal Finance</h3>
              </header>
              <div className="tab__row">
                <ChartDetails
                  chart={charts["municipal-finance"].levy_share_gauge}
                  muni={muni}
                  onViewData={handleShowModal}
                >
                  <MultiGaugeChart chart={charts["municipal-finance"].levy_share_gauge} muni={muni} />
                </ChartDetails>
                {/* TODO: add this back in when we understand what from the data needs to be displayed */}
                {/* <ChartDetails
                  chart={charts["municipal-finance"].levy_ceiling_gauge}
                  muni={muni}
                  onViewData={handleShowModal}
                >
                  <MultiGaugeChart chart={charts["municipal-finance"].levy_ceiling_gauge} muni={muni} />
                </ChartDetails> */}
                {/* TODO: add this back in when we understand what from the data needs to be displayed */}
                {/* <ChartDetails
                  chart={charts["municipal-finance"].levy_new_growth_gauge}
                  muni={muni}
                  onViewData={handleShowModal}
                >
                  <MultiGaugeChart chart={charts["municipal-finance"].levy_new_growth_gauge} muni={muni} />
                </ChartDetails> */}
              </div>
              <div className="tab__row">
                <ChartDetails chart={charts["municipal-finance"].overrides_win_loss_bar} muni={muni} onViewData={handleShowModal}>
                  <StackedBarChart chart={charts["municipal-finance"].overrides_win_loss_bar} muni={muni} />
                </ChartDetails>
              </div>
              <div className="tab__row">
                <ChartDetails
                  chart={charts["municipal-finance"].bond_rating_sp}
                  muni={muni}
                  onViewData={handleShowModal}
                  wrapperClassName="chart-wrapper--stat-tile"
                >
                  <ProfileMetricChart chart={charts["municipal-finance"].bond_rating_sp} muni={muni} />
                </ChartDetails>
                <ChartDetails
                  chart={charts["municipal-finance"].cpa_annual_spending}
                  muni={muni}
                  onViewData={handleShowModal}
                  wrapperClassName="chart-wrapper--stat-tile"
                >
                  <ProfileMetricChart chart={charts["municipal-finance"].cpa_annual_spending} muni={muni} />
                </ChartDetails>
                <ChartDetails
                  chart={charts["municipal-finance"].total_employees_finance}
                  muni={muni}
                  onViewData={handleShowModal}
                  wrapperClassName="chart-wrapper--stat-tile"
                >
                  <ProfileMetricChart chart={charts["municipal-finance"].total_employees_finance} muni={muni} />
                </ChartDetails>
              </div>
              <div className="tab__row">
                <ChartDetails
                  chart={charts["municipal-finance"].fund_revenue}
                  muni={muni}
                  onViewData={handleShowModal}
                  wrapperClassName="chart-wrapper--fund-revenue-breakdown"
                >
                  <TreeMap chart={charts["municipal-finance"].fund_revenue} muni={muni} />
                </ChartDetails>
              </div>
              <div className="tab__row tab__row--full-width-map">
                <MunicipalFinanceOverridesMap
                  config={charts["municipal-finance"].overrides_map_config}
                  municipalFeature={municipalFeature}
                />
              </div>
              <div className="tab__row municipal-finances-resources">
                <div className="chart-wrapper" style={{ maxWidth: "100%", flex: "0 0 100%" }}>
                  <div className="municipal-finances-resources__content">
                    <h4 className="municipal-finances-resources__title">Additional Municipal Finance Resources</h4>
                    <ul className="municipal-finances-resources__list">
                      <li>
                        <a
                          href="https://dlstab.dor.state.ma.us/views/TrendsinBudgetedGeneralFundRevenue/BudgetedGFRevenue?:embed=y&:isGuestRedirectFromVizportal=y"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          DLS data dashboard
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://www.mma.org/resources/a-perfect-storm-cities-and-towns-face-historic-fiscal-pressures/"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          A Perfect Storm: Cities and Towns Face Historic Fiscal Pressures (MMA)
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
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
          </div>
        </div>
      </div>

      <DataTableModal
        show={modalConfig.show}
        handleClose={handleCloseModal}
        data={modalConfig.data}
        title={modalConfig.title}
        muni={muni}
        tableKey={modalConfig.tableKey}
      />
    </article>
  );
};

export default CommunityProfilesView;

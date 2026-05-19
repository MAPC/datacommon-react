import PropTypes from "prop-types";
import MoonLoader from "react-spinners/MoonLoader";

/**
 * Single highlighted value for community profile tabs (non-percent metrics).
 * Pairs with ChartDetails like GaugeChart; data comes from chart.transformer.
 */
export default function ProfileMetricChart({ title, displayValue, hasData, isLoading }) {
  return (
    <div className="component chart ProfileMetricChart">
      <div className="profile-metric__panel profile-metric__panel--stat-card">
        {title ? (
          <div className="profile-metric__stat-header">
            <span className="profile-metric__label">{title}</span>
          </div>
        ) : null}
        <div className="profile-metric__body">
          {isLoading && !hasData ? (
            <div className="profile-metric__loader">
              <MoonLoader size={28} color="#767676" />
            </div>
          ) : null}
          {hasData ? <p className="profile-metric__value">{displayValue}</p> : null}
          {!isLoading && !hasData ? <p className="profile-metric__empty">Data not available.</p> : null}
        </div>
      </div>
    </div>
  );
}

ProfileMetricChart.propTypes = {
  title: PropTypes.string,
  displayValue: PropTypes.string,
  hasData: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

ProfileMetricChart.defaultProps = {
  title: "",
  displayValue: "",
};

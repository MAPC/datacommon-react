import PropTypes from "prop-types";
import MoonLoader from "react-spinners/MoonLoader";

const PageLoader = ({ message }) => (
  <div className="page-loader" role="status" aria-live="polite">
    <MoonLoader size={48} color="#1F4E46" />
    <span className="page-loader__message">{message}</span>
  </div>
);

PageLoader.propTypes = {
  message: PropTypes.string,
};

PageLoader.defaultProps = {
  message: "Loading…",
};

export default PageLoader;

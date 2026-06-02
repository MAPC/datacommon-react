import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function DatasetTableContextMenu({ menu, onClose }) {
  if (!menu) return null;

  const handleAction = (action) => {
    action();
    onClose();
  };

  return (
    <>
      <button
        type="button"
        className="dataset-table-context-menu__backdrop"
        aria-label="Close menu"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="dataset-table-context-menu"
        style={{ top: menu.y, left: menu.x }}
        role="menu"
      >
        {menu.items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="menuitem"
            className="dataset-table-context-menu__item"
            onClick={() => handleAction(item.onSelect)}
          >
            {item.icon ? (
              <span className="dataset-table-context-menu__icon" aria-hidden>
                <FontAwesomeIcon icon={item.icon} size="sm" />
              </span>
            ) : null}
            <span className="dataset-table-context-menu__label">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

DatasetTableContextMenu.propTypes = {
  menu: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        icon: PropTypes.object,
        onSelect: PropTypes.func.isRequired,
      }),
    ).isRequired,
  }),
  onClose: PropTypes.func.isRequired,
};

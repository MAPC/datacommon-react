import PropTypes from "prop-types";

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
        {menu.items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className="dataset-table-context-menu__item"
            onClick={() => handleAction(item.onSelect)}
          >
            {item.label}
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
        onSelect: PropTypes.func.isRequired,
      }),
    ).isRequired,
  }),
  onClose: PropTypes.func.isRequired,
};

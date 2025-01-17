import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import icons from "../constants/categories";
import { prioritized } from '../constants/categories';

const CategoryGrid = () => {
  const categories = useSelector(state => {
    const prioritizedCategories = [...prioritized.keys()];
    const categoryPool = [...state.dataset.categories];
    const selectedCategories = [];
    const maxCategories = 10;

    const categoriesRemainIn = pool => pool.length !== 0 && selectedCategories.length < maxCategories;

    while (categoriesRemainIn(prioritizedCategories)) {
      const priority = prioritizedCategories.shift();

      categoryPool.some((category, i) => {
        if (category === priority) {
          selectedCategories.push(category);
          categoryPool.splice(i, 1);
          return true;
        }
      });
    }

    while (categoriesRemainIn(categoryPool)) {
      selectedCategories.push(categoryPool.shift());
    }

    return selectedCategories;
  });

  const renderCategories = useMemo(() => {
    return categories.map((category) => (
      <li key={category} className="lift">
        <a href={`/browser/${category}`} className="category-link">
          <div className="category-image">
            <img
              src={icons[category] || icons["default"]}
              alt={`Icon for ${category}`}
              className="category-icon"
            />
          </div>
          <span className="category-title">{category}</span>
        </a>
      </li>
    ));
  }, [categories]);

  return (
    <div className="page-section">
      <ul className="component CategoryGrid grid-list">{renderCategories}</ul>
    </div>
  );
};

CategoryGrid.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.string),
};

export default CategoryGrid;

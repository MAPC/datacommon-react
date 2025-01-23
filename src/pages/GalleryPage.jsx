import React, { useState } from 'react';
import YearNav from '../components/gallery/YearNav';
import CalendarGrid from '../components/gallery/CalendarGrid';

const GalleryPage = () => {
  const [selectedYear, setSelectedYear] = useState(2021);

  const changeYear = (clickedYear) => {
    const newSelectedYear = document.getElementById(clickedYear.fullYear);
    const oldSelectedYear = document.getElementById(selectedYear);

    if (newSelectedYear === oldSelectedYear) {
      return;
    }

    newSelectedYear.className = 'year-navigation__year year-navigation__year--selected';
    oldSelectedYear.className = 'year-navigation__year';
    setSelectedYear(parseInt(clickedYear.fullYear, 10));
  };

  const mobileChangeYear = (event) => {
    setSelectedYear(parseInt(event.target.value, 10));
  };

  return (
    <>
      <YearNav
        selectedYear={selectedYear}
        changeYear={changeYear}
        mobileChangeYear={mobileChangeYear}
      />
      <CalendarGrid
        selectedYear={selectedYear}
      />
    </>
  );
};

export default GalleryPage;
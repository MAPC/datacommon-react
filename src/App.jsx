import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  const location = useLocation();
  const hideSiteChrome = new URLSearchParams(location.search).get("embed") === "1";
  const isEmbedMap =
    hideSiteChrome &&
    ((location.pathname || "").endsWith("/map") || location.pathname?.includes("/map"));
  const isExploreMap = location.pathname === "/explore";

  return (
    <section className={`component App${hideSiteChrome ? " App--embed" : ""}${isEmbedMap ? " App--embed-map" : ""}${isExploreMap ? " App--explore" : ""}`}>
      {!hideSiteChrome && <Header />}
      <main>
        <Outlet />
      </main>
      {!hideSiteChrome && !isExploreMap && <Footer />}
    </section>
  )
}

export default App

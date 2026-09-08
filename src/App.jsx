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

  return (
    <section className={`component App${hideSiteChrome ? " App--embed" : ""}${isEmbedMap ? " App--embed-map" : ""}`}>
      {!hideSiteChrome && <Header />}
      <main>
        <Outlet />
      </main>
      {!hideSiteChrome && <Footer />}
    </section>
  )
}

export default App

import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  const location = useLocation();
  const hideSiteChrome = new URLSearchParams(location.search).get("embed") === "1";

  return (
    <section className="component App">
      {!hideSiteChrome && <Header />}
      <main>
        <Outlet />
      </main>
      {!hideSiteChrome && <Footer />}
    </section>
  )
}

export default App

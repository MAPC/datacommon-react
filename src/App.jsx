import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  return (
    <section className="component App">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </section>
  )
}

export default App

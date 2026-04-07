import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import IntroModal from './components/IntroModal'

function App() {
  return (
    <section className="component App">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <IntroModal />
    </section>
  )
}

export default App

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import App from './App'
import Home from "./pages/HomePage"
import BrowserPage from "./pages/BrowserPage"
import DataViewerPage from "./pages/DataViewerPage"
import store from './store'
/* import './index.css' */
import '../src/assets/styles/app.scss'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'browser',
        children: [
          {
            index: true,
            element: <BrowserPage />
          },
          {
            path: ':menuOneSelectedItem',
            element: <BrowserPage />
          },
          {
            path: ':menuOneSelectedItem/:menuTwoSelectedItem',
            element: <BrowserPage />
          },
          {
            path: 'datasets/:id',
            element: <DataViewerPage />
          }
        ]
      }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
)

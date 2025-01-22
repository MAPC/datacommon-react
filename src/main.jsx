import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider, useParams, Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/HomePage";
import BrowserPage from "./pages/BrowserPage";
import DataViewerPage from "./pages/DataViewerPage";
import CommunitySelectorPage from "./pages/CommunitySelectorPage";
import store from "./store";
import "../src/assets/styles/app.scss";
import CommunityProfilesPage from "./pages/CommunityProfilesPage";
import tabs from "./constants/tabs";
import municipalities from "./assets/data/ma-munis.json";

// Create arrays of valid options
const muniOptions = municipalities.features.map(
  feature => feature.properties.town.toLowerCase().replace(/\s+/g, '-')
);

const tabOptions = tabs.map(tab => tab.value);

const ProfileRoute = ({ muniOptions, tabOptions }) => {
  const { muni, tab } = useParams();
  
  if (!muniOptions.includes(muni)) {
    return <Navigate to="/" />;
  }
  
  if (!tab || !tabOptions.includes(tab)) {
    return <Navigate to={`/profile/${muni}/${tabOptions[0]}`} />;
  }
  
  return <CommunityProfilesPage muni={muni} tab={tab} />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "browser",
        children: [
          {
            index: true,
            element: <BrowserPage />,
          },
          {
            path: ":menuOneSelectedItem",
            element: <BrowserPage />,
          },
          {
            path: ":menuOneSelectedItem/:menuTwoSelectedItem",
            element: <BrowserPage />,
          },
          {
            path: "datasets/:id",
            element: <DataViewerPage />,
          },
        ],
      },
      {
        path: "communities",
        element: <CommunitySelectorPage />,
      },
      {
        path: "/profile/:muni/:tab?",
        element: <ProfileRoute muniOptions={muniOptions} tabOptions={tabOptions} />
      }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);

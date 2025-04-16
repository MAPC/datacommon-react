import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider, useParams, Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/HomePage";
import BrowserPage from "./pages/BrowserPage";
import DataViewerPage from "./pages/DataViewerPage";
import CommunitySelectorPage from "./pages/CommunitySelectorPage";
import GalleryPage from "./pages/GalleryPage";
import CalenderEntry from "./components/gallery/CalendarEntry";
import store from "./store";
import "../src/assets/styles/app.scss";
import CommunityProfilesPage from "./pages/CommunityProfilesPage";
import SubregionProfilesPage from "./pages/SubregionProfilesPage";
import RPAregionProfilesPage from "./pages/RPAregionProfilesPage";
import tabs from "./constants/tabs";
import municipalities from "./assets/data/ma-munis.json";

// Create arrays of valid options
const muniOptions = municipalities.features.map(
  feature => feature.properties.town.toLowerCase().replace(/\s+/g, '-')
);

const tabOptions = tabs.map(tab => tab.value);
// todo: get this from the api ? 
const VALID_SUBREGIONS = ['355', '356', '357', '358', '359', '360', '361', '362'];

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

const SubregionProfileRoute = ({ tabOptions }) => {
  const { subregionId, tab } = useParams();
  
  if (!VALID_SUBREGIONS.includes(subregionId)) {
    return <Navigate to="/" />;
  }
  
  if (!tab || !tabOptions.includes(tab)) {
    return <Navigate to={`/profile/subregion/${subregionId}/${tabOptions[0]}`} />;
  }
  
  if (!subregionId || !VALID_SUBREGIONS.includes(subregionId)) {
    return <div>Subregion not found</div>;
  }
  
  return <SubregionProfilesPage />;
};

const RPAProfileRoute = ({ tabOptions }) => {
  const { rpaId, tab } = useParams();
  
  if (!tab || !tabOptions.includes(tab)) {
    return <Navigate to={`/profile/rpa/${rpaId}/${tabOptions[0]}`} />;
  }
  
  if(!rpaId) {
    return <div>RPA not found</div>;
  }

  return <RPAregionProfilesPage />;
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
      },
      {
        path: "/profile/subregion/:subregionId/:tab?",
        element: <SubregionProfileRoute tabOptions={tabOptions} />
      },
      {
        path: "/profile/rpa/:rpaId/:tab?",
        element: <RPAProfileRoute tabOptions={tabOptions} />
      },
      {
        path:"gallery",
        children:[
          {
            index:true,
            element:<GalleryPage />
          },
          {
            path:":year/:month",
            element:<CalenderEntry />
          }
        ]
      },
      {
        path:"/calendar/:year/:month",
        element:<CalenderEntry />
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

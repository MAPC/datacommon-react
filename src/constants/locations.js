// TODO: Add a new location for the new API
const locations = {
  development: {
    HOST: "https://localhost:1234",
    BROWSER_API: "/api",
  },

  staging: {
    HOST: "https://staging.datacommon.mapc.org",
    BROWSER_API: "/api",
  },

  production: {
    HOST: "https://datacommon.mapc.org",
    BROWSER_API: "/api",
  },
};

export default locations[process.env.NODE_ENV];

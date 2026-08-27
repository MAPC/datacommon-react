export const MAP_CONFIG = {
  style: "mapbox://styles/ihill/ckeucj9gy9vt319qm4dxcn73l",
  // bounds are used for the community profiles muni picker view
  bounds: [
    [-74.0081481933594, 41.1863288879395],
    [-69.8615341186523, 42.8867149353027],
  ],
  // center and zoom are used for the maps within a community profile
  center: [-71.5, 42.08],
  zoom: 6.9,
  padding: { top: 30, left: 300, right: 30, bottom: 30 },
  navigationControl: {
    showCompass: false,
    showZoom: true,
    visualizePitch: false,
    position: 'bottom-right'
  }
};

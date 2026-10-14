export const setupMouseEvents = (map, muniPoly, toProfile) => {
  map.on("mousemove", "hover-fill", (e) => {
    if (!e.features.length) return;
    
    const feature = e.features[0];
    map.getCanvas().style.cursor = "pointer";

    if (!muniPoly?.features) {
      console.warn("Municipality data not available");
      return;
    }

    const hoveredFeature = muniPoly.features.find(
      (f) => f.properties.town.toLowerCase() === feature.properties.town.toLowerCase()
    );

    if (hoveredFeature) {
      const selection = {
        type: "FeatureCollection",
        features: [hoveredFeature],
      };
      map.getSource("ma-fill")?.setData(selection);
      map.getSource("ma-selection-line")?.setData(selection);
    }
  });

  map.on("mouseleave", "hover-fill", () => {
    map.getCanvas().style.cursor = "";
    const empty = {
      type: "FeatureCollection",
      features: [],
    };
    map.getSource("ma-fill")?.setData(empty);
    map.getSource("ma-selection-line")?.setData(empty);
  });

  map.on("click", "hover-fill", (e) => {
    if (e.features.length && toProfile) {
      const muniName = e.features[0].properties.town
        .toLowerCase()
        .replace(/\s+/g, "-");
      toProfile(muniName);
    }
  });
}; 
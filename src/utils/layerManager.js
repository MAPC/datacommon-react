import colors from "../constants/colors";

const layerIdFor = (layer) => layer.id || `ma-${layer.type}`;

const defaultPaintFor = (layer) => (
  layer.type === "fill"
    ? {
        "fill-color": colors.BRAND.PRIMARY,
        "fill-opacity": 0.7,
      }
    : {
        "line-color": colors.BRAND.PRIMARY,
        "line-width": 1,
      }
);

export const addMapLayer = (map, layer) => {
  if (!layer) return;
  const layerId = layerIdFor(layer);
  if (map.getSource(layerId)) return;

  map.addSource(layerId, {
    type: "geojson",
    data: layer.geojson,
    generateId: true,
  });

  map.addLayer({
    id: layerId,
    type: layer.type,
    source: layerId,
    paint: {
      ...defaultPaintFor(layer),
      ...(layer.paint || {}),
    },
  });
};

export const updateMapLayers = (map, layers) => {
  layers.forEach((layer) => {
    if (!layer) return;

    const layerId = layerIdFor(layer);
    const source = map.getSource(layerId);
    if (source) {
      source.setData(layer.geojson);
      if (layer.paint && map.getLayer(layerId)) {
        Object.entries(layer.paint).forEach(([key, value]) => {
          map.setPaintProperty(layerId, key, value);
        });
      }
    } else {
      addMapLayer(map, layer);
    }
  });
};
import React from "react";
import PropTypes from "prop-types";
import mapboxgl from 'mapbox-gl';
import { MAP_CONFIG } from '../constants/mapConfig';
import { setupMouseEvents } from '../utils/mapEventHandlers';
import { addMapLayer, updateMapLayers } from '../utils/layerManager';
import mapcRegions from "../assets/data/mapc-regions.json";
import colors from "../constants/colors";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_TOKEN;

const boundsFromGeojson = (geojson) => {
  const bounds = new mapboxgl.LngLatBounds();
  const walk = (value) => {
    if (!Array.isArray(value) || value.length === 0) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      bounds.extend(value);
      return;
    }
    value.forEach(walk);
  };
  (geojson?.features || []).forEach((feature) => walk(feature.geometry?.coordinates));
  return bounds.isEmpty() ? null : bounds;
};

class MapBox extends React.Component {
  state = {
    finishedLoading: false,
    showMAPCRegions: true,
  };

  componentDidMount() {
    this.initializeMap();
    this.resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(this.resizeFitTimer);
      this.resizeFitTimer = window.setTimeout(() => this.fitToFocus({ animate: false }), 80);
    });
    if (this.mapContainer) {
      this.resizeObserver.observe(this.mapContainer);
    }
  }

  componentDidUpdate() {
    this.handleLayerUpdates();
    this.syncMapcRegionVisibility();
    const nextFocus = this.getFocusTownsKey();
    if (nextFocus !== this.focusTownsKey) {
      this.focusTownsKey = nextFocus;
      this.fitToFocus({ animate: Boolean(nextFocus) });
    }
  }

  componentWillUnmount() {
    window.clearTimeout(this.resizeFitTimer);
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  getFitPadding() {
    return this.props.fitPadding || MAP_CONFIG.padding;
  }

  getStateBounds() {
    return boundsFromGeojson(this.props.muniPoly) || MAP_CONFIG.bounds;
  }

  getFocusTownsKey() {
    return (this.props.focusTowns || [])
      .map((name) => String(name || "").toLowerCase().trim())
      .filter(Boolean)
      .sort()
      .join("|");
  }

  getFocusBounds() {
    const towns = new Set(
      (this.props.focusTowns || []).map((name) => String(name || "").toUpperCase()),
    );
    if (!towns.size) return this.getStateBounds();
    const focusGeojson = {
      type: "FeatureCollection",
      features: (this.props.muniPoly?.features || []).filter((feature) =>
        towns.has(feature.properties.town),
      ),
    };
    return boundsFromGeojson(focusGeojson) || this.getStateBounds();
  }

  fitToState() {
    this.fitToFocus({ animate: false, lockMinZoom: true });
  }

  fitToFocus({ animate = false, lockMinZoom = false } = {}) {
    if (!this.map || !this.mapContainer) return;
    const { width, height } = this.mapContainer.getBoundingClientRect();
    if (width < 40 || height < 40) return;

    this.map.resize();
    if (lockMinZoom) this.map.setMinZoom(0);
    this.map.fitBounds(this.getFocusBounds(), {
      padding: this.getFitPadding(),
      animate,
      duration: animate ? 900 : 0,
      maxZoom: 11,
    });
    if (lockMinZoom) {
      const fittedZoom = this.map.getZoom();
      if (Number.isFinite(fittedZoom)) {
        this.statewideMinZoom = fittedZoom;
        this.map.setMinZoom(fittedZoom);
      }
    } else if (Number.isFinite(this.statewideMinZoom)) {
      this.map.setMinZoom(this.statewideMinZoom);
    }
  }

  initializeMap() {
    const { layers, muniPoly, toProfile, fitPadding, focusTowns, ...mapProps } = this.props;
    this.focusTownsKey = this.getFocusTownsKey();
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: MAP_CONFIG.style,
      dragPan: true,
      dragRotate: false,
      ...mapProps,
    });

    this.fitToState();

    this.map.addControl(
      new mapboxgl.NavigationControl(MAP_CONFIG.navigationControl),
      MAP_CONFIG.navigationControl.position
    );

    this.map.on("load", () => this.onMapLoad());
  }

  onMapLoad() {
    this.fitToState();
    this.initializeHoverLayer();
    this.initializeMAPCRegions();
    
    if (this.props.layers) {
      this.props.layers.forEach(layer => addMapLayer(this.map, layer));
    }

    setupMouseEvents(this.map, this.props.muniPoly, this.props.toProfile);
    this.setState({ finishedLoading: true });
  }

  initializeHoverLayer() {
    if (!this.props.muniPoly) return;

    this.map.addSource("hover-fill", {
      type: "geojson",
      data: this.props.muniPoly,
    });

    this.map.addLayer({
      id: "hover-fill",
      type: "fill",
      source: "hover-fill",
      paint: {
        "fill-color": colors.BRAND.PRIMARY,
        "fill-opacity": 0,
      },
    });

    const popup = new mapboxgl.Popup({
			closeButton: false,
			closeOnClick: false
		});

		this.map.on('mousemove', 'hover-fill', (e) => {
			// Change the cursor style as a UI indicator.
			this.map.getCanvas().style.cursor = 'pointer';

			// Single out the first found feature.
			var feature = e.features[0];

			// Display a popup with the name of the municipality
			popup.setLngLat(e.lngLat)
				.setText(feature.properties.town.toLowerCase().replace(/\b\w/g, s => s.toUpperCase()))
				.addTo(this.map);
		});

		this.map.on('mouseleave', 'hover-fill', () => {
			this.map.getCanvas().style.cursor = '';
			popup.remove();
		});
  }

  initializeMAPCRegions() {
    this.map.addSource("mapc-region", {
      type: "geojson",
      data: mapcRegions,
    });

    this.map.addLayer({
      id: "mapc-region-line",
      type: "fill",
      source: "mapc-region",
      layout: { visibility: "visible" },
      paint: {
        "fill-color": "#006400",
        "fill-opacity": 0.7,
      },
    });
    this.syncMapcRegionVisibility();
  }

  syncMapcRegionVisibility() {
    if (!this.map?.getLayer("mapc-region-line")) return;
    const hideForFocus = Boolean(this.getFocusTownsKey());
    const visible = this.state.showMAPCRegions && !hideForFocus;
    this.map.setLayoutProperty(
      "mapc-region-line",
      "visibility",
      visible ? "visible" : "none",
    );
  }

  handleLayerUpdates() {
    if (this.state.finishedLoading && this.props.layers) {
      updateMapLayers(this.map, this.props.layers);
    }
  }

  toggleLayer = () => {
    this.setState(
      prevState => ({
        showMAPCRegions: !prevState.showMAPCRegions,
      }),
      () => this.syncMapcRegionVisibility(),
    );
  };

  render() {
    return (
      <section className="component MapBox">
        <div className="map-controls">
          <div className="toggle-container">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={this.state.showMAPCRegions}
                onChange={this.toggleLayer}
              />
              <span className="slider"></span>
            </label>
            <div className="slider-text">Show MAPC region</div>
          </div>
        </div>
        <div 
          className="map-layer" 
          ref={el => (this.mapContainer = el)} 
        />
      </section>
    );
  }
}

MapBox.propTypes = {
  style: PropTypes.string,
  center: PropTypes.arrayOf(PropTypes.number),
  maxBounds: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  zoom: PropTypes.number,
  minZoom: PropTypes.number,
  maxZoom: PropTypes.number,
  layers: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      geojson: PropTypes.object.isRequired,
    })
  ),
  muniPoly: PropTypes.object,
  toProfile: PropTypes.func,
  focusTowns: PropTypes.arrayOf(PropTypes.string),
  fitPadding: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
  }),
};

export default MapBox;

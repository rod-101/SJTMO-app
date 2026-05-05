import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ points, radius, blur, maxZoom, max }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !map.getContainer()) return;

    const layer = L.heatLayer([], {
      radius,
      blur,
      maxZoom,
      max,
      gradient: { 0.2: "#2196f3", 0.5: "#ff9800", 0.8: "#f44336", 1.0: "#b71c1c" },
    });

    // Patch _redraw so it silently bails if the map is already gone
    const originalRedraw = layer._redraw.bind(layer);
    layer._redraw = function () {
      if (!this._map || !this._map.getContainer()) return;
      originalRedraw();
    };

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layerRef.current = null;
      if (map && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Sync options when sliders change
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.setOptions({ radius, blur, maxZoom, max });
  }, [radius, blur, maxZoom, max]);

  // Sync data when filtered violations change
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.setLatLngs(points);
  }, [points]);

  return null;
}

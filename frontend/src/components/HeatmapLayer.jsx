import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ points, radius, blur, maxZoom, max }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    // Create layer on first render
    if (!layerRef.current) {
      layerRef.current = L.heatLayer([], {
        radius,
        blur,
        maxZoom,
        max,
        gradient: { 0.2: "#2196f3", 0.5: "#ff9800", 0.8: "#f44336", 1.0: "#b71c1c" },
      }).addTo(map);
    }
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
    // only on mount/unmount — options are applied separately below
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

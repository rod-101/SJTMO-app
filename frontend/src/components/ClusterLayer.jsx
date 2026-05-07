import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { getIcon } from "../utils/mapIcons";

// ── Cluster icon ─────────────────────────────────────────────

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  let size, bg, ring;

  if (count < 10) {
    size = 36; bg = "#2e7d32"; ring = "rgba(46,125,50,0.28)";
  } else if (count < 30) {
    size = 44; bg = "#f57c00"; ring = "rgba(245,124,0,0.28)";
  } else {
    size = 52; bg = "#c62828"; ring = "rgba(198,40,40,0.28)";
  }

  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border:3px solid #fff;
      box-shadow:0 0 0 4px ${ring},0 2px 10px rgba(0,0,0,0.22);
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:800;
      font-size:${count >= 100 ? "0.62rem" : "0.82rem"};
      font-family:'Segoe UI',system-ui,sans-serif;
      line-height:1;
    ">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── Popup HTML ───────────────────────────────────────────────

const STATUS_COLORS = {
  pending:   "#e65100",
  paid:      "#1565c0",
  resolved:  "#2e7d32",
  dismissed: "#757575",
  disputed:  "#6a1b9a",
  overdue:   "#b71c1c",
};

function buildPopupHTML(v) {
  const types = v.violation_type
    ? v.violation_type.split(",").map((t) => t.trim())
    : [];

  const chips = types
    .map(
      (t) =>
        `<span style="background:#eeeaff;color:#140c7e;padding:2px 7px;
          border-radius:10px;font-size:0.72rem;font-weight:700;
          border:1px solid #c5c0f0;white-space:nowrap">${t}</span>`,
    )
    .join("");

  const ticket = v.ticket_no
    ? `<div style="font-family:monospace;font-size:0.7rem;font-weight:700;
        color:#140c7e;background:#ede9fe;border:1px solid #c4b5fd;
        border-radius:4px;padding:2px 7px;margin-bottom:8px;display:inline-block">
        ${v.ticket_no}</div>`
    : "";

  const date = new Date(v.date_issued).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });

  const statusColor = STATUS_COLORS[v.status] || "#555";

  const notes = v.notes
    ? `<div style="margin-top:6px;color:#555;font-style:italic;font-size:0.78rem;
        border-top:1px solid #eee;padding-top:6px">${v.notes}</div>`
    : "";

  return `
    <div style="min-width:200px;font-family:'Segoe UI',system-ui,sans-serif">
      ${ticket}
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px">${chips}</div>
      <div style="font-size:0.82rem;line-height:1.8">
        <div><strong>Motorist:</strong> ${v.motorist_name}</div>
        <div><strong>Enforcer:</strong> ${v.enforcer_name}</div>
        <div><strong>Date:</strong> ${date}</div>
        <div><strong>Status:</strong>
          <span style="color:${statusColor};font-weight:700;text-transform:capitalize">
            ${v.status}
          </span>
        </div>
        ${notes}
      </div>
    </div>`;
}

// ── Component ────────────────────────────────────────────────

export default function ClusterLayer({ violations, onSelectViolation }) {
  const map = useMap();
  const groupRef = useRef(null);

  useEffect(() => {
    groupRef.current = L.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction: createClusterIcon,
      showCoverageOnHover: false,
      animate: true,
      animateAddingMarkers: false,
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
    }).addTo(map);

    return () => {
      if (groupRef.current) {
        map.removeLayer(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [map]);

  // Sync markers whenever violations change
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.clearLayers();

    violations.forEach((v) => {
      const marker = L.marker(
        [parseFloat(v.latitude), parseFloat(v.longitude)],
        { icon: getIcon(v.violation_type) },
      );
      marker.bindPopup(buildPopupHTML(v), { maxWidth: 260 });
      groupRef.current.addLayer(marker);
    });
  }, [violations]);

  return null;
}

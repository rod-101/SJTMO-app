import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { getIcon, iconColors_export } from "../../utils/mapIcons";
import "../../App.css";

// Vite-compatible ES imports for Leaflet default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const COLOR_MAP = {
  green: "#4caf50",
  blue: "#2196f3",
  red: "#f44336",
  orange: "#ff9800",
  yellow: "#ffeb3b",
  violet: "#9c27b0",
  grey: "#9e9e9e",
};

const LEGEND = [
  { type: "No Helmet", color: "green" },
  { type: "Illegal Parking", color: "blue" },
  { type: "No License", color: "red" },
  { type: "Reckless Driving", color: "orange" },
  { type: "Beating Red Light", color: "yellow" },
  { type: "Obstruction", color: "violet" },
  { type: "Other", color: "grey" },
];

// Default center: San Jose, Occidental Mindoro, Philippines
const DEFAULT_CENTER = [12.3547, 121.0694];

export default function ViolationMap({ violations }) {
  const withCoords = violations.filter((v) => v.latitude && v.longitude);

  return (
    <div>
      {/* Legend */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">
          🗺️ Violation Map — {withCoords.length} pins
        </div>
        <div className="map-legend">
          {LEGEND.map(({ type, color }) => (
            <div key={type} className="legend-item">
              <div
                className="legend-dot"
                style={{ background: COLOR_MAP[color] || "#9e9e9e" }}
              />
              <span style={{ fontSize: "0.8rem" }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          style={{ height: 480, width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((v) => {
            const typeList = v.violation_type
              ? v.violation_type.split(",").map((t) => t.trim())
              : [];
            return (
              <Marker
                key={v.id}
                position={[parseFloat(v.latitude), parseFloat(v.longitude)]}
                icon={getIcon(v.violation_type)}
              >
                <Popup>
                  <div style={{ minWidth: 190 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 3,
                        marginBottom: 8,
                      }}
                    >
                      {typeList.map((t, i) => (
                        <span
                          key={i}
                          style={{
                            background: "#eeeaff",
                            color: "#140c7e",
                            padding: "2px 7px",
                            borderRadius: 10,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            border: "1px solid #c5c0f0",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.82rem", lineHeight: 1.7 }}>
                      <div>
                        <strong>Motorist:</strong> {v.motorist_name}
                      </div>
                      <div>
                        <strong>Enforcer:</strong> {v.enforcer_name}
                      </div>
                      <div>
                        <strong>Date:</strong>{" "}
                        {new Date(v.date_issued).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <span
                          style={{
                            color:
                              v.status === "resolved"
                                ? "#2e7d32"
                                : v.status === "dismissed"
                                  ? "#757575"
                                  : "#e65100",
                            fontWeight: 600,
                          }}
                        >
                          {v.status}
                        </span>
                      </div>
                      {v.notes && (
                        <div
                          style={{
                            marginTop: 6,
                            color: "#555",
                            fontStyle: "italic",
                          }}
                        >
                          {v.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {withCoords.length === 0 && (
        <div className="empty-state" style={{ marginTop: 16 }}>
          <div className="empty-state-icon">📍</div>
          <div className="empty-state-text">
            No violations with GPS coordinates yet
          </div>
        </div>
      )}
    </div>
  );
}

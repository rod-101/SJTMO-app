import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { getIcon } from "../../utils/mapIcons";
import "../../App.css";

export default function ViolationDetail({ violation: v, onClose }) {
  const hasLocation = v.latitude && v.longitude;

  const statusColor =
    {
      pending: "#e65100",
      resolved: "#2e7d32",
      dismissed: "#757575",
    }[v.status] || "#666";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Violation Details</div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Status Banner */}
        <div
          style={{
            background:
              v.status === "resolved"
                ? "#e8f5e9"
                : v.status === "dismissed"
                  ? "#f5f5f5"
                  : "#fff3e0",
            border: `1px solid ${v.status === "resolved" ? "#c8e6c9" : v.status === "dismissed" ? "#e0e0e0" : "#ffe0b2"}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: statusColor,
              textTransform: "capitalize",
            }}
          >
            {v.status === "pending"
              ? "⚠️ Pending"
              : v.status === "resolved"
                ? "✅ Resolved"
                : "🚫 Dismissed"}
          </span>
          <span style={{ fontSize: "0.8rem", color: "#666" }}>
            {new Date(v.date_issued).toLocaleString()}
          </span>
        </div>

        {/* Details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <DetailRow label="Violation" value={v.violation_type} highlight />
          <DetailRow label="Motorist" value={v.motorist_name} />
          <DetailRow label="Issued By" value={v.enforcer_name} />
          <DetailRow
            label="Date"
            value={new Date(v.date_issued).toLocaleDateString()}
          />
          {v.notes && <DetailRow label="Notes" value={v.notes} />}
          {hasLocation && (
            <DetailRow
              label="Location"
              value={`${parseFloat(v.latitude).toFixed(5)}, ${parseFloat(v.longitude).toFixed(5)}`}
            />
          )}
        </div>

        {/* Mini Map */}
        {hasLocation && (
          <div
            style={{
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 16,
              border: "1px solid #e0e0e0",
            }}
          >
            <MapContainer
              center={[parseFloat(v.latitude), parseFloat(v.longitude)]}
              zoom={15}
              style={{ height: 200 }}
              zoomControl={false}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Marker
                position={[parseFloat(v.latitude), parseFloat(v.longitude)]}
                icon={getIcon(v.violation_type)}
              >
                <Popup>{v.violation_type}</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        <button className="btn btn-outline btn-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div
        style={{
          width: 90,
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#999",
          textTransform: "uppercase",
          letterSpacing: "0.3px",
          paddingTop: 2,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: highlight ? "1rem" : "0.9rem",
          fontWeight: highlight ? 700 : 400,
          color: highlight ? "#1a237e" : "#333",
          flex: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

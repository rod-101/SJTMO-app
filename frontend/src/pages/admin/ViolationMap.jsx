import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import MapFilterPanel from "../../components/MapFilterPanel";
import HeatmapLayer from "../../components/HeatmapLayer";
import ClusterLayer from "../../components/ClusterLayer";
import "../../App.css";

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

// ── Constants ────────────────────────────────────────────────

const DEFAULT_CENTER = [12.3547, 121.0694];
const BOUNDS = [
  [12.28, 120.99],
  [12.43, 121.15],
];

const EMPTY_FILTERS = {
  type: "", status: "", enforcer: "", dateFrom: "", dateTo: "",
};

const DEFAULT_HEAT = { radius: 25, blur: 20 };

const CLUSTER_LEGEND = [
  { bg: "#2e7d32", label: "< 10",  ring: "rgba(46,125,50,0.25)"  },
  { bg: "#f57c00", label: "10–29", ring: "rgba(245,124,0,0.25)"  },
  { bg: "#c62828", label: "30+",   ring: "rgba(198,40,40,0.25)"  },
];

// ── Filtering ────────────────────────────────────────────────

function applyFilters(violations, filters) {
  return violations.filter((v) => {
    if (!v.latitude || !v.longitude) return false;
    const lat = parseFloat(v.latitude);
    const lng = parseFloat(v.longitude);
    if (lat < 12.28 || lat > 12.43 || lng < 120.99 || lng > 121.15) return false;

    if (filters.type) {
      const types = (v.violation_type || "").split(",").map((t) => t.trim());
      if (!types.includes(filters.type)) return false;
    }
    if (filters.status && v.status !== filters.status) return false;
    if (filters.enforcer && v.enforcer_name !== filters.enforcer) return false;

    if (filters.dateFrom || filters.dateTo) {
      const issued = new Date(v.date_issued);
      if (filters.dateFrom && issued < new Date(filters.dateFrom)) return false;
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (issued > to) return false;
      }
    }
    return true;
  });
}

// ── View toggle ──────────────────────────────────────────────

function ViewToggle({ view, onChange }) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--bg)",
        border: "1.5px solid var(--border)",
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {[
        { value: "clusters", label: "🔵 Clusters" },
        { value: "heatmap",  label: "🔥 Heatmap"  },
      ].map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "7px 18px",
            border: "none",
            borderRadius: 7,
            fontSize: "0.82rem",
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "all 0.18s",
            background: view === o.value ? "var(--primary)" : "transparent",
            color: view === o.value ? "#fff" : "var(--text-light)",
            boxShadow: view === o.value ? "0 2px 8px var(--primary-glow)" : "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Heatmap controls ─────────────────────────────────────────

function HeatControls({ heat, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "10px 14px",
        background: "#fafafe",
        border: "1px solid var(--border)",
        borderRadius: 8,
        marginTop: 10,
      }}
    >
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Heat Settings
      </span>
      <Slider label="Radius" value={heat.radius} min={5}  max={60} step={1} onChange={(v) => onChange({ ...heat, radius: v })} />
      <Slider label="Blur"   value={heat.blur}   min={1}  max={40} step={1} onChange={(v) => onChange({ ...heat, blur: v   })} />
      <button
        onClick={() => onChange(DEFAULT_HEAT)}
        style={{
          background: "none", border: "1px solid var(--border)",
          borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem",
          cursor: "pointer", color: "var(--text-light)", fontFamily: "inherit",
        }}
      >
        Reset
      </button>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--text)" }}>
      <span style={{ minWidth: 36, fontWeight: 600 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 90, accentColor: "var(--primary)", cursor: "pointer" }}
      />
      <span style={{ minWidth: 22, color: "var(--primary)", fontWeight: 700 }}>{value}</span>
    </label>
  );
}

function HeatLegend() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: "0.72rem", color: "var(--text-light)" }}>
      <span style={{ fontWeight: 600 }}>Density:</span>
      <span>Low</span>
      <div style={{
        width: 120, height: 10, borderRadius: 5, flexShrink: 0,
        background: "linear-gradient(to right, #2196f3, #ff9800, #f44336, #b71c1c)",
        border: "1px solid #ddd",
      }} />
      <span>High</span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────

export default function ViolationMap({ violations }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [view, setView]       = useState("clusters");
  const [heat, setHeat]       = useState(DEFAULT_HEAT);

  const enforcers = useMemo(() => {
    const names = violations.map((v) => v.enforcer_name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [violations]);

  const violationTypes = useMemo(() => {
    const types = violations
      .flatMap((v) => (v.violation_type || "").split(",").map((t) => t.trim()))
      .filter(Boolean);
    return [...new Set(types)].sort();
  }, [violations]);

  const withCoords = useMemo(
    () => violations.filter((v) => v.latitude && v.longitude),
    [violations],
  );

  const filtered = useMemo(
    () => applyFilters(violations, filters),
    [violations, filters],
  );

  const heatPoints = useMemo(
    () => filtered.map((v) => [parseFloat(v.latitude), parseFloat(v.longitude), 1]),
    [filtered],
  );

  return (
    <div>
      <MapFilterPanel
        filters={filters}
        onChange={setFilters}
        enforcers={enforcers}
        violationTypes={violationTypes}
        total={withCoords.length}
        filtered={filtered.length}
      />

      <div className="card" style={{ marginBottom: 12 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            🗺️ Violation Map
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {/* Cluster legend */}
        {view === "clusters" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Cluster size:
            </span>
            {CLUSTER_LEGEND.map(({ bg, label, ring }) => (
              <div key={label} className="legend-item">
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: bg, border: "2px solid #fff",
                  boxShadow: `0 0 0 3px ${ring}`, flexShrink: 0,
                }} />
                <span style={{ fontSize: "0.75rem" }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Heatmap controls + legend */}
        {view === "heatmap" && (
          <>
            <HeatControls heat={heat} onChange={setHeat} />
            <HeatLegend />
          </>
        )}

        {/* Map */}
        <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={13}
            style={{ height: 500, width: "100%" }}
            scrollWheelZoom
            maxBounds={BOUNDS}
            maxBoundsViscosity={1.0}
            minZoom={12}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {view === "clusters" && (
              <ClusterLayer violations={filtered} />
            )}

            {view === "heatmap" && heatPoints.length > 0 && (
              <HeatmapLayer
                points={heatPoints}
                radius={heat.radius}
                blur={heat.blur}
                maxZoom={18}
                max={1}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {filtered.length === 0 && withCoords.length > 0 && (
        <div className="empty-state" style={{ marginTop: 0 }}>
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">No violations match the current filters</div>
        </div>
      )}
      {withCoords.length === 0 && (
        <div className="empty-state" style={{ marginTop: 0 }}>
          <div className="empty-state-icon">📍</div>
          <div className="empty-state-text">No violations with GPS coordinates yet</div>
        </div>
      )}
    </div>
  );
}

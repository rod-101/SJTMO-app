import React from "react";

const STATUSES = ["pending", "paid", "resolved", "dismissed", "disputed", "overdue"];

const EMPTY = { type: "", status: "", enforcer: "", dateFrom: "", dateTo: "" };

export default function MapFilterPanel({
  filters,
  onChange,
  enforcers,
  violationTypes = [],
  total,
  filtered,
}) {
  const isActive =
    filters.type ||
    filters.status ||
    filters.enforcer ||
    filters.dateFrom ||
    filters.dateTo;

  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div className="card-title" style={{ marginBottom: 0 }}>
          🔍 Filter Violations
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: "0.78rem",
              color: isActive ? "var(--primary)" : "var(--text-muted)",
              fontWeight: 700,
              background: isActive ? "#ede9fe" : "var(--bg)",
              padding: "3px 10px",
              borderRadius: 20,
              border: `1px solid ${isActive ? "#c4b5fd" : "var(--border)"}`,
              transition: "all 0.2s",
            }}
          >
            {filtered} / {total} shown
          </span>
          {isActive && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => onChange(EMPTY)}
              style={{ padding: "4px 12px", fontSize: "0.75rem" }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        {/* Violation type */}
        <div>
          <label className="form-label" style={{ marginBottom: 4 }}>
            Violation Type
          </label>
          <select
            className="form-select"
            style={{ padding: "8px 10px", fontSize: "0.83rem" }}
            value={filters.type}
            onChange={(e) => set("type", e.target.value)}
          >
            <option value="">All Types</option>
            {violationTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="form-label" style={{ marginBottom: 4 }}>
            Status
          </label>
          <select
            className="form-select"
            style={{ padding: "8px 10px", fontSize: "0.83rem" }}
            value={filters.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Enforcer */}
        <div>
          <label className="form-label" style={{ marginBottom: 4 }}>
            Enforcer
          </label>
          <select
            className="form-select"
            style={{ padding: "8px 10px", fontSize: "0.83rem" }}
            value={filters.enforcer}
            onChange={(e) => set("enforcer", e.target.value)}
          >
            <option value="">All Enforcers</option>
            {enforcers.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="form-label" style={{ marginBottom: 4 }}>
            Date From
          </label>
          <input
            type="date"
            className="form-input"
            style={{ padding: "8px 10px", fontSize: "0.83rem" }}
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => set("dateFrom", e.target.value)}
          />
        </div>

        {/* Date to */}
        <div>
          <label className="form-label" style={{ marginBottom: 4 }}>
            Date To
          </label>
          <input
            type="date"
            className="form-input"
            style={{ padding: "8px 10px", fontSize: "0.83rem" }}
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => set("dateTo", e.target.value)}
          />
        </div>
      </div>

      {/* Active filter chips */}
      {isActive && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {filters.type && (
            <Chip label={`Type: ${filters.type}`} onRemove={() => set("type", "")} />
          )}
          {filters.status && (
            <Chip label={`Status: ${filters.status}`} onRemove={() => set("status", "")} />
          )}
          {filters.enforcer && (
            <Chip label={`Enforcer: ${filters.enforcer}`} onRemove={() => set("enforcer", "")} />
          )}
          {filters.dateFrom && (
            <Chip label={`From: ${filters.dateFrom}`} onRemove={() => set("dateFrom", "")} />
          )}
          {filters.dateTo && (
            <Chip label={`To: ${filters.dateTo}`} onRemove={() => set("dateTo", "")} />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "#ede9fe",
        color: "#4c1d95",
        border: "1px solid #c4b5fd",
        borderRadius: 20,
        padding: "2px 10px 2px 10px",
        fontSize: "0.73rem",
        fontWeight: 700,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#7c3aed",
          padding: 0,
          lineHeight: 1,
          fontSize: "0.85rem",
          marginLeft: 2,
        }}
      >
        ×
      </button>
    </span>
  );
}

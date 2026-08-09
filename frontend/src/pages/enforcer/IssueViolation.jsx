import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  issueViolation,
  getViolationTypes,
  searchMotorists,
  searchVehicles,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Receipt from "../../components/Receipt";
import "../../App.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const SJ_CENTER = { lat: 12.3547, lng: 121.0694 };
const SJ_BOUNDS = {
  minLat: 12.28,
  maxLat: 12.43,
  minLng: 120.99,
  maxLng: 121.15,
};

const STEPS = [
  { key: "motorist", label: "Motorist", icon: "👤" },
  { key: "vehicle", label: "Vehicle", icon: "🏍️" },
  { key: "violation", label: "Violation", icon: "⚠️" },
  { key: "review", label: "Review", icon: "✅" },
];

const VEHICLE_TYPES = [
  { value: "motorcycle", label: "Motorcycle" },
  { value: "car", label: "Car / Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "jeepney", label: "Jeepney" },
  { value: "tricycle", label: "Tricycle" },
  { value: "van", label: "Van" },
  { value: "bus", label: "Bus" },
  { value: "other", label: "Other" },
];

const peso = (n) =>
  typeof n === "number" && !Number.isNaN(n)
    ? `₱${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
    : "—";

const inSJBounds = (lat, lng) =>
  lat >= SJ_BOUNDS.minLat &&
  lat <= SJ_BOUNDS.maxLat &&
  lng >= SJ_BOUNDS.minLng &&
  lng <= SJ_BOUNDS.maxLng;

const normName = (first, last) =>
  `${first} ${last}`.trim().toLowerCase().replace(/\s+/g, " ");

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ current, onJump, canJump }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="iv-stepper">
      {STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "todo";
        return (
          <React.Fragment key={s.key}>
            <button
              type="button"
              className={`iv-step iv-step-${state}`}
              onClick={() => canJump(i) && onJump(s.key)}
              disabled={!canJump(i)}
            >
              <span className="iv-step-bubble">
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className="iv-step-label">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={`iv-step-line${i < idx ? " done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Motorist Step ────────────────────────────────────────────────────────────
function MotoristStep({
  query,
  setQuery,
  suggestions,
  motoristForm,
  setMotoristForm,
  nameCollision,
  confirmedNew,
  onConfirmNew,
}) {
  const [showSuggest, setShowSuggest] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setShowSuggest(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectMotorist = (m) => {
    setMotoristForm({
      id: m.id,
      first_name: m.first_name || "",
      last_name: m.last_name || "",
      license_no: m.license_no || "",
      birthday: m.birthday ? m.birthday.slice(0, 10) : "",
      address: m.address || "",
      contact_no: m.contact_no || "",
    });
    setQuery(`${m.first_name} ${m.last_name}`);
    setShowSuggest(false);
  };

  const field = (key) => (e) =>
    setMotoristForm({ ...motoristForm, id: null, [key]: e.target.value });

  const clearSelection = () => {
    setMotoristForm({
      id: null,
      first_name: "",
      last_name: "",
      license_no: "",
      birthday: "",
      address: "",
      contact_no: "",
    });
    setQuery("");
    setShowSuggest(false);
  };

  return (
    <div className="iv-panel">
      <div className="iv-panel-title">Identify the motorist</div>
      <div className="iv-panel-hint">
        Search the registry — matches auto-fill the form below, which you can
        edit before issuing.
      </div>

      <div className="iv-search-wrap" ref={wrapRef}>
        <input
          className="form-input iv-input-lg"
          placeholder="Search by name or license no..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggest(true);
          }}
          onFocus={() => setShowSuggest(true)}
          autoFocus
        />
        {motoristForm.id && (
          <button
            type="button"
            className="iv-clear-selection"
            onClick={clearSelection}
            title="Clear selected motorist and start a new one"
          >
            ✕ Clear
          </button>
        )}
        {showSuggest && query.trim().length > 0 && (
          <div className="iv-suggest">
            {suggestions.length === 0 ? (
              <div className="iv-suggest-empty">
                No match — fill in the form below to add a new motorist.
              </div>
            ) : (
              suggestions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`iv-suggest-item${motoristForm.id === m.id ? " selected" : ""}`}
                  onClick={() => selectMotorist(m)}
                >
                  <div className="iv-suggest-avatar">
                    {(m.first_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="iv-suggest-body">
                    <div className="iv-suggest-name">
                      {m.first_name} {m.last_name}
                    </div>
                    <div className="iv-suggest-meta">
                      {[
                        m.license_no ? `License ${m.license_no}` : "No license",
                        Number(m.ticket_count) > 0
                          ? `${m.ticket_count} prior violation${Number(m.ticket_count) === 1 ? "" : "s"}`
                          : "No previous violations",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {motoristForm.id === m.id && (
                    <span className="iv-suggest-check">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {motoristForm.id ? (
        <div className="iv-motorist-status iv-motorist-status-existing">
          ✅ Using the saved info for{" "}
          <strong>
            {motoristForm.first_name} {motoristForm.last_name}
          </strong>
          . This violation will be added to their existing record.
        </div>
      ) : motoristForm.first_name.trim() || motoristForm.last_name.trim() ? (
        <div className="iv-motorist-status iv-motorist-status-new">
          🆕 This will be saved as a <strong>new</strong> motorist named{" "}
          <strong>
            {motoristForm.first_name} {motoristForm.last_name}
          </strong>
          .
          {nameCollision && (
            <div className="iv-motorist-collision">
              ⚠ A motorist named{" "}
              <strong>
                {motoristForm.first_name} {motoristForm.last_name}
              </strong>{" "}
              is already on record
              {nameCollision.license_no
                ? ` (License ${nameCollision.license_no})`
                : ""}
              . Select them above if this is the same person, to avoid creating
              a duplicate record.
              <label className="iv-collision-confirm">
                <br />
                <input
                  type="checkbox"
                  checked={confirmedNew}
                  onChange={(e) => onConfirmNew(e.target.checked)}
                />
                This is a different person with the same name — create a new
                record.
              </label>
            </div>
          )}
        </div>
      ) : null}

      <div className="iv-new-form">
        <div className="iv-manual-row">
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input
              className="form-input iv-input-lg"
              placeholder="Juan"
              value={motoristForm.first_name}
              onChange={field("first_name")}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input
              className="form-input iv-input-lg"
              placeholder="Dela Cruz"
              value={motoristForm.last_name}
              onChange={field("last_name")}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">
            License No. <span className="iv-optional">(optional)</span>
          </label>
          <input
            className="form-input iv-input-lg"
            placeholder="N01-23-456789"
            value={motoristForm.license_no}
            onChange={field("license_no")}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Birthday <span className="iv-optional">(optional)</span>
          </label>
          <input
            type="date"
            className="form-input iv-input-lg"
            value={motoristForm.birthday}
            onChange={field("birthday")}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Address <span className="iv-optional">(optional)</span>
          </label>
          <input
            className="form-input iv-input-lg"
            placeholder="Poblacion, San Jose, Occidental Mindoro"
            value={motoristForm.address}
            onChange={field("address")}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Contact No. <span className="iv-optional">(optional)</span>
          </label>
          <input
            className="form-input iv-input-lg"
            placeholder="09171234567"
            value={motoristForm.contact_no}
            onChange={field("contact_no")}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Vehicle Step ─────────────────────────────────────────────────────────────
function VehicleStep({
  query,
  setQuery,
  suggestions,
  vehicleForm,
  setVehicleForm,
}) {
  const [showSuggest, setShowSuggest] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setShowSuggest(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectVehicle = (v) => {
    setVehicleForm({
      id: v.id,
      plate_no: v.plate_no || "",
      no_plate: !!v.no_plate,
      vehicle_type: v.vehicle_type || "",
      make: v.make || "",
      model: v.model || "",
      color: v.color || "",
      or_cr_no: v.or_cr_no || "",
      or_cr_presented: !!v.or_cr_presented,
    });
    setQuery(v.no_plate ? "NO PLATE" : v.plate_no || "");
    setShowSuggest(false);
  };

  const field = (key) => (e) =>
    setVehicleForm({ ...vehicleForm, id: null, [key]: e.target.value });

  const clearSelection = () => {
    setVehicleForm({
      id: null,
      plate_no: "",
      no_plate: false,
      vehicle_type: "",
      make: "",
      model: "",
      color: "",
      or_cr_no: "",
      or_cr_presented: false,
    });
    setQuery("");
    setShowSuggest(false);
  };

  const toggleNoPlate = (e) => {
    const checked = e.target.checked;
    setVehicleForm({
      ...vehicleForm,
      id: null,
      no_plate: checked,
      plate_no: checked ? "" : vehicleForm.plate_no,
    });
    if (checked) setQuery("");
  };

  return (
    <div className="iv-panel">
      <div className="iv-panel-title">Identify the vehicle</div>
      <div className="iv-panel-hint">
        Search by plate number — matches auto-fill the form below, which you can
        edit before issuing.
      </div>

      <div className="iv-search-wrap" ref={wrapRef}>
        <input
          className="form-input iv-input-lg"
          placeholder="Search by plate number..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggest(true);
          }}
          onFocus={() => setShowSuggest(true)}
          disabled={vehicleForm.no_plate}
          autoFocus
        />
        {vehicleForm.id && (
          <button
            type="button"
            className="iv-clear-selection"
            onClick={clearSelection}
            title="Clear selected vehicle and start a new one"
          >
            ✕ Clear
          </button>
        )}
        {showSuggest && query.trim().length > 0 && (
          <div className="iv-suggest">
            {suggestions.length === 0 ? (
              <div className="iv-suggest-empty">
                No match — fill in the form below to add a new vehicle.
              </div>
            ) : (
              suggestions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`iv-suggest-item${vehicleForm.id === v.id ? " selected" : ""}`}
                  onClick={() => selectVehicle(v)}
                >
                  <div className="iv-suggest-avatar">
                    {(v.plate_no || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="iv-suggest-body">
                    <div className="iv-suggest-name">
                      {v.no_plate ? "No plate" : v.plate_no}
                    </div>
                    <div className="iv-suggest-meta">
                      {[
                        [v.make, v.model].filter(Boolean).join(" ") || null,
                        Number(v.ticket_count) > 0
                          ? `${v.ticket_count} prior violation${Number(v.ticket_count) === 1 ? "" : "s"}`
                          : "No previous violations",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {vehicleForm.id === v.id && (
                    <span className="iv-suggest-check">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {vehicleForm.id ? (
        <div className="iv-motorist-status iv-motorist-status-existing">
          ✅ Using the saved info for plate{" "}
          <strong>
            {vehicleForm.no_plate ? "NO PLATE" : vehicleForm.plate_no}
          </strong>
          . This violation will be added to its existing record.
        </div>
      ) : vehicleForm.plate_no.trim() || vehicleForm.no_plate ? (
        <div className="iv-motorist-status iv-motorist-status-new">
          🆕 This will be saved as a <strong>new</strong> vehicle
          {vehicleForm.plate_no.trim() && (
            <>
              {" "}
              with plate <strong>{vehicleForm.plate_no.trim()}</strong>
            </>
          )}
          .
        </div>
      ) : null}

      <div className="iv-new-form">
        <div className="form-group">
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              type="checkbox"
              checked={vehicleForm.no_plate}
              onChange={toggleNoPlate}
            />
            No plate / conduction sticker
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">Plate Number *</label>
          <input
            className="form-input iv-input-lg"
            placeholder="ABC 1234"
            value={vehicleForm.plate_no}
            onChange={field("plate_no")}
            disabled={vehicleForm.no_plate}
            required={!vehicleForm.no_plate}
          />
        </div>
        <div className="iv-manual-row">
          <div className="form-group">
            <label className="form-label">Vehicle Type *</label>
            <select
              className="form-input iv-input-lg"
              value={vehicleForm.vehicle_type}
              onChange={field("vehicle_type")}
              required
            >
              <option value="">Select type…</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Color <span className="iv-optional">(optional)</span>
            </label>
            <input
              className="form-input iv-input-lg"
              placeholder="Red"
              value={vehicleForm.color}
              onChange={field("color")}
            />
          </div>
        </div>
        <div className="iv-manual-row">
          <div className="form-group">
            <label className="form-label">
              Make <span className="iv-optional">(optional)</span>
            </label>
            <input
              className="form-input iv-input-lg"
              placeholder="Honda"
              value={vehicleForm.make}
              onChange={field("make")}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Model <span className="iv-optional">(optional)</span>
            </label>
            <input
              className="form-input iv-input-lg"
              placeholder="Click 125i"
              value={vehicleForm.model}
              onChange={field("model")}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">
            OR/CR No. <span className="iv-optional">(optional)</span>
          </label>
          <input
            className="form-input iv-input-lg"
            placeholder="OR/CR reference number"
            value={vehicleForm.or_cr_no}
            onChange={field("or_cr_no")}
          />
        </div>
        <div className="form-group">
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              type="checkbox"
              checked={vehicleForm.or_cr_presented}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  id: null,
                  or_cr_presented: e.target.checked,
                })
              }
            />
            OR/CR presented on-site
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Violation Picker Modal ───────────────────────────────────────────────────
function ViolationPickerModal({
  types,
  typeQuery,
  setTypeQuery,
  selectedTypes,
  toggleType,
  totalFine,
  onClose,
}) {
  const filteredTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => t.name.toLowerCase().includes(q));
  }, [types, typeQuery]);

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Trap escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="iv-modal-backdrop" onMouseDown={handleBackdrop}>
      <div
        className="iv-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Select violation types"
      >
        <div className="iv-modal-header">
          <div className="iv-modal-title">
            Select Violations
            {selectedTypes.length > 0 && (
              <span className="iv-count-pill">
                {selectedTypes.length} selected
              </span>
            )}
          </div>
          <button
            type="button"
            className="iv-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="iv-modal-search">
          <input
            className="form-input iv-input-lg"
            placeholder="Search violation type…"
            value={typeQuery}
            onChange={(e) => setTypeQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="iv-modal-body">
          {types.length === 0 ? (
            <div className="iv-loading">Loading types…</div>
          ) : (
            <div className="iv-type-grid">
              {filteredTypes.map((t) => {
                const sel = selectedTypes.some((s) => s.name === t.name);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`iv-type-card${sel ? " selected" : ""}`}
                    onClick={() => toggleType(t)}
                  >
                    <span className="iv-type-name">
                      {sel ? "✓ " : ""}
                      {t.name}
                    </span>
                    <span className="iv-type-fine">
                      {peso(Number(t.fine) || 0)}
                    </span>
                  </button>
                );
              })}
              {filteredTypes.length === 0 && (
                <div className="iv-loading">No types match "{typeQuery}".</div>
              )}
            </div>
          )}
        </div>

        <div className="iv-modal-footer">
          {selectedTypes.length > 0 && (
            <div className="iv-fine-total" style={{ marginTop: 0, flex: 1 }}>
              <span>Total Fine</span>
              <strong>{peso(totalFine)}</strong>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done{selectedTypes.length > 0 ? ` (${selectedTypes.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Violation Step ───────────────────────────────────────────────────────────
function ViolationStep({
  types,
  typeQuery,
  setTypeQuery,
  selectedTypes,
  toggleType,
  totalFine,
  notes,
  setNotes,
  gps,
  captureGPS,
  manualLat,
  manualLng,
  setManualLat,
  setManualLng,
  applyManual,
  photoPreview,
  onPhotoChange,
  clearPhoto,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="iv-panel">
      <div className="iv-panel-title">Capture violation details</div>
      <div className="iv-panel-hint">
        Select one or more violations. Totals update live.
      </div>

      {/* ── Violation type ── */}
      <div className="form-group">
        <label className="form-label">Violation Type *</label>
        <button
          type="button"
          className={`iv-picker-trigger${selectedTypes.length > 0 ? " has-selection" : ""}`}
          onClick={() => setPickerOpen(true)}
        >
          {selectedTypes.length === 0 ? (
            <span className="iv-picker-placeholder">
              ⚠️ Tap to choose violation…
            </span>
          ) : (
            <span className="iv-picker-selected-label">
              {selectedTypes.length === 1
                ? selectedTypes[0].name
                : `${selectedTypes.length} violations selected`}
            </span>
          )}
          <span className="iv-picker-arrow">›</span>
        </button>

        {selectedTypes.length > 0 && (
          <>
            <div className="iv-selected-tags">
              {selectedTypes.map((t) => (
                <span key={t.name} className="iv-selected-tag">
                  {t.name}
                  <button
                    type="button"
                    className="iv-tag-remove"
                    onClick={() => toggleType(t)}
                    aria-label={`Remove ${t.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="iv-fine-total">
              <span>Total Fine</span>
              <strong>{peso(totalFine)}</strong>
            </div>
          </>
        )}

        {pickerOpen && (
          <ViolationPickerModal
            types={types}
            typeQuery={typeQuery}
            setTypeQuery={setTypeQuery}
            selectedTypes={selectedTypes}
            toggleType={toggleType}
            totalFine={totalFine}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {/* ── Location ── */}
      <div className="form-group">
        <label className="form-label">Location (GPS) *</label>
        {gps.status === "idle" && (
          <button
            type="button"
            className="btn btn-outline iv-input-lg"
            onClick={captureGPS}
          >
            📍 Capture GPS Location
          </button>
        )}
        {gps.status === "loading" && (
          <div className="iv-gps loading">⏳ Acquiring GPS signal…</div>
        )}
        {(gps.status === "ok" || gps.status === "mocked") && (
          <>
            <div className="iv-gps">
              <span>📍</span>
              <span className="iv-gps-coords">
                {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
              </span>
              {gps.status === "mocked" && (
                <span className="iv-gps-tag">demo</span>
              )}
              <button
                type="button"
                className="iv-gps-refresh"
                onClick={captureGPS}
                aria-label="Refresh GPS"
                title="Re-capture GPS"
              >
                🔄
              </button>
            </div>
            <div className="iv-mini-map">
              <MapContainer
                key={`${gps.lat}-${gps.lng}`}
                center={[gps.lat, gps.lng]}
                zoom={16}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                zoomControl={false}
                attributionControl={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[gps.lat, gps.lng]} />
              </MapContainer>
            </div>
            <details className="iv-manual-toggle">
              <summary>Override coordinates manually</summary>
              <div className="iv-manual-row">
                <input
                  className="form-input"
                  placeholder="Latitude"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                />
                <input
                  className="form-input"
                  placeholder="Longitude"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={applyManual}
                >
                  Apply
                </button>
              </div>
            </details>
          </>
        )}
        {gps.status === "error" && (
          <div className="iv-gps error">
            ⚠ Could not capture GPS.{" "}
            <button className="iv-link-btn" onClick={captureGPS}>
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Photo evidence ── */}
      <div className="form-group">
        <label className="form-label">
          Photo Evidence <span className="iv-optional">(optional)</span>
        </label>
        {!photoPreview ? (
          <label className="iv-photo-drop">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhotoChange}
              hidden
            />
            <span className="iv-photo-drop-icon">📷</span>
            <span className="iv-photo-drop-text">
              Tap to take or upload photo
            </span>
          </label>
        ) : (
          <div className="iv-photo-preview">
            <img src={photoPreview} alt="Evidence preview" />
            <button
              type="button"
              className="iv-photo-remove"
              onClick={clearPhoto}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="form-group">
        <label className="form-label">
          Notes <span className="iv-optional">(optional)</span>
        </label>
        <textarea
          className="form-textarea iv-input-lg"
          placeholder="Add details about the incident…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}

// ─── Review Step ──────────────────────────────────────────────────────────────
function ReviewStep({
  motoristLabel,
  motoristMeta,
  vehicleLabel,
  vehicleMeta,
  selectedTypes,
  totalFine,
  gps,
  hasPhoto,
  notes,
  enforcer,
}) {
  return (
    <div className="iv-panel">
      <div className="iv-panel-title">Review before issuing</div>
      <div className="iv-panel-hint">
        Verify the details. Once issued, status changes require admin action.
      </div>

      <div className="iv-review-grid">
        <div className="iv-review-row">
          <div className="iv-review-label">Motorist</div>
          <div className="iv-review-value">
            <strong>{motoristLabel}</strong>
            {motoristMeta && (
              <div className="iv-review-sub">{motoristMeta}</div>
            )}
          </div>
        </div>

        <div className="iv-review-row">
          <div className="iv-review-label">Vehicle</div>
          <div className="iv-review-value">
            <strong>{vehicleLabel}</strong>
            {vehicleMeta && <div className="iv-review-sub">{vehicleMeta}</div>}
          </div>
        </div>

        <div className="iv-review-row">
          <div className="iv-review-label">
            Violation{selectedTypes.length > 1 ? "s" : ""}
          </div>
          <div className="iv-review-value">
            <div className="iv-review-tags">
              {selectedTypes.map((t) => (
                <span key={t.name} className="iv-review-tag">
                  {t.name}{" "}
                  <span className="iv-review-tag-fine">
                    {peso(Number(t.fine) || 0)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="iv-review-row">
          <div className="iv-review-label">Total Fine</div>
          <div className="iv-review-value iv-review-total">
            {peso(totalFine)}
          </div>
        </div>

        <div className="iv-review-row">
          <div className="iv-review-label">Location</div>
          <div className="iv-review-value">
            {gps.lat ? (
              <>
                <strong>
                  {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                </strong>
                {gps.status === "mocked" && (
                  <span className="iv-review-sub">demo coordinates</span>
                )}
              </>
            ) : (
              <span className="iv-review-sub">Not captured</span>
            )}
          </div>
        </div>

        <div className="iv-review-row">
          <div className="iv-review-label">Evidence</div>
          <div className="iv-review-value">
            {hasPhoto ? (
              "📷 Photo attached"
            ) : (
              <span className="iv-review-sub">None</span>
            )}
          </div>
        </div>

        {notes && (
          <div className="iv-review-row">
            <div className="iv-review-label">Notes</div>
            <div className="iv-review-value iv-review-notes">{notes}</div>
          </div>
        )}

        <div className="iv-review-row">
          <div className="iv-review-label">Issued By</div>
          <div className="iv-review-value">
            🚓 <strong>{enforcer.name}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IssueViolation({ onSuccess }) {
  const { user } = useAuth();

  const [step, setStep] = useState("motorist");
  const [types, setTypes] = useState([]);

  // Motorist
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [motoristForm, setMotoristForm] = useState({
    id: null,
    first_name: "",
    last_name: "",
    license_no: "",
    birthday: "",
    address: "",
    contact_no: "",
  });
  const [confirmedNewMotorist, setConfirmedNewMotorist] = useState(false);

  // Vehicle
  const [vQuery, setVQuery] = useState("");
  const [vSuggestions, setVSuggestions] = useState([]);
  const [vehicleForm, setVehicleForm] = useState({
    id: null,
    plate_no: "",
    no_plate: false,
    vehicle_type: "",
    make: "",
    model: "",
    color: "",
    or_cr_no: "",
    or_cr_presented: false,
  });

  // Violation details
  const [typeQuery, setTypeQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [notes, setNotes] = useState("");
  const [gps, setGps] = useState({ lat: null, lng: null, status: "idle" });
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoTag, setPhotoTag] = useState(false); // attached flag

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null); // { ticket_no, motorist_name }
  const [showReceipt, setShowReceipt] = useState(false);
  const [error, setError] = useState("");

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    getViolationTypes()
      .then(setTypes)
      .catch(() =>
        setTypes([
          { id: 1, name: "No Helmet", fine: 500 },
          { id: 2, name: "Illegal Parking", fine: 1000 },
          { id: 3, name: "No License", fine: 1500 },
          { id: 4, name: "Reckless Driving", fine: 2500 },
          { id: 5, name: "Beating Red Light", fine: 1500 },
          { id: 6, name: "Obstruction", fine: 1000 },
        ]),
      );
  }, []);

  // ── Motorist search (debounced) ─────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      searchMotorists(q)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Any name edit invalidates a previous "different person" confirmation
  useEffect(() => {
    setConfirmedNewMotorist(false);
  }, [motoristForm.first_name, motoristForm.last_name]);

  // ── Vehicle search (debounced) ──────────────────────────────────────────
  useEffect(() => {
    const q = vQuery.trim();
    if (!q) {
      setVSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      searchVehicles(q)
        .then(setVSuggestions)
        .catch(() => setVSuggestions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [vQuery]);

  // ── Auto-capture GPS when entering violation step ──────────────────────
  useEffect(() => {
    if (step === "violation" && gps.status === "idle") captureGPS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Derived ────────────────────────────────────────────────────────────
  const totalFine = useMemo(
    () => selectedTypes.reduce((sum, t) => sum + (Number(t.fine) || 0), 0),
    [selectedTypes],
  );

  const motoristResolved = useMemo(() => {
    const firstName = motoristForm.first_name.trim();
    const lastName = motoristForm.last_name.trim();
    if (!firstName || !lastName) return null;
    const bits = [];
    if (motoristForm.license_no.trim())
      bits.push(`License ${motoristForm.license_no.trim()}`);
    if (motoristForm.contact_no.trim())
      bits.push(motoristForm.contact_no.trim());
    return {
      name: `${firstName} ${lastName}`,
      license: motoristForm.license_no.trim() || null,
      meta:
        bits.join(" · ") || (motoristForm.id ? "On record" : "New motorist"),
    };
  }, [motoristForm]);

  // A suggestion whose name exactly matches what's typed, that the enforcer
  // hasn't selected — the same-name-different-person case that produces
  // silent duplicate motorist rows if left unconfirmed.
  const nameCollision = useMemo(() => {
    if (motoristForm.id) return null;
    const typed = normName(motoristForm.first_name, motoristForm.last_name);
    if (!typed) return null;
    return (
      suggestions.find((m) => normName(m.first_name, m.last_name) === typed) ||
      null
    );
  }, [
    suggestions,
    motoristForm.id,
    motoristForm.first_name,
    motoristForm.last_name,
  ]);

  const motoristValid =
    !!motoristResolved && (!nameCollision || confirmedNewMotorist);

  const vehicleResolved = useMemo(() => {
    if (!vehicleForm.vehicle_type) return null;
    if (!vehicleForm.no_plate && !vehicleForm.plate_no.trim()) return null;
    return {
      plate: vehicleForm.no_plate ? "NO PLATE" : vehicleForm.plate_no.trim(),
      meta:
        [vehicleForm.make, vehicleForm.model].filter(Boolean).join(" ") || null,
    };
  }, [vehicleForm]);

  const vehicleValid = !!vehicleResolved;
  const violationValid = selectedTypes.length > 0 && gps.lat != null;

  // ── Handlers ───────────────────────────────────────────────────────────
  const toggleType = (t) =>
    setSelectedTypes((prev) =>
      prev.some((x) => x.name === t.name)
        ? prev.filter((x) => x.name !== t.name)
        : [...prev, t],
    );

  function captureGPS() {
    if (!navigator.geolocation) {
      setGps({
        lat: SJ_CENTER.lat + (Math.random() - 0.5) * 0.02,
        lng: SJ_CENTER.lng + (Math.random() - 0.5) * 0.02,
        status: "mocked",
      });
      return;
    }
    setGps((prev) => ({ ...prev, status: "loading" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (inSJBounds(lat, lng)) {
          setGps({ lat, lng, status: "ok" });
        } else {
          // outside bounds → fallback to demo coordinates within bounds
          setGps({
            lat: SJ_CENTER.lat + (Math.random() - 0.5) * 0.02,
            lng: SJ_CENTER.lng + (Math.random() - 0.5) * 0.02,
            status: "mocked",
          });
        }
      },
      () => {
        setGps({
          lat: SJ_CENTER.lat + (Math.random() - 0.5) * 0.02,
          lng: SJ_CENTER.lng + (Math.random() - 0.5) * 0.02,
          status: "mocked",
        });
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  const applyManual = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Enter valid latitude and longitude.");
      return;
    }
    if (!inSJBounds(lat, lng)) {
      setError("Coordinates must be within San Jose, Occidental Mindoro.");
      return;
    }
    setError("");
    setGps({ lat, lng, status: "ok" });
    setManualLat("");
    setManualLng("");
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target.result);
      setPhotoTag(true);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    setPhotoTag(false);
  };

  const goNext = () => {
    setError("");
    if (step === "motorist") {
      if (!motoristValid)
        return setError(
          nameCollision
            ? "Select the matching motorist above, or confirm this is a different person."
            : "Identify the motorist before continuing.",
        );
      setStep("vehicle");
    } else if (step === "vehicle") {
      if (!vehicleValid)
        return setError("Identify the vehicle before continuing.");
      setStep("violation");
    } else if (step === "violation") {
      if (selectedTypes.length === 0)
        return setError("Select at least one violation type.");
      if (gps.lat == null)
        return setError("Capture GPS location before continuing.");
      setStep("review");
    }
  };

  const goBack = () => {
    setError("");
    if (step === "vehicle") setStep("motorist");
    else if (step === "violation") setStep("vehicle");
    else if (step === "review") setStep("violation");
  };

  const canJump = (i) => {
    if (i === 0) return true;
    if (i === 1) return motoristValid;
    if (i === 2) return motoristValid && vehicleValid;
    if (i === 3) return motoristValid && vehicleValid && violationValid;
    return false;
  };

  const handleSubmit = async () => {
    if (!motoristResolved) return setError("Motorist info missing.");
    if (nameCollision && !confirmedNewMotorist)
      return setError(
        "Select the matching motorist above, or confirm this is a different person.",
      );
    if (!vehicleResolved) return setError("Vehicle info missing.");
    if (selectedTypes.length === 0)
      return setError("Select at least one violation type.");

    setSubmitting(true);
    setError("");
    try {
      const noteBits = [];
      if (photoTag) noteBits.push("[Photo evidence attached]");
      if (notes.trim()) noteBits.push(notes.trim());

      const { ticket, motorist, vehicle } = await issueViolation({
        motorist_id: motoristForm.id,
        first_name: motoristForm.first_name.trim(),
        last_name: motoristForm.last_name.trim(),
        license_no: motoristForm.license_no.trim() || null,
        birthday: motoristForm.birthday || null,
        address: motoristForm.address.trim() || null,
        contact_no: motoristForm.contact_no.trim() || null,
        confirmed_new: confirmedNewMotorist,
        vehicle_id: vehicleForm.id,
        plate_no: vehicleForm.no_plate
          ? null
          : vehicleForm.plate_no.trim() || null,
        no_plate: vehicleForm.no_plate,
        vehicle_type: vehicleForm.vehicle_type,
        make: vehicleForm.make.trim() || null,
        model: vehicleForm.model.trim() || null,
        color: vehicleForm.color.trim() || null,
        or_cr_no: vehicleForm.or_cr_no.trim() || null,
        or_cr_presented: vehicleForm.or_cr_presented,
        violation_type: selectedTypes.map((t) => t.name).join(", "),
        notes: noteBits.join(" · "),
        latitude: gps.lat,
        longitude: gps.lng,
        enforcer_name: user.name,
        enforcer_id: user.id,
      });

      setSuccess({
        ticket_no: ticket?.ticket_no || ticket?.id?.slice?.(0, 8) || "—",
        date_issued: ticket?.date_issued || new Date().toISOString(),
        motorist_name: motoristResolved.name,
        motorist_license: motorist?.license_no || motoristForm.license_no.trim() || null,
        motorist_address: motorist?.address || motoristForm.address.trim() || null,
        motorist_contact: motorist?.contact_no || motoristForm.contact_no.trim() || null,
        vehicle_plate: vehicle?.no_plate
          ? "NO PLATE"
          : vehicle?.plate_no || vehicleResolved?.plate || "—",
        vehicle_type: vehicle?.vehicle_type || vehicleForm.vehicle_type || null,
        vehicle_make: vehicle?.make || vehicleForm.make.trim() || null,
        vehicle_model: vehicle?.model || vehicleForm.model.trim() || null,
        vehicle_color: vehicle?.color || vehicleForm.color.trim() || null,
        violation_types: selectedTypes.map((t) => ({
          name: t.name,
          fine: Number(t.fine) || 0,
        })),
        total: totalFine,
        enforcer_name: user.name,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err.message || "Failed to submit violation.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep("motorist");
    setQuery("");
    setSuggestions([]);
    setMotoristForm({
      id: null,
      first_name: "",
      last_name: "",
      license_no: "",
      birthday: "",
      address: "",
      contact_no: "",
    });
    setConfirmedNewMotorist(false);
    setVQuery("");
    setVSuggestions([]);
    setVehicleForm({
      id: null,
      plate_no: "",
      no_plate: false,
      vehicle_type: "",
      make: "",
      model: "",
      color: "",
      or_cr_no: "",
      or_cr_presented: false,
    });
    setSelectedTypes([]);
    setTypeQuery("");
    setNotes("");
    setGps({ lat: null, lng: null, status: "idle" });
    setManualLat("");
    setManualLng("");
    setPhotoPreview(null);
    setPhotoTag(false);
    setSuccess(null);
    setShowReceipt(false);
    setError("");
  };

  // ── Success view ───────────────────────────────────────────────────────
  if (success && showReceipt) {
    return (
      <Receipt data={success} onBack={() => setShowReceipt(false)} />
    );
  }

  if (success) {
    return (
      <div className="iv-success-card">
        <div className="iv-success-check">✓</div>
        <div className="iv-success-title">Violation Issued</div>
        <div className="iv-success-meta">
          Ticket <strong>#{success.ticket_no}</strong> for{" "}
          <strong>{success.motorist_name}</strong>
        </div>
        {success.total > 0 && (
          <div className="iv-success-total">
            Fine: <strong>{peso(success.total)}</strong>
          </div>
        )}
        <div className="iv-success-actions">
          <button className="btn btn-outline btn-full" onClick={reset}>
            ＋ Issue Another
          </button>
          <button
            className="btn btn-outline btn-full"
            onClick={() => setShowReceipt(true)}
          >
            🧾 View Receipt
          </button>
          <button
            className="btn btn-primary btn-full"
            onClick={() => onSuccess?.()}
          >
            View My Issued
          </button>
        </div>
      </div>
    );
  }

  // ── Helpers for review ─────────────────────────────────────────────────
  const motoristLabel = motoristResolved?.name || "—";
  const motoristMeta = motoristResolved?.meta || null;
  const vehicleLabel = vehicleResolved?.plate || "—";
  const vehicleMeta = vehicleResolved?.meta || null;

  return (
    <div className="iv-wrap">
      <Stepper current={step} onJump={setStep} canJump={canJump} />

      {error && <div className="alert alert-error iv-alert">⚠ {error}</div>}

      <div className="iv-card">
        {step === "motorist" && (
          <MotoristStep
            query={query}
            setQuery={setQuery}
            suggestions={suggestions}
            motoristForm={motoristForm}
            setMotoristForm={setMotoristForm}
            nameCollision={nameCollision}
            confirmedNew={confirmedNewMotorist}
            onConfirmNew={setConfirmedNewMotorist}
          />
        )}
        {step === "vehicle" && (
          <VehicleStep
            query={vQuery}
            setQuery={setVQuery}
            suggestions={vSuggestions}
            vehicleForm={vehicleForm}
            setVehicleForm={setVehicleForm}
          />
        )}
        {step === "violation" && (
          <ViolationStep
            types={types}
            typeQuery={typeQuery}
            setTypeQuery={setTypeQuery}
            selectedTypes={selectedTypes}
            toggleType={toggleType}
            totalFine={totalFine}
            notes={notes}
            setNotes={setNotes}
            gps={gps}
            captureGPS={captureGPS}
            manualLat={manualLat}
            manualLng={manualLng}
            setManualLat={setManualLat}
            setManualLng={setManualLng}
            applyManual={applyManual}
            photoPreview={photoPreview}
            onPhotoChange={onPhotoChange}
            clearPhoto={clearPhoto}
          />
        )}
        {step === "review" && (
          <ReviewStep
            motoristLabel={motoristLabel}
            motoristMeta={motoristMeta}
            vehicleLabel={vehicleLabel}
            vehicleMeta={vehicleMeta}
            selectedTypes={selectedTypes}
            totalFine={totalFine}
            gps={gps}
            hasPhoto={!!photoPreview}
            notes={notes}
            enforcer={user}
          />
        )}
      </div>

      {/* ── Sticky footer ── */}
      <div className="iv-footer">
        {step !== "motorist" ? (
          <button
            className="btn btn-outline btn-sm iv-back-btn"
            type="button"
            onClick={goBack}
            disabled={submitting}
          >
            ‹ Back
          </button>
        ) : (
          <span />
        )}

        {step === "review" ? (
          <button
            className="btn btn-primary iv-primary-btn"
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "⏳ Submitting…" : "🚨 Issue Violation"}
          </button>
        ) : (
          <button
            className="btn btn-primary iv-primary-btn"
            type="button"
            onClick={goNext}
            disabled={
              (step === "motorist" && !motoristValid) ||
              (step === "vehicle" && !vehicleValid) ||
              (step === "violation" &&
                (selectedTypes.length === 0 || gps.lat == null))
            }
          >
            Next ›
          </button>
        )}
      </div>

      <div className="iv-enforcer-tag">
        🚓 Issuing as <strong>{user.name}</strong>
      </div>
    </div>
  );
}

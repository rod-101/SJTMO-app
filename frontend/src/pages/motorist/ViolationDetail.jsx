import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { getIcon } from "../../utils/mapIcons";
import { submitMotoristReceipt } from "../../services/api";
import "../../App.css";

export default function ViolationDetail({ violation: v, onClose, onRefresh }) {
  const hasLocation = v.latitude && v.longitude;

  const statusColor =
    {
      pending: "#e65100",
      overdue: "#c62828",
      payment_submitted: "#1565c0",
      partially_paid: "#00695c",
      paid: "#2e7d32",
      resolved: "#2e7d32",
      dismissed: "#757575",
      disputed: "#6a1b9a",
    }[v.status] || "#666";

  const statusLabel =
    {
      pending: "⚠️ Pending",
      overdue: "⏰ Overdue",
      payment_submitted: "🧾 Payment Submitted",
      partially_paid: "💰 Partially Paid",
      paid: "✅ Paid",
      resolved: "✅ Resolved",
      dismissed: "🚫 Dismissed",
      disputed: "⚖️ Disputed",
    }[v.status] || v.status;

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
            background: v.status === "resolved" || v.status === "paid"
              ? "#e8f5e9"
              : v.status === "dismissed"
                ? "#f5f5f5"
                : v.status === "payment_submitted"
                  ? "#e3f2fd"
                  : v.status === "partially_paid"
                    ? "#e0f2f1"
                    : "#fff3e0",
            border: `1px solid ${v.status === "resolved" || v.status === "paid" ? "#c8e6c9" : v.status === "dismissed" ? "#e0e0e0" : v.status === "payment_submitted" ? "#bbdefb" : v.status === "partially_paid" ? "#b2dfdb" : "#ffe0b2"}`,
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
            {statusLabel}
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
          {v.fine_total != null && (
            <DetailRow label="Fine Amount" value={`₱${Number(v.fine_total).toFixed(2)}`} />
          )}
          {v.balance_due != null && (
            <DetailRow label="Balance Due" value={`₱${Number(v.balance_due).toFixed(2)}`} highlight={Number(v.balance_due) > 0} />
          )}
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

        {(v.status === "pending" || v.status === "overdue" || v.status === "partially_paid") && (
          <ReceiptUploadForm
            violation={v}
            onSubmitted={() => {
              onRefresh?.();
              onClose();
            }}
          />
        )}

        {v.status === "payment_submitted" && (
          <div
            style={{
              background: "#e3f2fd",
              border: "1px solid #bbdefb",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: "0.85rem",
              color: "#1565c0",
            }}
          >
            Your payment receipt has been submitted and is awaiting verification by the office.
          </div>
        )}

        <button className="btn btn-outline btn-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function ReceiptUploadForm({ violation, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const balanceDue = Number(violation.balance_due ?? violation.fine_total ?? 0);
  const [form, setForm] = useState({
    receipt_no: "",
    amount_paid: balanceDue > 0 ? String(balanceDue.toFixed(2)) : "",
    payment_method: "cash",
    paid_at: new Date().toISOString().slice(0, 16),
  });
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  if (!open) {
    return (
      <button
        className="btn btn-primary btn-full"
        style={{ marginBottom: 16 }}
        onClick={() => setOpen(true)}
      >
        📤 Upload Payment Receipt
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setErr("Please attach a photo of the receipt.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("ticket_id", violation.id);
      fd.append("receipt_no", form.receipt_no.trim());
      fd.append("amount_paid", form.amount_paid);
      fd.append("payment_method", form.payment_method);
      fd.append("paid_at", form.paid_at);
      fd.append("photo", photo);
      await submitMotoristReceipt(fd);
      onSubmitted();
    } catch (e2) {
      setErr(e2.message || "Failed to submit receipt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Upload Payment Receipt</div>
      <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: 10 }}>
        Balance due: ₱{balanceDue.toFixed(2)}. You may pay the full balance or a partial amount.
      </div>
      {err && <div className="alert alert-error">{err}</div>}
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Receipt No. (OR#)</label>
          <input
            className="form-input"
            value={form.receipt_no}
            onChange={(e) => setForm({ ...form, receipt_no: e.target.value })}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Amount Paid</label>
          <input
            className="form-input"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount_paid}
            onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <input className="form-input" type="text" value="Cash" disabled readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Date Paid</label>
          <input
            className="form-input"
            type="datetime-local"
            value={form.paid_at}
            onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Receipt Photo</label>
          <input
            className="form-input"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            required
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-outline btn-sm" type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={saving || !form.receipt_no.trim() || !form.amount_paid || !photo}
          >
            {saving ? "Submitting…" : "Submit Receipt"}
          </button>
        </div>
      </form>
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

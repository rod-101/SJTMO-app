import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  updateViolationStatus,
  updateViolation,
  deleteViolation,
  getViolationTypes,
  addViolationType,
  updateViolationType,
  deleteViolationType,
  getEvidencePhotoUrl,
  recordPayment,
  uploadReceiptPhoto,
  getReceiptPhotoUrl,
  verifyPayment,
  rejectPayment,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const OVERDUE_DAYS = 14;

const TABS = [
  { key: "all",      label: "All Violations" },
  { key: "pending",  label: "Pending"        },
  { key: "paid",     label: "Paid"           },
  { key: "overdue",  label: "Overdue"        },
  { key: "disputed", label: "Disputed"       },
];

const STATUS_OPTIONS = [
  "pending", "payment_submitted", "paid", "resolved", "dismissed", "disputed", "overdue",
];

const STATUS_LABEL = {
  pending: "Pending", payment_submitted: "Payment Submitted", paid: "Paid", resolved: "Resolved",
  dismissed: "Dismissed", disputed: "Disputed", overdue: "Overdue",
};

const STATUS_DESCRIPTION = {
  pending: "Violation issued; awaiting payment or review.",
  payment_submitted: "Motorist submitted a receipt photo; awaiting admin verification.",
  paid: "Payment received; awaiting final closure by admin.",
  resolved: "Case closed and settled — no further action needed.",
  dismissed: "Ticket voided/cancelled; no payment owed.",
  disputed: "Motorist has contested the violation; under review.",
  overdue: "Payment deadline passed without payment.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const formatDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");

const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

const isOverdue = (v) => v.status === "overdue" || (v.status === "pending" && daysSince(v.date_issued) > OVERDUE_DAYS);

const matchesTab = (v, tab) => {
  if (tab === "all") return true;
  if (tab === "overdue") return isOverdue(v);
  return v.status === tab;
};

// ─── Toasts ───────────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const push = (type, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  return { toasts, success: (m) => push("success", m), error: (m) => push("error", m) };
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function StatusBadge({ violation }) {
  const overdue = isOverdue(violation);
  const status = overdue ? "overdue" : violation.status;
  return (
    <span className={`badge badge-${status}`} title={STATUS_DESCRIPTION[status] || ""}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function StatusLegend() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, [open]);

  return (
    <div className="status-legend" ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        aria-label="What do statuses mean?"
        title="What do statuses mean?"
        onClick={() => setOpen((o) => !o)}
      >
        Status Guide
      </button>
      {open && (
        <div
          className="status-legend-popover"
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
            background: "var(--surface, #fff)", border: "1px solid var(--border, #e0e0e0)",
            borderRadius: 8, padding: "10px 12px", width: 280,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <div key={s} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0" }}>
              <span className={`badge badge-${s}`} style={{ flexShrink: 0 }}>{STATUS_LABEL[s]}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-light)" }}>{STATUS_DESCRIPTION[s]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonRows({ count = 5 }) {
  return <>{Array.from({ length: count }).map((_, i) => <div key={i} className="skeleton-row" />)}</>;
}

function TypeTags({ value }) {
  if (!value) return null;
  const types = value.split(",").map((t) => t.trim()).filter(Boolean);
  return (
    <div className="type-tags">
      {types.map((t, i) => <span key={i} className="type-tag">{t}</span>)}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="user-field">
      <div className="user-field-label">{label}</div>
      <div className="user-field-value">{value}</div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-light)", marginBottom: 18 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className={`btn btn-sm ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Violation Modal ─────────────────────────────────────────────────────
function EditModal({ violation, types, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    motorist_name: violation.motorist_name || "",
    violation_type: violation.violation_type || "",
    notes: violation.notes || "",
    status: violation.status || "pending",
    enforcer_name: violation.enforcer_name || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await updateViolation(violation.id, form);
      toast.success("Violation updated.");
      onSaved();
      onClose();
    } catch (e2) {
      setErr(e2.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit Violation</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>
          {violation.ticket_no}
        </div>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Motorist Name</label>
            <input className="form-input" value={form.motorist_name}
              onChange={(e) => setForm({ ...form, motorist_name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Violation Type</label>
            <select className="form-select" value={form.violation_type}
              onChange={(e) => setForm({ ...form, violation_type: e.target.value })}>
              <option value="">— Select —</option>
              {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              {form.violation_type &&
                !types.find((t) => t.name === form.violation_type.split(",")[0].trim()) && (
                <option value={form.violation_type}>{form.violation_type}</option>
              )}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Enforcer Name</label>
            <input className="form-input" value={form.enforcer_name}
              onChange={(e) => setForm({ ...form, enforcer_name: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ──────────────────────────────────────────────────────
function RecordPaymentModal({ violation, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    receipt_no: "",
    amount_paid: "",
    payment_method: "cash",
    paid_at: new Date().toISOString().slice(0, 16),
  });
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const payment = await recordPayment({
        ticket_id: violation.id,
        receipt_no: form.receipt_no.trim(),
        amount_paid: form.amount_paid,
        payment_method: form.payment_method,
        paid_at: form.paid_at,
      });
      if (photo) {
        const fd = new FormData();
        fd.append("photo", photo);
        await uploadReceiptPhoto(payment.id, fd);
      }
      toast.success("Payment recorded.");
      onSaved();
      onClose();
    } catch (e2) {
      setErr(e2.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Record Payment</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>
          {violation.ticket_no} — {violation.motorist_name}
        </div>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Receipt No. (OR#)</label>
            <input className="form-input" value={form.receipt_no}
              onChange={(e) => setForm({ ...form, receipt_no: e.target.value })} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Amount Paid</label>
            <input className="form-input" type="number" min="0.01" step="0.01"
              value={form.amount_paid}
              onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="others">Others</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date Paid</label>
            <input className="form-input" type="datetime-local" value={form.paid_at}
              onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Receipt Photo (optional)</label>
            <input className="form-input" type="file" accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={saving || !form.receipt_no.trim() || !form.amount_paid}>
              {saving ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Violation Type Row (list / inline edit) ──────────────────────────────────
function TypeRow({ type, onSaved, onDelete, toast }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [fine, setFine] = useState(type.fine ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const cancel = () => {
    setEditing(false);
    setName(type.name);
    setFine(type.fine ?? "");
    setErr("");
  };

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setErr("");
    try {
      await updateViolationType(type.id, name.trim(), fine);
      toast.success("Violation type updated.");
      setEditing(false);
      onSaved();
    } catch (e2) {
      setErr(e2.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={save} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0" }}>
        <div style={{ flex: 2 }}>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          {err && <div className="alert alert-error" style={{ marginTop: 6 }}>{err}</div>}
        </div>
        <input className="form-input" type="number" min="0" step="0.01" style={{ flex: 1 }}
          value={fine} onChange={(e) => setFine(e.target.value)} />
        <button className="btn btn-primary btn-sm" disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn btn-outline btn-sm" type="button" onClick={cancel}>Cancel</button>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border, #e0e0e0)" }}>
      <div style={{ flex: 2, fontWeight: 600 }}>{type.name}</div>
      <div style={{ flex: 1, color: "var(--text-light)" }}>₱{Number(type.fine || 0).toFixed(2)}</div>
      <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>
      <button className="btn btn-danger btn-sm" onClick={() => onDelete(type)}>Delete</button>
    </div>
  );
}

// ─── Manage Violation Types Modal ──────────────────────────────────────────────
function TypeManagerModal({ types, onClose, onAdded, onSaved, onDelete, toast }) {
  const [name, setName] = useState("");
  const [fine, setFine] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setErr("");
    try {
      await addViolationType(name.trim(), fine);
      toast.success("Violation type added.");
      setName(""); setFine("");
      onAdded();
    } catch (e2) {
      setErr(e2.message || "Failed to add type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Manage Violation Types</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16 }}>
          {types.length === 0 ? (
            <div className="empty-state-text" style={{ padding: "12px 0" }}>No violation types yet.</div>
          ) : (
            types.map((t) => (
              <TypeRow key={t.id} type={t} onSaved={onSaved} onDelete={onDelete} toast={toast} />
            ))
          )}
        </div>

        <div className="user-panel-section-title">Add New Type</div>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Violation Type Name</label>
            <input className="form-input" placeholder="e.g. Illegal U-Turn" value={name}
              onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Penalty Amount (₱)</label>
            <input className="form-input" type="number" min="0" step="0.01"
              placeholder="e.g. 500" value={fine}
              onChange={(e) => setFine(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>Close</button>
            <button className="btn btn-primary btn-sm" disabled={saving || !name.trim()}>
              {saving ? "Adding…" : "Add Type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Violation Details Panel ──────────────────────────────────────────────────
function ViolationDetailsPanel({ violation: v, onClose, onAction }) {
  const overdue = isOverdue(v);
  const hasLocation = v.latitude && v.longitude;
  const hasPayment = v.receipt_no || v.amount_paid;

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside className="user-panel">
        <div className="user-panel-header">
          <div className="user-panel-title">Violation Details</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="user-panel-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
              {v.ticket_no}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <StatusBadge violation={v} />
              {overdue && v.status === "pending" && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  ({daysSince(v.date_issued)}d old)
                </span>
              )}
            </div>
          </div>

          <div className="user-panel-section-title">Violation</div>
          <div className="user-panel-grid">
            <Field label="Type" value={<TypeTags value={v.violation_type} />} />
            <Field label="Date Issued" value={formatDateTime(v.date_issued)} />
            <Field label="Notes" value={v.notes || "—"} />
            <Field label="Location" value={hasLocation
              ? `${parseFloat(v.latitude).toFixed(5)}, ${parseFloat(v.longitude).toFixed(5)}`
              : "—"} />
          </div>

          <div className="user-panel-section-title">Motorist</div>
          <div className="user-panel-grid">
            <Field label="Name" value={v.motorist_name} />
            <Field label="Motorist ID" value={v.motorist_id
              ? <code style={{ fontSize: "0.7rem" }}>{v.motorist_id.slice(0, 8)}…</code>
              : "Unregistered"} />
          </div>

          <div className="user-panel-section-title">Issued By</div>
          <div className="user-panel-grid">
            <Field label="Enforcer" value={v.enforcer_name} />
            <Field label="Enforcer ID" value={v.enforcer_id
              ? <code style={{ fontSize: "0.7rem" }}>{v.enforcer_id.slice(0, 8)}…</code>
              : "—"} />
          </div>

          <div className="user-panel-section-title">Evidence</div>
          {v.evidence_filename ? (
            <a href={getEvidencePhotoUrl(v.id, v.access_token)} target="_blank" rel="noopener noreferrer">
              <img
                src={getEvidencePhotoUrl(v.id, v.access_token)}
                alt="Evidence"
                style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, marginBottom: 14 }}
              />
            </a>
          ) : (
            <div className="empty-state" style={{ padding: "12px 0" }}>
              <div className="empty-state-text">No evidence photo uploaded.</div>
            </div>
          )}

          <div className="user-panel-section-title">Payment</div>
          <div className="user-panel-grid">
            <Field label="Fine Amount" value={`₱${Number(v.fine_total ?? 0).toFixed(2)}`} />
            <Field
              label="Balance Due"
              value={
                <span style={{ color: Number(v.balance_due ?? 0) > 0 ? "var(--danger, #d33)" : "inherit" }}>
                  ₱{Number(v.balance_due ?? 0).toFixed(2)}
                </span>
              }
            />
          </div>
          {hasPayment ? (
            <>
              <div className="user-panel-grid">
                <Field label="Receipt #" value={v.receipt_no || "—"} />
                <Field label="Amount Paid" value={v.amount_paid ? `₱${Number(v.amount_paid).toFixed(2)}` : "—"} />
                <Field label="Paid At" value={formatDateTime(v.paid_at)} />
              </div>
              {v.status === "payment_submitted" && v.submitted_by_motorist && (
                <div style={{ fontSize: "0.75rem", color: "#1565c0", fontWeight: 600, marginTop: 6 }}>
                  🧾 Submitted by motorist — awaiting verification
                </div>
              )}
              {v.receipt_filename && v.payment_id && (
                <a href={getReceiptPhotoUrl(v.payment_id, v.access_token)} target="_blank" rel="noopener noreferrer">
                  <img
                    src={getReceiptPhotoUrl(v.payment_id, v.access_token)}
                    alt="Receipt"
                    style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, marginTop: 8 }}
                  />
                </a>
              )}
              {v.status === "payment_submitted" && v.submitted_by_motorist && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => onAction("verify-payment", v)}>
                    Verify
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onAction("reject-payment", v)}>
                    Reject
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ padding: "12px 0" }}>
              <div className="empty-state-text">No payment recorded.</div>
            </div>
          )}

          <div className="user-panel-actions">
            <button className="btn btn-outline btn-sm" onClick={() => onAction("edit", v)}>Edit</button>
            {v.status !== "paid" && v.status !== "payment_submitted" && (
              <button className="btn btn-outline btn-sm" onClick={() => onAction("mark-paid", v)}>Record Payment</button>
            )}
            {v.status !== "resolved" && (
              <button className="btn btn-outline btn-sm" onClick={() => onAction("mark-resolved", v)}>Mark Resolved</button>
            )}
            {v.status !== "pending" && (
              <button className="btn btn-outline btn-sm" onClick={() => onAction("reopen", v)}>Reopen</button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────
function RowMenu({ violation: v, isAdmin, onAction, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const item = (label, action, danger = false, disabled = false) => (
    <button
      key={action}
      className={`row-menu-item${danger ? " danger" : ""}`}
      disabled={disabled}
      onClick={() => { if (!disabled) onAction(action, v); onClose(); }}
    >
      {label}
    </button>
  );

  return (
    <div className="row-menu" ref={ref}>
      {item("View Details", "view")}
      {item("Edit Violation", "edit")}
      <div className="row-menu-divider" />
      {v.status === "payment_submitted" && item("Verify Payment", "verify-payment")}
      {v.status === "payment_submitted" && item("Reject Payment", "reject-payment", true)}
      {v.status !== "paid" && v.status !== "payment_submitted" && item("Mark as Paid", "mark-paid")}
      {v.status !== "resolved"  && item("Mark as Resolved", "mark-resolved")}
      {v.status !== "dismissed" && item("Mark as Dismissed", "mark-dismissed")}
      {v.status !== "pending"   && item("Reopen",            "reopen")}
      <div className="row-menu-divider" />
      {item("Delete", "delete", true, !isAdmin)}
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCsv(rows) {
  const headers = ["Ticket #", "Motorist", "Violation Type", "Enforcer", "Date Issued", "Status", "Fine Amount", "Balance Due", "Notes"];
  const escape = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((v) => [
      v.ticket_no, v.motorist_name, v.violation_type, v.enforcer_name,
      v.date_issued, v.status,
      Number(v.fine_total ?? 0).toFixed(2), Number(v.balance_due ?? 0).toFixed(2),
      v.notes,
    ].map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `violations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TicketsTable({ violations, onRefresh }) {
  const { user: actor } = useAuth();
  const isAdmin = actor?.role === "admin";
  const toast = useToasts();

  const [violationTypes, setViolationTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tab — persisted to localStorage
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("sjtmo_vt_tab") || "all"
  );

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterEnforcer, setFilterEnforcer] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState("date_issued");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Modals / panel
  const [editViolation, setEditViolation] = useState(null);
  const [paymentViolation, setPaymentViolation] = useState(null);
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [detailsId, setDetailsId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Load violation types for edit dropdown ────────────────────────────────
  useEffect(() => {
    getViolationTypes().then(setViolationTypes).catch(() => {});
  }, []);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // ── Tab change: reset filters + page ──────────────────────────────────────
  const switchTab = (key) => {
    setActiveTab(key);
    localStorage.setItem("sjtmo_vt_tab", key);
    setSearch(""); setDebouncedSearch("");
    setFilterStatus("all"); setFilterType("all"); setFilterEnforcer("all");
    setDateFrom(""); setDateTo("");
    setPage(1); setSelected(new Set());
    setSortKey("date_issued"); setSortDir("desc");
  };

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus, filterType, filterEnforcer, dateFrom, dateTo, pageSize]);

  // ── Tab counts (for badges) ───────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const c = { all: violations.length };
    TABS.slice(1).forEach((t) => {
      c[t.key] = violations.filter((v) => matchesTab(v, t.key)).length;
    });
    return c;
  }, [violations]);

  // ── Summary counts (above tabs) ───────────────────────────────────────────
  const counts = useMemo(() => {
    let total = 0, pending = 0, paid = 0, overdue = 0;
    violations.forEach((v) => {
      total++;
      if (v.status === "pending") pending++;
      if (v.status === "paid") paid++;
      if (isOverdue(v)) overdue++;
    });
    return { total, pending, paid, overdue };
  }, [violations]);

  // ── Distinct enforcers + types for filter dropdowns ───────────────────────
  const enforcers = useMemo(() => {
    return [...new Set(violations.map((v) => v.enforcer_name).filter(Boolean))].sort();
  }, [violations]);

  const typeOptions = useMemo(() => {
    const set = new Set();
    violations.forEach((v) => {
      (v.violation_type || "").split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => set.add(t));
    });
    return [...set].sort();
  }, [violations]);

  // ── Filtering + sorting ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = violations.filter((v) => matchesTab(v, activeTab));

    if (debouncedSearch) {
      list = list.filter((v) =>
        (v.ticket_no || "").toLowerCase().includes(debouncedSearch) ||
        (v.motorist_name || "").toLowerCase().includes(debouncedSearch) ||
        (v.enforcer_name || "").toLowerCase().includes(debouncedSearch) ||
        (v.violation_type || "").toLowerCase().includes(debouncedSearch),
      );
    }
    if (filterStatus !== "all") {
      list = list.filter((v) => (filterStatus === "overdue" ? isOverdue(v) : v.status === filterStatus));
    }
    if (filterType !== "all") {
      list = list.filter((v) =>
        (v.violation_type || "").split(",").map((t) => t.trim()).includes(filterType),
      );
    }
    if (filterEnforcer !== "all") list = list.filter((v) => v.enforcer_name === filterEnforcer);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((v) => new Date(v.date_issued).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      list = list.filter((v) => new Date(v.date_issued).getTime() < to);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let va = a[sortKey] ?? "";
      let vb = b[sortKey] ?? "";
      if (sortKey === "date_issued") { va = new Date(a.date_issued).getTime(); vb = new Date(b.date_issued).getTime(); }
      if (sortKey === "balance_due") { va = Number(a.balance_due ?? 0); vb = Number(b.balance_due ?? 0); }
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });
  }, [violations, activeTab, debouncedSearch, filterStatus, filterType, filterEnforcer, dateFrom, dateTo, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ── Selection ─────────────────────────────────────────────────────────────
  const allOnPage = paginated.length > 0 && paginated.every((v) => selected.has(v.id));
  const toggleOne = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allOnPage) paginated.forEach((v) => n.delete(v.id));
    else paginated.forEach((v) => n.add(v.id));
    return n;
  });
  const clearSel = () => setSelected(new Set());

  // ── Action dispatch ───────────────────────────────────────────────────────
  const performAction = async (action, target) => {
    switch (action) {
      case "view": return setDetailsId(target.id);
      case "edit": return setEditViolation(target);
      case "mark-paid": return setPaymentViolation(target);
      case "mark-resolved":
      case "mark-dismissed":
      case "reopen": {
        const map = {
          "mark-resolved": "resolved",
          "mark-dismissed": "dismissed", "reopen": "pending",
        };
        const newStatus = map[action];
        const label = action === "reopen" ? "Reopen" : `Mark as ${STATUS_LABEL[newStatus]}`;
        return setConfirmAction({
          title: `${label}?`,
          message: `Set ${target.ticket_no} status to "${STATUS_LABEL[newStatus]}"?`,
          confirmLabel: label,
          run: async () => {
            await updateViolationStatus(target.id, newStatus);
            toast.success(`${target.ticket_no} → ${STATUS_LABEL[newStatus]}.`);
            onRefresh();
          },
        });
      }
      case "verify-payment": return setConfirmAction({
        title: "Verify payment?",
        message: `Confirm the receipt submitted for ${target.ticket_no} is legitimate and mark this ticket as paid?`,
        confirmLabel: "Verify",
        run: async () => {
          await verifyPayment(target.payment_id);
          toast.success(`${target.ticket_no} payment verified.`);
          onRefresh();
        },
      });
      case "reject-payment": return setConfirmAction({
        title: "Reject payment submission?",
        message: `Remove the receipt submitted for ${target.ticket_no} and revert it to Pending so the motorist can resubmit?`,
        confirmLabel: "Reject",
        danger: true,
        run: async () => {
          await rejectPayment(target.payment_id);
          toast.success(`${target.ticket_no} payment submission rejected.`);
          onRefresh();
        },
      });
      case "delete": return setConfirmAction({
        title: "Delete violation?",
        message: `Permanently delete ${target.ticket_no}? This cannot be undone.`,
        confirmLabel: "Delete",
        danger: true,
        run: async () => {
          await deleteViolation(target.id);
          toast.success(`${target.ticket_no} deleted.`);
          onRefresh();
        },
      });
      default: return;
    }
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const bulkUpdateStatus = (label, newStatus) => {
    const targets = violations.filter((v) => selected.has(v.id));
    if (!targets.length) return;
    setConfirmAction({
      title: `${label} ${targets.length} violation${targets.length > 1 ? "s" : ""}?`,
      message: `This will set status to "${STATUS_LABEL[newStatus]}" for ${targets.length} record${targets.length > 1 ? "s" : ""}.`,
      confirmLabel: label,
      run: async () => {
        const res = await Promise.allSettled(targets.map((v) => updateViolationStatus(v.id, newStatus)));
        const ok = res.filter((r) => r.status === "fulfilled").length;
        if (ok) toast.success(`${ok} updated.`);
        if (ok < targets.length) toast.error(`${targets.length - ok} failed.`);
        clearSel(); onRefresh();
      },
    });
  };

  const bulkDelete = () => {
    const targets = violations.filter((v) => selected.has(v.id));
    if (!targets.length) return;
    setConfirmAction({
      title: `Delete ${targets.length} violation${targets.length > 1 ? "s" : ""}?`,
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
      run: async () => {
        const res = await Promise.allSettled(targets.map((v) => deleteViolation(v.id)));
        const ok = res.filter((r) => r.status === "fulfilled").length;
        if (ok) toast.success(`${ok} deleted.`);
        if (ok < targets.length) toast.error(`${targets.length - ok} failed.`);
        clearSel(); onRefresh();
      },
    });
  };

  const bulkExport = () => {
    const targets = violations.filter((v) => selected.has(v.id));
    if (!targets.length) return;
    exportCsv(targets);
    toast.success(`Exported ${targets.length} violation${targets.length > 1 ? "s" : ""}.`);
  };

  // ── Sort helper ───────────────────────────────────────────────────────────
  const sortBy = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };
  const si = (key) => sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  // ── Reset filters ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearch(""); setFilterStatus("all"); setFilterType("all"); setFilterEnforcer("all");
    setDateFrom(""); setDateTo("");
  };

  const refreshTypes = () => {
    getViolationTypes().then(setViolationTypes).catch(() => {});
    onRefresh();
  };

  const handleDeleteType = (type) => {
    setConfirmAction({
      title: "Delete violation type?",
      message: `Permanently delete "${type.name}"? Existing tickets already issued with this type keep their recorded name/fine.`,
      confirmLabel: "Delete",
      danger: true,
      run: async () => {
        await deleteViolationType(type.id);
        toast.success(`"${type.name}" deleted.`);
        refreshTypes();
      },
    });
  };

  const handleRefresh = async () => {
    setLoading(true);
    try { await onRefresh(); } finally { setLoading(false); }
  };

  return (
    <div>
      <ToastStack toasts={toast.toasts} />

      {/* ── Header ── */}
      <div className="um-page-header">
        <div>
          <h2 className="um-page-title">Violations Management</h2>
          <div className="um-page-subtitle">Manage tickets, payments, and case status.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <StatusLegend />
          <button className="btn btn-outline btn-sm" onClick={handleRefresh}>Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowManageTypes(true)}>Manage Violation Types</button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="um-summary-grid">
        <SummaryCard label="Total Violations" value={counts.total}    accent="blue"   />
        <SummaryCard label="Pending"          value={counts.pending}  accent="orange" />
        <SummaryCard label="Paid"             value={counts.paid}     accent="green"  />
        <SummaryCard label="Overdue"          value={counts.overdue}  accent="purple" />
      </div>

      {/* ── Status tabs ── */}
      <div className="um-tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`um-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
            <span className={`um-tab-count${activeTab === t.key ? " active" : ""}`}>
              {tabCounts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="card um-filters">
        <div className="um-filter-row">
          <div className="um-filter-search">
            <input className="form-input" placeholder="Search ticket #, motorist, type, enforcer…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-select" value={filterEnforcer} onChange={(e) => setFilterEnforcer(e.target.value)}>
            <option value="all">All Enforcers</option>
            {enforcers.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input className="form-input" type="date" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)} title="Date from" />
          <input className="form-input" type="date" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)} title="Date to" />
          <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* ── Bulk bar ── */}
      {selected.size > 0 && (
        <div className="bulk-bar">
          <div>
            <strong>{selected.size}</strong> selected
            <button className="bulk-link" onClick={clearSel}>Clear</button>
          </div>
          <div className="bulk-actions">
            <button className="btn btn-outline btn-sm" onClick={() => bulkUpdateStatus("Mark Paid",      "paid")}>Mark Paid</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkUpdateStatus("Mark Resolved",  "resolved")}>Mark Resolved</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkUpdateStatus("Mark Dismissed", "dismissed")}>Mark Dismissed</button>
            <button className="btn btn-outline btn-sm" onClick={bulkExport}>Export CSV</button>
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={bulkDelete}>Delete</button>}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="card um-table-card">
        <div className="table-wrapper um-table-wrapper">
          {loading ? (
            <div style={{ padding: "12px 4px" }}><SkeletonRows count={6} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-text">No violations found</div>
            </div>
          ) : (
            <table className="um-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th className="sortable" onClick={() => sortBy("ticket_no")}>Ticket #{si("ticket_no")}</th>
                  <th className="sortable" onClick={() => sortBy("motorist_name")}>Motorist{si("motorist_name")}</th>
                  <th>Violation Type</th>
                  <th className="sortable" onClick={() => sortBy("enforcer_name")}>Enforcer{si("enforcer_name")}</th>
                  <th className="sortable" onClick={() => sortBy("date_issued")}>Date{si("date_issued")}</th>
                  <th className="sortable" onClick={() => sortBy("status")}>Status{si("status")}</th>
                  <th className="sortable" onClick={() => sortBy("balance_due")}>Balance Due{si("balance_due")}</th>
                  <th style={{ width: 50 }} />
                </tr>
              </thead>
              <tbody>
                {paginated.map((v) => (
                  <tr
                    key={v.id}
                    className={selected.has(v.id) ? "row-selected" : ""}
                    onClick={(e) => { if (!e.target.closest(".um-row-stop")) setDetailsId(v.id); }}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="um-row-stop" style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selected.has(v.id)}
                        onChange={() => toggleOne(v.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td><span className="tct-code">{v.ticket_no}</span></td>
                    <td style={{ fontWeight: 600 }}>{v.motorist_name}</td>
                    <td><TypeTags value={v.violation_type} /></td>
                    <td>{v.enforcer_name}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>
                      {formatDate(v.date_issued)}
                    </td>
                    <td><StatusBadge violation={v} /></td>
                    <td style={{ fontWeight: 600, color: Number(v.balance_due ?? 0) > 0 ? "var(--danger, #d33)" : "inherit" }}>
                      ₱{Number(v.balance_due ?? 0).toFixed(2)}
                    </td>
                    <td className="um-row-stop" style={{ width: 50, position: "relative" }}>
                      <button
                        className="row-menu-btn"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === v.id ? null : v.id); }}
                        aria-label="Actions"
                      >⋮</button>
                      {openMenuId === v.id && (
                        <RowMenu
                          violation={v}
                          isAdmin={isAdmin}
                          onAction={performAction}
                          onClose={() => setOpenMenuId(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {filtered.length > 0 && (
          <div className="um-pagination">
            <div className="um-pagination-info">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="um-pagination-controls">
              <select className="form-select um-rows-per-page" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button className="btn btn-outline btn-sm" disabled={safePage === 1}          onClick={() => setPage(1)}>«</button>
              <button className="btn btn-outline btn-sm" disabled={safePage === 1}          onClick={() => setPage((p) => p - 1)}>‹</button>
              <span className="um-page-indicator">Page {safePage} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              <button className="btn btn-outline btn-sm" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {editViolation && (
        <EditModal
          violation={editViolation}
          types={violationTypes}
          onClose={() => setEditViolation(null)}
          onSaved={onRefresh}
          toast={toast}
        />
      )}
      {paymentViolation && (
        <RecordPaymentModal
          violation={paymentViolation}
          onClose={() => setPaymentViolation(null)}
          onSaved={onRefresh}
          toast={toast}
        />
      )}
      {showManageTypes && (
        <TypeManagerModal
          types={violationTypes}
          onClose={() => setShowManageTypes(false)}
          onAdded={refreshTypes}
          onSaved={refreshTypes}
          onDelete={handleDeleteType}
          toast={toast}
        />
      )}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          danger={confirmAction.danger}
          onClose={() => setConfirmAction(null)}
          onConfirm={async () => {
            const a = confirmAction;
            setConfirmAction(null);
            try { await a.run(); } catch (e) { toast.error(e.message || "Action failed."); }
          }}
        />
      )}
      {detailsId && (() => {
        const v = violations.find((x) => x.id === detailsId);
        if (!v) return null;
        return (
          <ViolationDetailsPanel
            violation={v}
            onClose={() => setDetailsId(null)}
            onAction={(action, vv) => { setDetailsId(null); performAction(action, vv); }}
          />
        );
      })()}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className={`um-summary-card accent-${accent}`}>
      <div className="um-summary-value">{value}</div>
      <div className="um-summary-label">{label}</div>
    </div>
  );
}

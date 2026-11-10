import React, { useEffect, useState } from "react";
import EnforcerAvatar from "./EnforcerAvatar";
import EnforcerPhotoControls from "./EnforcerPhotoControls";
import {
  getEnforcerProfile,
  updateEnforcerProfile,
  uploadEnforcerPhoto,
  deleteEnforcerPhoto,
} from "../services/api";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

// Profile body, usable inline (e.g. in an admin user drawer) or inside the
// modal below. With `editable`, admins can change phone and photo.
export function EnforcerProfileView({ enforcerId, editable = false, onChange }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError("");
    getEnforcerProfile(enforcerId)
      .then((p) => !cancelled && setProfile(p))
      .catch((err) => !cancelled && setError(err.message || "Failed to load profile."));
    return () => {
      cancelled = true;
    };
  }, [enforcerId]);

  const applyUpdate = (p) => {
    setProfile(p);
    onChange?.(p);
    return p;
  };

  const savePhone = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      applyUpdate(await updateEnforcerProfile(enforcerId, { phone }));
      setEditingPhone(false);
      setMsg({ type: "success", text: "Phone updated." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="enf-pw-msg enf-pw-msg--error">{error}</div>;
  if (!profile) return <div className="enf-profile-loading">Loading profile…</div>;

  const s = profile.stats;

  return (
    <div className="enf-profile-view">
      <div className="enf-profile-avatar-row">
        <EnforcerAvatar
          id={profile.id}
          name={profile.name}
          hasPhoto={profile.has_photo}
          version={profile.photo_updated_at}
          size={72}
        />
        <div>
          <div className="enf-profile-name">{profile.name}</div>
          <div className="enf-profile-role">
            🚓 Enforcer
            {profile.status !== "active" && (
              <span className={`badge badge-${profile.status}`} style={{ marginLeft: 8 }}>
                {profile.status}
              </span>
            )}
          </div>
          {editable && (
            <EnforcerPhotoControls
              hasPhoto={profile.has_photo}
              onUpload={async (blob) =>
                applyUpdate(await uploadEnforcerPhoto(enforcerId, blob))
              }
              onRemove={async () => applyUpdate(await deleteEnforcerPhoto(enforcerId))}
              onError={(text) => setMsg({ type: "error", text })}
            />
          )}
        </div>
      </div>

      <div className="enf-card">
        <div className="enf-card-title">Contact</div>
        <div className="enf-info-row">
          <span className="enf-info-label">Email</span>
          <span className="enf-info-value">
            {profile.email ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : "—"}
          </span>
        </div>
        <div className="enf-info-row">
          <span className="enf-info-label">Phone</span>
          {editingPhone ? (
            <form className="enf-inline-form" onSubmit={savePhone}>
              <input
                className="enf-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0917 123 4567"
                maxLength={30}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
                {saving ? "…" : "Save"}
              </button>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setEditingPhone(false)}
              >
                Cancel
              </button>
            </form>
          ) : (
            <span className="enf-info-value">
              {profile.phone ? <a href={`tel:${profile.phone}`}>{profile.phone}</a> : "—"}
              {editable && (
                <button
                  type="button"
                  className="enf-link-btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    setPhone(profile.phone || "");
                    setEditingPhone(true);
                    setMsg(null);
                  }}
                >
                  Edit
                </button>
              )}
            </span>
          )}
        </div>
        <div className="enf-info-row">
          <span className="enf-info-label">Joined</span>
          <span className="enf-info-value">{fmtDate(profile.created_at)}</span>
        </div>
        {editable && (
          <div className="enf-info-row">
            <span className="enf-info-label">Last login</span>
            <span className="enf-info-value">{fmtDateTime(profile.last_login)}</span>
          </div>
        )}
      </div>

      {msg && <div className={`enf-pw-msg enf-pw-msg--${msg.type}`}>{msg.text}</div>}

      <div className="enf-card">
        <div className="enf-card-title">Activity</div>
        <div className="enf-perf-grid">
          <div className="enf-perf-item">
            <div className="enf-perf-val">{s.tickets_today}</div>
            <div className="enf-perf-lbl">Today</div>
          </div>
          <div className="enf-perf-item">
            <div className="enf-perf-val">{s.tickets_month}</div>
            <div className="enf-perf-lbl">This Month</div>
          </div>
          <div className="enf-perf-item">
            <div className="enf-perf-val">{s.tickets_total}</div>
            <div className="enf-perf-lbl">All Time</div>
          </div>
          <div className="enf-perf-item">
            <div className="enf-perf-val">{s.tickets_resolved}</div>
            <div className="enf-perf-lbl">Resolved</div>
          </div>
        </div>
        <div className="enf-profile-foot">
          Last ticket issued: {fmtDateTime(s.last_ticket_at)}
        </div>
      </div>
    </div>
  );
}

export default function EnforcerProfileModal({ enforcerId, onClose, editable = false, onChange }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!enforcerId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal enf-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Enforcer profile"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">Enforcer Profile</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <EnforcerProfileView enforcerId={enforcerId} editable={editable} onChange={onChange} />
      </div>
    </div>
  );
}

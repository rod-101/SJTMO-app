import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { resetUserPassword } from "../../services/api";

export default function MotoristProfile({ violations }) {
  const { user } = useAuth();
  const [showPwForm, setShowPwForm] = useState(false);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const pending  = violations.filter((v) => v.status === "pending").length;
    const paid     = violations.filter((v) => v.status === "paid").length;
    const resolved = violations.filter((v) => v.status === "resolved").length;
    const overdue  = violations.filter((v) => v.status === "overdue").length;
    return { total: violations.length, pending, paid, resolved, overdue };
  }, [violations]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (pw.next.length < 8) {
      setPwMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setSaving(true);
    setPwMsg(null);
    try {
      await resetUserPassword(user.id, pw.next);
      setPwMsg({ type: "success", text: "Password updated successfully." });
      setPw({ next: "", confirm: "" });
      setShowPwForm(false);
    } catch (err) {
      setPwMsg({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="enf-profile">
      <div className="enf-page-header">
        <div className="enf-page-title">Profile</div>
        <div className="enf-page-sub">Your account and violation summary</div>
      </div>

      <div className="enf-profile-grid">
        {/* Left column: identity + account */}
        <div className="enf-profile-col">
          <div className="enf-profile-avatar-row">
            <div className="enf-profile-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="enf-profile-name">{user.name}</div>
              <div className="enf-profile-role">🚗 Motorist</div>
            </div>
          </div>

          <div className="enf-card">
            <div className="enf-card-title">Account Info</div>
            <div className="enf-info-row">
              <span className="enf-info-label">Email</span>
              <span className="enf-info-value">{user.email || "—"}</span>
            </div>
            <div className="enf-info-row">
              <span className="enf-info-label">Role</span>
              <span className="enf-info-value">Motorist</span>
            </div>
            <div className="enf-info-row">
              <span className="enf-info-label">Contact</span>
              <span className="enf-info-value">{user.contact_no || "—"}</span>
            </div>
            <div className="enf-info-row">
              <span className="enf-info-label">ID</span>
              <span className="enf-info-value">
                <code style={{ fontSize: "0.75rem" }}>
                  {user.id ? `${user.id.slice(0, 8)}…` : "—"}
                </code>
              </span>
            </div>
          </div>
        </div>

        {/* Right column: violation summary + actions */}
        <div className="enf-profile-col">
          <div className="enf-card">
            <div className="enf-card-title">Violation Summary</div>
            <div className="enf-perf-grid">
              <div className="enf-perf-item">
                <div className="enf-perf-val">{stats.total}</div>
                <div className="enf-perf-lbl">Total</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{stats.pending}</div>
                <div className="enf-perf-lbl">Pending</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{stats.paid}</div>
                <div className="enf-perf-lbl">Paid</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{stats.resolved}</div>
                <div className="enf-perf-lbl">Resolved</div>
              </div>
            </div>
            {stats.overdue > 0 && (
              <div className="alert alert-error" style={{ marginTop: 10 }}>
                ⚠ {stats.overdue} overdue violation{stats.overdue > 1 ? "s" : ""}
              </div>
            )}
          </div>

          <div className="enf-card">
            <div className="enf-card-title">Account</div>
            <button
              className="enf-action-btn"
              onClick={() => { setShowPwForm((v) => !v); setPwMsg(null); }}
            >
              🔑 Change Password
            </button>

            {showPwForm && (
              <form className="enf-pw-form" onSubmit={handleChangePassword}>
                <input
                  className="enf-input"
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  required
                />
                <input
                  className="enf-input"
                  type="password"
                  placeholder="Confirm new password"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  required
                />
                {pwMsg && (
                  <div className={`enf-pw-msg enf-pw-msg--${pwMsg.type}`}>
                    {pwMsg.text}
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving}
                  style={{ width: "100%", marginTop: 4 }}
                >
                  {saving ? "Saving…" : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

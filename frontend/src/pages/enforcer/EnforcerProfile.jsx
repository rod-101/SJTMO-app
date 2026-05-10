import React, { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { resetUserPassword } from "../../services/api";

export default function EnforcerProfile({ violations }) {
  const { user } = useAuth();
  const [showPwForm, setShowPwForm] = useState(false);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const issuedToday = violations.filter(
      (v) => new Date(v.date_issued).toDateString() === todayStr
    ).length;

    const monthly = violations.filter((v) => {
      const d = new Date(v.date_issued);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const unpaid = violations.filter(
      (v) => v.status === "unpaid" || v.status === "overdue"
    ).length;

    return { issuedToday, monthly, unpaid, total: violations.length };
  }, [violations]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (pw.next.length < 6) {
      setPwMsg({ type: "error", text: "Password must be at least 6 characters." });
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
        <div className="enf-page-sub">Your account and performance</div>
      </div>

      {/* Two-column at desktop: left = identity + account, right = performance + actions */}
      <div className="enf-profile-grid">
        {/* Left column */}
        <div className="enf-profile-col">
          <div className="enf-profile-avatar-row">
            <div className="enf-profile-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="enf-profile-name">{user.name}</div>
              <div className="enf-profile-role">🚓 Enforcer</div>
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
              <span className="enf-info-value">Enforcer</span>
            </div>
            <div className="enf-info-row">
              <span className="enf-info-label">ID</span>
              <span className="enf-info-value">#{user.id}</span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="enf-profile-col">
          <div className="enf-card">
            <div className="enf-card-title">Performance</div>
            <div className="enf-perf-grid">
              <div className="enf-perf-item">
                <div className="enf-perf-val">{stats.issuedToday}</div>
                <div className="enf-perf-lbl">Today</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{stats.monthly}</div>
                <div className="enf-perf-lbl">This Month</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{stats.total}</div>
                <div className="enf-perf-lbl">All Time</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{stats.unpaid}</div>
                <div className="enf-perf-lbl">Unpaid</div>
              </div>
            </div>
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
                  placeholder="New password"
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

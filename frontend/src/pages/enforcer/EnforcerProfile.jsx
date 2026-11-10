import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  changePassword,
  getMyEnforcerProfile,
  updateMyEnforcerProfile,
  uploadMyEnforcerPhoto,
  deleteMyEnforcerPhoto,
  getEnforcerDirectory,
} from "../../services/api";
import EnforcerAvatar from "../../components/EnforcerAvatar";
import EnforcerPhotoControls from "../../components/EnforcerPhotoControls";
import EnforcerProfileModal from "../../components/EnforcerProfileModal";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
    : "—";

export default function EnforcerProfile({ violations }) {
  const { user } = useAuth();

  // ── Own profile ──
  const [profile, setProfile] = useState(null);
  const [profileErr, setProfileErr] = useState("");
  const [msg, setMsg] = useState(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // ── Password ──
  const [showPwForm, setShowPwForm] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  // ── Directory ──
  const [directory, setDirectory] = useState([]);
  const [dirErr, setDirErr] = useState("");
  const [query, setQuery] = useState("");
  const [viewingId, setViewingId] = useState(null);

  useEffect(() => {
    getMyEnforcerProfile()
      .then(setProfile)
      .catch((err) => setProfileErr(err.message || "Failed to load profile."));
    getEnforcerDirectory()
      .then(setDirectory)
      .catch((err) => setDirErr(err.message || "Failed to load directory."));
  }, []);

  // Refresh server stats when a new ticket is issued in this session.
  useEffect(() => {
    if (!profile) return;
    getMyEnforcerProfile().then(setProfile).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violations.length]);

  const colleagues = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory
      .filter((e) => e.id !== user.id)
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q));
  }, [directory, query, user.id]);

  const savePhone = async (e) => {
    e.preventDefault();
    setSavingPhone(true);
    setMsg(null);
    try {
      setProfile(await updateMyEnforcerProfile({ phone }));
      setEditingPhone(false);
      setMsg({ type: "success", text: "Phone number saved." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to save." });
    } finally {
      setSavingPhone(false);
    }
  };

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
    setSavingPw(true);
    setPwMsg(null);
    try {
      await changePassword(pw.current, pw.next);
      setPwMsg({ type: "success", text: "Password updated. Other devices have been signed out." });
      setPw({ current: "", next: "", confirm: "" });
      setShowPwForm(false);
    } catch (err) {
      setPwMsg({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setSavingPw(false);
    }
  };

  const s = profile?.stats;

  return (
    <div className="enf-profile">
      <div className="enf-page-header">
        <div className="enf-page-title">Profile</div>
        <div className="enf-page-sub">Your profile, performance, and fellow enforcers</div>
      </div>

      <div className="enf-profile-grid">
        {/* Left column: identity + contact */}
        <div className="enf-profile-col">
          <div className="enf-profile-avatar-row">
            <EnforcerAvatar
              id={user.id}
              name={profile?.name || user.name}
              hasPhoto={profile?.has_photo}
              version={profile?.photo_updated_at}
              size={72}
            />
            <div>
              <div className="enf-profile-name">{profile?.name || user.name}</div>
              <div className="enf-profile-role">🚓 Enforcer</div>
              {profile && (
                <EnforcerPhotoControls
                  hasPhoto={profile.has_photo}
                  onUpload={async (blob) => setProfile(await uploadMyEnforcerPhoto(blob))}
                  onRemove={async () => setProfile(await deleteMyEnforcerPhoto())}
                  onError={(text) => setMsg({ type: "error", text })}
                />
              )}
            </div>
          </div>

          {profileErr && <div className="enf-pw-msg enf-pw-msg--error">{profileErr}</div>}
          {msg && <div className={`enf-pw-msg enf-pw-msg--${msg.type}`}>{msg.text}</div>}

          <div className="enf-card">
            <div className="enf-card-title">Contact Info</div>
            <div className="enf-info-row">
              <span className="enf-info-label">Email</span>
              <span className="enf-info-value">{profile?.email || user.email || "—"}</span>
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
                  <button className="btn btn-primary btn-sm" type="submit" disabled={savingPhone}>
                    {savingPhone ? "…" : "Save"}
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
                  {profile?.phone || "—"}
                  {profile && (
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
              <span className="enf-info-value">{fmtDate(profile?.created_at)}</span>
            </div>
          </div>
          <div className="enf-profile-foot">
            Your profile is visible to admins and fellow enforcers.
          </div>
        </div>

        {/* Right column: performance + account */}
        <div className="enf-profile-col">
          <div className="enf-card">
            <div className="enf-card-title">Performance</div>
            <div className="enf-perf-grid">
              <div className="enf-perf-item">
                <div className="enf-perf-val">{s ? s.tickets_today : "–"}</div>
                <div className="enf-perf-lbl">Today</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{s ? s.tickets_month : "–"}</div>
                <div className="enf-perf-lbl">This Month</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{s ? s.tickets_total : "–"}</div>
                <div className="enf-perf-lbl">All Time</div>
              </div>
              <div className="enf-perf-item">
                <div className="enf-perf-val">{s ? s.tickets_unpaid : "–"}</div>
                <div className="enf-perf-lbl">Unpaid</div>
              </div>
            </div>
          </div>

          <div className="enf-card">
            <div className="enf-card-title">Account</div>
            <button
              className="enf-action-btn"
              onClick={() => {
                setShowPwForm((v) => !v);
                setPwMsg(null);
              }}
            >
              🔑 Change Password
            </button>

            {showPwForm && (
              <form className="enf-pw-form" onSubmit={handleChangePassword}>
                <input
                  className="enf-input"
                  type="password"
                  placeholder="Current password"
                  autoComplete="current-password"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                  required
                />
                <input
                  className="enf-input"
                  type="password"
                  placeholder="New password (min 8 chars)"
                  autoComplete="new-password"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  required
                />
                <input
                  className="enf-input"
                  type="password"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  required
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={savingPw}
                  style={{ width: "100%", marginTop: 4 }}
                >
                  {savingPw ? "Saving…" : "Update Password"}
                </button>
              </form>
            )}
            {pwMsg && <div className={`enf-pw-msg enf-pw-msg--${pwMsg.type}`}>{pwMsg.text}</div>}
          </div>
        </div>
      </div>

      {/* Directory of fellow enforcers */}
      <div className="enf-card enf-dir">
        <div className="enf-card-title">Enforcer Directory</div>
        <input
          className="enf-input"
          type="search"
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {dirErr && <div className="enf-pw-msg enf-pw-msg--error">{dirErr}</div>}
        {!dirErr && colleagues.length === 0 && (
          <div className="enf-dir-empty">
            {query ? "No enforcers match your search." : "No other enforcers yet."}
          </div>
        )}
        <ul className="enf-dir-list">
          {colleagues.map((e) => (
            <li key={e.id}>
              <button type="button" className="enf-dir-item" onClick={() => setViewingId(e.id)}>
                <EnforcerAvatar
                  id={e.id}
                  name={e.name}
                  hasPhoto={e.has_photo}
                  version={e.photo_updated_at}
                  size={40}
                />
                <span className="enf-dir-text">
                  <span className="enf-dir-name">{e.name}</span>
                  <span className="enf-dir-sub">{e.phone || e.email}</span>
                </span>
                <span className="enf-dir-chev" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {viewingId && (
        <EnforcerProfileModal enforcerId={viewingId} onClose={() => setViewingId(null)} />
      )}
    </div>
  );
}

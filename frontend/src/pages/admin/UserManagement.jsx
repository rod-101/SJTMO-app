import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  forceLogoutUser,
  getUserActivity,
  resendInvite,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = ["admin", "enforcer", "motorist"];
const STATUSES = ["active", "inactive", "suspended"];
const ROLE_RANK = { motorist: 1, enforcer: 2, admin: 3 };
const ROLE_LABEL = { admin: "Admin", enforcer: "Enforcer", motorist: "Motorist" };

const TABS = [
  { key: "all",      label: "All Users",        role: null },
  { key: "enforcer", label: "Enforcers",         role: "enforcer" },
  { key: "motorist", label: "Motorists",         role: "motorist" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const formatRelative = (d) => {
  if (!d) return "Never";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
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
function StatusBadge({ status }) {
  return <span className={`status-pill status-${status || "active"}`}>{status || "active"}</span>;
}

function SkeletonRows({ count = 5 }) {
  return <>{Array.from({ length: count }).map((_, i) => <div key={i} className="skeleton-row" />)}</>;
}

function UserAvatar({ name, size }) {
  return <div className={`user-avatar${size === "lg" ? " lg" : ""}`}>{initials(name)}</div>;
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

// ─── Add User Modal ───────────────────────────────────────────────────────────
// Invite-only: admin supplies name/email/role, the invitee sets their own
// password via the emailed accept-invite link. Motorists self-register
// instead, so this modal only offers enforcer/admin.
const INVITABLE_ROLES = ["enforcer", "admin"];

function AddUserModal({ onClose, onCreated, toast, actorRole, defaultRole }) {
  const initialRole = INVITABLE_ROLES.includes(defaultRole) ? defaultRole : "enforcer";
  const [form, setForm] = useState({ name: "", email: "", role: initialRole });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) return setErr("Full name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErr("Enter a valid email address.");
    setSubmitting(true);
    try {
      await createUser({ name: form.name.trim(), email: form.email.trim(), role: form.role });
      toast.success("Invite sent.");
      onCreated();
      onClose();
    } catch (e2) {
      setErr(e2.message || "Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add User</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {INVITABLE_ROLES.filter((r) => actorRole === "admin" || r !== "admin").map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>
            An invite link will be emailed to this address. They'll set their own password.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? "Sending…" : "Send Invite"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved, toast, actorRole }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role, status: user.status || "active" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(user.id, form);
      toast.success("User updated.");
      onSaved();
      onClose();
    } catch (e2) {
      setErr(e2.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit User</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.filter((r) => actorRole === "admin" || ROLE_RANK[r] <= ROLE_RANK[actorRole]).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
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

// ─── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, toast }) {
  const [pwd, setPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (pwd.length < 8) return setErr("Password must be at least 8 characters.");
    setSaving(true);
    try {
      await resetUserPassword(user.id, pwd);
      toast.success(`Password reset for ${user.name}.`);
      onClose();
    } catch (e2) {
      setErr(e2.message || "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Reset Password</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: 14 }}>
          Set a new password for <strong>{user.name}</strong>. They will need to log in again.
        </p>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" autoFocus value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Resetting…" : "Reset Password"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Details Panel ───────────────────────────────────────────────────────
function UserDetailsPanel({ userId, onClose, onAction, stats }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    setErr("");
    getUserActivity(userId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(e.message || "Failed to load activity."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [userId]);

  // Merge violation stats passed from parent
  const issued = stats?.issued ?? data?.summary?.violations_issued ?? 0;
  const received = stats?.received ?? data?.summary?.violations_received ?? 0;

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside className="user-panel">
        <div className="user-panel-header">
          <div className="user-panel-title">User Details</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {loading ? (
          <div className="user-panel-body"><SkeletonRows count={6} /></div>
        ) : err ? (
          <div className="user-panel-body"><div className="alert alert-error">{err}</div></div>
        ) : data ? (
          <div className="user-panel-body">
            <div className="user-panel-profile">
              <UserAvatar name={data.user.name} size="lg" />
              <div>
                <div className="user-panel-name">{data.user.name}</div>
                <div className="user-panel-email">{data.user.email}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <span className={`badge badge-${data.user.role}`}>{ROLE_LABEL[data.user.role] || data.user.role}</span>
                  <StatusBadge status={data.user.status} />
                </div>
              </div>
            </div>

            <div className="user-panel-grid">
              <Field label="Created" value={formatDate(data.user.created_at)} />
              <Field label="Last Login" value={formatRelative(data.user.last_login)} />
              <Field label="User ID" value={<code style={{ fontSize: "0.7rem" }}>{data.user.id.slice(0, 8)}…</code>} />
            </div>

            <div className="user-panel-section-title">Activity Summary</div>
            <div className="user-panel-grid">
              <Field label="Tickets Issued" value={issued} />
              <Field label="Tickets Received" value={received} />
            </div>

            <div className="user-panel-section-title">Recent Actions</div>
            {data.logs.length === 0 ? (
              <div className="empty-state" style={{ padding: "16px 0" }}>
                <div className="empty-state-text">No audit entries yet.</div>
              </div>
            ) : (
              <ul className="audit-list">
                {data.logs.slice(0, 20).map((log) => (
                  <li key={log.id}>
                    <div className="audit-action">{log.action}</div>
                    <div className="audit-meta">{log.user_name || "system"} · {formatRelative(log.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}

            <div className="user-panel-actions">
              <button className="btn btn-outline btn-sm" onClick={() => onAction("edit", data.user)}>Edit</button>
              <button className="btn btn-outline btn-sm" onClick={() => onAction("reset-password", data.user)}>Reset Password</button>
              <button className="btn btn-outline btn-sm" onClick={() => onAction("force-logout", data.user)}>Force Logout</button>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────
function RowMenu({ user, canManage, onAction, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const keyHandler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  const item = (label, action, danger = false, disabled = false) => (
    <button
      key={action}
      className={`row-menu-item${danger ? " danger" : ""}`}
      disabled={disabled}
      onClick={() => { if (!disabled) onAction(action, user); onClose(); }}
    >
      {label}
    </button>
  );

  return (
    <div className="row-menu" ref={ref}>
      {item("View Details", "view")}
      {item("Edit User", "edit", false, !canManage)}
      {user.role !== "motorist" && user.status === "pending_verification" &&
        item("Resend Invite", "resend-invite", false, !canManage)}
      {item("Reset Password", "reset-password", false, !canManage)}
      {item("Force Logout", "force-logout", false, !canManage)}
      {user.status !== "active"    && item("Activate",   "activate",   false, !canManage)}
      {user.status !== "inactive"  && item("Deactivate", "deactivate", false, !canManage)}
      {user.status !== "suspended" && item("Suspend",    "suspend",    false, !canManage)}
      <div className="row-menu-divider" />
      {item("Delete User", "delete", true, !canManage)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserManagement({ violations = [] }) {
  const { user: actor } = useAuth();
  const toast = useToasts();

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");

  // Tab — persisted to localStorage
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("sjtmo_um_tab") || "all"
  );

  // Filters (reset when tab changes)
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHasViolations, setFilterHasViolations] = useState("all"); // motorist
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo]     = useState("");

  // Sort
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Modals / panel
  const [showAdd, setShowAdd]         = useState(false);
  const [editUser, setEditUser]       = useState(null);
  const [resetUser, setResetUser]     = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [detailsId, setDetailsId]     = useState(null);
  const [openMenuId, setOpenMenuId]   = useState(null);

  // ── Violation stats indexed by user id ────────────────────────────────────
  const violationStats = useMemo(() => {
    const map = {};
    violations.forEach((v) => {
      if (v.enforcer_id) {
        map[v.enforcer_id] = map[v.enforcer_id] || { issued: 0, received: 0 };
        map[v.enforcer_id].issued++;
      }
      if (v.motorist_id) {
        map[v.motorist_id] = map[v.motorist_id] || { issued: 0, received: 0 };
        map[v.motorist_id].received++;
      }
    });
    return map;
  }, [violations]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setErr("");
    try {
      setUsers(await getUsers());
    } catch (e) {
      setErr(e.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // ── Tab change: reset filters + page ────────────────────────────────────
  const switchTab = (key) => {
    setActiveTab(key);
    localStorage.setItem("sjtmo_um_tab", key);
    setSearch(""); setDebounced(""); setFilterStatus("all");
    setFilterHasViolations("all"); setCreatedFrom(""); setCreatedTo("");
    setPage(1); setSelected(new Set());
    // Default sort by created_at desc for all tabs
    setSortKey("created_at"); setSortDir("desc");
  };

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus, filterHasViolations, createdFrom, createdTo, pageSize]);

  // ── Tab config ─────────────────────────────────────────────────────────
  const currentTab = TABS.find((t) => t.key === activeTab) || TABS[0];

  // ── Counts per tab (for badges) ─────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const c = { all: users.length };
    TABS.slice(1).forEach((t) => {
      c[t.key] = users.filter((u) => u.role === t.role).length;
    });
    return c;
  }, [users]);

  // ── Summary card counts ────────────────────────────────────────────────
  const counts = useMemo(() => {
    let total = 0, active = 0, suspended = 0, enforcers = 0;
    users.forEach((u) => {
      total++;
      if ((u.status || "active") === "active") active++;
      if (u.status === "suspended") suspended++;
      if (u.role === "enforcer") enforcers++;
    });
    return { total, active, suspended, enforcers };
  }, [users]);

  // ── Filtering + sorting ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = currentTab.role
      ? users.filter((u) => u.role === currentTab.role)
      : users;

    if (debouncedSearch) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(debouncedSearch) ||
          u.email.toLowerCase().includes(debouncedSearch) ||
          u.id.toLowerCase().includes(debouncedSearch),
      );
    }
    if (filterStatus !== "all") list = list.filter((u) => (u.status || "active") === filterStatus);
    if (createdFrom) {
      const from = new Date(createdFrom).getTime();
      list = list.filter((u) => new Date(u.created_at).getTime() >= from);
    }
    if (createdTo) {
      const to = new Date(createdTo).getTime() + 86400000;
      list = list.filter((u) => new Date(u.created_at).getTime() < to);
    }
    // Motorist-specific: with/without violations
    if (activeTab === "motorist" && filterHasViolations !== "all") {
      list = list.filter((u) => {
        const count = violationStats[u.id]?.received || 0;
        return filterHasViolations === "yes" ? count > 0 : count === 0;
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let va = a[sortKey] ?? "";
      let vb = b[sortKey] ?? "";
      // Virtual sort keys
      if (sortKey === "_issued")   { va = violationStats[a.id]?.issued   || 0; vb = violationStats[b.id]?.issued   || 0; }
      if (sortKey === "_received") { va = violationStats[a.id]?.received  || 0; vb = violationStats[b.id]?.received  || 0; }
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });
  }, [users, currentTab, debouncedSearch, filterStatus, filterHasViolations, createdFrom, createdTo, sortKey, sortDir, activeTab, violationStats]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ── Selection ──────────────────────────────────────────────────────────
  const allOnPage = paginated.length > 0 && paginated.every((u) => selected.has(u.id));
  const toggleOne = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allOnPage) paginated.forEach((u) => n.delete(u.id));
    else paginated.forEach((u) => n.add(u.id));
    return n;
  });
  const clearSel = () => setSelected(new Set());

  // ── Permissions ────────────────────────────────────────────────────────
  const canManage = (target) =>
    actor && actor.id !== target.id && (ROLE_RANK[actor.role] || 0) >= (ROLE_RANK[target.role] || 0);

  // ── Action dispatch ────────────────────────────────────────────────────
  const performAction = async (action, target) => {
    switch (action) {
      case "view": return setDetailsId(target.id);
      case "edit": return setEditUser(target);
      case "reset-password": return setResetUser(target);
      case "resend-invite":
        try {
          await resendInvite(target.id);
          toast.success(`Invite resent to ${target.name}.`);
        } catch (e) {
          toast.error(e.message || "Failed to resend invite.");
        }
        return;
      case "activate":
      case "deactivate":
      case "suspend": {
        const map = { activate: "active", deactivate: "inactive", suspend: "suspended" };
        return setConfirmAction({
          title: `${action[0].toUpperCase() + action.slice(1)} user?`,
          message: `Set ${target.name}'s status to "${map[action]}"?`,
          confirmLabel: action[0].toUpperCase() + action.slice(1),
          danger: action === "suspend",
          run: async () => { await updateUser(target.id, { status: map[action] }); toast.success(`${target.name} ${action}d.`); fetchUsers(); },
        });
      }
      case "force-logout": return setConfirmAction({
        title: "Force logout?",
        message: `Invalidate all sessions for ${target.name}?`,
        confirmLabel: "Force Logout",
        run: async () => { await forceLogoutUser(target.id); toast.success(`${target.name} forced out.`); },
      });
      case "delete": return setConfirmAction({
        title: "Delete user?",
        message: `Permanently delete ${target.name}? Consider suspending instead.`,
        confirmLabel: "Delete User",
        danger: true,
        run: async () => { await deleteUser(target.id); toast.success(`${target.name} deleted.`); fetchUsers(); },
      });
      default: return;
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────
  const bulkApply = (label, runner) => {
    const targets = users.filter((u) => selected.has(u.id) && canManage(u));
    if (!targets.length) return toast.error("No selected users you can modify.");
    setConfirmAction({
      title: `${label} ${targets.length} user${targets.length > 1 ? "s" : ""}?`,
      message: `This will affect ${targets.length} account${targets.length > 1 ? "s" : ""}.`,
      confirmLabel: label,
      danger: /delete|suspend/i.test(label),
      run: async () => {
        const res = await Promise.allSettled(targets.map(runner));
        const ok = res.filter((r) => r.status === "fulfilled").length;
        if (ok) toast.success(`${ok} user${ok > 1 ? "s" : ""} updated.`);
        if (ok < targets.length) toast.error(`${targets.length - ok} failed.`);
        clearSel(); fetchUsers();
      },
    });
  };

  // ── Sort helper ────────────────────────────────────────────────────────
  const sortBy = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };
  const si = (key) => sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  // ── Column definitions per tab ─────────────────────────────────────────
  const columns = useMemo(() => {
    const base = [
      { key: "checkbox", label: "", width: 36 },
      { key: "name",     label: "Name",        sortKey: "name" },
      { key: "email",    label: "Email",        sortKey: "email" },
    ];
    if (activeTab === "all") return [
      ...base,
      { key: "role",       label: "Role",         sortKey: "role" },
      { key: "status",     label: "Status",        sortKey: "status" },
      { key: "last_login", label: "Last Login",    sortKey: "last_login" },
      { key: "created_at", label: "Created",       sortKey: "created_at" },
      { key: "actions",    label: "",              width: 50 },
    ];
    if (activeTab === "enforcer") return [
      ...base,
      { key: "status",     label: "Status",        sortKey: "status" },
      { key: "_issued",    label: "Tickets Issued", sortKey: "_issued" },
      { key: "last_login", label: "Last Activity",  sortKey: "last_login" },
      { key: "actions",    label: "",              width: 50 },
    ];
    // motorist
    return [
      ...base,
      { key: "status",     label: "Status",        sortKey: "status" },
      { key: "_received",  label: "Violations",    sortKey: "_received" },
      { key: "last_login", label: "Last Activity",  sortKey: "last_login" },
      { key: "actions",    label: "",              width: 50 },
    ];
  }, [activeTab]);

  const renderCell = (col, u) => {
    const stats = violationStats[u.id] || { issued: 0, received: 0 };
    switch (col.key) {
      case "checkbox": return (
        <td key="checkbox" className="um-row-stop" style={{ width: 36 }}>
          <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} onClick={(e) => e.stopPropagation()} />
        </td>
      );
      case "name": return (
        <td key="name">
          <div className="user-cell">
            <UserAvatar name={u.name} />
            <div className="user-cell-name">{u.name}</div>
          </div>
        </td>
      );
      case "email": return <td key="email" className="um-cell-email" title={u.email}>{u.email}</td>;
      case "role":  return <td key="role"><span className={`badge badge-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span></td>;
      case "status": return <td key="status"><StatusBadge status={u.status} /></td>;
      case "last_login": return <td key="last_login" style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>{formatRelative(u.last_login)}</td>;
      case "created_at": return <td key="created_at" style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>{formatDate(u.created_at)}</td>;
      case "_issued": return (
        <td key="_issued">
          <span className={`um-stat-chip${stats.issued > 0 ? " blue" : ""}`}>{stats.issued}</span>
        </td>
      );
      case "_received": return (
        <td key="_received">
          <span className={`um-stat-chip${stats.received > 0 ? " orange" : ""}`}>{stats.received}</span>
        </td>
      );
      case "actions": return (
        <td key="actions" className="um-row-stop" style={{ width: 50, position: "relative" }}>
          <button
            className="row-menu-btn"
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === u.id ? null : u.id); }}
            aria-label="Actions"
          >⋮</button>
          {openMenuId === u.id && (
            <RowMenu user={u} canManage={canManage(u)} onAction={performAction} onClose={() => setOpenMenuId(null)} />
          )}
        </td>
      );
      default: return <td key={col.key} />;
    }
  };

  const resetFilters = () => {
    setSearch(""); setFilterStatus("all"); setFilterHasViolations("all");
    setCreatedFrom(""); setCreatedTo("");
  };

  const defaultRoleForTab = currentTab.role || "motorist";

  return (
    <div>
      <ToastStack toasts={toast.toasts} />

      {/* ── Header ── */}
      <div className="um-page-header">
        <div>
          <h2 className="um-page-title">User Management</h2>
          <div className="um-page-subtitle">Manage all system users across roles.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add User</button>
      </div>

      {/* ── Summary cards ── */}
      <div className="um-summary-grid">
        <SummaryCard label="Total Users"    value={counts.total}     accent="blue"   />
        <SummaryCard label="Active"         value={counts.active}    accent="green"  />
        <SummaryCard label="Suspended"      value={counts.suspended} accent="orange" />
        <SummaryCard label="Enforcers"      value={counts.enforcers} accent="purple" />
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {/* ── Role tabs ── */}
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
            <input className="form-input" placeholder="Search name, email, or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
          {activeTab === "motorist" && (
            <select className="form-select" value={filterHasViolations} onChange={(e) => setFilterHasViolations(e.target.value)}>
              <option value="all">All Motorists</option>
              <option value="yes">With Violations</option>
              <option value="no">No Violations</option>
            </select>
          )}
          {activeTab === "all" && <>
            <input className="form-input" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} title="Created from" />
            <input className="form-input" type="date" value={createdTo}   onChange={(e) => setCreatedTo(e.target.value)}   title="Created to"   />
          </>}
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
            <button className="btn btn-outline btn-sm" onClick={() => bulkApply("Activate",   (u) => updateUser(u.id, { status: "active" }))}>Activate</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkApply("Deactivate", (u) => updateUser(u.id, { status: "inactive" }))}>Deactivate</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkApply("Suspend",    (u) => updateUser(u.id, { status: "suspended" }))}>Suspend</button>
            <button className="btn btn-danger btn-sm"  onClick={() => bulkApply("Delete",     (u) => deleteUser(u.id))}>Delete</button>
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
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">No {currentTab.label.toLowerCase()} found</div>
            </div>
          ) : (
            <table className="um-table">
              <thead>
                <tr>
                  {columns.map((col) =>
                    col.key === "checkbox" ? (
                      <th key="checkbox" style={{ width: 36 }}>
                        <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all" />
                      </th>
                    ) : (
                      <th
                        key={col.key}
                        style={col.width ? { width: col.width } : undefined}
                        className={col.sortKey ? "sortable" : undefined}
                        onClick={col.sortKey ? () => sortBy(col.sortKey) : undefined}
                      >
                        {col.label}{col.sortKey ? si(col.sortKey) : ""}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {paginated.map((u) => (
                  <tr
                    key={u.id}
                    className={selected.has(u.id) ? "row-selected" : ""}
                    onClick={(e) => { if (!e.target.closest(".um-row-stop")) setDetailsId(u.id); }}
                  >
                    {columns.map((col) => renderCell(col, u))}
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
      {showAdd && (
        <AddUserModal onClose={() => setShowAdd(false)} onCreated={fetchUsers} toast={toast} actorRole={actor?.role} defaultRole={defaultRoleForTab} />
      )}
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={fetchUsers} toast={toast} actorRole={actor?.role} />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} toast={toast} />
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
      {detailsId && (
        <UserDetailsPanel
          userId={detailsId}
          onClose={() => setDetailsId(null)}
          stats={violationStats[detailsId]}
          onAction={(action, u) => { setDetailsId(null); performAction(action, u); }}
        />
      )}
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

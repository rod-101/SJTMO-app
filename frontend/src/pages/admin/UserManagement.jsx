import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  forceLogoutUser,
  getUserActivity,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

const ROLES = ["admin", "enforcer", "motorist", "treasury"];
const STATUSES = ["active", "inactive", "suspended"];
const ROLE_RANK = { motorist: 1, enforcer: 2, treasury: 3, admin: 4 };

const ROLE_LABEL = {
  admin: "Admin",
  enforcer: "Enforcer",
  motorist: "Motorist",
  treasury: "Treasury",
};

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

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

// ─── Toasts ────────────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const push = (type, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      3500,
    );
  };
  return {
    toasts,
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-light)", marginBottom: 18 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button
            className={`btn btn-sm ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Invite User Modal ───────────────────────────────────────────────────
function AddUserModal({ onClose, onCreated, toast, actorRole }) {
  const [form, setForm] = useState({ name: "", email: "", role: "motorist", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) return setErr("Full name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return setErr("Enter a valid email address.");
    if (form.password.length < 8) return setErr("Password must be at least 8 characters.");
    setSubmitting(true);
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success("User created.");
      onCreated();
      onClose();
    } catch (e2) {
      setErr(e2.message || "Failed to create user.");
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
            <input
              className="form-input"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.filter((r) => actorRole === "admin" || r !== "admin").map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Initial Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved, toast, actorRole }) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || "active",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
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
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.filter(
                (r) => actorRole === "admin" || ROLE_RANK[r] <= ROLE_RANK[actorRole],
              ).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ──────────────────────────────────────────────────────
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
          Set a new password for <strong>{user.name}</strong>. They will be logged out of all devices.
        </p>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Details Side Panel ───────────────────────────────────────────────────
function UserDetailsPanel({ userId, onClose, onAction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserActivity(userId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(e.message || "Failed to load activity."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
              <div className="user-avatar lg">{initials(data.user.name)}</div>
              <div>
                <div className="user-panel-name">{data.user.name}</div>
                <div className="user-panel-email">{data.user.email}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <span className={`badge badge-${data.user.role}`}>{ROLE_LABEL[data.user.role] || data.user.role}</span>
                  <StatusBadge status={data.user.status} />
                </div>
              </div>
            </div>

            <div className="user-panel-grid">
              <Field label="Created" value={formatDate(data.user.created_at)} />
              <Field label="Last Login" value={formatRelative(data.user.last_login)} />
              <Field label="Contact" value={data.user.contact_no || "—"} />
              <Field label="User ID" value={<code style={{ fontSize: "0.7rem" }}>{data.user.id.slice(0, 8)}…</code>} />
            </div>

            <div className="user-panel-section-title">Activity Summary</div>
            <div className="user-panel-grid">
              <Field label="Tickets Issued" value={data.summary.violations_issued} />
              <Field label="Tickets Received" value={data.summary.violations_received} />
            </div>

            <div className="user-panel-section-title">Recent Actions</div>
            {data.logs.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <div className="empty-state-text">No audit entries yet.</div>
              </div>
            ) : (
              <ul className="audit-list">
                {data.logs.slice(0, 20).map((log) => (
                  <li key={log.id}>
                    <div className="audit-action">{log.action}</div>
                    <div className="audit-meta">
                      {log.user_name || "system"} · {formatRelative(log.created_at)}
                    </div>
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

function Field({ label, value }) {
  return (
    <div className="user-field">
      <div className="user-field-label">{label}</div>
      <div className="user-field-value">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-pill status-${status || "active"}`}>{status || "active"}</span>;
}

function SkeletonRows({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </>
  );
}

// ─── Row Action Menu ───────────────────────────────────────────────────────────
function RowMenu({ user, canManage, onAction, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", (e) => e.key === "Escape" && onClose());
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const item = (label, action, danger = false, disabled = false) => (
    <button
      className={`row-menu-item${danger ? " danger" : ""}`}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onAction(action, user);
        onClose();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="row-menu" ref={ref}>
      {item("View Details", "view")}
      {item("Edit User", "edit", false, !canManage)}
      {item("Reset Password", "reset-password", false, !canManage)}
      {item("Force Logout", "force-logout", false, !canManage)}
      {user.status !== "active" && item("Activate", "activate", false, !canManage)}
      {user.status !== "inactive" && item("Deactivate", "deactivate", false, !canManage)}
      {user.status !== "suspended" && item("Suspend", "suspend", false, !canManage)}
      <div className="row-menu-divider" />
      {item("Delete User", "delete", true, !canManage)}
    </div>
  );
}

// ─── Main UserManagement ──────────────────────────────────────────────────────
export default function UserManagement() {
  const { user: actor } = useAuth();
  const toast = useToasts();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Modals / panel
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = async () => {
    setErr("");
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      setErr(e.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterRole, filterStatus, createdFrom, createdTo, pageSize]);

  // ── Filtering / sorting ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = users;
    if (debouncedSearch) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(debouncedSearch) ||
          u.email.toLowerCase().includes(debouncedSearch) ||
          u.id.toLowerCase().includes(debouncedSearch),
      );
    }
    if (filterRole !== "all") list = list.filter((u) => u.role === filterRole);
    if (filterStatus !== "all")
      list = list.filter((u) => (u.status || "active") === filterStatus);
    if (createdFrom) {
      const from = new Date(createdFrom).getTime();
      list = list.filter((u) => new Date(u.created_at).getTime() >= from);
    }
    if (createdTo) {
      const to = new Date(createdTo).getTime() + 86400000;
      list = list.filter((u) => new Date(u.created_at).getTime() < to);
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [users, debouncedSearch, filterRole, filterStatus, createdFrom, createdTo, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Selection helpers
  const allSelectedOnPage =
    paginated.length > 0 && paginated.every((u) => selected.has(u.id));
  const toggleSelectOne = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const togglePageAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allSelectedOnPage) paginated.forEach((u) => n.delete(u.id));
      else paginated.forEach((u) => n.add(u.id));
      return n;
    });
  const clearSelection = () => setSelected(new Set());

  // ── Permissions ─────────────────────────────────────────────────────────────
  const canManage = (target) => {
    if (!actor) return false;
    if (actor.id === target.id) return false;
    return (ROLE_RANK[actor.role] || 0) >= (ROLE_RANK[target.role] || 0);
  };

  // ── Counts for summary cards ────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = {
      total: users.length,
      active: 0,
      suspended: 0,
      enforcers: 0,
    };
    users.forEach((u) => {
      const s = u.status || "active";
      if (s === "active") c.active++;
      if (s === "suspended") c.suspended++;
      if (u.role === "enforcer") c.enforcers++;
    });
    return c;
  }, [users]);

  const resetFilters = () => {
    setSearch("");
    setFilterRole("all");
    setFilterStatus("all");
    setCreatedFrom("");
    setCreatedTo("");
  };

  // ── Action dispatch ─────────────────────────────────────────────────────────
  const performAction = async (action, target) => {
    switch (action) {
      case "view":
        return setDetailsId(target.id);
      case "edit":
        return setEditUser(target);
      case "reset-password":
        return setResetUser(target);
      case "activate":
      case "deactivate":
      case "suspend": {
        const map = { activate: "active", deactivate: "inactive", suspend: "suspended" };
        return setConfirmAction({
          title: `${action[0].toUpperCase() + action.slice(1)} user?`,
          message: `Set ${target.name}'s status to "${map[action]}"?`,
          confirmLabel: action[0].toUpperCase() + action.slice(1),
          danger: action === "suspend",
          run: async () => {
            await updateUser(target.id, { status: map[action] });
            toast.success(`${target.name} ${action}d.`);
            fetchUsers();
          },
        });
      }
      case "force-logout":
        return setConfirmAction({
          title: "Force logout?",
          message: `Invalidate all active sessions for ${target.name}? They will need to log in again.`,
          confirmLabel: "Force Logout",
          run: async () => {
            await forceLogoutUser(target.id);
            toast.success(`${target.name} forced to log out.`);
          },
        });
      case "delete":
        return setConfirmAction({
          title: "Delete user?",
          message: `Permanently delete ${target.name}? This cannot be undone. Consider suspending instead.`,
          confirmLabel: "Delete User",
          danger: true,
          run: async () => {
            await deleteUser(target.id);
            toast.success(`${target.name} deleted.`);
            fetchUsers();
          },
        });
      default:
        return;
    }
  };

  // ── Bulk actions ────────────────────────────────────────────────────────────
  const bulkApply = async (label, runner) => {
    const targets = users.filter((u) => selected.has(u.id) && canManage(u));
    if (targets.length === 0) {
      toast.error("No selected users you can modify.");
      return;
    }
    setConfirmAction({
      title: `${label} ${targets.length} user${targets.length > 1 ? "s" : ""}?`,
      message: `This will affect ${targets.length} account${targets.length > 1 ? "s" : ""}.`,
      confirmLabel: label,
      danger: label.toLowerCase().includes("delete") || label.toLowerCase().includes("suspend"),
      run: async () => {
        const results = await Promise.allSettled(targets.map(runner));
        const ok = results.filter((r) => r.status === "fulfilled").length;
        const fail = results.length - ok;
        if (ok) toast.success(`${ok} user${ok > 1 ? "s" : ""} ${label.toLowerCase()}d.`);
        if (fail) toast.error(`${fail} failed.`);
        clearSelection();
        fetchUsers();
      },
    });
  };

  // ── Sorting helper ──────────────────────────────────────────────────────────
  const sortBy = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const sortIcon = (key) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  return (
    <div>
      <ToastStack toasts={toast.toasts} />

      {/* ─── Header ─── */}
      <div className="um-page-header">
        <div>
          <h2 className="um-page-title">User Management</h2>
          <div className="um-page-subtitle">Manage admins, enforcers, motorists, and treasury accounts.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add User</button>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="um-summary-grid">
        <SummaryCard label="Total Users" value={counts.total} accent="blue" />
        <SummaryCard label="Active" value={counts.active} accent="green" />
        <SummaryCard label="Suspended" value={counts.suspended} accent="orange" />
        <SummaryCard label="Enforcers" value={counts.enforcers} accent="purple" />
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {/* ─── Filters ─── */}
      <div className="card um-filters">
        <div className="um-filter-row">
          <div className="um-filter-search">
            <input
              className="form-input"
              placeholder="Search name, email, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
          <input className="form-input" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} title="Created from" />
          <input className="form-input" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} title="Created to" />
          <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* ─── Bulk Action Bar ─── */}
      {selected.size > 0 && (
        <div className="bulk-bar">
          <div>
            <strong>{selected.size}</strong> selected
            <button className="bulk-link" onClick={clearSelection}>Clear</button>
          </div>
          <div className="bulk-actions">
            <button className="btn btn-outline btn-sm" onClick={() => bulkApply("Activate", (u) => updateUser(u.id, { status: "active" }))}>Activate</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkApply("Deactivate", (u) => updateUser(u.id, { status: "inactive" }))}>Deactivate</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkApply("Suspend", (u) => updateUser(u.id, { status: "suspended" }))}>Suspend</button>
            <button className="btn btn-danger btn-sm" onClick={() => bulkApply("Delete", (u) => deleteUser(u.id))}>Delete</button>
          </div>
        </div>
      )}

      {/* ─── Table ─── */}
      <div className="card um-table-card">
        <div className="table-wrapper um-table-wrapper">
          {loading ? (
            <div style={{ padding: "12px 4px" }}><SkeletonRows count={6} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">No users found</div>
            </div>
          ) : (
            <table className="um-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={togglePageAll}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th onClick={() => sortBy("name")} className="sortable">Name{sortIcon("name")}</th>
                  <th onClick={() => sortBy("email")} className="sortable">Email{sortIcon("email")}</th>
                  <th onClick={() => sortBy("role")} className="sortable">Role{sortIcon("role")}</th>
                  <th onClick={() => sortBy("status")} className="sortable">Status{sortIcon("status")}</th>
                  <th onClick={() => sortBy("last_login")} className="sortable">Last Login{sortIcon("last_login")}</th>
                  <th onClick={() => sortBy("created_at")} className="sortable">Created{sortIcon("created_at")}</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((u) => (
                  <tr
                    key={u.id}
                    className={selected.has(u.id) ? "row-selected" : ""}
                    onClick={(e) => {
                      if (e.target.closest(".um-row-stop")) return;
                      setDetailsId(u.id);
                    }}
                  >
                    <td className="um-row-stop">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelectOne(u.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${u.name}`}
                      />
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{initials(u.name)}</div>
                        <div className="user-cell-name">{u.name}</div>
                      </div>
                    </td>
                    <td className="um-cell-email" title={u.email}>{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>{formatRelative(u.last_login)}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>{formatDate(u.created_at)}</td>
                    <td className="um-row-stop" style={{ position: "relative" }}>
                      <button
                        className="row-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === u.id ? null : u.id);
                        }}
                        aria-label="Actions"
                      >⋮</button>
                      {openMenuId === u.id && (
                        <RowMenu
                          user={u}
                          canManage={canManage(u)}
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

        {/* ─── Pagination ─── */}
        {filtered.length > 0 && (
          <div className="um-pagination">
            <div className="um-pagination-info">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="um-pagination-controls">
              <select
                className="form-select um-rows-per-page"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button className="btn btn-outline btn-sm" disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
              <button className="btn btn-outline btn-sm" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span className="um-page-indicator">Page {safePage} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
              <button className="btn btn-outline btn-sm" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreated={fetchUsers}
          toast={toast}
          actorRole={actor?.role}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={fetchUsers}
          toast={toast}
          actorRole={actor?.role}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
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
            try {
              await a.run();
            } catch (e) {
              toast.error(e.message || "Action failed.");
            }
          }}
        />
      )}
      {detailsId && (
        <UserDetailsPanel
          userId={detailsId}
          onClose={() => setDetailsId(null)}
          onAction={(action, u) => {
            setDetailsId(null);
            performAction(action, u);
          }}
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

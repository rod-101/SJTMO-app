import React, { useState, useEffect } from "react";
import { getUsers, createUser, deleteUser } from "../../services/api";
import "../../App.css";

const VALID_ROLES = ["admin", "enforcer", "motorist"];
const EMPTY_FORM = { name: "", email: "", password: "", role: "motorist" };

function validate(form) {
  if (!form.name.trim()) return "Full name is required.";
  if (!form.email.trim()) return "Email address is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    return "Enter a valid email address.";
  if (form.password.length < 8)
    return "Password must be at least 8 characters.";
  if (!VALID_ROLES.includes(form.role)) return "Invalid role.";
  return null;
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const flash = (setter, msg) => {
    setter(msg);
    setTimeout(() => setter(""), 3500);
  };

  const fetchUsers = async () => {
    try {
      setUsers(await getUsers());
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const err = validate(form);
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      flash(setMessage, "User created successfully.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This action cannot be undone.`))
      return;
    try {
      await deleteUser(id);
      flash(setMessage, "User deleted.");
      fetchUsers();
    } catch {
      flash(setError, "Failed to delete user.");
    }
  };

  const toggleForm = () => {
    setShowForm((v) => !v);
    setError("");
    setForm(EMPTY_FORM);
  };

  return (
    <div>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Card: header + create form ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="um-header">
          <div className="card-title" style={{ marginBottom: 0 }}>
            User Management
          </div>
          <button className="btn btn-primary btn-sm" onClick={toggleForm}>
            {showForm ? "Cancel" : "+ Add User"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} noValidate className="um-form">
            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="um-name">
                Full Name
              </label>
              <input
                id="um-name"
                className="form-input"
                placeholder="Juan dela Cruz"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="um-email">
                Email Address
              </label>
              <input
                id="um-email"
                className="form-input"
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value.trim() })
                }
                required
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="um-pwd">
                Password
              </label>
              <input
                id="um-pwd"
                className="form-input"
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {/* Role */}
            <div className="form-group">
              <label className="form-label" htmlFor="um-role">
                Role
              </label>
              <select
                id="um-role"
                className="form-select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="enforcer">Enforcer</option>
                <option value="motorist">Motorist</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create User"}
            </button>
          </form>
        )}
      </div>

      {/* ── Card: users table ── */}
      <div className="card">
        {loading ? (
          <p style={{ color: "var(--text-light)", padding: "8px 0" }}>
            Loading users…
          </p>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">
              No users yet. Add the first one above.
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td
                      style={{
                        color: "var(--text-light)",
                        fontSize: "0.78rem",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-light)",
                      }}
                    >
                      {u.email}
                    </td>
                    <td>
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    </td>
                    <td
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-light)",
                      }}
                    >
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(u.id, u.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

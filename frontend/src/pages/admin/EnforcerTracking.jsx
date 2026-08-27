import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getEnforcerTracking,
  getEnforcerActivity,
  getPatrolAreas,
  createPatrolArea,
  deletePatrolArea,
  getPatrolAssignments,
  createPatrolAssignment,
  updatePatrolAssignment,
  deletePatrolAssignment,
} from "../../services/api";
import "./EnforcerTracking.css";

// Local (Philippine) date as YYYY-MM-DD. toISOString() would return the UTC day,
// which is the previous date for any local time before 08:00.
function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function fmtDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtPeso(n) {
  return `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function relativeDays(value) {
  if (!value) return "never";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

const ASSIGN_STATUS_LABELS = {
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function EnforcerTracking() {
  const [view, setView] = useState("activity");

  return (
    <div className="et-page">
      <div className="um-tab-bar">
        <button
          className={`um-tab${view === "activity" ? " active" : ""}`}
          onClick={() => setView("activity")}
        >
          🚓 Activity
        </button>
        <button
          className={`um-tab${view === "patrol" ? " active" : ""}`}
          onClick={() => setView("patrol")}
        >
          📍 Patrol Assignment
        </button>
      </div>

      {view === "activity" ? <ActivityView /> : <PatrolView />}
    </div>
  );
}

// ─── Activity tracking ────────────────────────────────────────────────────────
function ActivityView() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState({ enforcers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [activity, setActivity] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getEnforcerTracking(days));
    } catch (err) {
      setError(err.message || "Failed to load enforcer activity");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!activity[id]) {
      try {
        const rows = await getEnforcerActivity(id, 25);
        setActivity((prev) => ({ ...prev, [id]: rows }));
      } catch {
        setActivity((prev) => ({ ...prev, [id]: [] }));
      }
    }
  };

  const totals = useMemo(() => {
    const list = data.enforcers || [];
    return {
      active: list.filter((e) => e.status === "active").length,
      onDuty: list.filter((e) => e.today_assignment).length,
      today: list.reduce((s, e) => s + e.tickets_today, 0),
      window: list.reduce((s, e) => s + e.tickets_window, 0),
    };
  }, [data]);

  if (loading) return <div className="card">Loading enforcer activity…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totals.active}</div>
          <div className="stat-label">Active Enforcers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totals.onDuty}</div>
          <div className="stat-label">Posted Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totals.today}</div>
          <div className="stat-label">Tickets Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totals.window}</div>
          <div className="stat-label">Tickets · Last {days}d</div>
        </div>
      </div>

      <div className="um-table-card">
        <div className="et-toolbar">
          <span className="et-toolbar-title">
            {data.enforcers.length} enforcer{data.enforcers.length !== 1 ? "s" : ""}
          </span>
          <div className="et-toolbar-actions">
            <select
              className="form-select"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={load}>
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th>Enforcer</th>
                <th>Posted Today</th>
                <th>Today</th>
                <th>Last {days}d</th>
                <th>Total</th>
                <th>Pending</th>
                <th>Collected</th>
                <th>Last Ticket</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.enforcers.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🚓</div>
                      <div className="empty-state-text">No enforcers yet</div>
                    </div>
                  </td>
                </tr>
              )}
              {data.enforcers.map((e) => (
                <React.Fragment key={e.id}>
                  <tr>
                    <td>
                      <div className="et-name">{e.name}</div>
                      <div className="et-sub">{e.email}</div>
                    </td>
                    <td>
                      {e.today_assignment ? (
                        <span className="badge badge-enforcer">
                          {e.today_assignment.area_name}
                        </span>
                      ) : (
                        <span className="et-sub">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <strong>{e.tickets_today}</strong>
                    </td>
                    <td>{e.tickets_window}</td>
                    <td>{e.tickets_total}</td>
                    <td>{e.tickets_pending}</td>
                    <td>{fmtPeso(e.collected_total)}</td>
                    <td>
                      <div>{relativeDays(e.last_ticket_at)}</div>
                      <div className="et-sub">{fmtDateTime(e.last_ticket_at)}</div>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => toggle(e.id)}
                      >
                        {expanded === e.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr>
                      <td colSpan={9} className="et-drill-cell">
                        <div className="et-drill">
                          <div className="et-drill-title">
                            Recent tickets by {e.name}
                          </div>
                          {!activity[e.id] ? (
                            <div className="et-sub">Loading…</div>
                          ) : activity[e.id].length === 0 ? (
                            <div className="et-sub">No tickets issued yet.</div>
                          ) : (
                            <ul className="et-drill-list">
                              {activity[e.id].map((t) => (
                                <li key={t.id}>
                                  <span className="et-drill-no">{t.ticket_no}</span>
                                  <span>{t.violation_type}</span>
                                  <span className="et-sub">{t.motorist_name}</span>
                                  <span className={`badge badge-${t.status}`}>
                                    {t.status}
                                  </span>
                                  <span className="et-sub">
                                    {fmtDateTime(t.date_issued)}
                                  </span>
                                  {t.latitude && t.longitude && (
                                    <span className="et-sub">
                                      📍 {Number(t.latitude).toFixed(4)},{" "}
                                      {Number(t.longitude).toFixed(4)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Patrol assignment ────────────────────────────────────────────────────────
function PatrolView() {
  const [date, setDate] = useState(todayLocal());
  const [areas, setAreas] = useState([]);
  const [enforcers, setEnforcers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enforcer_id: "",
    area_id: "",
    shift_start: "",
    shift_end: "",
    notes: "",
  });
  const [newArea, setNewArea] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [areaRows, tracking, assignRows] = await Promise.all([
        getPatrolAreas(),
        getEnforcerTracking(30),
        getPatrolAssignments({ date }),
      ]);
      setAreas(areaRows);
      setEnforcers(tracking.enforcers.filter((e) => e.status === "active"));
      setAssignments(assignRows);
    } catch (err) {
      setError(err.message || "Failed to load patrol data");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!form.enforcer_id || !form.area_id) {
      setError("Pick an enforcer and an area");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createPatrolAssignment({ ...form, shift_date: date });
      setForm({ enforcer_id: "", area_id: "", shift_start: "", shift_end: "", notes: "" });
      await load();
    } catch (err) {
      setError(err.message || "Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  const handleAddArea = async () => {
    if (!newArea.trim()) return;
    try {
      await createPatrolArea({ name: newArea.trim() });
      setNewArea("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to add area");
    }
  };

  const handleRemoveArea = async (id, name) => {
    if (!window.confirm(`Delete the "${name}" area and all its assignments?`)) return;
    try {
      await deletePatrolArea(id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete area");
    }
  };

  const handleUnassign = async (id) => {
    try {
      await deletePatrolAssignment(id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to remove assignment");
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await updatePatrolAssignment(id, { status });
      await load();
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
  };

  // Group the flat assignment list by area so each zone shows its roster.
  const byArea = useMemo(() => {
    const map = new Map(areas.map((a) => [a.id, { area: a, list: [] }]));
    for (const a of assignments) {
      if (map.has(a.area_id)) map.get(a.area_id).list.push(a);
    }
    return Array.from(map.values());
  }, [areas, assignments]);

  const unassigned = useMemo(() => {
    const posted = new Set(assignments.map((a) => a.enforcer_id));
    return enforcers.filter((e) => !posted.has(e.id));
  }, [enforcers, assignments]);

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="et-toolbar">
          <span className="et-toolbar-title">Shift date</span>
          <div className="et-toolbar-actions">
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button className="btn btn-outline btn-sm" onClick={() => setDate(todayLocal())}>
              Today
            </button>
          </div>
        </div>

        <form className="et-assign-form" onSubmit={handleAssign}>
          <div className="form-group">
            <label className="form-label">Enforcer</label>
            <select
              className="form-select"
              value={form.enforcer_id}
              onChange={(e) => setForm({ ...form, enforcer_id: e.target.value })}
            >
              <option value="">Select enforcer…</option>
              {enforcers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Patrol area</label>
            <select
              className="form-select"
              value={form.area_id}
              onChange={(e) => setForm({ ...form, area_id: e.target.value })}
            >
              <option value="">Select area…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Start</label>
            <input
              type="time"
              className="form-input"
              value={form.shift_start}
              onChange={(e) => setForm({ ...form, shift_start: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">End</label>
            <input
              type="time"
              className="form-input"
              value={form.shift_end}
              onChange={(e) => setForm({ ...form, shift_end: e.target.value })}
            />
          </div>
          <div className="form-group et-form-wide">
            <label className="form-label">Notes (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. focus on no-helmet violations"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="form-group et-form-submit">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Assigning…" : "Assign to patrol"}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="card">Loading patrol board…</div>
      ) : (
        <>
          <div className="et-board">
            {byArea.map(({ area, list }) => (
              <div className="card et-area-card" key={area.id}>
                <div className="et-area-head">
                  <div>
                    <div className="et-area-name">{area.name}</div>
                    {area.description && (
                      <div className="et-sub">{area.description}</div>
                    )}
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleRemoveArea(area.id, area.name)}
                    title="Delete area"
                  >
                    ✕
                  </button>
                </div>

                {list.length === 0 ? (
                  <div className="et-sub et-area-empty">No one posted here.</div>
                ) : (
                  <ul className="et-roster">
                    {list.map((a) => (
                      <li key={a.id}>
                        <div className="et-roster-main">
                          <span className="et-name">{a.enforcer_name}</span>
                          <span className={`status-pill et-status-${a.status}`}>
                            {ASSIGN_STATUS_LABELS[a.status]}
                          </span>
                        </div>
                        <div className="et-sub">
                          {a.shift_start
                            ? `${a.shift_start.slice(0, 5)}–${
                                a.shift_end ? a.shift_end.slice(0, 5) : "…"
                              }`
                            : "Whole day"}
                          {a.notes ? ` · ${a.notes}` : ""}
                        </div>
                        <div className="et-roster-actions">
                          {a.status !== "completed" && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleStatus(a.id, "completed")}
                            >
                              Mark done
                            </button>
                          )}
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleUnassign(a.id)}
                          >
                            Unassign
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="card">
            <div className="et-area-name">Unassigned on this date</div>
            {unassigned.length === 0 ? (
              <div className="et-sub">Every active enforcer is posted. 🎉</div>
            ) : (
              <div className="et-chip-row">
                {unassigned.map((e) => (
                  <span className="badge badge-pending" key={e.id}>
                    {e.name}
                  </span>
                ))}
              </div>
            )}

            <div className="et-area-name et-add-area-title">Add a patrol area</div>
            <div className="et-toolbar-actions">
              <input
                className="form-input"
                placeholder="Area name (e.g. Brgy. Palapala)"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddArea();
                  }
                }}
              />
              <button className="btn btn-outline btn-sm" onClick={handleAddArea}>
                Add area
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

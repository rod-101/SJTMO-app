import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  getMyPatrolAssignments,
  updateMyPatrolAssignment,
} from "../../services/api";

const today = () => new Date().toDateString();

// Local YYYY-MM-DD — toISOString() would give the UTC day, which is yesterday
// for any Philippine time before 08:00.
function todayLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function MyPatrol() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      setAssignments(await getMyPatrolAssignments());
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, status) => {
    setBusy(id);
    try {
      await updateMyPatrolAssignment(id, status);
      await load();
    } catch {
      /* leave the card as-is; the next refresh will reconcile */
    } finally {
      setBusy(null);
    }
  };

  const todays = useMemo(
    () => assignments.filter((a) => a.shift_date?.slice(0, 10) === todayLocal()),
    [assignments],
  );

  if (loading) return null;

  return (
    <div className="enf-patrol-card">
      <div className="enf-section-title">My Patrol Today</div>
      {todays.length === 0 ? (
        <div className="enf-patrol-empty">
          No patrol area assigned for today.
        </div>
      ) : (
        todays.map((a) => (
          <div className="enf-patrol-item" key={a.id}>
            <div className="enf-patrol-area">📍 {a.area_name}</div>
            <div className="enf-patrol-meta">
              {a.shift_start
                ? `${a.shift_start.slice(0, 5)} – ${
                    a.shift_end ? a.shift_end.slice(0, 5) : "…"
                  }`
                : "Whole day"}
            </div>
            {a.area_description && (
              <div className="enf-patrol-meta">{a.area_description}</div>
            )}
            {a.notes && <div className="enf-patrol-notes">📝 {a.notes}</div>}
            <div className="enf-patrol-actions">
              <span className={`badge badge-${a.status === "completed" ? "paid" : "pending"}`}>
                {a.status}
              </span>
              {a.status === "assigned" && (
                <button
                  className="btn btn-outline btn-sm"
                  disabled={busy === a.id}
                  onClick={() => act(a.id, "acknowledged")}
                >
                  Acknowledge
                </button>
              )}
              {a.status !== "completed" && (
                <button
                  className="btn btn-outline btn-sm"
                  disabled={busy === a.id}
                  onClick={() => act(a.id, "completed")}
                >
                  Mark done
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="enf-metric-card">
      <div className="enf-metric-value">{value}</div>
      <div className="enf-metric-label">{label}</div>
      {sub && <div className="enf-metric-sub">{sub}</div>}
    </div>
  );
}

function statusBadge(status) {
  const map = {
    unpaid: "badge-unpaid",
    paid: "badge-paid",
    overdue: "badge-overdue",
    cancelled: "badge-cancelled",
  };
  return map[status] || "badge-unpaid";
}

export default function EnforcerDashboardHome({ violations, onIssue }) {
  const metrics = useMemo(() => {
    const todayStr = today();
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

    return { total: violations.length, issuedToday, monthly, unpaid };
  }, [violations]);

  const recent = violations.slice(0, 8);

  return (
    <div className="enf-dashboard-home">
      {/* Left panel — header, metrics, CTA */}
      <div className="enf-dash-left">
        <div className="enf-page-header">
          <div className="enf-page-title">Dashboard</div>
          <div className="enf-page-sub">Your activity at a glance</div>
        </div>

        <div className="enf-metrics-grid">
          <MetricCard label="Today" value={metrics.issuedToday} sub="issued" />
          <MetricCard label="This Month" value={metrics.monthly} sub="issued" />
          <MetricCard label="Total" value={metrics.total} sub="all time" />
          <MetricCard label="Unpaid" value={metrics.unpaid} sub="pending" />
        </div>

        <MyPatrol />

        <button className="enf-issue-cta" onClick={onIssue}>
          <span className="enf-issue-cta-icon">✍️</span>
          Issue Violation
        </button>
      </div>

      {/* Right panel — recent activity */}
      <div className="enf-dash-right">
        <div className="enf-section-title">Recent Activity</div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No violations issued yet</div>
          </div>
        ) : (
          <div className="enf-recent-list">
            {recent.map((v) => (
              <div key={v.id} className="enf-recent-item">
                <div className="enf-recent-main">
                  <span className="enf-recent-type">{v.violation_type}</span>
                  <span className={`badge ${statusBadge(v.status)}`}>
                    {v.status}
                  </span>
                </div>
                <div className="enf-recent-meta">
                  <span>👤 {v.motorist_name}</span>
                  <span>
                    {new Date(v.date_issued).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

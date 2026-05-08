import React, { useEffect, useMemo, useState } from "react";
import { getUsers } from "../../services/api";
import "../../App.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const OVERDUE_DAYS = 14;
const ACTIVE_WINDOW_HOURS = 24;

const isToday = (d) => {
  const x = new Date(d);
  const now = new Date();
  return (
    x.getFullYear() === now.getFullYear() &&
    x.getMonth() === now.getMonth() &&
    x.getDate() === now.getDate()
  );
};

const daysSince = (d) =>
  Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

const isOverdue = (v) =>
  v.status === "overdue" ||
  (v.status === "pending" && daysSince(v.date_issued) > OVERDUE_DAYS);

const formatRelative = (d) => {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, accent, hint, onClick, loading }) {
  return (
    <button
      type="button"
      className={`um-summary-card accent-${accent} dash-stat-card${onClick ? " clickable" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="um-summary-value">{loading ? "—" : value}</div>
      <div className="um-summary-label">{label}</div>
      {hint && <div className="dash-stat-hint">{hint}</div>}
    </button>
  );
}

function AlertItem({ tone, icon, title, detail, onClick }) {
  return (
    <button
      type="button"
      className={`dash-alert dash-alert-${tone}`}
      onClick={onClick}
    >
      <span className="dash-alert-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="dash-alert-body">
        <span className="dash-alert-title">{title}</span>
        {detail && <span className="dash-alert-detail">{detail}</span>}
      </span>
      <span className="dash-alert-chev" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

function StatusDot({ status }) {
  const s = status || "pending";
  return <span className={`dash-status-dot status-${s}`} aria-hidden="true" />;
}

function SkeletonBlock({ h = 20, w = "100%", style }) {
  return (
    <div
      className="skeleton-row"
      style={{ height: h, width: w, ...style }}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardOverview({
  violations = [],
  loading: violationsLoading,
  onNavigate,
}) {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    getUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((e) => {
        if (!cancelled) setUsersError(e.message || "Failed to load users.");
      })
      .finally(() => !cancelled && setUsersLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLastUpdated(new Date());
  }, [violations]);

  // ── Derived metrics ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = violations.filter((v) => isToday(v.date_issued));
    const pending = violations.filter((v) => v.status === "pending");
    const overdue = violations.filter(isOverdue);
    const resolved = violations.filter(
      (v) => v.status === "resolved" || v.status === "paid",
    );

    // Last 7 days (per-day count, oldest first)
    const buckets = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return { date: d, count: 0 };
    });
    violations.forEach((v) => {
      const t = new Date(v.date_issued).getTime();
      buckets.forEach((b) => {
        const start = b.date.getTime();
        const end = start + 86400000;
        if (t >= start && t < end) b.count++;
      });
    });

    const breakdown = violations.reduce((acc, v) => {
      acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
      return acc;
    }, {});

    return {
      total: violations.length,
      today: today.length,
      pending: pending.length,
      overdue: overdue.length,
      resolved: resolved.length,
      buckets,
      breakdown,
      last7: buckets.reduce((s, b) => s + b.count, 0),
    };
  }, [violations]);

  const userStats = useMemo(() => {
    const enforcers = users.filter((u) => u.role === "enforcer");
    const activeEnforcers = enforcers.filter((u) => {
      const status = u.status || "active";
      if (status !== "active") return false;
      if (!u.last_login) return false;
      const hours = (Date.now() - new Date(u.last_login).getTime()) / 3600000;
      return hours <= ACTIVE_WINDOW_HOURS;
    });
    const inactiveEnforcers = enforcers.length - activeEnforcers.length;
    const motorists = users.filter((u) => u.role === "motorist").length;
    return {
      totalUsers: users.length,
      enforcers: enforcers.length,
      activeEnforcers: activeEnforcers.length,
      inactiveEnforcers,
      motorists,
    };
  }, [users]);

  // ── Recent activity (last 8 violations) ─────────────────────────────────
  const recent = useMemo(
    () =>
      [...violations]
        .sort(
          (a, b) =>
            new Date(b.date_issued).getTime() -
            new Date(a.date_issued).getTime(),
        )
        .slice(0, 8),
    [violations],
  );

  // ── Navigation helpers ──────────────────────────────────────────────────
  const goViolations = (vtab) => {
    if (vtab) localStorage.setItem("sjtmo_vt_tab", vtab);
    onNavigate?.("violations");
  };
  const goUsers = (utab) => {
    if (utab) localStorage.setItem("sjtmo_um_tab", utab);
    onNavigate?.("users");
  };
  const goMap = () => onNavigate?.("map");

  // ── Priority alerts ─────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const out = [];
    if (stats.overdue > 0) {
      out.push({
        tone: "danger",
        icon: "⚠",
        title: `${stats.overdue} overdue violation${stats.overdue === 1 ? "" : "s"} require attention`,
        detail: "Pending more than 14 days — escalate or follow up.",
        onClick: () => goViolations("overdue"),
      });
    }
    if (stats.pending >= 20) {
      out.push({
        tone: "warning",
        icon: "⏱",
        title: `${stats.pending} pending violations awaiting payment`,
        detail: "Backlog above normal threshold (20).",
        onClick: () => goViolations("pending"),
      });
    }
    if (
      !usersLoading &&
      userStats.enforcers > 0 &&
      userStats.inactiveEnforcers >= Math.max(1, Math.ceil(userStats.enforcers * 0.4))
    ) {
      out.push({
        tone: "warning",
        icon: "👥",
        title: `${userStats.inactiveEnforcers} enforcer${userStats.inactiveEnforcers === 1 ? "" : "s"} inactive in the last 24h`,
        detail: "Check field deployment and enforcer schedules.",
        onClick: () => goUsers("enforcer"),
      });
    }
    if (stats.today >= 15) {
      out.push({
        tone: "info",
        icon: "📈",
        title: `High violation activity today (${stats.today} issued)`,
        detail: "Above typical daily volume — monitor hotspots on the live map.",
        onClick: goMap,
      });
    }
    return out;
  }, [stats, userStats, usersLoading]);

  const breakdownEntries = useMemo(
    () =>
      Object.entries(stats.breakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
    [stats.breakdown],
  );

  const maxBucket = Math.max(1, ...stats.buckets.map((b) => b.count));

  return (
    <div className="dash-page">
      {/* ── Header ── */}
      <div className="um-page-header">
        <div>
          <h2 className="um-page-title">Dashboard</h2>
          <div className="um-page-subtitle">
            Operational overview — what needs attention right now.
          </div>
        </div>
        <div className="dash-header-meta">
          <span className="dash-live-dot" aria-hidden="true" />
          <span>
            Live · updated{" "}
            {lastUpdated.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* ── 1. System Overview ── */}
      <div className="dash-section-label">System Overview</div>
      <div className="um-summary-grid">
        <StatCard
          label="Active Enforcers"
          value={
            usersLoading
              ? "—"
              : `${userStats.activeEnforcers} / ${userStats.enforcers}`
          }
          accent="blue"
          hint="Logged in within 24h"
          onClick={() => goUsers("enforcer")}
          loading={usersLoading}
        />
        <StatCard
          label="Violations Today"
          value={stats.today}
          accent="purple"
          hint={`${stats.last7} in last 7 days`}
          onClick={() => goViolations("all")}
          loading={violationsLoading}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          accent="orange"
          hint="Awaiting payment"
          onClick={() => goViolations("pending")}
          loading={violationsLoading}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          accent={stats.overdue > 0 ? "danger" : "green"}
          hint={
            stats.overdue > 0 ? "Needs follow-up" : "All within payment window"
          }
          onClick={() => goViolations("overdue")}
          loading={violationsLoading}
        />
      </div>

      {/* ── 2. Priority Alerts ── */}
      {alerts.length > 0 && (
        <>
          <div className="dash-section-label">Priority Alerts</div>
          <div className="dash-alert-list">
            {alerts.map((a, i) => (
              <AlertItem key={i} {...a} />
            ))}
          </div>
        </>
      )}

      {usersError && <div className="alert alert-error">{usersError}</div>}

      {/* ── 3. Key Metrics ── */}
      <div className="dash-section-label">Key Metrics</div>
      <div className="um-summary-grid">
        <StatCard
          label="Total Users"
          value={userStats.totalUsers}
          accent="blue"
          hint={`${userStats.motorists} motorists · ${userStats.enforcers} enforcers`}
          onClick={() => goUsers("all")}
          loading={usersLoading}
        />
        <StatCard
          label="Total Violations"
          value={stats.total}
          accent="purple"
          onClick={() => goViolations("all")}
          loading={violationsLoading}
        />
        <StatCard
          label="Resolved / Paid"
          value={stats.resolved}
          accent="green"
          hint={
            stats.total
              ? `${Math.round((stats.resolved / stats.total) * 100)}% of total`
              : "—"
          }
          onClick={() => goViolations("paid")}
          loading={violationsLoading}
        />
        <StatCard
          label="Last 7 Days"
          value={stats.last7}
          accent="orange"
          hint={`${stats.today} today`}
          onClick={() => goViolations("all")}
          loading={violationsLoading}
        />
      </div>

      {/* ── 4. Charts row: Trend + Breakdown ── */}
      <div className="dash-grid-2col">
        <div className="card">
          <div className="dash-card-head">
            <div className="card-title" style={{ marginBottom: 0 }}>
              Violations · Last 7 Days
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => goViolations("all")}
            >
              View all
            </button>
          </div>
          {violationsLoading ? (
            <SkeletonBlock h={140} />
          ) : stats.last7 === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">No activity this week</div>
            </div>
          ) : (
            <div className="dash-spark">
              {stats.buckets.map((b, i) => {
                const h = Math.max(4, Math.round((b.count / maxBucket) * 100));
                const label = b.date.toLocaleDateString(undefined, {
                  weekday: "short",
                });
                return (
                  <div className="dash-spark-col" key={i} title={`${label}: ${b.count}`}>
                    <div className="dash-spark-count">{b.count || ""}</div>
                    <div
                      className="dash-spark-bar"
                      style={{ height: `${h}%` }}
                    />
                    <div className="dash-spark-label">{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="dash-card-head">
            <div className="card-title" style={{ marginBottom: 0 }}>
              Violations by Type
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => goViolations("all")}
            >
              View all
            </button>
          </div>
          {violationsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SkeletonBlock h={18} />
              <SkeletonBlock h={18} w="80%" />
              <SkeletonBlock h={18} w="60%" />
            </div>
          ) : breakdownEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">No violations yet</div>
            </div>
          ) : (
            <div className="dash-breakdown">
              {breakdownEntries.map(([type, count]) => {
                const pct = Math.round((count / stats.total) * 100);
                return (
                  <div key={type} className="dash-breakdown-row">
                    <div className="dash-breakdown-head">
                      <span className="dash-breakdown-name">{type}</span>
                      <span className="dash-breakdown-count">
                        {count} <span className="dash-breakdown-pct">({pct}%)</span>
                      </span>
                    </div>
                    <div className="dash-bar-track">
                      <div
                        className="dash-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Activity feed + Map preview ── */}
      <div className="dash-grid-2col">
        <div className="card">
          <div className="dash-card-head">
            <div className="card-title" style={{ marginBottom: 0 }}>
              Recent Activity
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => goViolations("all")}
            >
              View all
            </button>
          </div>
          {violationsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBlock key={i} h={42} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🕐</div>
              <div className="empty-state-text">No recent activity</div>
            </div>
          ) : (
            <ul className="dash-activity">
              {recent.map((v) => {
                const status = isOverdue(v) ? "overdue" : v.status;
                return (
                  <li
                    key={v.id}
                    className="dash-activity-item"
                    onClick={() => goViolations(status === "overdue" ? "overdue" : "all")}
                  >
                    <StatusDot status={status} />
                    <div className="dash-activity-body">
                      <div className="dash-activity-title">
                        <strong>{v.enforcer_name || "Enforcer"}</strong> issued{" "}
                        <em>{v.violation_type}</em> to {v.motorist_name}
                      </div>
                      <div className="dash-activity-meta">
                        <span className={`badge badge-${status}`}>{status}</span>
                        <span>·</span>
                        <span>{formatRelative(v.date_issued)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card dash-map-card">
          <div className="dash-card-head">
            <div className="card-title" style={{ marginBottom: 0 }}>
              Live Map
            </div>
            <button className="btn btn-outline btn-sm" onClick={goMap}>
              View Full Map
            </button>
          </div>
          <div
            className="dash-map-preview"
            onClick={goMap}
            role="button"
            tabIndex={0}
          >
            <div className="dash-map-icon">🗺️</div>
            <div className="dash-map-stat">
              <strong>{stats.today}</strong> today · <strong>{stats.last7}</strong> this week
            </div>
            <div className="dash-map-cta">Open live map to view hotspots →</div>
          </div>
        </div>
      </div>

      {/* ── 6. Quick Actions ── */}
      <div className="dash-section-label">Quick Actions</div>
      <div className="dash-quick-actions">
        <button
          className="dash-quick-btn"
          onClick={() => goViolations("pending")}
        >
          <span className="dash-quick-icon">⏱</span>
          <span className="dash-quick-label">View Pending</span>
        </button>
        <button
          className="dash-quick-btn"
          onClick={() => goViolations("overdue")}
        >
          <span className="dash-quick-icon">⚠</span>
          <span className="dash-quick-label">View Overdue</span>
        </button>
        <button className="dash-quick-btn" onClick={() => goUsers("enforcer")}>
          <span className="dash-quick-icon">🚓</span>
          <span className="dash-quick-label">View Enforcers</span>
        </button>
        <button className="dash-quick-btn" onClick={() => goUsers("all")}>
          <span className="dash-quick-icon">👥</span>
          <span className="dash-quick-label">Manage Users</span>
        </button>
      </div>
    </div>
  );
}

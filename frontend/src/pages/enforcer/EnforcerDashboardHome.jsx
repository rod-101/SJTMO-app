import React, { useMemo } from "react";

const today = () => new Date().toDateString();

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
    const issuedToday = violations.filter(
      (v) => new Date(v.date_issued).toDateString() === todayStr
    ).length;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthly = violations.filter((v) => {
      const d = new Date(v.date_issued);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const unpaid = violations.filter(
      (v) => v.status === "unpaid" || v.status === "overdue"
    ).length;

    return {
      total: violations.length,
      issuedToday,
      monthly,
      unpaid,
    };
  }, [violations]);

  const recent = violations.slice(0, 5);

  return (
    <div className="enf-dashboard-home">
      <div className="enf-page-header">
        <div className="enf-page-title">Dashboard</div>
        <div className="enf-page-sub">Your activity at a glance</div>
      </div>

      <div className="enf-metrics-grid">
        <MetricCard label="Today" value={metrics.issuedToday} sub="issued" />
        <MetricCard label="This Month" value={metrics.monthly} sub="issued" />
        <MetricCard label="Total" value={metrics.total} sub="all time" />
        <MetricCard
          label="Unpaid"
          value={metrics.unpaid}
          sub="pending"
        />
      </div>

      <button className="enf-issue-cta" onClick={onIssue}>
        <span className="enf-issue-cta-icon">✍️</span>
        Issue Violation
      </button>

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
  );
}

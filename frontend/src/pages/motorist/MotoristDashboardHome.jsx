import React, { useMemo } from "react";

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className={`enf-metric-card${accent ? ` enf-metric-${accent}` : ""}`}>
      <div className="enf-metric-value">{value}</div>
      <div className="enf-metric-label">{label}</div>
      {sub && <div className="enf-metric-sub">{sub}</div>}
    </div>
  );
}

const statusBadgeClass = (status) => `badge badge-${status || "pending"}`;

export default function MotoristDashboardHome({ violations, onViewAll, onSelect }) {
  const metrics = useMemo(() => {
    const pending  = violations.filter((v) => v.status === "pending").length;
    const paid     = violations.filter((v) => v.status === "paid").length;
    const resolved = violations.filter((v) => v.status === "resolved").length;
    const overdue  = violations.filter((v) => v.status === "overdue").length;
    return { total: violations.length, pending, paid, resolved, overdue };
  }, [violations]);

  const recent = violations.slice(0, 5);

  return (
    <div className="enf-dashboard-home">
      <div className="enf-dash-left">
        <div className="enf-page-header">
          <div className="enf-page-title">My Dashboard</div>
          <div className="enf-page-sub">Your traffic record at a glance</div>
        </div>

        <div className="enf-metrics-grid">
          <MetricCard label="Total"    value={metrics.total}    sub="all time" />
          <MetricCard label="Pending"  value={metrics.pending}  sub="awaiting payment" />
          <MetricCard label="Paid"     value={metrics.paid}     sub="settled" />
          <MetricCard label="Overdue"  value={metrics.overdue}  sub="past due" />
        </div>

        {metrics.pending > 0 && (
          <div className="alert alert-error" style={{ marginTop: 12 }}>
            ⚠ You have {metrics.pending} pending violation{metrics.pending > 1 ? "s" : ""}. Please settle to avoid penalties.
          </div>
        )}

        <button
          className="enf-issue-cta"
          onClick={onViewAll}
          style={{ marginTop: 12 }}
        >
          <span className="enf-issue-cta-icon">📋</span>
          View All My Violations
        </button>
      </div>

      <div className="enf-dash-right">
        <div className="enf-section-title">Recent Violations</div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-text">Clean record — no violations.</div>
            <div style={{ fontSize: "0.8rem", color: "#aaa", marginTop: 8 }}>
              Drive safely.
            </div>
          </div>
        ) : (
          <div className="enf-recent-list">
            {recent.map((v) => (
              <div
                key={v.id}
                className="enf-recent-item"
                onClick={() => onSelect?.(v)}
                style={{ cursor: "pointer" }}
              >
                <div className="enf-recent-main">
                  <span className="enf-recent-type">{v.violation_type}</span>
                  <span className={statusBadgeClass(v.status)}>{v.status}</span>
                </div>
                <div className="enf-recent-meta">
                  <span>🎫 {v.ticket_no || "—"}</span>
                  <span>
                    {new Date(v.date_issued).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {v.notes && <div className="enf-recent-notes">{v.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

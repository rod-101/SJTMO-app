import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Navbar";
import EnforcerBottomNav from "../../components/EnforcerBottomNav";
import EnforcerDashboardHome from "./EnforcerDashboardHome";
import IssueViolation from "./IssueViolation";
import EnforcerProfile from "./EnforcerProfile";
import { getViolations } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

function statusBadge(status) {
  const map = {
    unpaid: "badge-unpaid",
    paid: "badge-paid",
    overdue: "badge-overdue",
    cancelled: "badge-cancelled",
  };
  return map[status] || "badge-unpaid";
}

export default function EnforcerDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchMyViolations = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getViolations();
      const mine = all.filter(
        (v) => v.enforcer_name?.toLowerCase() === user.name?.toLowerCase()
      );
      // newest first
      mine.sort((a, b) => new Date(b.date_issued) - new Date(a.date_issued));
      setViolations(mine);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.name]);

  // Load violations on mount and when navigating to dashboard or history
  useEffect(() => {
    if (tab === "dashboard" || tab === "history") {
      fetchMyViolations();
    }
  }, [tab, fetchMyViolations]);

  const handleIssueSuccess = () => {
    setTab("history");
    fetchMyViolations();
  };

  return (
    <div className="enf-shell">
      <Navbar title="Enforcer Panel" />

      <div className="enf-content">
        {tab === "dashboard" && (
          <EnforcerDashboardHome
            violations={violations}
            onIssue={() => setTab("issue")}
          />
        )}

        {tab === "issue" && (
          <div className="enf-issue-wrap">
            <div className="enf-page-header">
              <div className="enf-page-title">Issue Violation</div>
              <div className="enf-page-sub">Fill in motorist and violation details</div>
            </div>
            <IssueViolation onSuccess={handleIssueSuccess} />
          </div>
        )}

        {tab === "history" && (
          <div className="enf-history">
            <div className="enf-page-header">
              <div className="enf-page-title">My Issued</div>
              <div className="enf-page-sub">Violations you have issued</div>
            </div>
            <div className="enf-history-toolbar">
              <span className="enf-history-count">
                {violations.length} violation{violations.length !== 1 ? "s" : ""}
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={fetchMyViolations}
                disabled={loading}
              >
                {loading ? "…" : "🔄 Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="enf-loading">Loading…</div>
            ) : violations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">No violations issued yet</div>
              </div>
            ) : (
              <div className="enf-recent-list">
                {violations.map((v) => (
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
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {v.notes && (
                      <div className="enf-recent-notes">{v.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "profile" && (
          <EnforcerProfile violations={violations} />
        )}
      </div>

      <EnforcerBottomNav active={tab} onChange={setTab} />
    </div>
  );
}

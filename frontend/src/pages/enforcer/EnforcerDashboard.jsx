import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Navbar";
import IssueViolation from "./IssueViolation";
import { getViolations } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

export default function EnforcerDashboard() {
  const [tab, setTab] = useState("issue");
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchMyViolations = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getViolations();
      // Filter to this enforcer's violations
      const mine = all.filter(
        (v) => v.enforcer_name.toLowerCase() === user.name.toLowerCase(),
      );
      setViolations(mine);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.name]);

  useEffect(() => {
    if (tab === "history") fetchMyViolations();
  }, [tab, fetchMyViolations]);

  return (
    <div className="page">
      <Navbar title="Enforcer Panel" />
      <div className="content enforcer-page">
        <div className="tab-nav">
          <button
            className={`tab-btn ${tab === "issue" ? "active" : ""}`}
            onClick={() => setTab("issue")}
          >
            ✍️ Issue Violation
          </button>
          <button
            className={`tab-btn ${tab === "history" ? "active" : ""}`}
            onClick={() => setTab("history")}
          >
            📋 My Issued ({violations.length})
          </button>
        </div>

        {tab === "issue" && (
          <IssueViolation
            onSuccess={() => {
              setTab("history");
              fetchMyViolations();
            }}
          />
        )}

        {tab === "history" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "#666" }}>
                Violations issued by you
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={fetchMyViolations}
              >
                🔄 Refresh
              </button>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                Loading...
              </div>
            ) : violations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">No violations issued yet</div>
              </div>
            ) : (
              violations.map((v) => (
                <div key={v.id} className={`violation-card ${v.status}`}>
                  <div className="vc-type">{v.violation_type}</div>
                  <div className="vc-meta">
                    <span>👤 {v.motorist_name}</span>
                    <span>
                      📅 {new Date(v.date_issued).toLocaleDateString()}
                    </span>
                    <span>
                      <span className={`badge badge-${v.status}`}>
                        {v.status}
                      </span>
                    </span>
                  </div>
                  {v.notes && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: "0.8rem",
                        color: "#666",
                        fontStyle: "italic",
                      }}
                    >
                      {v.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

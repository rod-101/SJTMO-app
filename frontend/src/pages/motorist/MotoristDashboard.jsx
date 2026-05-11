import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Navbar";
import MotoristBottomNav from "../../components/MotoristBottomNav";
import MotoristDashboardHome from "./MotoristDashboardHome";
import MotoristProfile from "./MotoristProfile";
import ViolationDetail from "./ViolationDetail";
import { getViolations } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

export default function MotoristDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getViolations(user.name);
      // newest first
      data.sort((a, b) => new Date(b.date_issued) - new Date(a.date_issued));
      setViolations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.name]);

  useEffect(() => {
    if (tab === "dashboard" || tab === "violations" || tab === "profile") {
      fetchViolations();
    }
  }, [tab, fetchViolations]);

  return (
    <div className="enf-shell">
      <Navbar title="Motorist Portal" />

      <div className="enf-content">
        {tab === "dashboard" && (
          <MotoristDashboardHome
            violations={violations}
            onViewAll={() => setTab("violations")}
            onSelect={setSelected}
          />
        )}

        {tab === "violations" && (
          <div className="enf-history">
            <div className="enf-page-header">
              <div className="enf-page-title">My Violations</div>
              <div className="enf-page-sub">Full history of citations issued to you</div>
            </div>

            <div className="enf-history-toolbar">
              <span className="enf-history-count">
                {violations.length} violation{violations.length !== 1 ? "s" : ""}
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={fetchViolations}
                disabled={loading}
              >
                {loading ? "…" : "🔄 Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="enf-loading">Loading…</div>
            ) : violations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎉</div>
                <div className="empty-state-text">No violations on record!</div>
                <div style={{ fontSize: "0.8rem", color: "#aaa", marginTop: 8 }}>
                  Drive safely.
                </div>
              </div>
            ) : (
              <div className="enf-recent-list">
                {violations.map((v) => (
                  <div
                    key={v.id}
                    className="enf-recent-item"
                    onClick={() => setSelected(v)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="enf-recent-main">
                      <span className="enf-recent-type">{v.violation_type}</span>
                      <span className={`badge badge-${v.status || "pending"}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="enf-recent-meta">
                      <span>🎫 {v.ticket_no || "—"}</span>
                      <span>🚓 {v.enforcer_name}</span>
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
                    <div style={{ fontSize: "0.72rem", color: "#bbb", marginTop: 4 }}>
                      Tap to view details →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "profile" && (
          <MotoristProfile violations={violations} />
        )}
      </div>

      <MotoristBottomNav active={tab} onChange={setTab} />

      {selected && (
        <ViolationDetail
          violation={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

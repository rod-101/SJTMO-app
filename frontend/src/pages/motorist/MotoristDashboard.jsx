import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Navbar";
import ViolationDetail from "./ViolationDetail";
import { getViolations } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../App.css";

export default function MotoristDashboard() {
  const { user } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getViolations(user.name);
      setViolations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.name]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const pendingCount = violations.filter((v) => v.status === "pending").length;
  const resolvedCount = violations.filter(
    (v) => v.status === "resolved",
  ).length;

  return (
    <div className="page">
      <Navbar title="My Violations" />
      <div className="content" style={{ maxWidth: 600 }}>
        {/* Stats */}
        <div
          className="stats-grid"
          style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 20 }}
        >
          <div className="stat-card">
            <div className="stat-value">{violations.length}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{resolvedCount}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 600, color: "#333" }}>
            Violations for <span style={{ color: "#1a237e" }}>{user.name}</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchViolations}>
            🔄
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>⏳</div>
            Loading your violations...
          </div>
        ) : violations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-text">No violations on record!</div>
            <div style={{ fontSize: "0.8rem", color: "#aaa", marginTop: 8 }}>
              Drive safely.
            </div>
          </div>
        ) : (
          violations.map((v) => (
            <div
              key={v.id}
              className={`violation-card ${v.status}`}
              onClick={() => setSelected(v)}
            >
              <div className="vc-type">{v.violation_type}</div>
              <div className="vc-meta">
                <span>📅 {new Date(v.date_issued).toLocaleDateString()}</span>
                <span>🚓 {v.enforcer_name}</span>
                <span>
                  <span className={`badge badge-${v.status}`}>{v.status}</span>
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#bbb", marginTop: 4 }}>
                Tap to view details →
              </div>
            </div>
          ))
        )}
      </div>

      {/* Violation Detail Modal */}
      {selected && (
        <ViolationDetail
          violation={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

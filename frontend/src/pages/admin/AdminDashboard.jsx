import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Navbar";
import ViolationMap from "./ViolationMap";
import ViolationsTable from "./ViolationsTable";
import UserManagement from "./UserManagement";
import OrdinancesPanel from "./OrdinancesPanel";
import { useAuth } from "../../context/AuthContext";
import { getViolations } from "../../services/api";
import "../../App.css";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { id: "overview", icon: "📊", label: "Dashboard" },
      { id: "map", icon: "🗺️", label: "Live Map" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "violations", icon: "📋", label: "Violations" },
      { id: "enforcer-tracking", icon: "🚓", label: "Enforcer Tracking" },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "users", icon: "👥", label: "Users" },
      { id: "ordinances", icon: "📌", label: "Ordinances" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "logs", icon: "📜", label: "System Logs" },
      { id: "settings", icon: "⚙️", label: "System Settings" },
    ],
  },
];

const ROLE_LABELS = {
  admin: "Administrator",
  enforcer: "Enforcer",
  motorist: "Motorist",
};

function ComingSoon({ title, icon }) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        <div className="empty-state-text" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 4 }}>
          {title}
        </div>
        <div className="empty-state-text">Coming soon</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logoutUser } = useAuth();
  const [tab, setTab] = useState("overview");
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sjtmo_sidebar_collapsed") === "1";
  });

  useEffect(() => {
    localStorage.setItem("sjtmo_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const fetchViolations = useCallback(async () => {
    try {
      const data = await getViolations();
      setViolations(data);
    } catch (err) {
      console.error("Failed to fetch violations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchViolations();
    const interval = setInterval(fetchViolations, 15000);
    return () => clearInterval(interval);
  }, [fetchViolations]);

  const today = new Date().toDateString();
  const todayCount = violations.filter(
    (v) => new Date(v.date_issued).toDateString() === today,
  ).length;
  const pendingCount = violations.filter((v) => v.status === "pending").length;
  const resolvedCount = violations.filter(
    (v) => v.status === "resolved",
  ).length;

  const breakdown = violations.reduce((acc, v) => {
    acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
    return acc;
  }, {});

  const handleNavClick = (id) => {
    setTab(id);
    setSidebarOpen(false);
  };

  return (
    <div className="page">
      <Navbar
        title="Admin Panel"
        onMenuToggle={() => setSidebarOpen((o) => !o)}
        showMenuToggle
        hideUser
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`admin-layout${collapsed ? " sidebar-collapsed" : ""}`}>
        {/* Sidebar */}
        <aside
          className={`admin-sidebar${sidebarOpen ? " open" : ""}${collapsed ? " collapsed" : ""}`}
          aria-label="Primary navigation"
        >
          <nav className="sidebar-nav">
            {NAV_SECTIONS.map((section) => (
              <div className="sidebar-section" key={section.label}>
                <div className="sidebar-section-label">{section.label}</div>
                {section.items.map((item) => {
                  const isActive = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`sidebar-nav-item${isActive ? " active" : ""}`}
                      onClick={() => handleNavClick(item.id)}
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="sidebar-nav-icon">{item.icon}</span>
                      <span className="sidebar-nav-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom section: profile + collapse toggle + logout */}
          <div className="sidebar-footer">
            <div className="sidebar-profile" title={collapsed ? user?.name : undefined}>
              <div className="sidebar-avatar">
                {(user?.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-profile-info">
                <div className="sidebar-profile-name">{user?.name || "User"}</div>
                <div className="sidebar-profile-role">
                  {ROLE_LABELS[user?.role] || user?.role}
                </div>
              </div>
            </div>

            <button
              className="sidebar-action sidebar-logout"
              onClick={logoutUser}
              title={collapsed ? "Logout" : undefined}
            >
              <span className="sidebar-nav-icon">⏻</span>
              <span className="sidebar-nav-label">Logout</span>
            </button>

            <button
              className="sidebar-collapse-btn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <span className="sidebar-collapse-chevron" aria-hidden="true">‹</span>
              <span className="sidebar-collapse-label">Collapse</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="admin-main">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">
                    {loading ? "..." : violations.length}
                  </div>
                  <div className="stat-label">Total Violations</div>
                </div>
                <div className="stat-card accent">
                  <div className="stat-value">{loading ? "..." : todayCount}</div>
                  <div className="stat-label">Today</div>
                </div>
                <div className="stat-card danger">
                  <div className="stat-value">
                    {loading ? "..." : pendingCount}
                  </div>
                  <div className="stat-label">Pending</div>
                </div>
                <div className="stat-card success">
                  <div className="stat-value">
                    {loading ? "..." : resolvedCount}
                  </div>
                  <div className="stat-label">Resolved</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">📈 Violation Breakdown</div>
                {loading ? (
                  <p style={{ color: "#999" }}>Loading...</p>
                ) : Object.keys(breakdown).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-text">No violations yet</div>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  >
                    {Object.entries(breakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => {
                        const pct = Math.round(
                          (count / violations.length) * 100,
                        );
                        return (
                          <div key={type}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 4,
                                fontSize: "0.88rem",
                              }}
                            >
                              <span>{type}</span>
                              <span style={{ color: "#666" }}>
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div
                              style={{
                                background: "#e0e0e0",
                                borderRadius: 4,
                                height: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  background:
                                    "linear-gradient(90deg, #1a237e, #3949ab)",
                                  height: "100%",
                                  borderRadius: 4,
                                  transition: "width 0.5s",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title">🕐 Recent Violations</div>
                {loading ? (
                  <p style={{ color: "#999" }}>Loading...</p>
                ) : violations.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-text">
                      No violations recorded yet
                    </div>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Motorist</th>
                          <th>Type</th>
                          <th>Enforcer</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {violations.slice(0, 5).map((v) => (
                          <tr key={v.id}>
                            <td>{v.motorist_name}</td>
                            <td>{v.violation_type}</td>
                            <td>{v.enforcer_name}</td>
                            <td>
                              {new Date(v.date_issued).toLocaleDateString()}
                            </td>
                            <td>
                              <span className={`badge badge-${v.status}`}>
                                {v.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "map" && <ViolationMap violations={violations} />}

          {tab === "violations" && (
            <ViolationsTable
              violations={violations}
              onRefresh={fetchViolations}
            />
          )}

          {tab === "users" && <UserManagement />}

          {tab === "ordinances" && <OrdinancesPanel />}

          {tab === "enforcer-tracking" && (
            <ComingSoon title="Enforcer Tracking" icon="🚓" />
          )}

          {tab === "logs" && <ComingSoon title="System Logs" icon="📜" />}

          {tab === "settings" && (
            <ComingSoon title="System Settings" icon="⚙️" />
          )}
        </main>
      </div>
    </div>
  );
}

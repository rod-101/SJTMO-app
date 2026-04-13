import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import ViolationMap from './ViolationMap';
import ViolationsTable from './ViolationsTable';
import UserManagement from './UserManagement';
import OrdinancesPanel from './OrdinancesPanel';
import { getViolations } from '../../services/api';
import '../../App.css';

const TABS = [
  { id: 'overview', label: '📊 Dashboard' },
  { id: 'map', label: '🗺️ Live Map' },
  { id: 'violations', label: '📋 Violations' },
  { id: 'users', label: '👥 Users' },
  { id: 'ordinances', label: '📌 Ordinances' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchViolations = useCallback(async () => {
    try {
      const data = await getViolations();
      setViolations(data);
    } catch (err) {
      console.error('Failed to fetch violations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchViolations();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchViolations, 15000);
    return () => clearInterval(interval);
  }, [fetchViolations]);

  const today = new Date().toDateString();
  const todayCount = violations.filter(
    (v) => new Date(v.date_issued).toDateString() === today
  ).length;
  const pendingCount = violations.filter((v) => v.status === 'pending').length;
  const resolvedCount = violations.filter((v) => v.status === 'resolved').length;

  // Violation type breakdown
  const breakdown = violations.reduce((acc, v) => {
    acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page">
      <Navbar title="Admin Panel" />
      <div className="content">
        {/* Tab Navigation */}
        <div className="tab-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{loading ? '...' : violations.length}</div>
                <div className="stat-label">Total Violations</div>
              </div>
              <div className="stat-card accent">
                <div className="stat-value">{loading ? '...' : todayCount}</div>
                <div className="stat-label">Today</div>
              </div>
              <div className="stat-card danger">
                <div className="stat-value">{loading ? '...' : pendingCount}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-card success">
                <div className="stat-value">{loading ? '...' : resolvedCount}</div>
                <div className="stat-label">Resolved</div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">📈 Violation Breakdown</div>
              {loading ? (
                <p style={{ color: '#999' }}>Loading...</p>
              ) : Object.keys(breakdown).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-text">No violations yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(breakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const pct = Math.round((count / violations.length) * 100);
                      return (
                        <div key={type}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.88rem' }}>
                            <span>{type}</span>
                            <span style={{ color: '#666' }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ background: '#e0e0e0', borderRadius: 4, height: 8 }}>
                            <div style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #1a237e, #3949ab)',
                              height: '100%',
                              borderRadius: 4,
                              transition: 'width 0.5s'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Recent violations */}
            <div className="card">
              <div className="card-title">🕐 Recent Violations</div>
              {loading ? (
                <p style={{ color: '#999' }}>Loading...</p>
              ) : violations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-text">No violations recorded yet</div>
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
                          <td>{new Date(v.date_issued).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge badge-${v.status}`}>{v.status}</span>
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

        {tab === 'map' && (
          <ViolationMap violations={violations} />
        )}

        {tab === 'violations' && (
          <ViolationsTable violations={violations} onRefresh={fetchViolations} />
        )}

        {tab === 'users' && (
          <UserManagement />
        )}

        {tab === 'ordinances' && (
          <OrdinancesPanel />
        )}
      </div>
    </div>
  );
}

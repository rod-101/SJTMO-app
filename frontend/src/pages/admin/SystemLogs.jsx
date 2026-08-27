import React, { useEffect, useState, useCallback } from "react";
import { getSystemLogs, getSystemLogActions } from "../../services/api";
import "../../App.css";

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

function ActionBadge({ action = "" }) {
  const tone = /delete|reject|suspend|force_logout/.test(action)
    ? "danger"
    : /create|verify|activate/.test(action)
      ? "success"
      : /update|reset_password|deactivate/.test(action)
        ? "warn"
        : "neutral";
  return <span className={`status-pill log-action-${tone}`}>{action || "unknown"}</span>;
}

function SkeletonRows({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </>
  );
}

function LogDetailsModal({ log, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Log Entry</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: "grid", gap: 10, fontSize: "0.85rem" }}>
          <div><strong>Action:</strong> <ActionBadge action={log.action} /></div>
          <div><strong>Actor:</strong> {log.user_name || "system"}</div>
          <div><strong>Target:</strong> {log.target_table || "—"} {log.target_id ? `#${log.target_id}` : ""}</div>
          <div><strong>IP Address:</strong> {log.ip_address || "—"}</div>
          <div><strong>Timestamp:</strong> {formatDateTime(log.created_at)}</div>
          {log.old_value && (
            <div>
              <strong>Before:</strong>
              <pre className="log-json">{JSON.stringify(log.old_value, null, 2)}</pre>
            </div>
          )}
          {log.new_value && (
            <div>
              <strong>After:</strong>
              <pre className="log-json">{JSON.stringify(log.new_value, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [actions, setActions] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    getSystemLogActions()
      .then(setActions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter, from, to, pageSize]);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setErr("");
    getSystemLogs({
      page,
      pageSize,
      search: debouncedSearch,
      action: actionFilter === "all" ? "" : actionFilter,
      from,
      to,
    })
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((e) => setErr(e.message || "Failed to load logs."))
      .finally(() => setLoading(false));
  }, [page, pageSize, debouncedSearch, actionFilter, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setSearch("");
    setActionFilter("all");
    setFrom("");
    setTo("");
  };

  return (
    <div>
      <div className="um-page-header">
        <div>
          <h2 className="um-page-title">System Logs</h2>
          <div className="um-page-subtitle">Audit trail of administrative and system actions.</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchLogs} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      <div className="card um-filters">
        <div className="um-filter-row">
          <div className="um-filter-search">
            <input
              className="form-input"
              placeholder="Search actor, action, or target ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="all">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input className="form-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
          <input className="form-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
          <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      <div className="card um-table-card">
        <div className="table-wrapper um-table-wrapper">
          {loading ? (
            <div style={{ padding: "12px 4px" }}><SkeletonRows /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📜</div>
              <div className="empty-state-text">No log entries found</div>
            </div>
          ) : (
            <table className="um-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} onClick={() => setSelectedLog(log)} style={{ cursor: "pointer" }}>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-light)", whiteSpace: "nowrap" }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>{log.user_name || "system"}</td>
                    <td><ActionBadge action={log.action} /></td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>
                      {log.target_table ? `${log.target_table}${log.target_id ? ` #${log.target_id}` : ""}` : "—"}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>{log.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {logs.length > 0 && (
          <div className="um-pagination">
            <div className="um-pagination-info">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="um-pagination-controls">
              <select className="form-select um-rows-per-page" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
              <span className="um-page-indicator">Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>

      {selectedLog && <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}

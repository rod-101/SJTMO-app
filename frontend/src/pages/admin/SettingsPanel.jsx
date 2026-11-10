import React, { useEffect, useMemo, useState } from "react";
import {
  getSettings,
  updateSettings,
  getSystemStatus,
  runOverdueCheck,
} from "../../services/api";
import { setTicketTextCache } from "../../utils/ticketText";
import "../../App.css";

const TEXT_LIMITS = {
  ticket_office_name: 60,
  ticket_title: 40,
  ticket_footer: 120,
};

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
};

const hint = { fontSize: "0.8rem", color: "var(--text-light)", marginTop: 4 };
const sectionHeader = { marginBottom: 16 };

function CharCount({ value, max }) {
  const len = (value || "").length;
  return (
    <span
      style={{
        float: "right",
        fontWeight: 400,
        color: len > max ? "var(--danger)" : "var(--text-muted)",
      }}
    >
      {len}/{max}
    </span>
  );
}

export default function SettingsPanel() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const showMsg = (msg, isError = false) => {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => {
      setMessage("");
      setError("");
    }, 3500);
  };

  useEffect(() => {
    Promise.all([getSettings(), getSystemStatus().catch(() => null)])
      .then(([data, sys]) => {
        setSaved(data.settings);
        setForm(data.settings);
        setLastUpdated(data.lastUpdated);
        setStatus(sys);
      })
      .catch((err) => showMsg(err.message || "Failed to load settings", true))
      .finally(() => setLoading(false));
  }, []);

  // Only keys whose value differs from what's saved. overdue_days is compared
  // as a string so "14" in the input equals 14 from the server.
  const changes = useMemo(() => {
    if (!form || !saved) return {};
    const out = {};
    for (const key of Object.keys(form)) {
      if (String(form[key]) !== String(saved[key])) out[key] = form[key];
    }
    return out;
  }, [form, saved]);
  const dirty = Object.keys(changes).length > 0;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      const data = await updateSettings(changes);
      setSaved(data.settings);
      setForm(data.settings);
      setLastUpdated(data.lastUpdated);
      setTicketTextCache(data.settings);
      showMsg("Settings saved");
    } catch (err) {
      showMsg(err.message || "Failed to save settings", true);
    } finally {
      setSaving(false);
    }
  };

  const handleRunCheck = async () => {
    if (dirty && "overdue_days" in changes) {
      showMsg("Save the new overdue threshold before running the check.", true);
      return;
    }
    if (
      !window.confirm(
        `Mark every pending ticket older than ${saved.overdue_days} day(s) as overdue now?`,
      )
    )
      return;
    setRunning(true);
    try {
      const { marked } = await runOverdueCheck();
      showMsg(
        marked === 0
          ? "No pending tickets were past the threshold."
          : `Marked ${marked} ticket(s) as overdue.`,
      );
    } catch (err) {
      showMsg(err.message || "Overdue check failed", true);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-text">Loading settings…</div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div>
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-text">Settings could not be loaded.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {message && <div className="alert alert-success">✅ {message}</div>}
      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <form onSubmit={handleSave}>
        {/* Header + save */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="card-title" style={{ marginBottom: 2 }}>
                ⚙️ System Settings
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                {lastUpdated?.updated_by
                  ? `Last updated by ${lastUpdated.updated_by} on ${formatDateTime(lastUpdated.updated_at)}`
                  : "Using default values"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={!dirty || saving}
                onClick={() => setForm(saved)}
              >
                Discard
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!dirty || saving}
              >
                {saving ? "Saving…" : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Violations & overdue */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={sectionHeader}>
            <div className="card-title" style={{ marginBottom: 2 }}>
              ⏰ Violations &amp; Overdue
            </div>
          </div>
          <div className="form-group" style={{ maxWidth: 260 }}>
            <label className="form-label" htmlFor="overdue_days">
              Overdue threshold (days)
            </label>
            <input
              id="overdue_days"
              className="form-input"
              type="number"
              min={1}
              max={365}
              step={1}
              value={form.overdue_days}
              onChange={set("overdue_days")}
            />
          </div>
          <div style={hint}>
            Pending tickets older than {form.overdue_days || "N"} day(s) are marked
            overdue every night at midnight. Changing this does not change tickets
            that are already overdue.
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleRunCheck}
              disabled={running}
            >
              {running ? "Running…" : "▶️ Run overdue check now"}
            </button>
          </div>
        </div>

        {/* Ticket text */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={sectionHeader}>
            <div className="card-title" style={{ marginBottom: 2 }}>
              🧾 Ticket Text
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
              Printed on PT-210 tickets and shown on receipts
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            <div>
              {[
                ["ticket_office_name", "Office name"],
                ["ticket_title", "Ticket title (printed ticket only)"],
                ["ticket_footer", "Footer note"],
              ].map(([key, label]) => (
                <div className="form-group" key={key}>
                  <label className="form-label" htmlFor={key}>
                    {label}
                    <CharCount value={form[key]} max={TEXT_LIMITS[key]} />
                  </label>
                  <input
                    id={key}
                    className="form-input"
                    value={form[key]}
                    onChange={set(key)}
                    placeholder={key === "ticket_footer" ? "(optional)" : ""}
                  />
                </div>
              ))}
            </div>

            {/* Live preview */}
            <div>
              <div className="form-label">Preview</div>
              <div
                style={{
                  fontFamily: "ui-monospace, Consolas, monospace",
                  fontSize: "0.8rem",
                  background: "var(--bg)",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: 16,
                  textAlign: "center",
                  color: "var(--text)",
                  overflowWrap: "anywhere",
                }}
              >
                <div style={{ fontWeight: 700 }}>SJTMO</div>
                <div>{form.ticket_office_name}</div>
                <div>{form.ticket_title}</div>
                <div style={{ margin: "8px 0", color: "var(--text-muted)" }}>
                  ··· ticket details ···
                </div>
                <div style={{ textAlign: "left" }}>{form.ticket_footer}</div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* System status */}
      <div className="card">
        <div style={sectionHeader}>
          <div className="card-title" style={{ marginBottom: 2 }}>
            🖥️ System Status
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
            Read-only. These come from the server's environment variables.
          </div>
        </div>
        {status ? (
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(140px, max-content) 1fr",
              gap: "8px 16px",
              margin: 0,
              fontSize: "0.875rem",
            }}
          >
            {[
              ["Environment", status.environment],
              ["Access token lifetime", status.accessTokenTtl],
              ["Refresh token lifetime", `${status.refreshTokenDays} day(s)`],
              [
                "Email (SMTP)",
                status.smtpConfigured ? "Configured" : "Not configured — emails are logged to the console",
              ],
              ["Frontend URL", status.frontendUrl],
              ["Overdue job", status.overdueJobSchedule],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <dt style={{ color: "var(--text-light)" }}>{label}</dt>
                <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        ) : (
          <div style={hint}>Status unavailable.</div>
        )}
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getReport, getReportPeriods } from "../../services/api";
import "../../App.css";
import "./Reports.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  bank_transfer: "Bank Transfer",
  others: "Others",
};

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const count = (n) => Number(n || 0).toLocaleString();

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

function Delta({ pct, prev }) {
  // A percentage change off a zero baseline isn't meaningful — say so instead
  // of reporting a misleading "+100%".
  if (Number(prev) === 0) {
    return <span className="report-delta-flat">no prior-period baseline</span>;
  }
  const v = Number(pct) || 0;
  const cls = v > 0 ? "report-delta-up" : v < 0 ? "report-delta-down" : "report-delta-flat";
  const arrow = v > 0 ? "▲" : v < 0 ? "▼" : "▬";
  return (
    <span className={cls}>
      {arrow} {Math.abs(v)}%
    </span>
  );
}

function Stat({ value, label, hint }) {
  return (
    <div className="report-stat">
      <div className="report-stat-value">{value}</div>
      <div className="report-stat-label">{label}</div>
      {hint && <div className="report-stat-hint">{hint}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="report-section">
      <div className="report-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function ReportsPanel() {
  const now = new Date();
  const [period, setPeriod] = useState("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [years, setYears] = useState([now.getFullYear()]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    getReportPeriods()
      .then((data) => data?.years?.length && setYears(data.years))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(() => {
    setLoading(true);
    setErr("");
    getReport({ period, year, month: period === "monthly" ? month : undefined })
      .then(setReport)
      .catch((e) => setErr(e.message || "Failed to load report."))
      .finally(() => setLoading(false));
  }, [period, year, month]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Browser print dialog → "Save as PDF". Keeps the report a single source of
  // truth (no separate server-side PDF template to drift out of sync) and
  // renders exactly what the admin previewed on screen.
  const exportPdf = () => {
    const previousTitle = document.title;
    if (report) {
      document.title = `SJTMO ${period === "yearly" ? "Annual" : "Monthly"} Report - ${report.meta.label}`;
    }
    window.print();
    document.title = previousTitle;
  };

  const maxSeries = useMemo(
    () => Math.max(1, ...(report?.series || []).map((s) => s.tickets)),
    [report],
  );

  const seriesLabel = (bucket) => {
    const d = new Date(bucket);
    return report?.meta.granularity === "day"
      ? String(d.getDate())
      : MONTHS[d.getMonth()].slice(0, 3);
  };

  const totals = useMemo(() => {
    if (!report) return null;
    return {
      typeCount: report.by_violation_type.reduce((s, r) => s + r.count, 0),
      typeAmount: report.by_violation_type.reduce((s, r) => s + r.amount_assessed, 0),
      enforcerTickets: report.by_enforcer.reduce((s, r) => s + r.tickets_issued, 0),
      enforcerAssessed: report.by_enforcer.reduce((s, r) => s + r.fines_assessed, 0),
      enforcerCollected: report.by_enforcer.reduce((s, r) => s + r.collected, 0),
      methodAmount: report.financials.by_method.reduce((s, r) => s + r.amount, 0),
      methodCount: report.financials.by_method.reduce((s, r) => s + r.payment_count, 0),
    };
  }, [report]);

  return (
    <div>
      <div className="um-page-header">
        <div>
          <h2 className="um-page-title">Reports</h2>
          <div className="um-page-subtitle">
            Monthly and annual enforcement and collection reports, ready to export as PDF.
          </div>
        </div>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {/* ── Controls (hidden when printing) ── */}
      <div className="card um-filters">
        <div className="report-toolbar">
          <div className="report-toolbar-field">
            <label className="report-toolbar-label" htmlFor="rpt-period">Report Type</label>
            <select
              id="rpt-period"
              className="form-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {period === "monthly" && (
            <div className="report-toolbar-field">
              <label className="report-toolbar-label" htmlFor="rpt-month">Month</label>
              <select
                id="rpt-month"
                className="form-select"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="report-toolbar-field">
            <label className="report-toolbar-label" htmlFor="rpt-year">Year</label>
            <select
              id="rpt-year"
              className="form-select"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="report-toolbar-spacer" />

          <button className="btn btn-outline btn-sm" onClick={fetchReport} disabled={loading}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportPdf} disabled={loading || !report}>
            ⤓ Export PDF
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-text">Generating report…</div>
          </div>
        </div>
      ) : !report ? null : (
        <div className="report-print-area">
          <div className="report-doc">
            {/* ── Header ── */}
            <div className="report-doc-head">
              <div className="report-org">Republic of the Philippines · Municipality of San Jose</div>
              <div className="report-org">Traffic Management Office (SJTMO)</div>
              <div className="report-title">
                {report.meta.period === "yearly" ? "Annual" : "Monthly"} Enforcement &amp; Collection Report
              </div>
              <div className="report-period">{report.meta.label}</div>
              <div className="report-meta">
                <span>Coverage: {report.meta.start} to {report.meta.end} (exclusive)</span>
                <span>Prepared by: {report.meta.generated_by}</span>
                <span>Generated: {formatDateTime(report.meta.generated_at)}</span>
              </div>
            </div>

            {/* ── 1. Executive summary ── */}
            <Section title="I. Executive Summary">
              <div className="report-stat-grid">
                <Stat
                  value={count(report.summary.tickets_issued)}
                  label="Tickets Issued"
                  hint={
                    <>
                      vs {count(report.comparison.previous_tickets)} in {report.comparison.previous_label}{" "}
                      <Delta
                        pct={report.comparison.tickets_change_pct}
                        prev={report.comparison.previous_tickets}
                      />
                    </>
                  }
                />
                <Stat
                  value={peso(report.financials.fines_assessed)}
                  label="Total Fines Assessed"
                  hint={`Average ${peso(report.summary.avg_fine)} per ticket`}
                />
                <Stat
                  value={peso(report.financials.total_collected)}
                  label="Total Collected"
                  hint={
                    <>
                      vs {peso(report.comparison.previous_collected)} in {report.comparison.previous_label}{" "}
                      <Delta
                        pct={report.comparison.collected_change_pct}
                        prev={report.comparison.previous_collected}
                      />
                    </>
                  }
                />
                <Stat
                  value={`${report.financials.collection_rate}%`}
                  label="Collection Rate"
                  hint="Collected ÷ fines assessed"
                />
                <Stat
                  value={peso(report.financials.outstanding)}
                  label="Outstanding Balance"
                  hint="Unpaid balance on this period's tickets"
                />
                <Stat
                  value={count(report.summary.unique_motorists)}
                  label="Motorists Cited"
                  hint={`${count(report.summary.active_enforcers)} enforcers active`}
                />
              </div>
            </Section>

            {/* ── 2. Ticket status ── */}
            <Section title="II. Ticket Status Breakdown">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="num">Tickets</th>
                    <th className="num">Share</th>
                    <th>Definition</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Pending", report.summary.pending, "Issued, awaiting payment"],
                    ["Payment Submitted", report.summary.payment_submitted, "Motorist uploaded a receipt, awaiting verification"],
                    ["Partially Paid", report.summary.partially_paid, "Verified payment received, balance remaining"],
                    ["Paid", report.summary.paid, "Fine settled in full"],
                    ["Resolved", report.summary.resolved, "Closed by the office"],
                    ["Overdue", report.summary.overdue, "Past the payment window"],
                    ["Disputed", report.summary.disputed, "Contested by the motorist"],
                    ["Dismissed", report.summary.dismissed, "Voided — no fine collectible"],
                  ].map(([label, value, note]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td className="num">{count(value)}</td>
                      <td className="num">
                        {report.summary.tickets_issued
                          ? `${Math.round((value / report.summary.tickets_issued) * 1000) / 10}%`
                          : "—"}
                      </td>
                      <td style={{ color: "#666" }}>{note}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="num">{count(report.summary.tickets_issued)}</td>
                    <td className="num">100%</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </Section>

            {/* ── 3. Financials ── */}
            <Section title="III. Financial Summary">
              <table className="report-table">
                <tbody>
                  <tr>
                    <td>Total fines assessed (tickets issued this period)</td>
                    <td className="num">{peso(report.financials.fines_assessed)}</td>
                  </tr>
                  <tr>
                    <td>Total collected (verified payments received this period)</td>
                    <td className="num">{peso(report.financials.total_collected)}</td>
                  </tr>
                  <tr>
                    <td>Outstanding balance on this period&apos;s tickets</td>
                    <td className="num">{peso(report.financials.outstanding)}</td>
                  </tr>
                  <tr>
                    <td>Collection rate</td>
                    <td className="num">{report.financials.collection_rate}%</td>
                  </tr>
                  <tr>
                    <td>Number of verified payment transactions</td>
                    <td className="num">{count(report.financials.payment_count)}</td>
                  </tr>
                  <tr>
                    <td>Tickets receiving a payment</td>
                    <td className="num">{count(report.financials.tickets_paid_against)}</td>
                  </tr>
                  <tr>
                    <td>Motorist-submitted (online) payments verified</td>
                    <td className="num">{count(report.financials.online_submissions)}</td>
                  </tr>
                  <tr>
                    <td>Receipts still awaiting verification</td>
                    <td className="num">
                      {count(report.financials.unverified_count)} ({peso(report.financials.unverified_amount)})
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 14 }}>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Payment Method</th>
                      <th className="num">Transactions</th>
                      <th className="num">Amount</th>
                      <th className="num">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.financials.by_method.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="report-empty">No payments recorded in this period.</td>
                      </tr>
                    ) : (
                      report.financials.by_method.map((m) => (
                        <tr key={m.payment_method}>
                          <td>{PAYMENT_METHOD_LABELS[m.payment_method] || m.payment_method}</td>
                          <td className="num">{count(m.payment_count)}</td>
                          <td className="num">{peso(m.amount)}</td>
                          <td className="num">
                            {totals.methodAmount
                              ? `${Math.round((m.amount / totals.methodAmount) * 1000) / 10}%`
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {report.financials.by_method.length > 0 && (
                    <tfoot>
                      <tr>
                        <td>Total</td>
                        <td className="num">{count(totals.methodCount)}</td>
                        <td className="num">{peso(totals.methodAmount)}</td>
                        <td className="num">100%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Section>

            {/* ── 4. Violations by type ── */}
            <Section title="IV. Violations by Type">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Violation</th>
                    <th className="num">Count</th>
                    <th className="num">Share</th>
                    <th className="num">Fine Each</th>
                    <th className="num">Amount Assessed</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_violation_type.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="report-empty">No violations recorded in this period.</td>
                    </tr>
                  ) : (
                    report.by_violation_type.map((v) => (
                      <tr key={v.violation_type}>
                        <td>{v.violation_type}</td>
                        <td className="num">{count(v.count)}</td>
                        <td className="num">
                          {totals.typeCount
                            ? `${Math.round((v.count / totals.typeCount) * 1000) / 10}%`
                            : "—"}
                        </td>
                        <td className="num">{peso(v.fine_each)}</td>
                        <td className="num">{peso(v.amount_assessed)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {report.by_violation_type.length > 0 && (
                  <tfoot>
                    <tr>
                      <td>Total offences cited</td>
                      <td className="num">{count(totals.typeCount)}</td>
                      <td className="num">100%</td>
                      <td className="num">—</td>
                      <td className="num">{peso(totals.typeAmount)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </Section>

            {/* ── 5. Enforcer performance ── */}
            <Section title="V. Enforcer Performance">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Enforcer</th>
                    <th className="num">Tickets Issued</th>
                    <th className="num">Settled</th>
                    <th className="num">Overdue</th>
                    <th className="num">Fines Assessed</th>
                    <th className="num">Collected</th>
                    <th className="num">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_enforcer.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="report-empty">No tickets issued in this period.</td>
                    </tr>
                  ) : (
                    report.by_enforcer.map((e) => (
                      <tr key={e.enforcer_name}>
                        <td>{e.enforcer_name}</td>
                        <td className="num">{count(e.tickets_issued)}</td>
                        <td className="num">{count(e.settled)}</td>
                        <td className="num">{count(e.overdue)}</td>
                        <td className="num">{peso(e.fines_assessed)}</td>
                        <td className="num">{peso(e.collected)}</td>
                        <td className="num">
                          {e.fines_assessed
                            ? `${Math.round((e.collected / e.fines_assessed) * 1000) / 10}%`
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {report.by_enforcer.length > 0 && (
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="num">{count(totals.enforcerTickets)}</td>
                      <td className="num" />
                      <td className="num" />
                      <td className="num">{peso(totals.enforcerAssessed)}</td>
                      <td className="num">{peso(totals.enforcerCollected)}</td>
                      <td className="num">
                        {totals.enforcerAssessed
                          ? `${Math.round((totals.enforcerCollected / totals.enforcerAssessed) * 1000) / 10}%`
                          : "—"}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </Section>

            {/* ── 6. Trend ── */}
            <Section
              title={
                report.meta.granularity === "day"
                  ? "VI. Daily Trend"
                  : "VI. Monthly Trend"
              }
            >
              <div className="report-chart">
                {report.series.map((s) => (
                  <div
                    className="report-chart-col"
                    key={s.bucket}
                    title={`${seriesLabel(s.bucket)}: ${s.tickets} ticket(s), ${peso(s.collected)} collected`}
                  >
                    <div className="report-chart-count">{s.tickets || ""}</div>
                    <div
                      className="report-chart-bar"
                      style={{ height: `${Math.round((s.tickets / maxSeries) * 100)}%` }}
                    />
                    <div className="report-chart-label">{seriesLabel(s.bucket)}</div>
                  </div>
                ))}
              </div>

              <table className="report-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>{report.meta.granularity === "day" ? "Date" : "Month"}</th>
                    <th className="num">Tickets Issued</th>
                    <th className="num">Fines Assessed</th>
                    <th className="num">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {report.series
                    .filter((s) => s.tickets > 0 || s.collected > 0)
                    .map((s) => (
                      <tr key={s.bucket}>
                        <td>
                          {new Date(s.bucket).toLocaleDateString(undefined,
                            report.meta.granularity === "day"
                              ? { year: "numeric", month: "short", day: "numeric" }
                              : { year: "numeric", month: "long" },
                          )}
                        </td>
                        <td className="num">{count(s.tickets)}</td>
                        <td className="num">{peso(s.fines_assessed)}</td>
                        <td className="num">{peso(s.collected)}</td>
                      </tr>
                    ))}
                  {report.series.every((s) => s.tickets === 0 && s.collected === 0) && (
                    <tr>
                      <td colSpan={4} className="report-empty">No activity in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>

            {/* ── 7. Repeat offenders ── */}
            <Section title="VII. Repeat Offenders">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Motorist</th>
                    <th className="num">Tickets in Period</th>
                    <th className="num">Fines Assessed</th>
                  </tr>
                </thead>
                <tbody>
                  {report.repeat_offenders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="report-empty">
                        No motorist was cited more than once in this period.
                      </td>
                    </tr>
                  ) : (
                    report.repeat_offenders.map((m) => (
                      <tr key={m.motorist_name}>
                        <td>{m.motorist_name}</td>
                        <td className="num">{count(m.tickets)}</td>
                        <td className="num">{peso(m.fines_assessed)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Section>

            {/* ── 8. System activity ── */}
            <Section title="VIII. System Activity">
              <div className="report-stat-grid">
                <Stat value={count(report.new_users.total)} label="New Accounts Registered" />
                <Stat value={count(report.new_users.motorist)} label="New Motorist Accounts" />
                <Stat value={count(report.new_users.enforcer)} label="New Enforcer Accounts" />
                <Stat value={count(report.new_users.admin)} label="New Admin Accounts" />
              </div>
            </Section>

            {/* ── Signatures ── */}
            <div className="report-signatures">
              <div className="report-sign-line">Prepared by — {report.meta.generated_by}</div>
              <div className="report-sign-line">Reviewed by</div>
              <div className="report-sign-line">Approved by — TMO Head</div>
            </div>

            <div className="report-footnote">
              Notes: Fines assessed are computed from the current fine schedule for every violation
              cited on tickets issued within the coverage period. Collections are recognised on the
              payment date, so a payment settling an earlier period&apos;s ticket is reported here and
              the collection rate may exceed 100%. Only verified payments are counted; receipts
              awaiting verification are listed separately in Section III. Deleted tickets are excluded.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

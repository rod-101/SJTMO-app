const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth, authorize } = require("../middleware/auth");

router.use(requireAuth, authorize("admin"));

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Period boundaries are plain YYYY-MM-DD strings compared against TIMESTAMPTZ
// columns, so Postgres resolves them in the server's timezone — the same
// timezone the rest of the app records date_issued/paid_at in.
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// Returns { start, end, prevStart, prevEnd, label, granularity } for the
// requested period. `end` is exclusive.
function resolvePeriod(period, year, month) {
  if (period === "yearly") {
    return {
      start: ymd(year, 1, 1),
      end: ymd(year + 1, 1, 1),
      prevStart: ymd(year - 1, 1, 1),
      prevEnd: ymd(year, 1, 1),
      label: String(year),
      granularity: "month",
    };
  }
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  const prevY = month === 1 ? year - 1 : year;
  const prevM = month === 1 ? 12 : month - 1;
  return {
    start: ymd(year, month, 1),
    end: ymd(nextY, nextM, 1),
    prevStart: ymd(prevY, prevM, 1),
    prevEnd: ymd(year, month, 1),
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    granularity: "day",
  };
}

// Tickets issued inside the window, each with the summed fine of every
// violation named in its comma-separated violation_type string.
const PERIOD_TICKETS_CTE = `
  WITH period_tickets AS (
    SELECT t.id,
           t.ticket_no,
           t.status,
           t.enforcer_name,
           t.motorist_name,
           t.motorist_id,
           t.license_no,
           t.date_issued,
           COALESCE(f.fine_total, 0) AS fine_total
    FROM tickets t
    LEFT JOIN LATERAL (
      SELECT SUM(vt.fine) AS fine_total
      FROM unnest(string_to_array(t.violation_type, ',')) AS names(n)
      JOIN violation_types vt ON vt.name = trim(names.n)
    ) f ON TRUE
    WHERE t.is_deleted = FALSE
      AND t.date_issued >= $1::date
      AND t.date_issued <  $2::date
  )
`;

const num = (v) => Number(v) || 0;

// ─── GET /reports ─────────────────────────────────────────────────────────────
// Query params: period=monthly|yearly, year=YYYY, month=1-12 (monthly only)
router.get("/", async (req, res) => {
  try {
    const period = req.query.period === "yearly" ? "yearly" : "monthly";
    const now = new Date();

    const year = parseInt(req.query.year, 10) || now.getFullYear();
    if (year < 2000 || year > 2100) {
      return res
        .status(400)
        .json({ error: "year must be between 2000 and 2100" });
    }
    let month = parseInt(req.query.month, 10);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      month = now.getMonth() + 1;
    }

    const p = resolvePeriod(period, year, month);
    const range = [p.start, p.end];

    // Ticket volume, status mix and fines assessed for the period.
    const summaryQ = pool.query(
      `${PERIOD_TICKETS_CTE}
       SELECT COUNT(*)                                              AS tickets_issued,
              COUNT(*) FILTER (WHERE status = 'pending')            AS pending,
              COUNT(*) FILTER (WHERE status = 'payment_submitted')  AS payment_submitted,
              COUNT(*) FILTER (WHERE status = 'partially_paid')     AS partially_paid,
              COUNT(*) FILTER (WHERE status = 'paid')               AS paid,
              COUNT(*) FILTER (WHERE status = 'resolved')           AS resolved,
              COUNT(*) FILTER (WHERE status = 'dismissed')          AS dismissed,
              COUNT(*) FILTER (WHERE status = 'disputed')           AS disputed,
              COUNT(*) FILTER (WHERE status = 'overdue')            AS overdue,
              COALESCE(SUM(fine_total), 0)                          AS fines_assessed,
              COUNT(DISTINCT motorist_name)                         AS unique_motorists,
              COUNT(DISTINCT enforcer_name)                         AS active_enforcers
       FROM period_tickets`,
      range,
    );

    // Money actually collected during the period, keyed on payment date — a
    // payment made this month against last month's ticket belongs here.
    const collectionsQ = pool.query(
      `SELECT COUNT(*)                                   AS payment_count,
              COALESCE(SUM(amount_paid), 0)              AS total_collected,
              COUNT(DISTINCT ticket_id)                  AS tickets_paid_against,
              COUNT(*) FILTER (WHERE submitted_by_motorist) AS online_submissions
       FROM payments
       WHERE verified = TRUE AND paid_at >= $1::date AND paid_at < $2::date`,
      range,
    );

    const methodsQ = pool.query(
      `SELECT payment_method,
              COUNT(*)                      AS payment_count,
              COALESCE(SUM(amount_paid), 0) AS amount
       FROM payments
       WHERE verified = TRUE AND paid_at >= $1::date AND paid_at < $2::date
       GROUP BY payment_method
       ORDER BY amount DESC`,
      range,
    );

    // Motorist-submitted receipts still awaiting admin verification.
    const unverifiedQ = pool.query(
      `SELECT COUNT(*)                      AS payment_count,
              COALESCE(SUM(amount_paid), 0) AS amount
       FROM payments
       WHERE verified = FALSE AND paid_at >= $1::date AND paid_at < $2::date`,
      range,
    );

    // One row per violation named on a ticket — a ticket citing two offences
    // contributes to both rows, which is what a per-offence report wants.
    const byTypeQ = pool.query(
      `SELECT trim(names.n)                  AS violation_type,
              COUNT(*)                       AS count,
              COALESCE(MAX(vt.fine), 0)      AS fine_each,
              COALESCE(SUM(vt.fine), 0)      AS amount_assessed
       FROM tickets t
       CROSS JOIN LATERAL unnest(string_to_array(t.violation_type, ',')) AS names(n)
       LEFT JOIN violation_types vt ON vt.name = trim(names.n)
       WHERE t.is_deleted = FALSE
         AND t.date_issued >= $1::date AND t.date_issued < $2::date
         AND t.violation_type IS NOT NULL
       GROUP BY 1
       ORDER BY count DESC, violation_type`,
      range,
    );

    // Per-enforcer output. `collected` counts verified payments against that
    // enforcer's period tickets whenever they were paid, so the column reads
    // as "how much of what this enforcer issued has come in".
    const enforcersQ = pool.query(
      `${PERIOD_TICKETS_CTE}
       SELECT COALESCE(NULLIF(trim(pt.enforcer_name), ''), 'Unassigned') AS enforcer_name,
              COUNT(*)                                                  AS tickets_issued,
              COUNT(*) FILTER (WHERE pt.status IN ('paid', 'resolved'))  AS settled,
              COUNT(*) FILTER (WHERE pt.status = 'overdue')              AS overdue,
              COALESCE(SUM(pt.fine_total), 0)                            AS fines_assessed,
              COALESCE(SUM(pay.amount), 0)                               AS collected
       FROM period_tickets pt
       LEFT JOIN LATERAL (
         SELECT SUM(p.amount_paid) AS amount
         FROM payments p
         WHERE p.ticket_id = pt.id AND p.verified = TRUE
       ) pay ON TRUE
       GROUP BY 1
       ORDER BY tickets_issued DESC, enforcer_name`,
      range,
    );

    // Time series: day-by-day for a monthly report, month-by-month for a
    // yearly one. generate_series keeps empty buckets in the table.
    const step = p.granularity === "day" ? "1 day" : "1 month";
    const seriesQ = pool.query(
      `SELECT b.bucket,
              COALESCE(tk.tickets, 0)   AS tickets,
              COALESCE(tk.assessed, 0)  AS fines_assessed,
              COALESCE(pm.collected, 0) AS collected
       FROM generate_series(
              $1::timestamptz,
              ($2::date - interval '1 day')::timestamptz,
              interval '${step}'
            ) AS b(bucket)
       LEFT JOIN (
         SELECT date_trunc('${p.granularity}', t.date_issued) AS bucket,
                COUNT(*)                                      AS tickets,
                COALESCE(SUM(f.fine_total), 0)                AS assessed
         FROM tickets t
         LEFT JOIN LATERAL (
           SELECT SUM(vt.fine) AS fine_total
           FROM unnest(string_to_array(t.violation_type, ',')) AS names(n)
           JOIN violation_types vt ON vt.name = trim(names.n)
         ) f ON TRUE
         WHERE t.is_deleted = FALSE
           AND t.date_issued >= $1::date AND t.date_issued < $2::date
         GROUP BY 1
       ) tk ON tk.bucket = b.bucket
       LEFT JOIN (
         SELECT date_trunc('${p.granularity}', paid_at) AS bucket,
                COALESCE(SUM(amount_paid), 0)           AS collected
         FROM payments
         WHERE verified = TRUE AND paid_at >= $1::date AND paid_at < $2::date
         GROUP BY 1
       ) pm ON pm.bucket = b.bucket
       ORDER BY b.bucket`,
      range,
    );

    // Motorists cited more than once inside the period.
    const repeatQ = pool.query(
      `${PERIOD_TICKETS_CTE}
       SELECT motorist_name,
              COUNT(*)                        AS tickets,
              COALESCE(SUM(fine_total), 0)    AS fines_assessed
       FROM period_tickets
       WHERE motorist_name IS NOT NULL
       GROUP BY 1
       HAVING COUNT(*) > 1
       ORDER BY tickets DESC, motorist_name
       LIMIT 10`,
      range,
    );

    const violatorsQ = pool.query(
      `${PERIOD_TICKETS_CTE}
       SELECT
         COALESCE(
           m.id::text,
           LOWER(TRIM(COALESCE(
             NULLIF(trim(pt.motorist_name), ''),
             CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, ''))
           )))
         ) AS person_key,
         MAX(COALESCE(
           NULLIF(trim(pt.motorist_name), ''),
           CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, ''))
         )) AS motorist_name,
         MAX(m.first_name) AS first_name,
         MAX(m.last_name) AS last_name,
         MAX(COALESCE(m.license_no, pt.license_no)) AS license_no,
         MAX(m.birthday) AS birthday,
         MAX(m.address) AS address,
         MAX(m.contact_no) AS contact_no,
         COUNT(*) AS tickets,
         COALESCE(SUM(pt.fine_total), 0) AS fines_assessed
       FROM period_tickets pt
       LEFT JOIN motorists m ON m.id = pt.motorist_id
       GROUP BY 1
       ORDER BY tickets DESC, motorist_name
       LIMIT 100`,
      range,
    );

    const ticketsQ = pool.query(
      `${PERIOD_TICKETS_CTE}
       SELECT pt.ticket_no,
              pt.date_issued,
              pt.motorist_name,
              pt.license_no,
              t.violation_type,
              pt.enforcer_name,
              pt.status,
              pt.fine_total,
              COALESCE(paid.amount_paid, 0) AS amount_paid,
              GREATEST(pt.fine_total - COALESCE(paid.amount_paid, 0), 0) AS balance_due,
              latest.paid_at,
              latest.payment_method,
              latest.receipt_no
       FROM period_tickets pt
       JOIN tickets t ON t.id = pt.id
       LEFT JOIN LATERAL (
         SELECT SUM(p.amount_paid) AS amount_paid
         FROM payments p
         WHERE p.ticket_id = pt.id AND p.verified = TRUE
       ) paid ON TRUE
       LEFT JOIN LATERAL (
         SELECT p.paid_at, p.payment_method, p.receipt_no
         FROM payments p
         WHERE p.ticket_id = pt.id
         ORDER BY p.paid_at DESC NULLS LAST, p.receipt_no DESC
         LIMIT 1
       ) latest ON TRUE
       ORDER BY pt.date_issued DESC, pt.ticket_no`,
      range,
    );

    const newUsersQ = pool.query(
      `SELECT role, COUNT(*) AS count
       FROM users
       WHERE created_at >= $1::date AND created_at < $2::date
       GROUP BY role`,
      range,
    );

    // Same two headline numbers for the preceding period, for the delta row.
    const prevRange = [p.prevStart, p.prevEnd];
    const prevTicketsQ = pool.query(
      `${PERIOD_TICKETS_CTE}
       SELECT COUNT(*) AS tickets_issued, COALESCE(SUM(fine_total), 0) AS fines_assessed
       FROM period_tickets`,
      prevRange,
    );
    const prevCollectedQ = pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS total_collected
       FROM payments
       WHERE verified = TRUE AND paid_at >= $1::date AND paid_at < $2::date`,
      prevRange,
    );

    const [
      summaryR,
      collectionsR,
      methodsR,
      unverifiedR,
      byTypeR,
      enforcersR,
      seriesR,
      repeatR,
      violatorsR,
      ticketsR,
      newUsersR,
      prevTicketsR,
      prevCollectedR,
    ] = await Promise.all([
      summaryQ,
      collectionsQ,
      methodsQ,
      unverifiedQ,
      byTypeQ,
      enforcersQ,
      seriesQ,
      repeatQ,
      violatorsQ,
      ticketsQ,
      newUsersQ,
      prevTicketsQ,
      prevCollectedQ,
    ]);

    const s = summaryR.rows[0];
    const c = collectionsR.rows[0];
    const u = unverifiedR.rows[0];

    const finesAssessed = num(s.fines_assessed);
    const totalCollected = num(c.total_collected);
    const ticketsIssued = num(s.tickets_issued);

    // Outstanding is scoped to tickets issued in the period: everything billed
    // minus everything ever collected against those same tickets.
    const outstandingR = await pool.query(
      `${PERIOD_TICKETS_CTE}
       SELECT COALESCE(SUM(GREATEST(pt.fine_total - COALESCE(pay.amount, 0), 0)), 0) AS outstanding
       FROM period_tickets pt
       LEFT JOIN LATERAL (
         SELECT SUM(p.amount_paid) AS amount
         FROM payments p
         WHERE p.ticket_id = pt.id AND p.verified = TRUE
       ) pay ON TRUE`,
      range,
    );

    const prevTickets = num(prevTicketsR.rows[0].tickets_issued);
    const prevCollected = num(prevCollectedR.rows[0].total_collected);
    const pct = (curr, prev) =>
      prev === 0
        ? curr === 0
          ? 0
          : 100
        : Math.round(((curr - prev) / prev) * 1000) / 10;

    const newUsers = { motorist: 0, enforcer: 0, admin: 0, total: 0 };
    newUsersR.rows.forEach((r) => {
      newUsers[r.role] = num(r.count);
      newUsers.total += num(r.count);
    });

    res.json({
      meta: {
        period,
        year,
        month: period === "monthly" ? month : null,
        label: p.label,
        start: p.start,
        end: p.end,
        granularity: p.granularity,
        generated_at: new Date().toISOString(),
        generated_by: req.user.name,
      },
      summary: {
        tickets_issued: ticketsIssued,
        pending: num(s.pending),
        payment_submitted: num(s.payment_submitted),
        partially_paid: num(s.partially_paid),
        paid: num(s.paid),
        resolved: num(s.resolved),
        dismissed: num(s.dismissed),
        disputed: num(s.disputed),
        overdue: num(s.overdue),
        unique_motorists: num(s.unique_motorists),
        active_enforcers: num(s.active_enforcers),
        avg_fine: ticketsIssued
          ? Math.round((finesAssessed / ticketsIssued) * 100) / 100
          : 0,
      },
      financials: {
        fines_assessed: finesAssessed,
        total_collected: totalCollected,
        outstanding: num(outstandingR.rows[0].outstanding),
        collection_rate: finesAssessed
          ? Math.round((totalCollected / finesAssessed) * 1000) / 10
          : 0,
        payment_count: num(c.payment_count),
        tickets_paid_against: num(c.tickets_paid_against),
        online_submissions: num(c.online_submissions),
        unverified_count: num(u.payment_count),
        unverified_amount: num(u.amount),
        by_method: methodsR.rows.map((r) => ({
          payment_method: r.payment_method,
          payment_count: num(r.payment_count),
          amount: num(r.amount),
        })),
      },
      by_violation_type: byTypeR.rows.map((r) => ({
        violation_type: r.violation_type,
        count: num(r.count),
        fine_each: num(r.fine_each),
        amount_assessed: num(r.amount_assessed),
      })),
      by_enforcer: enforcersR.rows.map((r) => ({
        enforcer_name: r.enforcer_name,
        tickets_issued: num(r.tickets_issued),
        settled: num(r.settled),
        overdue: num(r.overdue),
        fines_assessed: num(r.fines_assessed),
        collected: num(r.collected),
      })),
      series: seriesR.rows.map((r) => ({
        bucket: r.bucket,
        tickets: num(r.tickets),
        fines_assessed: num(r.fines_assessed),
        collected: num(r.collected),
      })),
      repeat_offenders: repeatR.rows.map((r) => ({
        motorist_name: r.motorist_name,
        tickets: num(r.tickets),
        fines_assessed: num(r.fines_assessed),
      })),
      violators: violatorsR.rows.map((r) => ({
        motorist_name: r.motorist_name,
        first_name: r.first_name,
        last_name: r.last_name,
        license_no: r.license_no,
        birthday: r.birthday,
        address: r.address,
        contact_no: r.contact_no,
        tickets: num(r.tickets),
        fines_assessed: num(r.fines_assessed),
      })),
      tickets: ticketsR.rows.map((r) => ({
        ticket_no: r.ticket_no,
        date_issued: r.date_issued,
        motorist_name: r.motorist_name,
        license_no: r.license_no,
        violation_type: r.violation_type,
        enforcer_name: r.enforcer_name,
        status: r.status,
        fine_assessed: num(r.fine_total),
        amount_paid: num(r.amount_paid),
        balance_due: num(r.balance_due),
        paid_at: r.paid_at,
        payment_method: r.payment_method,
        receipt_no: r.receipt_no,
      })),
      new_users: newUsers,
      comparison: {
        previous_label:
          period === "yearly"
            ? String(year - 1)
            : `${MONTH_NAMES[(month === 1 ? 12 : month - 1) - 1]} ${month === 1 ? year - 1 : year}`,
        previous_tickets: prevTickets,
        previous_collected: prevCollected,
        tickets_change_pct: pct(ticketsIssued, prevTickets),
        collected_change_pct: pct(totalCollected, prevCollected),
      },
    });
  } catch (err) {
    console.error("Get report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /reports/periods ─────────────────────────────────────────────────────
// Years that actually contain data, so the picker never offers empty periods.
router.get("/periods", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM date_issued)::int AS year
       FROM tickets
       WHERE is_deleted = FALSE AND date_issued IS NOT NULL
       ORDER BY year DESC`,
    );
    const years = result.rows.map((r) => r.year);
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) years.unshift(currentYear);
    res.json({ years });
  } catch (err) {
    console.error("Get report periods error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

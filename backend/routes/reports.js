const express = require("express");
const PDFDocument = require("pdfkit");
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

const REPORT_EXPORT_SECTIONS = [
  "executive_summary",
  "ticket_status_breakdown",
  "financial_summary",
  "violations_by_type",
  "enforcer_performance",
  "ticket_records",
];

function normalizeReportFilters(raw = {}) {
  const now = new Date();
  const period = raw.period === "yearly" ? "yearly" : "monthly";
  const year = Number.parseInt(raw.year, 10) || now.getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return null;
  }
  let month = Number.parseInt(raw.month, 10);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    month = now.getMonth() + 1;
  }
  return { period, year, month };
}

function normalizeExportSections(rawSections = REPORT_EXPORT_SECTIONS) {
  if (rawSections === undefined) return [...REPORT_EXPORT_SECTIONS];

  const input = Array.isArray(rawSections)
    ? rawSections
    : typeof rawSections === "string"
      ? rawSections.split(",")
      : [];

  const values = [
    ...new Set(input.map((value) => String(value).trim()).filter(Boolean)),
  ];

  if (values.length === 0) {
    throw new Error("Select at least one report section to export.");
  }

  const invalid = values.filter(
    (value) => !REPORT_EXPORT_SECTIONS.includes(value),
  );
  if (invalid.length > 0) {
    throw new Error(`Unknown export sections: ${invalid.join(", ")}`);
  }

  return values;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatPercent(value) {
  return `${Number(value) || 0}%`;
}

function ensurePageSpace(doc, neededHeight, currentY, topPadding = 45) {
  const pageBottom = 430;
  if (currentY + neededHeight > pageBottom) {
    doc.addPage({ size: "A4", layout: "landscape" });
    return topPadding;
  }
  return currentY;
}

function drawTable(doc, headers, rows, startY, columnWidths, options = {}) {
  const rowHeight = options.rowHeight || 15;
  const fontSize = options.fontSize || 8;
  const tableTop = startY;

  doc.font("Helvetica-Bold").fontSize(fontSize);
  let x = 50;
  headers.forEach((header, index) => {
    doc.text(header, x, tableTop, {
      width: columnWidths[index],
      align: "left",
    });
    x += columnWidths[index];
  });

  doc
    .moveTo(50, tableTop + 14)
    .lineTo(545, tableTop + 14)
    .stroke();

  doc.font("Helvetica").fontSize(fontSize);
  let currentY = tableTop + 18;
  rows.forEach((row) => {
    if (currentY + rowHeight > 430) {
      doc.addPage({ size: "A4", layout: "landscape" });
      currentY = 45;
      doc.font("Helvetica-Bold").fontSize(fontSize);
      x = 50;
      headers.forEach((header, index) => {
        doc.text(header, x, currentY, {
          width: columnWidths[index],
          align: "left",
        });
        x += columnWidths[index];
      });
      doc
        .moveTo(50, currentY + 14)
        .lineTo(545, currentY + 14)
        .stroke();
      doc.font("Helvetica").fontSize(fontSize);
      currentY += 18;
    }

    let colX = 50;
    row.forEach((cell, index) => {
      doc.text(String(cell ?? ""), colX, currentY, {
        width: columnWidths[index],
        align: "left",
      });
      colX += columnWidths[index];
    });

    currentY += rowHeight;
  });

  return currentY;
}

async function generateReportPdf(report, filters = {}) {
  const summary = report.summary || {};
  const financials = report.financials || {};
  const byViolation = report.by_violation_type || [];
  const byEnforcer = report.by_enforcer || [];
  const tickets = report.tickets || [];
  const selectedSections = normalizeExportSections(filters.sections);
  const title =
    filters.period === "yearly"
      ? `Annual Report ${filters.year}`
      : `Monthly Report ${MONTH_NAMES[(filters.month || 1) - 1]} ${filters.year}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const coverLeft = 60;
    const coverWidth = 720;

    doc.rect(0, 0, 842, 595).fill("#0f172a");
    doc
      .fillColor("#ffffff")
      .fontSize(14)
      .text("SJTMO ENFORCEMENT OFFICE", coverLeft, 58, {
        width: coverWidth,
        align: "left",
      });
    doc
      .fillColor("#dbeafe")
      .fontSize(13)
      .text("OFFICIAL REPORT DOCUMENT", coverLeft, 92, {
        width: coverWidth,
        align: "left",
      });
    doc.fillColor("#ffffff").fontSize(28).text(title, coverLeft, 130, {
      width: coverWidth,
      align: "left",
    });
    doc
      .fontSize(12)
      .fillColor("#dbeafe")
      .text("Period covered", coverLeft, 185, {
        width: coverWidth,
        align: "left",
      });
    doc
      .fillColor("#ffffff")
      .fontSize(16)
      .text(report.meta?.label || title, coverLeft, 205, {
        width: coverWidth,
        align: "left",
      });

    doc.fillColor("#dbeafe").fontSize(12).text("Generated on", coverLeft, 250, {
      width: coverWidth,
      align: "left",
    });
    doc
      .fillColor("#ffffff")
      .fontSize(15)
      .text(
        new Date(report.meta?.generated_at || Date.now()).toLocaleString(),
        coverLeft,
        270,
        { width: coverWidth, align: "left" },
      );

    doc.fillColor("#dbeafe").fontSize(12).text("Prepared by", coverLeft, 315, {
      width: coverWidth,
      align: "left",
    });
    doc
      .fillColor("#ffffff")
      .fontSize(15)
      .text(report.meta?.generated_by || "System", coverLeft, 335, {
        width: coverWidth,
        align: "left",
      });

    doc
      .fillColor("#a7f3d0")
      .fontSize(11)
      .text(
        "This document is issued for official review, monitoring, and recordkeeping.",
        coverLeft,
        440,
        {
          width: coverWidth,
          align: "left",
        },
      );

    let contentY = 45;
    const renderSectionTable = (title, headers, rows, widths, options = {}) => {
      const sectionHeight = options.sectionHeight || 120;
      contentY = ensurePageSpace(doc, sectionHeight, contentY, 45);
      doc
        .fillColor("#0f172a")
        .fontSize(12)
        .text(title, 50, contentY, { width: 300, align: "left" });
      contentY += 18;
      contentY = drawTable(doc, headers, rows, contentY, widths, {
        rowHeight: options.rowHeight || 15,
        fontSize: options.fontSize || 8,
      });
      contentY += 16;
    };

    if (selectedSections.includes("executive_summary")) {
      doc
        .fillColor("#0f172a")
        .fontSize(20)
        .text("SJTMO Enforcement Office", 50, 45, {
          width: 500,
          align: "left",
        });
      doc.fillColor("#475569").fontSize(10).text("Official Summary", 50, 70, {
        width: 200,
        align: "left",
      });
      doc
        .fillColor("#0f172a")
        .fontSize(22)
        .text(title, 50, 90, { width: 500, align: "left" });
      doc
        .fillColor("#475569")
        .fontSize(10)
        .text(
          `Generated: ${new Date(report.meta?.generated_at || Date.now()).toLocaleString()}     Prepared by: ${report.meta?.generated_by || "System"}`,
          50,
          120,
          { width: 700, align: "left" },
        );

      const summaryRows = [
        [
          "Tickets issued",
          formatNumber(summary.tickets_issued),
          formatNumber(report.comparison?.previous_tickets || 0),
          `${report.comparison?.tickets_change_pct ?? 0}%`,
        ],
        ["Fines assessed", formatCurrency(financials.fines_assessed), "—", "—"],
        [
          "Total collected",
          formatCurrency(financials.total_collected),
          formatCurrency(report.comparison?.previous_collected || 0),
          `${report.comparison?.collected_change_pct ?? 0}%`,
        ],
        [
          "Collection rate",
          formatPercent(financials.collection_rate),
          "—",
          "—",
        ],
        [
          "Outstanding balance",
          formatCurrency(financials.outstanding),
          "—",
          "—",
        ],
        ["Motorists cited", formatNumber(summary.unique_motorists), "—", "—"],
      ];

      contentY = ensurePageSpace(doc, 160, contentY, 45);
      doc
        .fontSize(12)
        .fillColor("#0f172a")
        .text("Executive summary table", 50, 150, {
          width: 220,
          align: "left",
        });
      contentY = drawTable(
        doc,
        ["Metric", "Current", "Previous", "Change"],
        summaryRows,
        170,
        [170, 120, 120, 110],
      );
      contentY += 12;
    }

    if (selectedSections.includes("ticket_status_breakdown")) {
      const statusRows = [
        ["Pending", summary.pending],
        ["Payment Submitted", summary.payment_submitted],
        ["Partially Paid", summary.partially_paid],
        ["Paid", summary.paid],
        ["Resolved", summary.resolved],
        ["Overdue", summary.overdue],
        ["Disputed", summary.disputed],
        ["Dismissed", summary.dismissed],
      ];
      renderSectionTable(
        "Ticket status breakdown",
        ["Status", "Tickets"],
        statusRows.length ? statusRows : [["No data", "0"]],
        [220, 120],
        { sectionHeight: 110, rowHeight: 15 },
      );
    }

    if (selectedSections.includes("financial_summary")) {
      const financialRows = [
        ["Fines assessed", formatCurrency(financials.fines_assessed)],
        ["Collected", formatCurrency(financials.total_collected)],
        ["Outstanding", formatCurrency(financials.outstanding)],
        ["Collection rate", formatPercent(financials.collection_rate)],
      ];
      renderSectionTable(
        "Financial summary",
        ["Metric", "Amount"],
        financialRows.length ? financialRows : [["No data", "-"]],
        [220, 140],
        { sectionHeight: 100, rowHeight: 15 },
      );
    }

    if (selectedSections.includes("violations_by_type")) {
      const violationRows = (byViolation || [])
        .slice(0, 10)
        .map((row) => [
          row.violation_type || "N/A",
          formatNumber(row.count),
          formatCurrency(row.amount_assessed),
        ]);
      renderSectionTable(
        "Violations by type",
        ["Violation", "Count", "Assessed"],
        violationRows.length ? violationRows : [["No data", "-", "-"]],
        [170, 90, 150],
        { sectionHeight: 120, rowHeight: 15 },
      );
    }

    if (selectedSections.includes("enforcer_performance")) {
      const enforcerRows = (byEnforcer || [])
        .slice(0, 10)
        .map((row) => [
          row.enforcer_name || "Unassigned",
          formatNumber(row.tickets_issued),
          formatCurrency(row.fines_assessed),
          formatCurrency(row.collected),
        ]);
      renderSectionTable(
        "Enforcer performance",
        ["Enforcer", "Tickets", "Fines", "Collected"],
        enforcerRows.length ? enforcerRows : [["No data", "-", "-", "-"]],
        [170, 90, 120, 120],
        { sectionHeight: 120, rowHeight: 15 },
      );
    }

    if (selectedSections.includes("ticket_records")) {
      const ticketRows = (tickets || [])
        .slice(0, 12)
        .map((row) => [
          row.ticket_no || "-",
          row.motorist_name || "-",
          row.violation_type || "-",
          row.status || "-",
          formatCurrency(row.balance_due || 0),
        ]);
      renderSectionTable(
        "Top tickets",
        ["Ticket", "Motorist", "Violation", "Status", "Balance due"],
        ticketRows.length ? ticketRows : [["No tickets", "-", "-", "-", "-"]],
        [80, 150, 150, 80, 90],
        { sectionHeight: 135, rowHeight: 14 },
      );
    }

    const approvalY = doc.y + 28;
    const approvalX = 50;
    doc
      .fontSize(12)
      .fillColor("#0f172a")
      .text("Approval and certification", approvalX, approvalY, {
        width: 250,
      });

    const signatureWidth = 170;
    const signatureGap = 170;
    const baseY = approvalY + 30;
    const signatureData = [
      { label: "Prepared by", value: report.meta?.generated_by || "System" },
      { label: "Reviewed by", value: "SJTMO Administration" },
      { label: "Approved by", value: "Office Head / Reporting Authority" },
    ];

    signatureData.forEach((entry, index) => {
      const x = approvalX + index * signatureGap;
      doc.rect(x, baseY, signatureWidth, 52).lineWidth(1).stroke("#cbd5e1");
      doc
        .fontSize(8)
        .fillColor("#64748b")
        .text(entry.label, x + 10, baseY + 10, { width: signatureWidth - 20 });
      doc
        .fontSize(11)
        .fillColor("#0f172a")
        .text(entry.value, x + 10, baseY + 26, { width: signatureWidth - 20 });
      doc
        .moveTo(x + 10, baseY + 44)
        .lineTo(x + signatureWidth - 10, baseY + 44)
        .stroke("#cbd5e1");
    });

    doc
      .fontSize(9)
      .fillColor("#555")
      .text(
        "Official report export generated by the SJTMO reporting system.",
        50,
        730,
        { align: "left" },
      );
    doc.text(`Report scope: ${report.meta?.label || title}`, 50, 742, {
      align: "left",
    });

    doc.end();
  });
}

async function buildReportData({ period, year, month, userName }) {
  const p = resolvePeriod(period, year, month);
  const range = [p.start, p.end];

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

  const unverifiedQ = pool.query(
    `SELECT COUNT(*)                      AS payment_count,
            COALESCE(SUM(amount_paid), 0) AS amount
     FROM payments
     WHERE verified = FALSE AND paid_at >= $1::date AND paid_at < $2::date`,
    range,
  );

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

  return {
    meta: {
      period,
      year,
      month: period === "monthly" ? month : null,
      label: p.label,
      start: p.start,
      end: p.end,
      granularity: p.granularity,
      generated_at: new Date().toISOString(),
      generated_by: userName || "System",
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
  };
}

async function handleReportExport(req, res) {
  try {
    const requestBody = req.body || req.query || {};
    const filters = normalizeReportFilters(requestBody);
    if (!filters) {
      return res
        .status(400)
        .json({ error: "year must be between 2000 and 2100" });
    }

    const sections = normalizeExportSections(
      requestBody.sections ?? REPORT_EXPORT_SECTIONS,
    );

    const report = await buildReportData({
      ...filters,
      userName: req.user.name,
    });

    const pdfBuffer = await generateReportPdf(report, { ...filters, sections });
    const filename = `${filters.period === "yearly" ? "annual" : "monthly"}-report-${filters.year}${
      filters.period === "monthly"
        ? `-${String(filters.month).padStart(2, "0")}`
        : ""
    }.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Generate report PDF error:", err);
    const message = err.message || "Failed to generate report PDF";
    const status =
      message.includes("Select at least one") ||
      message.includes("Unknown export")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

// ─── GET /reports ─────────────────────────────────────────────────────────────
// Query params: period=monthly|yearly, year=YYYY, month=1-12 (monthly only)
router.get("/", async (req, res) => {
  try {
    const filters = normalizeReportFilters(req.query || {});
    if (!filters) {
      return res
        .status(400)
        .json({ error: "year must be between 2000 and 2100" });
    }

    const report = await buildReportData({
      ...filters,
      userName: req.user.name,
    });
    res.json(report);
  } catch (err) {
    console.error("Get report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/export", handleReportExport);
router.post("/export", handleReportExport);

// ─── GET /reports/periods ─────────────────────────────────────────────────────
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
module.exports.REPORT_EXPORT_SECTIONS = REPORT_EXPORT_SECTIONS;
module.exports.normalizeReportFilters = normalizeReportFilters;
module.exports.normalizeExportSections = normalizeExportSections;

import * as XLSX from "xlsx-js-style";

const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  bank_transfer: "Bank Transfer",
  others: "Others",
};

const number = (value) => Number(value) || 0;
const ratio = (value, total) =>
  number(total) ? number(value) / number(total) : null;

export function formatPhilippineDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

const COLORS = {
  navy: "17324D",
  blue: "2F6B8A",
  paleBlue: "EAF3F8",
  paleGray: "F4F6F8",
  border: "D7DEE5",
  text: "1F2933",
  white: "FFFFFF",
  total: "E8F1F5",
};

const thinBorder = {
  top: { style: "thin", color: { rgb: COLORS.border } },
  bottom: { style: "thin", color: { rgb: COLORS.border } },
  left: { style: "thin", color: { rgb: COLORS.border } },
  right: { style: "thin", color: { rgb: COLORS.border } },
};

const titleStyle = {
  font: {
    name: "Aptos Display",
    sz: 16,
    bold: true,
    color: { rgb: COLORS.white },
  },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.navy } },
  alignment: { vertical: "center" },
};

const headerStyle = {
  font: { name: "Aptos", sz: 10, bold: true, color: { rgb: COLORS.white } },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.blue } },
  alignment: { vertical: "center", wrapText: true },
  border: thinBorder,
};

const sectionStyle = {
  font: { name: "Aptos", sz: 10, bold: true, color: { rgb: COLORS.navy } },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.paleBlue } },
  border: thinBorder,
};

const totalStyle = {
  font: { name: "Aptos", sz: 10, bold: true, color: { rgb: COLORS.navy } },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.total } },
  border: thinBorder,
};

const bodyStyle = {
  font: { name: "Aptos", sz: 10, color: { rgb: COLORS.text } },
  border: thinBorder,
};

const alternateBodyStyle = {
  ...bodyStyle,
  fill: { patternType: "solid", fgColor: { rgb: COLORS.paleGray } },
};

function styleRow(sheet, row, endColumn, style) {
  for (let column = 0; column <= endColumn; column += 1) {
    const address = XLSX.utils.encode_cell({ r: row, c: column });
    if (!sheet[address]) sheet[address] = { t: "s", v: "" };
    sheet[address].s = style;
  }
}

function addSheet(workbook, name, rows, widths, freezeRows = 1, options = {}) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!freeze"] = { xSplit: 0, ySplit: freezeRows };

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: freezeRows - 1, c: range.s.c },
      e: { r: range.e.r, c: range.e.c },
    }),
  };

  const endColumn = widths.length - 1;
  const titleRows = options.titleRows || [];
  const headerRows = options.headerRows || [freezeRows - 1];
  const sectionRows = options.sectionRows || [];
  const totalRows = options.totalRows || [];

  for (let row = 0; row <= range.e.r; row += 1) {
    if (titleRows.includes(row)) continue;
    if (headerRows.includes(row)) continue;
    if (sectionRows.includes(row)) continue;
    if (totalRows.includes(row)) continue;
    styleRow(
      sheet,
      row,
      endColumn,
      row % 2 === 0 ? bodyStyle : alternateBodyStyle,
    );
  }
  titleRows.forEach((row) => styleRow(sheet, row, endColumn, titleStyle));
  headerRows.forEach((row) => styleRow(sheet, row, endColumn, headerStyle));
  sectionRows.forEach((row) => styleRow(sheet, row, endColumn, sectionStyle));
  totalRows.forEach((row) => styleRow(sheet, row, endColumn, totalStyle));

  if (titleRows.length > 0 && endColumn > 0) {
    sheet["!merges"] = titleRows.map((row) => ({
      s: { r: row, c: 0 },
      e: { r: row, c: endColumn },
    }));
  }
  sheet["!rows"] = [];
  titleRows.forEach((row) => {
    sheet["!rows"][row] = { hpt: 28 };
  });
  headerRows.forEach((row) => {
    sheet["!rows"][row] = { hpt: 24 };
  });

  XLSX.utils.book_append_sheet(workbook, sheet, name);
  return sheet;
}

function formatColumns(sheet, columns, format) {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  for (const column of columns) {
    for (let row = 1; row <= range.e.r; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell && typeof cell.v === "number") cell.z = format;
    }
  }
}

function summaryRows(report) {
  const { comparison, financials, summary, new_users: newUsers } = report;
  return [
    ["SJTMO Enforcement & Collection Report"],
    ["Report period", report.meta.label],
    ["Coverage start", report.meta.start],
    ["Coverage end (exclusive)", report.meta.end],
    ["Prepared by", report.meta.generated_by],
    ["Generated at", formatPhilippineDateTime(report.meta.generated_at)],
    [],
    ["Metric", "Current", "Previous", "Change"],
    [
      "Tickets Issued",
      number(summary.tickets_issued),
      number(comparison.previous_tickets),
      ratio(comparison.tickets_change_pct, 100),
    ],
    ["Total Fines Assessed", number(financials.fines_assessed), null, null],
    [
      "Total Collected",
      number(financials.total_collected),
      number(comparison.previous_collected),
      ratio(comparison.collected_change_pct, 100),
    ],
    ["Collection Rate", number(financials.collection_rate) / 100, null, null],
    ["Outstanding Balance", number(financials.outstanding), null, null],
    ["Motorists Cited", number(summary.unique_motorists), null, null],
    ["Active Enforcers", number(summary.active_enforcers), null, null],
    [],
    ["System Activity", "Count"],
    ["New Accounts Registered", number(newUsers.total)],
    ["New Motorist Accounts", number(newUsers.motorist)],
    ["New Enforcer Accounts", number(newUsers.enforcer)],
    ["New Admin Accounts", number(newUsers.admin)],
  ];
}

export function buildReportWorkbook(report) {
  const workbook = XLSX.utils.book_new();
  const ticketTotal = number(report.summary.tickets_issued);
  const methodTotal = report.financials.by_method.reduce(
    (sum, row) => sum + number(row.amount),
    0,
  );
  const typeTotal = report.by_violation_type.reduce(
    (sum, row) => sum + number(row.count),
    0,
  );
  const enforcerTotals = report.by_enforcer.reduce(
    (totals, row) => ({
      tickets: totals.tickets + number(row.tickets_issued),
      assessed: totals.assessed + number(row.fines_assessed),
      collected: totals.collected + number(row.collected),
    }),
    { tickets: 0, assessed: 0, collected: 0 },
  );

  const summary = addSheet(
    workbook,
    "Summary",
    summaryRows(report),
    [34, 24, 24, 18],
    8,
    {
      titleRows: [0],
      sectionRows: [16],
    },
  );
  formatColumns(summary, [1, 2], "#,##0.00");
  formatColumns(summary, [3], "0.0%");
  summary["B12"].z = "0.0%";

  const statusRows = [
    ["Status", "Tickets", "Share", "Definition"],
    [
      "Pending",
      number(report.summary.pending),
      ratio(report.summary.pending, ticketTotal),
      "Issued, awaiting payment",
    ],
    [
      "Payment Submitted",
      number(report.summary.payment_submitted),
      ratio(report.summary.payment_submitted, ticketTotal),
      "Motorist uploaded a receipt, awaiting verification",
    ],
    [
      "Partially Paid",
      number(report.summary.partially_paid),
      ratio(report.summary.partially_paid, ticketTotal),
      "Verified payment received, balance remaining",
    ],
    [
      "Paid",
      number(report.summary.paid),
      ratio(report.summary.paid, ticketTotal),
      "Fine settled in full",
    ],
    [
      "Resolved",
      number(report.summary.resolved),
      ratio(report.summary.resolved, ticketTotal),
      "Closed by the office",
    ],
    [
      "Overdue",
      number(report.summary.overdue),
      ratio(report.summary.overdue, ticketTotal),
      "Past the payment window",
    ],
    [
      "Disputed",
      number(report.summary.disputed),
      ratio(report.summary.disputed, ticketTotal),
      "Contested by the motorist",
    ],
    [
      "Dismissed",
      number(report.summary.dismissed),
      ratio(report.summary.dismissed, ticketTotal),
      "Voided - no fine collectible",
    ],
    ["Total", ticketTotal, ticketTotal ? 1 : null, ""],
  ];
  const status = addSheet(workbook, "Status", statusRows, [24, 14, 14, 52], 1, {
    totalRows: [statusRows.length - 1],
  });
  formatColumns(status, [2], "#,##0");
  formatColumns(status, [3], "0.0%");

  const financials = addSheet(
    workbook,
    "Financials",
    [
      ["Financial Metric", "Value"],
      ["Fines Assessed", number(report.financials.fines_assessed)],
      ["Total Collected", number(report.financials.total_collected)],
      ["Outstanding Balance", number(report.financials.outstanding)],
      ["Collection Rate", number(report.financials.collection_rate) / 100],
      [
        "Verified Payment Transactions",
        number(report.financials.payment_count),
      ],
      [
        "Tickets Receiving a Payment",
        number(report.financials.tickets_paid_against),
      ],
      [
        "Online Payments Verified",
        number(report.financials.online_submissions),
      ],
      [
        "Receipts Awaiting Verification",
        number(report.financials.unverified_count),
      ],
      ["Unverified Amount", number(report.financials.unverified_amount)],
      [],
      ["Payment Method", "Transactions", "Amount", "Share"],
      ...report.financials.by_method.map((row) => [
        PAYMENT_METHOD_LABELS[row.payment_method] || row.payment_method,
        number(row.payment_count),
        number(row.amount),
        ratio(row.amount, methodTotal),
      ]),
      [
        "Total",
        report.financials.by_method.reduce(
          (sum, row) => sum + number(row.payment_count),
          0,
        ),
        methodTotal,
        methodTotal ? 1 : null,
      ],
    ],
    [34, 18, 18, 14],
    1,
    {
      sectionRows: [11],
      totalRows: [report.financials.by_method.length + 12],
    },
  );
  formatColumns(financials, [1], "#,##0.00");
  formatColumns(financials, [2], "#,##0.00");
  formatColumns(financials, [3], "0.0%");
  financials["B5"].z = "0.0%";

  const violations = addSheet(
    workbook,
    "Violations",
    [
      ["Violation", "Count", "Share", "Fine Each", "Amount Assessed"],
      ...report.by_violation_type.map((row) => [
        row.violation_type,
        number(row.count),
        ratio(row.count, typeTotal),
        number(row.fine_each),
        number(row.amount_assessed),
      ]),
      [
        "Total Offences Cited",
        typeTotal,
        typeTotal ? 1 : null,
        null,
        report.by_violation_type.reduce(
          (sum, row) => sum + number(row.amount_assessed),
          0,
        ),
      ],
    ],
    [34, 14, 14, 16, 20],
    1,
    {
      totalRows: [report.by_violation_type.length + 1],
    },
  );
  formatColumns(violations, [1], "#,##0");
  formatColumns(violations, [2], "0.0%");
  formatColumns(violations, [3, 4], "#,##0.00");

  const enforcers = addSheet(
    workbook,
    "Enforcers",
    [
      [
        "Enforcer",
        "Tickets Issued",
        "Settled",
        "Overdue",
        "Fines Assessed",
        "Collected",
        "Rate",
      ],
      ...report.by_enforcer.map((row) => [
        row.enforcer_name,
        number(row.tickets_issued),
        number(row.settled),
        number(row.overdue),
        number(row.fines_assessed),
        number(row.collected),
        ratio(row.collected, row.fines_assessed),
      ]),
      [
        "Total",
        enforcerTotals.tickets,
        null,
        null,
        enforcerTotals.assessed,
        enforcerTotals.collected,
        ratio(enforcerTotals.collected, enforcerTotals.assessed),
      ],
    ],
    [28, 16, 12, 12, 18, 16, 12],
    1,
    {
      totalRows: [report.by_enforcer.length + 1],
    },
  );
  formatColumns(enforcers, [1, 2, 3], "#,##0");
  formatColumns(enforcers, [4, 5], "#,##0.00");
  formatColumns(enforcers, [6], "0.0%");

  addSheet(
    workbook,
    "Repeat Offenders",
    [
      ["Motorist", "Tickets in Period", "Fines Assessed"],
      ...report.repeat_offenders.map((row) => [
        row.motorist_name,
        number(row.tickets),
        number(row.fines_assessed),
      ]),
    ],
    [34, 20, 18],
  );

  return workbook;
}

export function downloadReportWorkbook(report) {
  const workbook = buildReportWorkbook(report);
  const period =
    report.meta.period === "yearly"
      ? `yearly-${report.meta.year}`
      : `monthly-${report.meta.year}-${String(report.meta.month).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `sjtmo-report-${period}.xlsx`);
}

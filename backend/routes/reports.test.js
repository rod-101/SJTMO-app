const test = require("node:test");
const assert = require("node:assert/strict");

const reports = require("./reports");

test("official export list excludes the trend section", () => {
  assert.ok(Array.isArray(reports.REPORT_EXPORT_SECTIONS));
  assert.ok(!reports.REPORT_EXPORT_SECTIONS.includes("ticket_volume_trend"));
  assert.deepEqual(
    reports.normalizeExportSections(),
    reports.REPORT_EXPORT_SECTIONS,
  );
});

test("trend section is rejected as an invalid export option", () => {
  assert.throws(
    () => reports.normalizeExportSections(["ticket_volume_trend"]),
    /Unknown export sections: ticket_volume_trend/,
  );
});

const express = require("express");
const router = express.Router();
const pool = require("../db");

// POST /payments - record a payment for a violation
router.post("/", async (req, res) => {
  const { violation_id, receipt_no, amount_paid, processed_by, payment_method, notes } = req.body;

  if (!violation_id || !receipt_no || !amount_paid) {
    return res.status(400).json({ error: "violation_id, receipt_no, and amount_paid are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const violation = await client.query(
      "SELECT id, status FROM violations WHERE id = $1 AND is_deleted = FALSE",
      [violation_id],
    );
    if (violation.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Violation not found" });
    }
    if (violation.rows[0].status === "resolved" || violation.rows[0].status === "dismissed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Violation is already resolved or dismissed" });
    }

    const payment = await client.query(
      `INSERT INTO payments (violation_id, receipt_no, amount_paid, processed_by, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [violation_id, receipt_no, amount_paid, processed_by || null, payment_method || "cash", notes || null],
    );

    // Auto-update violation status to paid
    await client.query(
      "UPDATE violations SET status = 'paid' WHERE id = $1",
      [violation_id],
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, new_value)
       VALUES ($1, $2, 'PAYMENT_RECORDED', 'payments', $3, $4)`,
      [
        processed_by || null,
        null,
        payment.rows[0].id,
        JSON.stringify({ violation_id, receipt_no, amount_paid, payment_method }),
      ],
    );

    await client.query("COMMIT");
    res.status(201).json(payment.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") return res.status(409).json({ error: "Receipt number already exists." });
    console.error("Record payment error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// GET /payments/:violation_id - get payment for a violation
router.get("/:violation_id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS processed_by_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.processed_by
       WHERE p.violation_id = $1
       ORDER BY p.paid_at DESC`,
      [req.params.violation_id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get payment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

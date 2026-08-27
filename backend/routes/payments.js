const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { requireAuth, authorize, optionalAuth } = require("../middleware/auth");

// Receipt photos live in their own subdir, separate from the publicly-served
// /uploads static mount used for ordinance PDFs — access-controlled like ticket evidence.
const receiptsDir = path.join(__dirname, "../uploads/receipts");
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Memory storage — the raw upload is compressed via sharp before anything
// touches disk, so oversized phone-camera photos never linger uncompressed.
const uploadReceipt = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, or WebP images are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Computes fine_total for a ticket and total amount paid so far across all
// verified payments (optionally excluding one payment id, e.g. one being
// rejected). Used to decide whether a ticket is now partially_paid or paid.
async function getFineAndPaid(client, ticketId, excludePaymentId = null) {
  const fineResult = await client.query(
    `SELECT COALESCE(SUM(vt.fine), 0) AS fine_total
     FROM tickets t
     JOIN unnest(string_to_array(t.violation_type, ',')) AS names(n) ON true
     JOIN violation_types vt ON vt.name = trim(names.n)
     WHERE t.id = $1`,
    [ticketId],
  );
  const paidResult = await client.query(
    `SELECT COALESCE(SUM(amount_paid), 0) AS amount_paid
     FROM payments
     WHERE ticket_id = $1 AND verified = TRUE AND id IS DISTINCT FROM $2`,
    [ticketId, excludePaymentId],
  );
  return {
    fineTotal: Number(fineResult.rows[0].fine_total) || 0,
    amountPaid: Number(paidResult.rows[0].amount_paid) || 0,
  };
}

// POST /payments - record a payment for a ticket
router.post("/", requireAuth, authorize("admin"), async (req, res) => {
  const { ticket_id, receipt_no, amount_paid, payment_method, notes, paid_at } = req.body;

  if (!ticket_id || !receipt_no || !amount_paid) {
    return res.status(400).json({ error: "ticket_id, receipt_no, and amount_paid are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ticket = await client.query(
      "SELECT id, status FROM tickets WHERE id = $1 AND is_deleted = FALSE",
      [ticket_id],
    );
    if (ticket.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Ticket not found" });
    }
    if (ticket.rows[0].status === "resolved" || ticket.rows[0].status === "dismissed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Ticket is already resolved or dismissed" });
    }

    const payment = await client.query(
      `INSERT INTO payments (ticket_id, receipt_no, amount_paid, processed_by, payment_method, notes, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW())) RETURNING *`,
      [ticket_id, receipt_no, amount_paid, req.user.id, payment_method || "cash", notes || null, paid_at || null],
    );

    // This payment is recorded as already verified (admin-entered), so it
    // counts toward the total immediately when deciding partially_paid vs paid.
    const { fineTotal, amountPaid: totalPaid } = await getFineAndPaid(client, ticket_id);
    const newStatus = totalPaid >= fineTotal && fineTotal > 0 ? "paid" : "partially_paid";
    await client.query("UPDATE tickets SET status = $1 WHERE id = $2", [newStatus, ticket_id]);

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, new_value)
       VALUES ($1, $2, 'PAYMENT_RECORDED', 'payments', $3, $4)`,
      [
        req.user.id,
        req.user.name,
        payment.rows[0].id,
        JSON.stringify({ ticket_id, receipt_no, amount_paid, payment_method }),
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

// POST /payments/motorist-submit - motorist self-reports a payment made outside
// the office, with a receipt photo as proof. Creates an UNVERIFIED payment row
// and moves the ticket to 'payment_submitted' pending admin review.
router.post("/motorist-submit", requireAuth, authorize("motorist"), (req, res) => {
  uploadReceipt.single("photo")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Receipt photo is required" });
    }

    const { ticket_id, receipt_no, amount_paid, payment_method, paid_at } = req.body;
    if (!ticket_id || !receipt_no || !amount_paid) {
      return res.status(400).json({ error: "ticket_id, receipt_no, and amount_paid are required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const ticket = await client.query(
        `SELECT t.id, t.status FROM tickets t
         WHERE t.id = $1 AND t.is_deleted = FALSE
           AND (
             t.motorist_id IN (SELECT id FROM motorists WHERE user_id = $2)
             OR LOWER(t.motorist_name) = LOWER($3)
           )`,
        [ticket_id, req.user.id, req.user.name],
      );
      if (ticket.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Ticket not found" });
      }
      const acceptingStatuses = ["pending", "overdue", "partially_paid"];
      if (!acceptingStatuses.includes(ticket.rows[0].status)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "This ticket does not accept a receipt submission right now." });
      }

      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const filePath = path.join(receiptsDir, filename);
      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(filePath);

      let payment;
      try {
        payment = await client.query(
          `INSERT INTO payments
             (ticket_id, receipt_no, amount_paid, payment_method, paid_at, receipt_filename, submitted_by_motorist, verified)
           VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6, TRUE, FALSE) RETURNING *`,
          [ticket_id, receipt_no, amount_paid, "cash", paid_at || null, filename],
        );
      } catch (insertErr) {
        fs.unlinkSync(filePath);
        throw insertErr;
      }

      await client.query("UPDATE tickets SET status = 'payment_submitted' WHERE id = $1", [ticket_id]);

      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, new_value)
         VALUES ($1, $2, 'PAYMENT_SUBMITTED_BY_MOTORIST', 'payments', $3, $4)`,
        [
          req.user.id,
          req.user.name,
          payment.rows[0].id,
          JSON.stringify({ ticket_id, receipt_no, amount_paid, payment_method }),
        ],
      );

      await client.query("COMMIT");
      res.status(201).json(payment.rows[0]);
    } catch (err2) {
      await client.query("ROLLBACK");
      if (err2.code === "23505") return res.status(409).json({ error: "Receipt number already exists." });
      console.error("Motorist submit receipt error:", err2);
      res.status(500).json({ error: "Server error" });
    } finally {
      client.release();
    }
  });
});

// POST /payments/:id/verify - admin confirms a motorist-submitted receipt is
// legitimate: marks it verified and settles the ticket.
router.post("/:id/verify", requireAuth, authorize("admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const payment = await client.query(
      `SELECT id, ticket_id FROM payments WHERE id = $1 AND submitted_by_motorist = TRUE AND verified = FALSE`,
      [req.params.id],
    );
    if (payment.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No pending motorist submission found for this payment" });
    }

    await client.query(
      `UPDATE payments SET verified = TRUE, verified_by = $1, verified_at = NOW() WHERE id = $2`,
      [req.user.id, req.params.id],
    );

    const { fineTotal, amountPaid: totalPaid } = await getFineAndPaid(client, payment.rows[0].ticket_id);
    const newStatus = totalPaid >= fineTotal && fineTotal > 0 ? "paid" : "partially_paid";
    await client.query("UPDATE tickets SET status = $1 WHERE id = $2", [newStatus, payment.rows[0].ticket_id]);

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, new_value)
       VALUES ($1, $2, 'PAYMENT_VERIFIED', 'payments', $3, $4)`,
      [req.user.id, req.user.name, req.params.id, JSON.stringify({ ticket_id: payment.rows[0].ticket_id })],
    );

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "22P02") return res.status(404).json({ error: "Payment not found" });
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// POST /payments/:id/reject - admin rejects a motorist-submitted receipt: removes
// it and reverts the ticket to pending so the motorist can resubmit.
router.post("/:id/reject", requireAuth, authorize("admin"), async (req, res) => {
  const { reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const payment = await client.query(
      `SELECT * FROM payments WHERE id = $1 AND submitted_by_motorist = TRUE AND verified = FALSE`,
      [req.params.id],
    );
    if (payment.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No pending motorist submission found for this payment" });
    }

    const { amountPaid: remainingPaid } = await getFineAndPaid(client, payment.rows[0].ticket_id, req.params.id);
    const revertStatus = remainingPaid > 0 ? "partially_paid" : "pending";

    await client.query("DELETE FROM payments WHERE id = $1", [req.params.id]);
    await client.query("UPDATE tickets SET status = $1 WHERE id = $2", [revertStatus, payment.rows[0].ticket_id]);

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, old_value, new_value)
       VALUES ($1, $2, 'PAYMENT_REJECTED', 'payments', $3, $4, $5)`,
      [
        req.user.id,
        req.user.name,
        req.params.id,
        JSON.stringify(payment.rows[0]),
        JSON.stringify({ reason: reason || null }),
      ],
    );

    await client.query("COMMIT");

    if (payment.rows[0].receipt_filename) {
      const filePath = path.join(receiptsDir, payment.rows[0].receipt_filename);
      fs.existsSync(filePath) && fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "22P02") return res.status(404).json({ error: "Payment not found" });
    console.error("Reject payment error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// POST /payments/:id/photo - upload a photo of the physical receipt (staff only)
router.post("/:id/photo", requireAuth, authorize("admin"), (req, res) => {
  uploadReceipt.single("photo")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Photo file is required" });
    }
    try {
      // Receipts are small paper slips — downscale and re-encode as JPEG so
      // storage stays cheap even when the source is a multi-MB phone photo.
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const filePath = path.join(receiptsDir, filename);
      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(filePath);

      const result = await pool.query(
        `UPDATE payments SET receipt_filename = $1 WHERE id = $2 RETURNING id, receipt_filename`,
        [filename, req.params.id],
      );
      if (result.rows.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(201).json({ success: true, filename });
    } catch (err2) {
      console.error("Upload receipt photo error:", err2);
      res.status(500).json({ error: "Server error" });
    }
  });
});

// GET /payments/:id/photo - fetch receipt photo. Accessible to authenticated
// staff, or anyone holding the ticket's access_token (same token used by the
// public receipt link), so it must never be served via the open /uploads mount.
router.get("/:id/photo", optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.receipt_filename, t.access_token
       FROM payments p
       JOIN tickets t ON t.id = p.ticket_id
       WHERE p.id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0 || !result.rows[0].receipt_filename) {
      return res.status(404).json({ error: "Photo not found" });
    }
    const { receipt_filename, access_token } = result.rows[0];

    const tokenMatches = req.query.token && req.query.token === access_token;
    if (!req.user && !tokenMatches) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const filePath = path.join(receiptsDir, receipt_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Photo file missing" });
    }
    res.sendFile(filePath);
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(404).json({ error: "Photo not found" });
    }
    console.error("Get receipt photo error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /payments/:ticket_id - get payment(s) for a ticket
router.get("/:ticket_id", requireAuth, authorize("admin", "enforcer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS processed_by_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.processed_by
       WHERE p.ticket_id = $1
       ORDER BY p.paid_at DESC`,
      [req.params.ticket_id],
    );
    res.json(result.rows);
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(404).json({ error: "Ticket not found" });
    }
    console.error("Get payment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

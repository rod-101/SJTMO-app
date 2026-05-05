const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ────────────────────────────────────────────────────────────────────
// FRONTEND_URL is set on Render to the static site URL (e.g. https://sjtmo-app.onrender.com)
// In local dev it falls back to allowing localhost origins.
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ["http://localhost:3000", "http://localhost:5173"];

const corsOptions = { origin: allowedOrigins, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight for all routes

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// Serve uploaded ordinance files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const violationRoutes = require("./routes/violations");
const userRoutes = require("./routes/users");
const ordinanceRoutes = require("./routes/ordinances");
const paymentRoutes = require("./routes/payments");

app.use("/login", authRoutes);
app.use("/violations", violationRoutes);
app.use("/users", userRoutes);
app.use("/ordinances", ordinanceRoutes);
app.use("/payments", paymentRoutes);

// Health check — useful for Render uptime monitoring
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "SJTMO Backend running" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SJTMO Backend running on port ${PORT}`);
});

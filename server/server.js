/* =========================================================
   server.js — Express entry point. Serves the static frontend
   (repo root), the uploaded payment screenshots, and mounts
   the JSON API under /api.
   ========================================================= */

const path = require("node:path");
const express = require("express");

require("./db"); // opens the DB connection and runs first-run seed/migrations

const authRoutes = require("./routes/auth");
const planRoutes = require("./routes/plans");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 4000;
const ROOT_DIR = path.join(__dirname, "..");

app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// More specific prefixes must be registered before the bare "/api" mount
// below, otherwise userRoutes' router.use(requireAuth) — which applies to
// every request that reaches it, before any route matching — would
// intercept /api/admin/* requests first and block them with a 401.
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", userRoutes);

// Serves index.html, admin.html, css/, js/, assets/ from the repo root.
app.use(express.static(ROOT_DIR));

app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.message && err.message.includes("Only JPG")) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`InvestWise server running at http://localhost:${PORT}`);
  console.log(`Admin dashboard at        http://localhost:${PORT}/admin.html`);
});

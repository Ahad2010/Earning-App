/* =========================================================
   auth.js — JWT verification middleware for user and admin
   protected routes.
   ========================================================= */

const jwt = require("jsonwebtoken");
const db = require("../db");
const { syncEarnings } = require("../lib/earnings");

const JWT_SECRET = process.env.JWT_SECRET || "investwise-demo-dev-secret-change-me";

function signUserToken(user) {
  return jwt.sign({ sub: user.id, role: "user" }, JWT_SECRET, { expiresIn: "7d" });
}

function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id, role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Login required." });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "user") return res.status(403).json({ error: "Invalid token type." });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub);
    if (!user) return res.status(401).json({ error: "Account not found." });

    // Keep the balance fresh with any daily earnings accrued since the last request.
    syncEarnings(user.id);
    req.user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired, please log in again." });
  }
}

function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Admin login required." });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Invalid token type." });

    const admin = db.prepare("SELECT * FROM admins WHERE id = ?").get(payload.sub);
    if (!admin) return res.status(401).json({ error: "Admin account not found." });

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Admin session expired, please log in again." });
  }
}

module.exports = { signUserToken, signAdminToken, requireAuth, requireAdmin };

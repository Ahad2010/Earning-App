/* =========================================================
   db.js — SQLite schema, connection, and first-run seed data.
   Uses Node's built-in node:sqlite (Node 22.5+), so there is
   no native module to compile and no extra dependency.
   ========================================================= */

const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "data.sqlite");
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    referral_code TEXT NOT NULL UNIQUE,
    referred_by TEXT,
    balance REAL NOT NULL DEFAULT 0,
    avatar TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    deposit REAL NOT NULL,
    daily_return REAL NOT NULL,
    duration INTEGER NOT NULL,
    icon TEXT,
    accent TEXT,
    accent_light TEXT,
    popular INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS deposit_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    plan_id INTEGER REFERENCES plans(id),
    amount REAL NOT NULL,
    screenshot_path TEXT NOT NULL,
    method TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS active_investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    deposit_request_id INTEGER REFERENCES deposit_requests(id),
    invested_at TEXT NOT NULL,
    credited_amount REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    account_details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    related_user_id INTEGER,
    plan_id INTEGER,
    deposit_request_id INTEGER,
    withdrawal_request_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposit_requests(user_id);
  CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposit_requests(status);
  CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawal_requests(user_id);
  CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);
  CREATE INDEX IF NOT EXISTS idx_investments_user ON active_investments(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
`);

/* ---------------- First-run seed ---------------- */

const planCount = db.prepare("SELECT COUNT(*) AS c FROM plans").get().c;
if (planCount === 0) {
  const insertPlan = db.prepare(`
    INSERT INTO plans (name, deposit, daily_return, duration, icon, accent, accent_light, popular)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seedPlans = [
    ["Starter Plan", 400, 180, 30, "🌱", "#1E5FBF", "#E8F0FE", 0],
    ["Silver Plan", 1000, 400, 30, "⚡", "#5B6B82", "#EEF1F6", 1],
    ["Gold Plan", 5000, 1800, 45, "👑", "#C98A0A", "#FCF3DF", 0],
    ["Platinum Plan", 10000, 3800, 60, "💎", "#0F3E82", "#E8F0FE", 0]
  ];
  for (const p of seedPlans) insertPlan.run(...p);
  console.log("[db] Seeded investment plans.");
}

const adminCount = db.prepare("SELECT COUNT(*) AS c FROM admins").get().c;
if (adminCount === 0) {
  const defaultEmail = process.env.ADMIN_EMAIL || "admin@investwise.demo";
  const defaultPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const hash = bcrypt.hashSync(defaultPassword, 10);
  db.prepare("INSERT INTO admins (email, password_hash) VALUES (?, ?)").run(defaultEmail, hash);
  console.log(`[db] Seeded default admin login -> email: ${defaultEmail}  password: ${defaultPassword}`);
  console.log("[db] IMPORTANT: change this password before using this anywhere but locally.");
}

fs.mkdirSync(path.join(__dirname, "uploads", "screenshots"), { recursive: true });

module.exports = db;

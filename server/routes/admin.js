/* =========================================================
   routes/admin.js — admin login + the approval workflow for
   deposits and withdrawals, plus a basic users/stats overview.
   ========================================================= */

const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signAdminToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const COMMISSION_RATE = 0.1; // 10% referral commission on an approved deposit

/* ---------------- Admin login ---------------- */

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(String(email).trim().toLowerCase());
  if (!admin || !bcrypt.compareSync(String(password), admin.password_hash)) {
    return res.status(401).json({ error: "Invalid admin email or password." });
  }

  const token = signAdminToken(admin);
  res.json({ token, admin: { id: admin.id, email: admin.email } });
});

router.use(requireAdmin);

/* ---------------- Deposits ---------------- */

router.get("/deposits", (req, res) => {
  const status = (req.query.status || "pending").toLowerCase();
  const rows =
    status === "all"
      ? db
          .prepare(
            `SELECT dr.*, u.name AS userName, u.email AS userEmail, p.name AS planName
             FROM deposit_requests dr
             JOIN users u ON u.id = dr.user_id
             LEFT JOIN plans p ON p.id = dr.plan_id
             ORDER BY dr.created_at DESC`
          )
          .all()
      : db
          .prepare(
            `SELECT dr.*, u.name AS userName, u.email AS userEmail, p.name AS planName
             FROM deposit_requests dr
             JOIN users u ON u.id = dr.user_id
             LEFT JOIN plans p ON p.id = dr.plan_id
             WHERE dr.status = ?
             ORDER BY dr.created_at DESC`
          )
          .all(status);

  res.json(rows.map(serializeAdminDeposit));
});

router.post("/deposits/:id/approve", (req, res) => {
  const deposit = db.prepare("SELECT * FROM deposit_requests WHERE id = ?").get(req.params.id);
  if (!deposit) return res.status(404).json({ error: "Deposit request not found." });
  if (deposit.status !== "pending") return res.status(400).json({ error: "This request was already reviewed." });

  const now = new Date().toISOString();
  db.prepare("UPDATE deposit_requests SET status = 'approved', reviewed_at = ? WHERE id = ?").run(now, deposit.id);

  if (deposit.plan_id) {
    db.prepare(
      `INSERT INTO active_investments (user_id, plan_id, deposit_request_id, invested_at, credited_amount)
       VALUES (?, ?, ?, ?, 0)`
    ).run(deposit.user_id, deposit.plan_id, deposit.id, now);
  } else {
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(deposit.amount, deposit.user_id);
  }

  db.prepare(
    "UPDATE transactions SET status = 'Completed' WHERE deposit_request_id = ? AND status = 'Pending'"
  ).run(deposit.id);

  creditReferralCommission(deposit.user_id, deposit.amount);

  const updated = db.prepare("SELECT * FROM deposit_requests WHERE id = ?").get(deposit.id);
  res.json(serializeAdminDeposit(withJoinedNames(updated)));
});

router.post("/deposits/:id/reject", (req, res) => {
  const deposit = db.prepare("SELECT * FROM deposit_requests WHERE id = ?").get(req.params.id);
  if (!deposit) return res.status(404).json({ error: "Deposit request not found." });
  if (deposit.status !== "pending") return res.status(400).json({ error: "This request was already reviewed." });

  const note = (req.body && req.body.note) || "Rejected by admin";
  const now = new Date().toISOString();

  db.prepare("UPDATE deposit_requests SET status = 'rejected', admin_note = ?, reviewed_at = ? WHERE id = ?").run(
    note,
    now,
    deposit.id
  );
  db.prepare(
    "UPDATE transactions SET status = 'Rejected' WHERE deposit_request_id = ? AND status = 'Pending'"
  ).run(deposit.id);

  const updated = db.prepare("SELECT * FROM deposit_requests WHERE id = ?").get(deposit.id);
  res.json(serializeAdminDeposit(withJoinedNames(updated)));
});

function creditReferralCommission(depositorId, amount) {
  const depositor = db.prepare("SELECT * FROM users WHERE id = ?").get(depositorId);
  if (!depositor.referred_by) return;

  const referrer = db.prepare("SELECT * FROM users WHERE referral_code = ?").get(depositor.referred_by);
  if (!referrer) return;

  const commission = Math.round(amount * COMMISSION_RATE * 100) / 100;
  if (commission <= 0) return;

  db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(commission, referrer.id);
  db.prepare(
    `INSERT INTO transactions (user_id, type, amount, status, related_user_id)
     VALUES (?, 'Commission', ?, 'Completed', ?)`
  ).run(referrer.id, commission, depositorId);
}

function withJoinedNames(deposit) {
  const user = db.prepare("SELECT name, email FROM users WHERE id = ?").get(deposit.user_id);
  const plan = deposit.plan_id ? db.prepare("SELECT name FROM plans WHERE id = ?").get(deposit.plan_id) : null;
  return { ...deposit, userName: user.name, userEmail: user.email, planName: plan ? plan.name : null };
}

function serializeAdminDeposit(d) {
  return {
    id: d.id,
    userName: d.userName,
    userEmail: d.userEmail,
    planId: d.plan_id,
    planName: d.planName,
    amount: d.amount,
    screenshotUrl: d.screenshot_path,
    method: d.method,
    status: d.status,
    adminNote: d.admin_note,
    createdAt: d.created_at,
    reviewedAt: d.reviewed_at
  };
}

/* ---------------- Withdrawals ---------------- */

router.get("/withdrawals", (req, res) => {
  const status = (req.query.status || "pending").toLowerCase();
  const rows =
    status === "all"
      ? db
          .prepare(
            `SELECT wr.*, u.name AS userName, u.email AS userEmail
             FROM withdrawal_requests wr
             JOIN users u ON u.id = wr.user_id
             ORDER BY wr.created_at DESC`
          )
          .all()
      : db
          .prepare(
            `SELECT wr.*, u.name AS userName, u.email AS userEmail
             FROM withdrawal_requests wr
             JOIN users u ON u.id = wr.user_id
             WHERE wr.status = ?
             ORDER BY wr.created_at DESC`
          )
          .all(status);

  res.json(rows.map(serializeAdminWithdrawal));
});

router.post("/withdrawals/:id/approve", (req, res) => {
  const withdrawal = db.prepare("SELECT * FROM withdrawal_requests WHERE id = ?").get(req.params.id);
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal request not found." });
  if (withdrawal.status !== "pending") return res.status(400).json({ error: "This request was already reviewed." });

  const now = new Date().toISOString();
  db.prepare("UPDATE withdrawal_requests SET status = 'approved', reviewed_at = ? WHERE id = ?").run(
    now,
    withdrawal.id
  );
  // Funds were already held (deducted) when the user submitted the request.
  db.prepare(
    "UPDATE transactions SET status = 'Completed' WHERE withdrawal_request_id = ? AND status = 'Pending'"
  ).run(withdrawal.id);

  const updated = db.prepare("SELECT * FROM withdrawal_requests WHERE id = ?").get(withdrawal.id);
  res.json(serializeAdminWithdrawal(withUserNames(updated)));
});

router.post("/withdrawals/:id/reject", (req, res) => {
  const withdrawal = db.prepare("SELECT * FROM withdrawal_requests WHERE id = ?").get(req.params.id);
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal request not found." });
  if (withdrawal.status !== "pending") return res.status(400).json({ error: "This request was already reviewed." });

  const note = (req.body && req.body.note) || "Rejected by admin";
  const now = new Date().toISOString();

  db.prepare(
    "UPDATE withdrawal_requests SET status = 'rejected', admin_note = ?, reviewed_at = ? WHERE id = ?"
  ).run(note, now, withdrawal.id);

  // Refund the held funds back to the user's balance.
  db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(withdrawal.amount, withdrawal.user_id);

  db.prepare(
    "UPDATE transactions SET status = 'Rejected' WHERE withdrawal_request_id = ? AND status = 'Pending'"
  ).run(withdrawal.id);

  const updated = db.prepare("SELECT * FROM withdrawal_requests WHERE id = ?").get(withdrawal.id);
  res.json(serializeAdminWithdrawal(withUserNames(updated)));
});

function withUserNames(withdrawal) {
  const user = db.prepare("SELECT name, email FROM users WHERE id = ?").get(withdrawal.user_id);
  return { ...withdrawal, userName: user.name, userEmail: user.email };
}

function serializeAdminWithdrawal(w) {
  return {
    id: w.id,
    userName: w.userName,
    userEmail: w.userEmail,
    amount: w.amount,
    method: w.method,
    accountDetails: w.account_details,
    status: w.status,
    adminNote: w.admin_note,
    createdAt: w.created_at,
    reviewedAt: w.reviewed_at
  };
}

/* ---------------- Users overview ---------------- */

router.get("/users", (req, res) => {
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  const investedStmt = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM deposit_requests WHERE user_id = ? AND status = 'approved'"
  );

  res.json(
    rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      balance: u.balance,
      referralCode: u.referral_code,
      referredBy: u.referred_by,
      totalInvested: investedStmt.get(u.id).total,
      joinDate: u.created_at
    }))
  );
});

/* ---------------- Stats ---------------- */

router.get("/stats", (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  const pendingDeposits = db.prepare("SELECT COUNT(*) AS c FROM deposit_requests WHERE status = 'pending'").get().c;
  const pendingWithdrawals = db
    .prepare("SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status = 'pending'")
    .get().c;
  const totalApprovedDeposits = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM deposit_requests WHERE status = 'approved'")
    .get().total;
  const totalApprovedWithdrawals = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawal_requests WHERE status = 'approved'")
    .get().total;

  res.json({
    totalUsers,
    pendingDeposits,
    pendingWithdrawals,
    totalApprovedDeposits,
    totalApprovedWithdrawals
  });
});

module.exports = router;

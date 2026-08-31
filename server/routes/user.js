/* =========================================================
   routes/user.js — everything a logged-in user can do:
   profile, earnings, team/referrals, transaction history,
   and submitting/listing deposit & withdrawal requests.
   ========================================================= */

const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { publicUser } = require("../lib/util");
const { uploadScreenshot } = require("../lib/upload");

const router = express.Router();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

router.use(requireAuth);

/* ---------------- Profile ---------------- */

router.get("/me", (req, res) => {
  res.json(publicUser(req.user));
});

/* ---------------- Earnings / active plans ---------------- */

router.get("/earnings", (req, res) => {
  const rows = db
    .prepare(
      `SELECT ai.*, p.name, p.deposit, p.daily_return AS dailyReturn, p.duration, p.icon, p.accent, p.accent_light AS accentLight
       FROM active_investments ai
       JOIN plans p ON p.id = ai.plan_id
       WHERE ai.user_id = ?
       ORDER BY ai.invested_at DESC`
    )
    .all(req.user.id);

  let totalInvested = 0;
  let totalEarned = 0;

  const activePlans = rows.map((r) => {
    const investedAt = new Date(r.invested_at).getTime();
    const daysCompleted = Math.min(Math.floor(Math.max(Date.now() - investedAt, 0) / MS_PER_DAY), r.duration);
    const earned = daysCompleted * r.dailyReturn;
    const progressPct = Math.round((daysCompleted / r.duration) * 100);
    const isCompleted = daysCompleted >= r.duration;

    totalInvested += r.deposit;
    totalEarned += earned;

    return {
      id: r.id,
      planId: r.plan_id,
      name: r.name,
      icon: r.icon,
      accent: r.accent,
      accentLight: r.accentLight,
      deposit: r.deposit,
      dailyReturn: r.dailyReturn,
      duration: r.duration,
      investedAt: r.invested_at,
      daysCompleted,
      earned,
      progressPct,
      status: isCompleted ? "Completed" : "Active"
    };
  });

  res.json({ totalInvested, totalEarned, activePlans });
});

/* ---------------- Team / referrals ---------------- */

router.get("/team", (req, res) => {
  const me = req.user;

  const referred = db
    .prepare("SELECT * FROM users WHERE referred_by = ? ORDER BY created_at DESC")
    .all(me.referral_code);

  const investedStmt = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM deposit_requests WHERE user_id = ? AND status = 'approved'"
  );
  const commissionStmt = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = ? AND type = 'Commission' AND related_user_id = ?"
  );

  const members = referred.map((m) => ({
    name: m.name,
    avatar: m.avatar,
    joinDate: m.created_at,
    invested: investedStmt.get(m.id).total,
    commission: commissionStmt.get(me.id, m.id).total
  }));

  const totalTeamEarning = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = ? AND type = 'Commission'")
    .get(me.id).total;

  res.json({
    referralCode: me.referral_code,
    referralLink: `${req.protocol}://${req.get("host")}/?ref=${me.referral_code}`,
    stats: { totalReferrals: members.length, totalTeamEarning },
    members
  });
});

/* ---------------- Transaction history ---------------- */

router.get("/transactions", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200")
    .all(req.user.id);

  res.json(
    rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      date: t.created_at
    }))
  );
});

/* ---------------- Deposits (buy a plan, or top up wallet) ---------------- */

router.post("/deposits", (req, res) => {
  uploadScreenshot.single("screenshot")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const { planId, method } = req.body || {};
    if (!req.file) return res.status(400).json({ error: "A payment screenshot is required." });

    let amount;
    let resolvedPlanId = null;

    if (planId) {
      const plan = db.prepare("SELECT * FROM plans WHERE id = ? AND active = 1").get(Number(planId));
      if (!plan) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: "Plan not found." });
      }
      amount = plan.deposit; // server-authoritative price, never trust client amount
      resolvedPlanId = plan.id;
    } else {
      amount = Number(req.body && req.body.amount);
      if (!amount || amount <= 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "Enter a valid deposit amount." });
      }
    }

    const relativePath = `/uploads/screenshots/${req.file.filename}`;

    const info = db
      .prepare(
        `INSERT INTO deposit_requests (user_id, plan_id, amount, screenshot_path, method, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`
      )
      .run(req.user.id, resolvedPlanId, amount, relativePath, method || "Manual Transfer");

    db.prepare(
      `INSERT INTO transactions (user_id, type, amount, status, plan_id, deposit_request_id)
       VALUES (?, 'Deposit', ?, 'Pending', ?, ?)`
    ).run(req.user.id, amount, resolvedPlanId, info.lastInsertRowid);

    const created = db.prepare("SELECT * FROM deposit_requests WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(serializeDeposit(created));
  });
});

router.get("/deposits", (req, res) => {
  const rows = db
    .prepare(
      `SELECT dr.*, p.name AS planName
       FROM deposit_requests dr
       LEFT JOIN plans p ON p.id = dr.plan_id
       WHERE dr.user_id = ?
       ORDER BY dr.created_at DESC`
    )
    .all(req.user.id);

  res.json(rows.map(serializeDeposit));
});

function serializeDeposit(d) {
  return {
    id: d.id,
    planId: d.plan_id,
    planName: d.planName || null,
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

router.post("/withdrawals", express.json(), (req, res) => {
  const { amount, method, accountDetails } = req.body || {};
  const numericAmount = Number(amount);

  if (!numericAmount || numericAmount <= 0) {
    return res.status(400).json({ error: "Enter a valid withdrawal amount." });
  }
  if (!method || !accountDetails) {
    return res.status(400).json({ error: "Payout method and account details are required." });
  }
  if (numericAmount > req.user.balance) {
    return res.status(400).json({ error: "Withdrawal amount exceeds your available balance." });
  }

  // Hold the funds immediately so they can't be withdrawn twice while pending review.
  db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(numericAmount, req.user.id);

  const info = db
    .prepare(
      `INSERT INTO withdrawal_requests (user_id, amount, method, account_details, status)
       VALUES (?, ?, ?, ?, 'pending')`
    )
    .run(req.user.id, numericAmount, method, accountDetails);

  db.prepare(
    `INSERT INTO transactions (user_id, type, amount, status, withdrawal_request_id)
     VALUES (?, 'Withdraw', ?, 'Pending', ?)`
  ).run(req.user.id, numericAmount, info.lastInsertRowid);

  const created = db.prepare("SELECT * FROM withdrawal_requests WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(serializeWithdrawal(created));
});

router.get("/withdrawals", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);

  res.json(rows.map(serializeWithdrawal));
});

function serializeWithdrawal(w) {
  return {
    id: w.id,
    amount: w.amount,
    method: w.method,
    accountDetails: w.account_details,
    status: w.status,
    adminNote: w.admin_note,
    createdAt: w.created_at,
    reviewedAt: w.reviewed_at
  };
}

module.exports = router;

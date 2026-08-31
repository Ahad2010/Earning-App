/* =========================================================
   routes/auth.js — user registration & login (not admin).
   ========================================================= */

const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signUserToken } = require("../middleware/auth");
const { generateReferralCode, publicUser } = require("../lib/util");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", (req, res) => {
  const { name, email, password, referralCode } = req.body || {};

  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required." });
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) return res.status(409).json({ error: "An account with this email already exists." });

  let referredBy = null;
  if (referralCode && String(referralCode).trim()) {
    const referrer = db
      .prepare("SELECT referral_code FROM users WHERE referral_code = ?")
      .get(String(referralCode).trim().toUpperCase());
    if (referrer) referredBy = referrer.referral_code;
  }

  const passwordHash = bcrypt.hashSync(String(password), 10);
  const myReferralCode = generateReferralCode();
  const avatarSeed = Math.floor(Math.random() * 70) + 1;

  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, referral_code, referred_by, balance, avatar)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    )
    .run(String(name).trim(), normalizedEmail, passwordHash, myReferralCode, referredBy, `https://i.pravatar.cc/160?img=${avatarSeed}`);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = signUserToken(user);

  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signUserToken(user);
  res.json({ token, user: publicUser(user) });
});

module.exports = router;

/* =========================================================
   util.js — small shared helpers (referral codes, safe user
   serialization for API responses).
   ========================================================= */

const db = require("../db");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function generateReferralCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    for (let i = 0; i < 7; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    const exists = db.prepare("SELECT id FROM users WHERE referral_code = ?").get(code);
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique referral code");
}

/** Strips password_hash and other internal fields before sending a user out. */
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balance: user.balance,
    referralCode: user.referral_code,
    referredBy: user.referred_by,
    avatar: user.avatar,
    joinDate: user.created_at
  };
}

module.exports = { generateReferralCode, publicUser };

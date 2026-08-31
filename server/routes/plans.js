/* =========================================================
   routes/plans.js — public list of investment plans.
   ========================================================= */

const express = require("express");
const db = require("../db");

const router = express.Router();

function serializePlan(p) {
  return {
    id: p.id,
    name: p.name,
    deposit: p.deposit,
    dailyReturn: p.daily_return,
    duration: p.duration,
    icon: p.icon,
    accent: p.accent,
    accentLight: p.accent_light,
    popular: !!p.popular
  };
}

router.get("/", (req, res) => {
  const plans = db.prepare("SELECT * FROM plans WHERE active = 1 ORDER BY deposit ASC").all();
  res.json(plans.map(serializePlan));
});

module.exports = router;

/* =========================================================
   earnings.js — Credits accrued daily-return earnings from a
   user's active investments into their withdrawable balance.

   This is called on every authenticated user request, so the
   balance always reflects "days completed × daily return" for
   each active plan without needing a cron job. It is idempotent:
   each investment tracks how much of its accrued earning has
   already been credited (`credited_amount`), so re-running this
   never double-credits.
   ========================================================= */

const db = require("../db");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getActiveInvestments = db.prepare(`
  SELECT ai.*, p.daily_return AS dailyReturn, p.duration AS duration
  FROM active_investments ai
  JOIN plans p ON p.id = ai.plan_id
  WHERE ai.user_id = ?
`);

const updateCredited = db.prepare("UPDATE active_investments SET credited_amount = ? WHERE id = ?");
const addToBalance = db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
const insertTransaction = db.prepare(`
  INSERT INTO transactions (user_id, type, amount, status, plan_id)
  VALUES (?, 'Earning', ?, 'Completed', ?)
`);

function syncEarnings(userId) {
  const investments = getActiveInvestments.all(userId);
  let totalDelta = 0;

  for (const inv of investments) {
    const investedAt = new Date(inv.invested_at).getTime();
    const elapsedMs = Math.max(Date.now() - investedAt, 0);
    const daysCompleted = Math.min(Math.floor(elapsedMs / MS_PER_DAY), inv.duration);
    const earnedSoFar = daysCompleted * inv.dailyReturn;
    const delta = earnedSoFar - inv.credited_amount;

    if (delta > 0) {
      updateCredited.run(earnedSoFar, inv.id);
      totalDelta += delta;
      insertTransaction.run(userId, delta, inv.plan_id);
    }
  }

  if (totalDelta > 0) {
    addToBalance.run(totalDelta, userId);
  }

  return totalDelta;
}

module.exports = { syncEarnings };

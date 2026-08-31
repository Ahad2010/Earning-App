/* =========================================================
   data.js — Static / mock data for the demo app.
   No backend, no real transactions. Everything here is a
   placeholder so the UI has something realistic to render.
   ========================================================= */

const investmentPlans = [
  { id: 1, name: "Starter Plan", deposit: 400, dailyReturn: 180, duration: 30 },
  { id: 2, name: "Silver Plan", deposit: 1000, dailyReturn: 400, duration: 30 },
  { id: 3, name: "Gold Plan", deposit: 5000, dailyReturn: 1800, duration: 45 },
  { id: 4, name: "Platinum Plan", deposit: 10000, dailyReturn: 3800, duration: 60 }
];

const user = {
  name: "Demo User",
  email: "demo@example.com",
  balance: 2500,
  referralCode: "DEMO123",
  joinDate: "2026-01-15"
};

const teamMembers = [
  { name: "Ali Raza", joinDate: "2026-02-01", invested: 400, commission: 40 },
  { name: "Sara Khan", joinDate: "2026-02-10", invested: 1000, commission: 100 },
  { name: "Bilal Ahmed", joinDate: "2026-03-05", invested: 5000, commission: 500 },
  { name: "Hina Sheikh", joinDate: "2026-04-18", invested: 400, commission: 40 }
];

const transactions = [
  { type: "Deposit", amount: 400, date: "2026-08-01", status: "Completed" },
  { type: "Earning", amount: 180, date: "2026-08-02", status: "Completed" },
  { type: "Earning", amount: 180, date: "2026-08-03", status: "Completed" },
  { type: "Withdraw", amount: 200, date: "2026-08-15", status: "Pending" },
  { type: "Deposit", amount: 1000, date: "2026-08-20", status: "Completed" },
  { type: "Earning", amount: 400, date: "2026-08-21", status: "Completed" }
];

/* Promo banner slides shown on the Home screen carousel.
   Rendered from data (per spec) rather than hardcoded HTML,
   and styled with CSS gradients instead of image assets so
   the demo has zero external dependencies. */
const promoSlides = [
  {
    title: "Welcome to InvestWise",
    subtitle: "Track demo investment plans and simulated daily returns.",
    gradient: "linear-gradient(135deg,#1E5FBF,#0F3E82)"
  },
  {
    title: "New: Gold Plan",
    subtitle: "Rs. 5,000 deposit — Rs. 1,800 demo daily return.",
    gradient: "linear-gradient(135deg,#2F72D6,#123A73)"
  },
  {
    title: "Invite & Earn",
    subtitle: "Share your referral code and earn demo commission.",
    gradient: "linear-gradient(135deg,#1FAE5C,#0F3E82)"
  },
  {
    title: "100% Demo Mode",
    subtitle: "No real money involved. All figures are for UI demo only.",
    gradient: "linear-gradient(135deg,#0F3E82,#1E5FBF)"
  }
];

/* Fixed reference point used by the Home screen's live
   Day / Hour / Min / Sec counters — elapsed time since the
   user's (demo) join date. */
const APP_START_DATE = new Date(user.joinDate + "T00:00:00");

/* Target number the live "Total Payouts Distributed" counter
   animates up to on load, then keeps ticking slowly to feel alive. */
const PAYOUTS_COUNTER_TARGET = 1284560;

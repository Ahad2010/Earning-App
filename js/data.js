/* =========================================================
   data.js — The only things that are still static/cosmetic
   on the frontend: home banner slides and the vanity payouts
   counter target. Everything financial (plans, user, team,
   transactions, deposits, withdrawals) now comes from the
   backend API — see js/api.js.
   ========================================================= */

/* Dummy account details shown in the billing/checkout modal.
   This is a manual "pay then upload proof" flow — the same
   pattern many small Pakistani businesses use for JazzCash /
   EasyPaisa payments — NOT a live payment gateway. Nothing here
   moves real money by itself; a human admin must review the
   screenshot and approve it before any balance changes. */
const PAYMENT_ACCOUNTS = [
  { method: "JazzCash", label: "JazzCash", accountName: "InvestWise Demo", accountNumber: "0300-1234567" },
  { method: "EasyPaisa", label: "EasyPaisa", accountName: "InvestWise Demo", accountNumber: "0333-7654321" },
  { method: "Bank Transfer", label: "Bank Transfer", accountName: "InvestWise Demo Pvt Ltd", accountNumber: "PK00 DEMO 0000 1234 5678" }
];

/* Promo banner slides shown on the Home screen carousel.
   Rendered from data (per spec) rather than hardcoded HTML.
   Each slide has a CSS gradient (instant, always-on background)
   plus a real photo URL that render.js layers on top once it
   finishes loading — if the photo fails (offline, blocked host),
   the gradient alone still looks intentional, never a broken image. */
const promoSlides = [
  {
    title: "Welcome to InvestWise",
    subtitle: "Track demo investment plans and simulated daily returns.",
    gradient: "linear-gradient(135deg,#1E5FBF,#0F3E82)",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=70"
  },
  {
    title: "New: Gold Plan",
    subtitle: "Rs. 5,000 deposit — Rs. 1,800 demo daily return.",
    gradient: "linear-gradient(135deg,#2F72D6,#123A73)",
    image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=900&q=70"
  },
  {
    title: "Invite & Earn",
    subtitle: "Share your referral code and earn demo commission.",
    gradient: "linear-gradient(135deg,#1FAE5C,#0F3E82)",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=70"
  },
  {
    title: "100% Demo Mode",
    subtitle: "No real money involved. All figures are for UI demo only.",
    gradient: "linear-gradient(135deg,#0F3E82,#1E5FBF)",
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=900&q=70"
  }
];

/* Fixed reference point used by the Home screen's live
   Day / Hour / Min / Sec counters — elapsed time since the
   platform's (demo) launch date. Purely decorative. */
const APP_START_DATE = new Date("2026-01-01T00:00:00");

/* Target number the live "Total Payouts Distributed" counter
   animates up to on load, then keeps ticking slowly to feel alive. */
const PAYOUTS_COUNTER_TARGET = 1284560;

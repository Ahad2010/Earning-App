/* =========================================================
   data.js — Static / mock data for the demo app.
   No backend, no real transactions. Everything here is a
   placeholder so the UI has something realistic to render.
   ========================================================= */

const investmentPlans = [
  {
    id: 1, name: "Starter Plan", deposit: 400, dailyReturn: 180, duration: 30,
    icon: "🌱", accent: "#1E5FBF", accentLight: "#E8F0FE"
  },
  {
    id: 2, name: "Silver Plan", deposit: 1000, dailyReturn: 400, duration: 30,
    icon: "⚡", accent: "#5B6B82", accentLight: "#EEF1F6", popular: true
  },
  {
    id: 3, name: "Gold Plan", deposit: 5000, dailyReturn: 1800, duration: 45,
    icon: "👑", accent: "#C98A0A", accentLight: "#FCF3DF"
  },
  {
    id: 4, name: "Platinum Plan", deposit: 10000, dailyReturn: 3800, duration: 60,
    icon: "💎", accent: "#0F3E82", accentLight: "#E8F0FE"
  }
];

const user = {
  name: "Demo User",
  email: "demo@example.com",
  balance: 2500,
  referralCode: "DEMO123",
  joinDate: "2026-01-15",
  avatar: "https://i.pravatar.cc/160?img=8"
};

const teamMembers = [
  { name: "Ali Raza", joinDate: "2026-02-01", invested: 400, commission: 40, avatar: "https://i.pravatar.cc/120?img=12" },
  { name: "Sara Khan", joinDate: "2026-02-10", invested: 1000, commission: 100, avatar: "https://i.pravatar.cc/120?img=47" },
  { name: "Bilal Ahmed", joinDate: "2026-03-05", invested: 5000, commission: 500, avatar: "https://i.pravatar.cc/120?img=33" },
  { name: "Hina Sheikh", joinDate: "2026-04-18", invested: 400, commission: 40, avatar: "https://i.pravatar.cc/120?img=25" }
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
   user's (demo) join date. */
const APP_START_DATE = new Date(user.joinDate + "T00:00:00");

/* Target number the live "Total Payouts Distributed" counter
   animates up to on load, then keeps ticking slowly to feel alive. */
const PAYOUTS_COUNTER_TARGET = 1284560;

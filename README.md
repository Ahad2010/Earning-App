# InvestWise — Investment Plan Tracker (Demo)

> **Disclaimer:** This started as a UI/UX demo and now has a real backend, real
> accounts, and a real (manual) deposit/withdrawal approval workflow — but it
> is still **not a licensed financial product**. Deposits are a "pay
> manually, upload a screenshot, admin reviews it" flow, the same pattern many
> small Pakistani businesses use for JazzCash/EasyPaisa payments when they
> don't have a payment gateway. **There is no live payment gateway anywhere
> in this app** — nothing here can move real money by itself. A human admin
> must open the dashboard and click Approve before any balance changes.
>
> **Before this ever takes real money from real members of the public:** the
> investment-plan return figures seeded in `server/db.js` (e.g. Rs. 400 in →
> Rs. 180/day back, ~45% *daily*) are demo placeholders. That shape — fixed,
> above-market daily returns paid out from a pool of user deposits, plus a
> referral commission — is the same shape as an unsustainable/Ponzi scheme if
> it's ever run for real without a genuine revenue source behind the returns.
> Running this as a real product that accepts deposits from the public
> requires proper legal/regulatory review and licensing (e.g. SECP
> registration in Pakistan) first. Don't onboard real paying users on the
> current numbers.

## What this is

A mobile-first investment plan tracker with a real backend:
- Users register/log in, browse investment plans, and "buy" one through a
  billing/checkout flow — pay manually to a shown demo account, upload a
  screenshot, and wait for admin review.
- An admin dashboard lists pending deposits/withdrawals with the uploaded
  screenshot, and approves or rejects them.
- Approving a plan deposit activates it and starts accruing the daily
  return into the user's withdrawable balance; approving a wallet top-up
  credits the balance directly.
- Withdrawals hold the requested amount immediately and either finalize or
  refund it depending on the admin's decision.
- Referral commission (10%) is credited automatically when a referred
  user's deposit is approved.

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (no framework, no build step)
- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` (no native module to
  compile, no separate DB server to install)
- **Auth:** JWT, passwords hashed with bcrypt
- **File uploads:** Multer (payment-proof screenshots)

## Running it

```bash
cd server
npm install
npm start
```

The server prints a default admin login on first run (also shown below) and
serves everything on one port:

- App: http://localhost:4000
- Admin dashboard: http://localhost:4000/admin.html

Default admin login (created automatically the first time the server runs,
when the database file doesn't exist yet):

```
email:    admin@investwise.demo
password: Admin@123
```

**Change this password** (or set `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars
before the first run) before using this anywhere but your own machine. Also
set a real `JWT_SECRET` env var — see `server/middleware/auth.js`.

The SQLite database file (`server/data.sqlite`) and uploaded screenshots
(`server/uploads/screenshots/`) are created automatically and are
gitignored — delete `server/data.sqlite` to reset all data.

## Project Structure

```
investment-app-demo/
│
├── index.html                # User-facing app shell (auth gate + app)
├── admin.html                # Admin dashboard
├── css/
│   ├── style.css              # Global styles, variables, theme, layout
│   ├── components.css         # Cards, buttons, nav bar, modals, forms
│   ├── animations.css         # Transitions, keyframes
│   ├── auth.css               # Login/register (and admin login) screen
│   └── admin.css               # Admin dashboard layout
├── js/
│   ├── api.js                  # Fetch wrapper + JWT handling (user)
│   ├── data.js                  # Cosmetic-only data (banner slides, demo payment accounts)
│   ├── navigation.js             # Tab switching + sliding nav indicator
│   ├── counter.js                 # Live counter + running timer animation
│   ├── render.js                   # Renders each screen from API data
│   ├── app.js                       # App init, auth gate, billing/withdraw flows, notifications
│   └── admin.js                      # Admin dashboard logic (its own token/session)
├── assets/                    # Reserved for custom icons/images (nav icons are inline SVG)
├── server/
│   ├── server.js               # Express entry point — serves frontend + /api + /uploads
│   ├── db.js                    # SQLite schema + first-run seed (plans, default admin)
│   ├── middleware/auth.js        # JWT verification (user + admin)
│   ├── lib/
│   │   ├── earnings.js            # Credits accrued daily-return earnings into balance
│   │   ├── upload.js               # Multer config for screenshot uploads
│   │   └── util.js                  # Referral code generation, response serialization
│   ├── routes/
│   │   ├── auth.js                  # Register / login
│   │   ├── plans.js                  # Public plan list
│   │   ├── user.js                    # Profile, earnings, team, transactions, deposits, withdrawals
│   │   └── admin.js                    # Admin login + approve/reject workflow, users, stats
│   └── uploads/screenshots/            # Uploaded payment-proof images (gitignored)
└── README.md
```

## How the money flow actually works (so it's clear nothing is automatic)

1. **Buy a plan / top up wallet:** user picks a plan (or the Profile
   "Deposit" button for a plain top-up), sees a demo account to pay to, pays
   *manually* outside the app, and uploads a screenshot. This creates a
   `pending` deposit request — no balance changes yet.
2. **Admin reviews it** on `/admin.html`, looking at the screenshot, and
   clicks Approve or Reject.
   - Approve + plan purchase → the plan becomes an active investment and
     starts accruing its daily return (server-computed, credited into the
     balance a little at a time whenever the user's data is fetched).
   - Approve + wallet top-up → the amount is added to the balance directly.
   - Reject → nothing changes; the request is marked rejected.
3. **Withdraw:** user requests a withdrawal; the amount is held (deducted)
   from their balance immediately so it can't be double-spent while pending.
   Admin approves (finalizes it) or rejects (refunds the held amount back).
4. **Referral commission:** when a referred user's deposit is approved, the
   referrer is credited 10% of that deposit automatically.

All of this is visible in Transaction History and the bell-icon
notifications, both of which reflect real request status (`Pending` /
`Completed` / `Rejected`) rather than static text.

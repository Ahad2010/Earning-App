# InvestWise — Investment Plan Tracker (Demo)

> **Disclaimer:** This is a UI/UX demo project. No real payment gateway, real
> user funds, or real financial transactions are involved. All data (balance,
> earnings, plans, referrals, transactions) is static/mock. Turning this into
> a real product that accepts real user deposits would require proper legal
> licensing (e.g. SECP registration in Pakistan) and a genuine revenue source.

## What this is

A mobile-first, single-page demo of an investment plan tracker: browse
investment plans, "invest" (dummy) into them, watch simulated earnings and
progress, view a referral/team screen, and a profile screen with a dummy
withdraw/deposit flow and transaction history.

## Tech Stack

- HTML5 (semantic structure)
- CSS3 (Flexbox, CSS variables, transitions/animations)
- Vanilla JavaScript (no frameworks, no build tools, no backend)

Everything runs directly in the browser — no `npm install`, no build step.

## Running it

Just open `index.html` in a browser. For clipboard "Copy" to work in every
browser (some restrict `navigator.clipboard` to secure contexts), it's best
served over `http://localhost` rather than a raw `file://` URL — the app
includes a fallback for `file://` regardless. To serve locally:

```bash
# any static file server works, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project Structure

```
investment-app-demo/
│
├── index.html              # Main single-page app shell
├── css/
│   ├── style.css            # Global styles, variables, theme, layout
│   ├── components.css       # Cards, buttons, nav bar, modals, forms
│   └── animations.css       # Counter animation, transitions, keyframes
├── js/
│   ├── data.js               # Dummy data (plans, user, team, transactions)
│   ├── navigation.js         # Tab switching logic
│   ├── counter.js            # Live counter + running timer animation logic
│   ├── render.js              # Functions to render each screen's content
│   └── app.js                 # App init / entry point, state, modals, events
├── assets/
│   ├── icons/                 # Reserved for custom icons (nav icons are
│   │                             inline SVG in index.html for portability)
│   └── images/                 # Reserved for custom banner/avatar images
│                                 (banner slides currently use CSS gradients)
└── README.md
```

## Screens

- **Home** — promo banner carousel, live "Total Payouts" counter with a
  running Day/Hour/Min/Sec timer, and a dynamically rendered list of
  investment plans with an "Invest Now" action.
- **Earning** — summary of total invested / total earned, and a list of
  active plans with progress bars, computed from when each plan was
  "invested" in.
- **Team** — referral code + shareable link with copy-to-clipboard, team
  stats, and a list of referred users with their commission.
- **Profile** — user info, balance card with dummy Withdraw/Deposit modals,
  and a menu for Transaction History, About Us, Settings (toggles) and
  Logout.

## Notes on data & persistence

- All base data (plans, user, team, transactions) lives in `js/data.js` as
  static/mock JS objects — no API calls.
- "Invest Now" and Settings toggles persist to `localStorage` only, so the
  demo state survives a page refresh but never touches a server.
- A "DEMO MODE" badge is shown in the header at all times for transparency,
  per the project's non-functional requirements.

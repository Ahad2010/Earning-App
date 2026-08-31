/* =========================================================
   render.js — Functions that render each screen's dynamic
   content from the data in data.js / app.js state.
   ========================================================= */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatCurrency(amount, withPrefix = true) {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString("en-PK");
  return withPrefix ? `Rs. ${formatted}` : formatted;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Renders a circular avatar that shows initials immediately and
 *  upgrades to a real photo once it loads; if the photo fails to
 *  load, the <img> removes itself and the initials stay visible —
 *  there is never a broken-image icon. */
function avatarHtml(name, avatarUrl, extraClass = "") {
  return `
    <div class="avatar ${extraClass}">
      <span class="avatar-fallback">${initials(name)}</span>
      ${avatarUrl ? `<img class="avatar-img" src="${avatarUrl}" alt="" loading="lazy"
          onload="this.classList.add('loaded')" onerror="this.remove()" />` : ""}
    </div>`;
}

/* ---------------- Home: Banner Carousel ---------------- */

function renderPromoBanner() {
  const track = document.getElementById("banner-track");
  const dots = document.getElementById("banner-dots");
  if (!track || !dots) return;

  track.innerHTML = promoSlides
    .map(
      (slide, i) => `
      <div class="banner-slide" data-index="${i}" style="background:${slide.gradient}">
        <div class="banner-slide-text">
          <h3>${slide.title}</h3>
          <p>${slide.subtitle}</p>
        </div>
      </div>`
    )
    .join("");

  dots.innerHTML = promoSlides
    .map((_, i) => `<span class="banner-dot${i === 0 ? " active" : ""}" data-index="${i}"></span>`)
    .join("");

  // Upgrade each slide to a real photo once it's loaded, layered
  // under a dark scrim so the title/subtitle stay readable. The
  // gradient background above stays visible until (or instead of)
  // that photo, so a slow/blocked network never shows a blank slide.
  promoSlides.forEach((slide, i) => {
    if (!slide.image) return;
    const img = new Image();
    img.onload = () => {
      const el = track.querySelector(`.banner-slide[data-index="${i}"]`);
      if (el) {
        el.style.backgroundImage =
          `linear-gradient(180deg, rgba(10,26,58,0.15), rgba(8,18,42,0.72)), url('${slide.image}')`;
      }
    };
    img.src = slide.image;
  });
}

/* ---------------- Home: Investment Plans ---------------- */

function renderInvestmentPlans(plans) {
  const list = document.getElementById("plans-list");
  if (!list) return;

  list.innerHTML = plans
    .map(
      (plan) => `
      <div class="plan-card${plan.popular ? " popular" : ""}" style="--plan-accent:${plan.accent};--plan-accent-light:${plan.accentLight}">
        ${plan.popular ? '<span class="plan-ribbon">POPULAR</span>' : ""}
        <div class="plan-card-top">
          <div class="plan-card-heading">
            <span class="plan-icon-badge">${plan.icon}</span>
            <span class="plan-name">${plan.name}</span>
          </div>
          <span class="plan-duration-badge">${plan.duration} Days</span>
        </div>
        <div class="plan-stats">
          <div class="plan-stat">
            <span class="plan-stat-label">Deposit</span>
            <span class="plan-stat-value">${formatCurrency(plan.deposit)}</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat-label">Daily Return</span>
            <span class="plan-stat-value">${formatCurrency(plan.dailyReturn)} / day</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block invest-now-btn" data-plan-id="${plan.id}">
          Invest Now
        </button>
      </div>`
    )
    .join("");
}

/* ---------------- Earning Screen ---------------- */

function renderEarningScreen(data) {
  const listEl = document.getElementById("active-plans-list");
  const investedEl = document.getElementById("summary-invested");
  const earnedEl = document.getElementById("summary-earned");
  const badgeEl = document.getElementById("earning-badge");
  if (!listEl || !investedEl || !earnedEl) return;

  const activePlans = (data && data.activePlans) || [];

  if (!activePlans.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <p>No active plans yet — go to Home to invest</p>
        <button class="btn btn-primary" id="empty-state-home-btn">Browse Plans</button>
      </div>`;
    investedEl.textContent = formatCurrency(0);
    earnedEl.textContent = formatCurrency(0);
    if (badgeEl) badgeEl.hidden = true;

    const goHomeBtn = document.getElementById("empty-state-home-btn");
    if (goHomeBtn) goHomeBtn.addEventListener("click", () => showScreen("screen-home"));
    return;
  }

  listEl.innerHTML = activePlans
    .map((ap) => {
      const isCompleted = ap.status === "Completed";
      return `
        <div class="active-plan-card" style="--plan-accent:${ap.accent};--plan-accent-light:${ap.accentLight}">
          <div class="active-plan-top">
            <div>
              <div class="active-plan-name">${ap.icon ? ap.icon + " " : ""}${ap.name}</div>
              <div class="active-plan-invested">Invested: ${formatCurrency(ap.deposit)}</div>
            </div>
            <span class="status-badge ${isCompleted ? "status-completed" : "status-active"}">
              ${ap.status}
            </span>
          </div>
          <div class="progress-row">
            <div class="progress-labels">
              <span>${ap.daysCompleted} / ${ap.duration} days</span>
              <span>${ap.progressPct}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${ap.progressPct}%"></div>
            </div>
          </div>
          <div class="active-plan-earned">
            <span class="earned-label">Earned so far</span>
            <span class="earned-value">${formatCurrency(ap.earned)}</span>
          </div>
        </div>`;
    })
    .join("");

  investedEl.textContent = formatCurrency(data.totalInvested);
  earnedEl.textContent = formatCurrency(data.totalEarned);

  if (badgeEl) {
    badgeEl.hidden = activePlans.length === 0;
    badgeEl.textContent = activePlans.length;
  }
}

/* ---------------- Team Screen ---------------- */

function renderTeamScreen(data) {
  const statsRow = document.getElementById("team-stats-row");
  const listEl = document.getElementById("team-list");
  const codeEl = document.getElementById("referral-code");
  const linkEl = document.getElementById("referral-link");
  if (!statsRow || !listEl) return;

  codeEl.textContent = data.referralCode;
  linkEl.textContent = data.referralLink;

  statsRow.innerHTML = `
    <div class="team-stat-card">
      <div class="team-stat-value">${data.stats.totalReferrals}</div>
      <div class="team-stat-label">Total Referrals</div>
    </div>
    <div class="team-stat-card">
      <div class="team-stat-value">${formatCurrency(data.stats.totalTeamEarning)}</div>
      <div class="team-stat-label">Team Earning</div>
    </div>`;

  if (!data.members.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <p>No referrals yet — share your code to start earning commission</p>
      </div>`;
    return;
  }

  listEl.innerHTML = data.members
    .map(
      (m) => `
      <div class="team-row">
        ${avatarHtml(m.name, m.avatar)}
        <div class="team-row-info">
          <div class="team-row-name">${m.name}</div>
          <div class="team-row-date">Joined ${formatDate(m.joinDate)}</div>
        </div>
        <div class="team-row-numbers">
          <div class="team-row-invested">${formatCurrency(m.invested)} invested</div>
          <div class="team-row-commission">+${formatCurrency(m.commission)}</div>
        </div>
      </div>`
    )
    .join("");
}

/* ---------------- Profile Screen ---------------- */

function renderProfileScreen(user) {
  const headerEl = document.getElementById("profile-header");
  const balanceEl = document.getElementById("balance-value");
  if (!headerEl || !balanceEl) return;

  headerEl.innerHTML = `
    ${avatarHtml(user.name, user.avatar, "profile-avatar")}
    <div class="profile-info">
      <div class="profile-name">${user.name}</div>
      <div class="profile-contact">${user.email}</div>
    </div>
    <button class="profile-edit-btn" id="profile-edit-btn" title="Edit profile (demo only)">✎</button>`;

  balanceEl.textContent = formatCurrency(user.balance);
}

/* ---------------- Transaction History (modal content) ---------------- */

const TX_ICONS = { Deposit: "⬇️", Earning: "💰", Withdraw: "⬆️", Commission: "🤝" };

function renderTransactionHistoryHtml(transactions) {
  if (!transactions.length) {
    return `
      <h3 class="modal-title">Transaction History</h3>
      <div class="empty-state">
        <div class="empty-state-icon">🧾</div>
        <p>No transactions yet.</p>
      </div>`;
  }

  const rows = transactions
    .map((tx) => {
      const typeClass = tx.type.toLowerCase();
      const statusClass = tx.status.toLowerCase();
      const sign = tx.type === "Withdraw" ? "-" : "+";
      return `
        <div class="tx-row">
          <div class="tx-icon ${typeClass}">${TX_ICONS[tx.type] || "•"}</div>
          <div class="tx-info">
            <div class="tx-type">${tx.type}</div>
            <div class="tx-date">${formatDate(tx.date)}</div>
          </div>
          <div class="tx-right">
            <div class="tx-amount">${sign}${formatCurrency(tx.amount)}</div>
            <span class="tx-status ${statusClass}">${tx.status}</span>
          </div>
        </div>`;
    })
    .join("");

  return `
    <h3 class="modal-title">Transaction History</h3>
    <p class="modal-subtitle">Deposits are pending until an admin reviews your screenshot.</p>
    <div class="modal-body">${rows}</div>`;
}

/* ---------------- About Us (modal content) ---------------- */

function renderAboutUsHtml() {
  return `
    <h3 class="modal-title">About Us</h3>
    <div class="modal-body">
      <p>InvestWise is a UI/UX demo project built to showcase an investment plan tracker app end-to-end, including a manual deposit/withdrawal review workflow. It is not a licensed financial product.</p>
      <p>Deposits are a "pay manually, then upload proof" flow — like JazzCash/EasyPaisa transfers many small Pakistani businesses use — reviewed by a human admin before any balance changes. There is no live payment gateway connected anywhere in this app.</p>
      <p>Turning this into a real product that accepts funds from the public would require proper legal/regulatory licensing (e.g. SECP registration in Pakistan) and a genuine, sustainable revenue source — the daily-return figures here are demo placeholders, not a real financial offer.</p>
    </div>`;
}

/* ---------------- Settings (modal content) ---------------- */

function renderSettingsHtml(settings) {
  return `
    <h3 class="modal-title">Settings</h3>
    <p class="modal-subtitle">Demo preferences — stored locally in your browser only.</p>
    <div class="modal-body">
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Push Notifications</div>
          <div class="settings-row-sub">Demo toggle — no real notifications are sent</div>
        </div>
        <button class="toggle ${settings.notifications ? "on" : ""}" data-setting="notifications"></button>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Dark Theme</div>
          <div class="settings-row-sub">Demo toggle — theme switching not implemented</div>
        </div>
        <button class="toggle ${settings.darkTheme ? "on" : ""}" data-setting="darkTheme"></button>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">English Language</div>
          <div class="settings-row-sub">Demo toggle — language switching not implemented</div>
        </div>
        <button class="toggle ${settings.english ? "on" : ""}" data-setting="english"></button>
      </div>
    </div>`;
}

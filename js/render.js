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

/* ---------------- Home: Banner Carousel ---------------- */

function renderPromoBanner() {
  const track = document.getElementById("banner-track");
  const dots = document.getElementById("banner-dots");
  if (!track || !dots) return;

  track.innerHTML = promoSlides
    .map(
      (slide) => `
      <div class="banner-slide" style="background:${slide.gradient}">
        <h3>${slide.title}</h3>
        <p>${slide.subtitle}</p>
      </div>`
    )
    .join("");

  dots.innerHTML = promoSlides
    .map((_, i) => `<span class="banner-dot${i === 0 ? " active" : ""}" data-index="${i}"></span>`)
    .join("");
}

/* ---------------- Home: Investment Plans ---------------- */

function renderInvestmentPlans() {
  const list = document.getElementById("plans-list");
  if (!list) return;

  list.innerHTML = investmentPlans
    .map(
      (plan) => `
      <div class="plan-card">
        <div class="plan-card-top">
          <span class="plan-name">${plan.name}</span>
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

function computeActivePlanProgress(activePlan) {
  const plan = investmentPlans.find((p) => p.id === activePlan.planId);
  if (!plan) return null;

  const elapsedMs = Date.now() - activePlan.investedAt;
  const daysCompleted = Math.min(Math.max(Math.floor(elapsedMs / MS_PER_DAY), 0), plan.duration);
  const earned = daysCompleted * plan.dailyReturn;
  const progressPct = Math.round((daysCompleted / plan.duration) * 100);
  const isCompleted = daysCompleted >= plan.duration;

  return { plan, daysCompleted, earned, progressPct, isCompleted };
}

function renderEarningScreen(activePlans) {
  const listEl = document.getElementById("active-plans-list");
  const investedEl = document.getElementById("summary-invested");
  const earnedEl = document.getElementById("summary-earned");
  const badgeEl = document.getElementById("earning-badge");
  if (!listEl || !investedEl || !earnedEl) return;

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

  let totalInvested = 0;
  let totalEarned = 0;

  listEl.innerHTML = activePlans
    .map((activePlan) => {
      const result = computeActivePlanProgress(activePlan);
      if (!result) return "";
      const { plan, daysCompleted, earned, progressPct, isCompleted } = result;

      totalInvested += plan.deposit;
      totalEarned += earned;

      return `
        <div class="active-plan-card">
          <div class="active-plan-top">
            <div>
              <div class="active-plan-name">${plan.name}</div>
              <div class="active-plan-invested">Invested: ${formatCurrency(plan.deposit)}</div>
            </div>
            <span class="status-badge ${isCompleted ? "status-completed" : "status-active"}">
              ${isCompleted ? "Completed" : "Active"}
            </span>
          </div>
          <div class="progress-row">
            <div class="progress-labels">
              <span>${daysCompleted} / ${plan.duration} days</span>
              <span>${progressPct}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${progressPct}%"></div>
            </div>
          </div>
          <div class="active-plan-earned">
            <span class="earned-label">Earned so far</span>
            <span class="earned-value">${formatCurrency(earned)}</span>
          </div>
        </div>`;
    })
    .join("");

  investedEl.textContent = formatCurrency(totalInvested);
  earnedEl.textContent = formatCurrency(totalEarned);

  if (badgeEl) {
    badgeEl.hidden = activePlans.length === 0;
    badgeEl.textContent = activePlans.length;
  }
}

/* ---------------- Team Screen ---------------- */

function renderTeamScreen() {
  const statsRow = document.getElementById("team-stats-row");
  const listEl = document.getElementById("team-list");
  const codeEl = document.getElementById("referral-code");
  const linkEl = document.getElementById("referral-link");
  if (!statsRow || !listEl) return;

  codeEl.textContent = user.referralCode;
  linkEl.textContent = `https://investwise.demo/ref/${user.referralCode}`;

  const totalEarning = teamMembers.reduce((sum, m) => sum + m.commission, 0);

  statsRow.innerHTML = `
    <div class="team-stat-card">
      <div class="team-stat-value">${teamMembers.length}</div>
      <div class="team-stat-label">Total Referrals</div>
    </div>
    <div class="team-stat-card">
      <div class="team-stat-value">${formatCurrency(totalEarning)}</div>
      <div class="team-stat-label">Team Earning</div>
    </div>`;

  listEl.innerHTML = teamMembers
    .map(
      (m) => `
      <div class="team-row">
        <div class="avatar">${initials(m.name)}</div>
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

function renderProfileScreen(currentBalance) {
  const headerEl = document.getElementById("profile-header");
  const balanceEl = document.getElementById("balance-value");
  if (!headerEl || !balanceEl) return;

  headerEl.innerHTML = `
    <div class="profile-avatar">${initials(user.name)}</div>
    <div class="profile-info">
      <div class="profile-name">${user.name}</div>
      <div class="profile-contact">${user.email}</div>
    </div>
    <button class="profile-edit-btn" id="profile-edit-btn" title="Edit profile (demo only)">✎</button>`;

  balanceEl.textContent = formatCurrency(currentBalance);
}

/* ---------------- Transaction History (modal content) ---------------- */

const TX_ICONS = { Deposit: "⬇️", Earning: "💰", Withdraw: "⬆️" };

function renderTransactionHistoryHtml() {
  const rows = transactions
    .slice()
    .reverse()
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
    <p class="modal-subtitle">Demo records — no real transactions were made.</p>
    <div class="modal-body">${rows}</div>`;
}

/* ---------------- About Us (modal content) ---------------- */

function renderAboutUsHtml() {
  return `
    <h3 class="modal-title">About Us</h3>
    <div class="modal-body">
      <p>InvestWise is a UI/UX demo project built to showcase an investment plan tracker interface. It is not a real financial product — all balances, plans, referrals and transactions shown are static, mock data.</p>
      <p>No real payment gateway, real user funds, or real financial transactions are involved anywhere in this app. If this concept were ever developed into a real product handling user funds, it would require proper legal licensing (e.g. SECP registration in Pakistan) and a genuine, verifiable revenue source before launch.</p>
      <p>This project exists purely to demonstrate front-end structure, responsive layout, and interactive UI patterns using plain HTML, CSS and JavaScript.</p>
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

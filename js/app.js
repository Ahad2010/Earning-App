/* =========================================================
   app.js — App init / entry point. Wires up state, modals,
   toasts and event listeners for every screen.
   ========================================================= */

const ACTIVE_PLANS_KEY = "investwise_active_plans";
const SETTINGS_KEY = "investwise_settings";

let activePlans = loadActivePlans();
let currentBalance = user.balance;
let settings = loadSettings();
let carouselIndex = 0;
let carouselTimer = null;

/* ---------------- Persistence helpers ---------------- */

function loadActivePlans() {
  try {
    const raw = localStorage.getItem(ACTIVE_PLANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveActivePlans() {
  localStorage.setItem(ACTIVE_PLANS_KEY, JSON.stringify(activePlans));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { notifications: true, darkTheme: false, english: true };
  } catch (e) {
    return { notifications: true, darkTheme: false, english: true };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ---------------- Toast ---------------- */

function showToast(message, type = "") {
  const toastEl = document.getElementById("toast");
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = "toast show" + (type ? ` ${type}` : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.className = "toast";
  }, 2600);
}

/* ---------------- Modal ---------------- */

function openModal(html) {
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");
  if (!overlay || !content) return;
  content.innerHTML = html;
  overlay.classList.add("open");
  bindModalContentEvents();
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
}

function initModal() {
  const overlay = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("modal-close");
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
}

/* ---------------- Home: Banner Carousel ---------------- */

function goToSlide(index) {
  const track = document.getElementById("banner-track");
  const dots = document.querySelectorAll(".banner-dot");
  if (!track || !dots.length) return;

  carouselIndex = (index + promoSlides.length) % promoSlides.length;
  track.style.transform = `translateX(-${carouselIndex * 100}%)`;
  dots.forEach((dot, i) => dot.classList.toggle("active", i === carouselIndex));
}

function initCarousel() {
  goToSlide(0);
  restartCarouselTimer();

  document.querySelectorAll(".banner-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      goToSlide(Number(dot.dataset.index));
      restartCarouselTimer();
    });
  });
}

function restartCarouselTimer() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => goToSlide(carouselIndex + 1), 4000);
}

/* ---------------- Home: Invest Now ---------------- */

function bindInvestButtons() {
  document.querySelectorAll(".invest-now-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const planId = Number(btn.dataset.planId);
      const plan = investmentPlans.find((p) => p.id === planId);
      if (plan) openInvestConfirmModal(plan);
    });
  });
}

function openInvestConfirmModal(plan) {
  openModal(`
    <h3 class="modal-title">Confirm Investment</h3>
    <p class="modal-subtitle">This is a demo action — no real payment is made.</p>
    <div class="modal-body">
      <p><strong>${plan.name}</strong><br>
      Deposit: ${formatCurrency(plan.deposit)}<br>
      Daily Return: ${formatCurrency(plan.dailyReturn)} / day<br>
      Duration: ${plan.duration} days</p>
    </div>
    <button class="btn btn-primary btn-block" id="confirm-invest-btn" data-plan-id="${plan.id}">
      Confirm &amp; Invest
    </button>
  `);
}

function confirmInvest(planId) {
  const plan = investmentPlans.find((p) => p.id === planId);
  if (!plan) return;

  activePlans.push({ planId: plan.id, investedAt: Date.now() });
  saveActivePlans();
  closeModal();
  showToast(`Invested in ${plan.name} successfully!`, "success");
  renderEarningScreen(activePlans);
}

/* ---------------- Team: Copy referral code / link ---------------- */

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return Promise.resolve();
}

function showCopiedTooltip() {
  const tooltip = document.getElementById("copied-tooltip");
  if (!tooltip) return;
  tooltip.classList.remove("show");
  void tooltip.offsetWidth;
  tooltip.classList.add("show");
}

function initTeamActions() {
  const copyCodeBtn = document.getElementById("copy-code-btn");
  const copyLinkBtn = document.getElementById("copy-link-btn");

  copyCodeBtn.addEventListener("click", () => {
    copyText(user.referralCode).then(showCopiedTooltip);
  });

  copyLinkBtn.addEventListener("click", () => {
    copyText(`https://investwise.demo/ref/${user.referralCode}`).then(showCopiedTooltip);
  });
}

/* ---------------- Profile: Withdraw / Deposit ---------------- */

function openWithdrawModal() {
  openModal(`
    <h3 class="modal-title">Withdraw Funds</h3>
    <p class="modal-subtitle">Demo form — submitting creates no real transaction.</p>
    <form id="withdraw-form">
      <div class="form-group">
        <label class="form-label">Amount (Rs.)</label>
        <input class="form-input" type="number" min="1" max="${currentBalance}" placeholder="e.g. 500" id="withdraw-amount" required />
        <p class="form-hint">Available balance: ${formatCurrency(currentBalance)}</p>
      </div>
      <div class="form-group">
        <label class="form-label">Withdraw To</label>
        <select class="form-select" id="withdraw-method">
          <option>JazzCash (Demo)</option>
          <option>EasyPaisa (Demo)</option>
          <option>Bank Account (Demo)</option>
        </select>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Submit Request</button>
    </form>
  `);
}

function openDepositModal() {
  openModal(`
    <h3 class="modal-title">Deposit Funds</h3>
    <p class="modal-subtitle">Demo form — submitting creates no real transaction.</p>
    <form id="deposit-form">
      <div class="form-group">
        <label class="form-label">Amount (Rs.)</label>
        <input class="form-input" type="number" min="1" placeholder="e.g. 1000" id="deposit-amount" required />
      </div>
      <div class="form-group">
        <label class="form-label">Deposit Via</label>
        <select class="form-select" id="deposit-method">
          <option>JazzCash (Demo)</option>
          <option>EasyPaisa (Demo)</option>
          <option>Bank Transfer (Demo)</option>
        </select>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Submit Request</button>
    </form>
  `);
}

function showRequestSubmitted(message) {
  openModal(`
    <h3 class="modal-title">Request Submitted</h3>
    <div class="modal-body">
      <p>${message}</p>
      <p>This is a demo confirmation only — no real funds were moved.</p>
    </div>
    <button class="btn btn-primary btn-block" id="modal-ok-btn">Okay</button>
  `);
}

/* ---------------- Profile: About / Settings / Logout ---------------- */

function toggleSetting(key) {
  settings[key] = !settings[key];
  saveSettings();
  openModal(renderSettingsHtml(settings));
}

function initProfileMenu() {
  document.getElementById("withdraw-btn").addEventListener("click", openWithdrawModal);
  document.getElementById("deposit-btn").addEventListener("click", openDepositModal);

  document.getElementById("menu-transactions").addEventListener("click", () => {
    openModal(renderTransactionHistoryHtml());
  });

  document.getElementById("menu-about").addEventListener("click", () => {
    openModal(renderAboutUsHtml());
  });

  document.getElementById("menu-settings").addEventListener("click", () => {
    openModal(renderSettingsHtml(settings));
  });

  document.getElementById("menu-logout").addEventListener("click", () => {
    openModal(`
      <h3 class="modal-title">Log Out</h3>
      <div class="modal-body">
        <p>This is a demo app — logging out simply resets the current session view.</p>
      </div>
      <button class="btn btn-primary btn-block" id="confirm-logout-btn">Log Out</button>
    `);
  });
}

/* ---------------- Delegated events for modal content ---------------- */

function bindModalContentEvents() {
  const confirmInvestBtn = document.getElementById("confirm-invest-btn");
  if (confirmInvestBtn) {
    confirmInvestBtn.addEventListener("click", () => {
      confirmInvest(Number(confirmInvestBtn.dataset.planId));
    });
  }

  const withdrawForm = document.getElementById("withdraw-form");
  if (withdrawForm) {
    withdrawForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById("withdraw-amount").value);
      if (!amount || amount <= 0 || amount > currentBalance) {
        showToast("Enter a valid amount within your balance", "error");
        return;
      }
      showRequestSubmitted(`Your withdrawal request of ${formatCurrency(amount)} has been submitted for review.`);
    });
  }

  const depositForm = document.getElementById("deposit-form");
  if (depositForm) {
    depositForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById("deposit-amount").value);
      if (!amount || amount <= 0) {
        showToast("Enter a valid amount", "error");
        return;
      }
      showRequestSubmitted(`Your deposit request of ${formatCurrency(amount)} has been submitted for review.`);
    });
  }

  const okBtn = document.getElementById("modal-ok-btn");
  if (okBtn) okBtn.addEventListener("click", closeModal);

  const logoutBtn = document.getElementById("confirm-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      closeModal();
      showToast("Logged out (demo)");
      showScreen("screen-home");
    });
  }

  document.querySelectorAll(".toggle[data-setting]").forEach((toggleBtn) => {
    toggleBtn.addEventListener("click", () => toggleSetting(toggleBtn.dataset.setting));
  });
}

/* ---------------- Screen change hook (called by navigation.js) ---------------- */

function onScreenShown(screenId) {
  if (screenId === "screen-earning") {
    renderEarningScreen(activePlans);
  } else if (screenId === "screen-team") {
    renderTeamScreen();
  } else if (screenId === "screen-profile") {
    renderProfileScreen(currentBalance);
  }
}

/* ---------------- Init ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  renderPromoBanner();
  renderInvestmentPlans();
  renderEarningScreen(activePlans);
  renderTeamScreen();
  renderProfileScreen(currentBalance);

  initModal();
  initNavigation();
  initCarousel();
  initLiveCounter();
  initRunningTimer();
  bindInvestButtons();
  initTeamActions();
  initProfileMenu();
});

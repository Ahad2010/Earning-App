/* =========================================================
   app.js — App init / entry point. Wires up the auth gate,
   modals, toasts, notifications, and event listeners for
   every screen, all backed by the real API in js/api.js.
   ========================================================= */

const SETTINGS_KEY = "investwise_settings";

let currentUser = null;
let planCache = [];
let settings = loadSettings();
let carouselIndex = 0;
let carouselTimer = null;
let notifDropdownOpen = false;

/* ---------------- Local (non-financial) settings ---------------- */

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

function friendlyError(err) {
  return (err && err.message) || "Something went wrong. Please try again.";
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

/* =========================================================
   Auth gate
   ========================================================= */

function showAuthScreen() {
  document.getElementById("auth-screen").hidden = false;
  document.getElementById("app-shell").hidden = true;
}

function showAppShell() {
  document.getElementById("auth-screen").hidden = true;
  document.getElementById("app-shell").hidden = false;

  // The nav indicator was positioned while the shell had zero size
  // (hidden behind the auth screen); recompute it now that it's visible.
  const activeBtn = document.querySelector(".nav-btn.active");
  if (activeBtn) moveNavIndicator(activeBtn);
}

function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.getElementById("login-form").hidden = tab !== "login";
  document.getElementById("register-form").hidden = tab !== "register";
}

function setAuthError(formId, message) {
  const el = document.getElementById(formId === "login-form" ? "login-error" : "register-error");
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

function initAuthScreen() {
  document.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchAuthTab(btn.dataset.tab));
  });

  const params = new URLSearchParams(window.location.search);
  const refCode = params.get("ref");
  if (refCode) {
    document.getElementById("register-referral").value = refCode;
    switchAuthTab("register");
  }

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthError("login-form", "");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    try {
      const { token } = await api.login({ email, password });
      setToken(token);
      await bootApp();
    } catch (err) {
      setAuthError("login-form", friendlyError(err));
    }
  });

  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthError("register-form", "");
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const referralCode = document.getElementById("register-referral").value.trim();
    try {
      const { token } = await api.register({ name, email, password, referralCode });
      setToken(token);
      await bootApp();
    } catch (err) {
      setAuthError("register-form", friendlyError(err));
    }
  });
}

function logout() {
  setToken(null);
  currentUser = null;
  showToast("Logged out");
  showAuthScreen();
}

/* =========================================================
   App bootstrap (after login, or on load with a saved token)
   ========================================================= */

async function bootApp() {
  try {
    currentUser = await api.getMe();
  } catch (err) {
    setToken(null);
    showAuthScreen();
    return;
  }

  showAppShell();

  try {
    planCache = await api.getPlans();
  } catch (err) {
    planCache = [];
    showToast("Could not load investment plans", "error");
  }
  renderInvestmentPlans(planCache);
  bindInvestButtons();

  await Promise.all([refreshEarnings(), refreshTeam(), refreshProfile(), refreshNotifDot()]);
}

async function refreshEarnings() {
  try {
    const data = await api.getEarnings();
    renderEarningScreen(data);
  } catch (err) {
    showToast(friendlyError(err), "error");
  }
}

async function refreshTeam() {
  try {
    const data = await api.getTeam();
    renderTeamScreen(data);
  } catch (err) {
    showToast(friendlyError(err), "error");
  }
}

async function refreshProfile() {
  try {
    currentUser = await api.getMe();
    renderProfileScreen(currentUser);
  } catch (err) {
    showToast(friendlyError(err), "error");
  }
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

/* =========================================================
   Home: Invest Now -> Billing / Checkout -> screenshot upload
   ========================================================= */

function bindInvestButtons() {
  document.querySelectorAll(".invest-now-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const plan = planCache.find((p) => p.id === Number(btn.dataset.planId));
      if (plan) openBillingModal(plan);
    });
  });
}

function paymentAccountOptionsHtml(selectedMethod) {
  return PAYMENT_ACCOUNTS.map(
    (acc) => `<option value="${acc.method}" ${acc.method === selectedMethod ? "selected" : ""}>${acc.label}</option>`
  ).join("");
}

function openBillingModal(plan) {
  const account = PAYMENT_ACCOUNTS[0];
  openModal(`
    <h3 class="modal-title">Checkout — ${plan.name}</h3>
    <p class="modal-subtitle">Pay manually, then upload your payment screenshot for review.</p>
    <div class="modal-body">
      <div class="billing-summary">
        <span>Amount to pay</span>
        <strong>${formatCurrency(plan.deposit)}</strong>
      </div>
    </div>
    <form id="billing-form" data-plan-id="${plan.id}">
      <div class="form-group">
        <label class="form-label">Pay Via</label>
        <select class="form-select" id="billing-method">${paymentAccountOptionsHtml(account.method)}</select>
      </div>
      <div class="billing-account" id="billing-account"></div>
      <div class="form-group">
        <label class="form-label">Upload Payment Screenshot</label>
        <input class="form-input" type="file" id="billing-screenshot" accept="image/png,image/jpeg,image/webp,image/gif" required />
        <p class="form-hint">JPG, PNG, WEBP or GIF — up to 5MB.</p>
      </div>
      <p class="auth-error" id="billing-error" hidden></p>
      <button class="btn btn-primary btn-block" type="submit" id="billing-submit-btn">I've Paid — Submit for Review</button>
    </form>
    <p class="auth-demo-note">DEMO — send no real money. This flow mirrors a manual JazzCash/EasyPaisa proof-of-payment review; an admin must approve it before your plan activates.</p>
  `);

  updateBillingAccountDetails(account.method);
}

function updateBillingAccountDetails(method) {
  const account = PAYMENT_ACCOUNTS.find((a) => a.method === method) || PAYMENT_ACCOUNTS[0];
  const el = document.getElementById("billing-account");
  if (!el) return;
  el.innerHTML = `
    <div class="billing-account-row"><span>Account Name</span><strong>${account.accountName}</strong></div>
    <div class="billing-account-row"><span>${account.method === "Bank Transfer" ? "IBAN" : "Number"}</span><strong>${account.accountNumber}</strong></div>`;
}

async function submitDepositForm(form, { planId } = {}) {
  const errorEl = document.getElementById("billing-error") || document.getElementById("deposit-error");
  const submitBtn = form.querySelector('button[type="submit"]');
  const fileInput = form.querySelector('input[type="file"]');

  if (!fileInput.files[0]) {
    if (errorEl) {
      errorEl.textContent = "Please attach your payment screenshot.";
      errorEl.hidden = false;
    }
    return;
  }

  const formData = new FormData();
  if (planId) formData.append("planId", planId);
  else formData.append("amount", form.querySelector("#deposit-amount").value);
  formData.append("method", form.querySelector("select").value);
  formData.append("screenshot", fileInput.files[0]);

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    await api.submitDeposit(formData);
    showRequestSubmitted(
      "Your payment screenshot has been submitted. An admin will review it and your balance/plan will update once approved."
    );
    refreshNotifDot();
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = friendlyError(err);
      errorEl.hidden = false;
    } else {
      showToast(friendlyError(err), "error");
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = planId ? "I've Paid — Submit for Review" : "Submit for Review";
  }
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
  document.getElementById("copy-code-btn").addEventListener("click", () => {
    const code = document.getElementById("referral-code").textContent;
    copyText(code).then(showCopiedTooltip);
  });

  document.getElementById("copy-link-btn").addEventListener("click", () => {
    const link = document.getElementById("referral-link").textContent;
    copyText(link).then(showCopiedTooltip);
  });
}

/* ---------------- Profile: Withdraw / Deposit ---------------- */

function openWithdrawModal() {
  const balance = currentUser ? currentUser.balance : 0;
  openModal(`
    <h3 class="modal-title">Withdraw Funds</h3>
    <p class="modal-subtitle">Submitted for admin review — funds are held from your balance until reviewed.</p>
    <form id="withdraw-form">
      <div class="form-group">
        <label class="form-label">Amount (Rs.)</label>
        <input class="form-input" type="number" min="1" max="${balance}" placeholder="e.g. 500" id="withdraw-amount" required />
        <p class="form-hint">Available balance: ${formatCurrency(balance)}</p>
      </div>
      <div class="form-group">
        <label class="form-label">Withdraw To</label>
        <select class="form-select" id="withdraw-method">${paymentAccountOptionsHtml(PAYMENT_ACCOUNTS[0].method)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Account Number / IBAN</label>
        <input class="form-input" type="text" id="withdraw-account" placeholder="e.g. 0300-1234567" required />
      </div>
      <p class="auth-error" id="withdraw-error" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">Submit Request</button>
    </form>
  `);
}

function openDepositModal() {
  openModal(`
    <h3 class="modal-title">Deposit Funds</h3>
    <p class="modal-subtitle">Top up your wallet balance — pay manually, then upload proof.</p>
    <form id="deposit-form">
      <div class="form-group">
        <label class="form-label">Amount (Rs.)</label>
        <input class="form-input" type="number" min="1" placeholder="e.g. 1000" id="deposit-amount" required />
      </div>
      <div class="form-group">
        <label class="form-label">Deposit Via</label>
        <select class="form-select" id="deposit-method">${paymentAccountOptionsHtml(PAYMENT_ACCOUNTS[0].method)}</select>
      </div>
      <div class="billing-account" id="deposit-account"></div>
      <div class="form-group">
        <label class="form-label">Upload Payment Screenshot</label>
        <input class="form-input" type="file" id="deposit-screenshot" accept="image/png,image/jpeg,image/webp,image/gif" required />
        <p class="form-hint">JPG, PNG, WEBP or GIF — up to 5MB.</p>
      </div>
      <p class="auth-error" id="deposit-error" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">Submit for Review</button>
    </form>
    <p class="auth-demo-note">DEMO — send no real money. An admin reviews your screenshot before your balance updates.</p>
  `);
  updateDepositAccountDetails(PAYMENT_ACCOUNTS[0].method);
}

function updateDepositAccountDetails(method) {
  const account = PAYMENT_ACCOUNTS.find((a) => a.method === method) || PAYMENT_ACCOUNTS[0];
  const el = document.getElementById("deposit-account");
  if (!el) return;
  el.innerHTML = `
    <div class="billing-account-row"><span>Account Name</span><strong>${account.accountName}</strong></div>
    <div class="billing-account-row"><span>${account.method === "Bank Transfer" ? "IBAN" : "Number"}</span><strong>${account.accountNumber}</strong></div>`;
}

function showRequestSubmitted(message) {
  openModal(`
    <h3 class="modal-title">Submitted for Review</h3>
    <div class="modal-body">
      <p>${message}</p>
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

  document.getElementById("menu-transactions").addEventListener("click", async () => {
    openModal(`<h3 class="modal-title">Transaction History</h3><div class="modal-body"><p>Loading…</p></div>`);
    try {
      const transactions = await api.getTransactions();
      openModal(renderTransactionHistoryHtml(transactions));
    } catch (err) {
      openModal(`<h3 class="modal-title">Transaction History</h3><div class="modal-body"><p>${friendlyError(err)}</p></div>`);
    }
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
        <p>You'll need to log back in to see your balance and plans again.</p>
      </div>
      <button class="btn btn-primary btn-block" id="confirm-logout-btn">Log Out</button>
    `);
  });
}

/* ---------------- Delegated events for modal content ---------------- */

function bindModalContentEvents() {
  const billingForm = document.getElementById("billing-form");
  if (billingForm) {
    const methodSelect = billingForm.querySelector("#billing-method");
    methodSelect.addEventListener("change", () => updateBillingAccountDetails(methodSelect.value));
    billingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      submitDepositForm(billingForm, { planId: Number(billingForm.dataset.planId) });
    });
  }

  const depositForm = document.getElementById("deposit-form");
  if (depositForm) {
    const methodSelect = depositForm.querySelector("#deposit-method");
    methodSelect.addEventListener("change", () => updateDepositAccountDetails(methodSelect.value));
    depositForm.addEventListener("submit", (e) => {
      e.preventDefault();
      submitDepositForm(depositForm, { planId: null });
    });
  }

  const withdrawForm = document.getElementById("withdraw-form");
  if (withdrawForm) {
    withdrawForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("withdraw-error");
      const submitBtn = withdrawForm.querySelector('button[type="submit"]');
      const amount = Number(document.getElementById("withdraw-amount").value);
      const method = document.getElementById("withdraw-method").value;
      const accountDetails = document.getElementById("withdraw-account").value.trim();

      submitBtn.disabled = true;
      try {
        await api.submitWithdrawal({ amount, method, accountDetails });
        await refreshProfile();
        showRequestSubmitted(
          `Your withdrawal request of ${formatCurrency(amount)} has been submitted and the amount held from your balance, pending admin review.`
        );
        refreshNotifDot();
      } catch (err) {
        errorEl.textContent = friendlyError(err);
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  const okBtn = document.getElementById("modal-ok-btn");
  if (okBtn) okBtn.addEventListener("click", closeModal);

  const logoutBtn = document.getElementById("confirm-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      closeModal();
      logout();
    });
  }

  document.querySelectorAll(".toggle[data-setting]").forEach((toggleBtn) => {
    toggleBtn.addEventListener("click", () => toggleSetting(toggleBtn.dataset.setting));
  });
}

/* =========================================================
   Notifications (bell icon)
   ========================================================= */

function notifSeenKey() {
  return `investwise_notif_seen_${currentUser ? currentUser.id : "guest"}`;
}

function notifIconFor(type) {
  return { Deposit: "⬇️", Earning: "💰", Withdraw: "⬆️", Commission: "🤝" }[type] || "🔔";
}

function notifMessageFor(tx) {
  if (tx.type === "Deposit") {
    if (tx.status === "Completed") return `Your deposit of ${formatCurrency(tx.amount)} was approved.`;
    if (tx.status === "Rejected") return `Your deposit of ${formatCurrency(tx.amount)} was rejected.`;
    return `Your deposit of ${formatCurrency(tx.amount)} is pending review.`;
  }
  if (tx.type === "Withdraw") {
    if (tx.status === "Completed") return `Your withdrawal of ${formatCurrency(tx.amount)} was approved.`;
    if (tx.status === "Rejected") return `Your withdrawal of ${formatCurrency(tx.amount)} was rejected and refunded.`;
    return `Your withdrawal of ${formatCurrency(tx.amount)} is pending review.`;
  }
  if (tx.type === "Earning") return `You earned ${formatCurrency(tx.amount)} from an active plan.`;
  if (tx.type === "Commission") return `You earned ${formatCurrency(tx.amount)} referral commission.`;
  return `${tx.type}: ${formatCurrency(tx.amount)}`;
}

async function refreshNotifDot() {
  const dot = document.getElementById("notif-dot");
  if (!dot || !currentUser) return;
  try {
    const transactions = await api.getTransactions();
    const lastSeen = Number(localStorage.getItem(notifSeenKey()) || 0);
    const hasUnseen = transactions.some((t) => new Date(t.date).getTime() > lastSeen);
    dot.hidden = !hasUnseen;
  } catch (err) {
    // Silently keep whatever state the dot was already in.
  }
}

async function toggleNotifDropdown() {
  const dropdown = document.getElementById("notif-dropdown");
  if (!dropdown) return;

  notifDropdownOpen = !notifDropdownOpen;
  dropdown.hidden = !notifDropdownOpen;
  if (!notifDropdownOpen) return;

  dropdown.innerHTML = `<div class="notif-empty">Loading…</div>`;
  try {
    const transactions = (await api.getTransactions()).slice(0, 8);
    dropdown.innerHTML = transactions.length
      ? transactions
          .map(
            (tx) => `
        <div class="notif-item">
          <span class="notif-item-icon">${notifIconFor(tx.type)}</span>
          <div class="notif-item-body">
            <p>${notifMessageFor(tx)}</p>
            <span class="notif-item-date">${formatDate(tx.date)}</span>
          </div>
        </div>`
          )
          .join("")
      : `<div class="notif-empty">No notifications yet.</div>`;
  } catch (err) {
    dropdown.innerHTML = `<div class="notif-empty">${friendlyError(err)}</div>`;
  }

  localStorage.setItem(notifSeenKey(), String(Date.now()));
  document.getElementById("notif-dot").hidden = true;
}

function closeNotifDropdown() {
  if (!notifDropdownOpen) return;
  notifDropdownOpen = false;
  const dropdown = document.getElementById("notif-dropdown");
  if (dropdown) dropdown.hidden = true;
}

function initNotifications() {
  const btn = document.getElementById("notif-btn");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotifDropdown();
  });

  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("notif-dropdown");
    if (notifDropdownOpen && dropdown && !dropdown.contains(e.target)) {
      closeNotifDropdown();
    }
  });
}

/* ---------------- Screen change hook (called by navigation.js) ---------------- */

function onScreenShown(screenId) {
  if (!currentUser) return;
  if (screenId === "screen-earning") refreshEarnings();
  else if (screenId === "screen-team") refreshTeam();
  else if (screenId === "screen-profile") refreshProfile();
}

/* ---------------- Init ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  renderPromoBanner();
  initModal();
  initNavigation();
  initCarousel();
  initLiveCounter();
  initRunningTimer();
  initTeamActions();
  initProfileMenu();
  initNotifications();
  initAuthScreen();

  if (getToken()) {
    await bootApp();
  } else {
    showAuthScreen();
  }
});

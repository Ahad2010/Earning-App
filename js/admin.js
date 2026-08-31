/* =========================================================
   admin.js — Admin dashboard: login, stats, and the approval
   workflow for deposits & withdrawals. Self-contained (does
   not share js/api.js's token, since an admin session and a
   user session must never collide in the same browser).
   ========================================================= */

const ADMIN_TOKEN_KEY = "investwise_admin_token";

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminApiRequest(path, { method = "GET", body } = {}) {
  const headers = {};
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, { method, headers, body: payload });
  } catch (err) {
    throw new Error("Can't reach the server. Is it running?");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

const adminApi = {
  login: (payload) => adminApiRequest("/api/admin/login", { method: "POST", body: payload }),
  getStats: () => adminApiRequest("/api/admin/stats"),
  getDeposits: (status) => adminApiRequest(`/api/admin/deposits?status=${status}`),
  approveDeposit: (id) => adminApiRequest(`/api/admin/deposits/${id}/approve`, { method: "POST" }),
  rejectDeposit: (id, note) => adminApiRequest(`/api/admin/deposits/${id}/reject`, { method: "POST", body: { note } }),
  getWithdrawals: (status) => adminApiRequest(`/api/admin/withdrawals?status=${status}`),
  approveWithdrawal: (id) => adminApiRequest(`/api/admin/withdrawals/${id}/approve`, { method: "POST" }),
  rejectWithdrawal: (id, note) =>
    adminApiRequest(`/api/admin/withdrawals/${id}/reject`, { method: "POST", body: { note } }),
  getUsers: () => adminApiRequest("/api/admin/users")
};

function showToast(message, type = "") {
  const toastEl = document.getElementById("toast");
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = "toast show" + (type ? ` ${type}` : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toastEl.className = "toast"), 2600);
}

/* ---------------- Auth ---------------- */

function showAdminLogin() {
  document.getElementById("admin-auth-screen").hidden = false;
  document.getElementById("admin-shell").hidden = true;
}

function showAdminShell() {
  document.getElementById("admin-auth-screen").hidden = true;
  document.getElementById("admin-shell").hidden = false;
}

function initAdminLogin() {
  document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("admin-login-error");
    errorEl.hidden = true;
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;
    try {
      const { token } = await adminApi.login({ email, password });
      setAdminToken(token);
      await bootAdminDashboard();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });

  document.getElementById("admin-logout-btn").addEventListener("click", () => {
    setAdminToken(null);
    showAdminLogin();
  });
}

async function bootAdminDashboard() {
  try {
    await refreshStats();
  } catch (err) {
    setAdminToken(null);
    showAdminLogin();
    return;
  }
  showAdminShell();
  await Promise.all([refreshDeposits(), refreshWithdrawals(), refreshUsers()]);
}

/* ---------------- Tabs ---------------- */

function initAdminTabs() {
  const refreshers = { deposits: refreshDeposits, withdrawals: refreshWithdrawals, users: refreshUsers };

  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".admin-panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${tab.dataset.tab}`));

      const refresh = refreshers[tab.dataset.tab];
      if (refresh) refresh();
      refreshStats();
    });
  });
}

/* ---------------- Stats ---------------- */

async function refreshStats() {
  const stats = await adminApi.getStats();
  document.getElementById("admin-stats-row").innerHTML = `
    <div class="admin-stat-card">
      <div class="admin-stat-value">${stats.totalUsers}</div>
      <div class="admin-stat-label">Users</div>
    </div>
    <div class="admin-stat-card ${stats.pendingDeposits ? "attention" : ""}">
      <div class="admin-stat-value">${stats.pendingDeposits}</div>
      <div class="admin-stat-label">Pending Deposits</div>
    </div>
    <div class="admin-stat-card ${stats.pendingWithdrawals ? "attention" : ""}">
      <div class="admin-stat-value">${stats.pendingWithdrawals}</div>
      <div class="admin-stat-label">Pending Withdrawals</div>
    </div>
    <div class="admin-stat-card">
      <div class="admin-stat-value">${formatCurrency(stats.totalApprovedDeposits)}</div>
      <div class="admin-stat-label">Approved Deposits</div>
    </div>
    <div class="admin-stat-card">
      <div class="admin-stat-value">${formatCurrency(stats.totalApprovedWithdrawals)}</div>
      <div class="admin-stat-label">Approved Withdrawals</div>
    </div>`;
}

/* ---------------- Deposits ---------------- */

async function refreshDeposits() {
  const status = document.getElementById("deposits-filter").value;
  const listEl = document.getElementById("deposits-list");
  listEl.innerHTML = `<div class="admin-empty">Loading…</div>`;

  const deposits = await adminApi.getDeposits(status);
  if (!deposits.length) {
    listEl.innerHTML = `<div class="admin-empty">No ${status === "all" ? "" : status} deposit requests.</div>`;
    return;
  }

  listEl.innerHTML = deposits.map(depositCardHtml).join("");
  bindDepositActions();
}

function depositCardHtml(d) {
  return `
    <div class="admin-card" data-id="${d.id}">
      <img class="admin-card-thumb" src="${d.screenshotUrl}" alt="Payment screenshot" data-lightbox="${d.screenshotUrl}" />
      <div class="admin-card-body">
        <div class="admin-card-top">
          <div>
            <div class="admin-card-title">${d.userName}</div>
            <div class="admin-card-sub">${d.userEmail}</div>
          </div>
          <span class="status-badge admin-status-${d.status}">${d.status}</span>
        </div>
        <div class="admin-card-meta">
          <span>${d.planName ? `Plan: ${d.planName}` : "Wallet top-up"}</span>
          <span>${d.method || ""}</span>
          <span>${formatDate(d.createdAt)}</span>
        </div>
        <div class="admin-card-amount">${formatCurrency(d.amount)}</div>
        ${d.adminNote ? `<div class="admin-card-note">Note: ${d.adminNote}</div>` : ""}
        ${
          d.status === "pending"
            ? `<div class="admin-card-actions">
                <button class="btn btn-small btn-primary admin-approve-deposit" data-id="${d.id}">Approve</button>
                <button class="btn btn-small btn-outline admin-reject-deposit" data-id="${d.id}">Reject</button>
              </div>`
            : ""
        }
      </div>
    </div>`;
}

function bindDepositActions() {
  document.querySelectorAll(".admin-approve-deposit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await adminApi.approveDeposit(btn.dataset.id);
        showToast("Deposit approved", "success");
        await Promise.all([refreshDeposits(), refreshStats(), refreshUsers()]);
      } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll(".admin-reject-deposit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const note = window.prompt("Reason for rejecting this deposit (optional):", "Screenshot could not be verified");
      if (note === null) return;
      btn.disabled = true;
      try {
        await adminApi.rejectDeposit(btn.dataset.id, note);
        showToast("Deposit rejected", "success");
        await Promise.all([refreshDeposits(), refreshStats()]);
      } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
      }
    });
  });

  bindLightbox();
}

/* ---------------- Withdrawals ---------------- */

async function refreshWithdrawals() {
  const status = document.getElementById("withdrawals-filter").value;
  const listEl = document.getElementById("withdrawals-list");
  listEl.innerHTML = `<div class="admin-empty">Loading…</div>`;

  const withdrawals = await adminApi.getWithdrawals(status);
  if (!withdrawals.length) {
    listEl.innerHTML = `<div class="admin-empty">No ${status === "all" ? "" : status} withdrawal requests.</div>`;
    return;
  }

  listEl.innerHTML = withdrawals.map(withdrawalCardHtml).join("");
  bindWithdrawalActions();
}

function withdrawalCardHtml(w) {
  return `
    <div class="admin-card admin-card-no-thumb" data-id="${w.id}">
      <div class="admin-card-body">
        <div class="admin-card-top">
          <div>
            <div class="admin-card-title">${w.userName}</div>
            <div class="admin-card-sub">${w.userEmail}</div>
          </div>
          <span class="status-badge admin-status-${w.status}">${w.status}</span>
        </div>
        <div class="admin-card-meta">
          <span>${w.method}</span>
          <span>${w.accountDetails}</span>
          <span>${formatDate(w.createdAt)}</span>
        </div>
        <div class="admin-card-amount">${formatCurrency(w.amount)}</div>
        ${w.adminNote ? `<div class="admin-card-note">Note: ${w.adminNote}</div>` : ""}
        ${
          w.status === "pending"
            ? `<div class="admin-card-actions">
                <button class="btn btn-small btn-primary admin-approve-withdrawal" data-id="${w.id}">Approve</button>
                <button class="btn btn-small btn-outline admin-reject-withdrawal" data-id="${w.id}">Reject &amp; Refund</button>
              </div>`
            : ""
        }
      </div>
    </div>`;
}

function bindWithdrawalActions() {
  document.querySelectorAll(".admin-approve-withdrawal").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await adminApi.approveWithdrawal(btn.dataset.id);
        showToast("Withdrawal approved", "success");
        await Promise.all([refreshWithdrawals(), refreshStats()]);
      } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll(".admin-reject-withdrawal").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const note = window.prompt("Reason for rejecting this withdrawal (optional):", "Could not verify account details");
      if (note === null) return;
      btn.disabled = true;
      try {
        await adminApi.rejectWithdrawal(btn.dataset.id, note);
        showToast("Withdrawal rejected — funds refunded to user", "success");
        await Promise.all([refreshWithdrawals(), refreshStats(), refreshUsers()]);
      } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
      }
    });
  });
}

/* ---------------- Users ---------------- */

async function refreshUsers() {
  const users = await adminApi.getUsers();
  const tbody = document.getElementById("users-table-body");

  tbody.innerHTML = users
    .map(
      (u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${formatCurrency(u.balance)}</td>
        <td>${formatCurrency(u.totalInvested)}</td>
        <td><code>${u.referralCode}</code></td>
        <td>${formatDate(u.joinDate)}</td>
      </tr>`
    )
    .join("");
}

/* ---------------- Screenshot lightbox ---------------- */

function bindLightbox() {
  document.querySelectorAll("[data-lightbox]").forEach((el) => {
    el.addEventListener("click", () => {
      document.getElementById("admin-lightbox-img").src = el.dataset.lightbox;
      document.getElementById("admin-lightbox").classList.add("open");
    });
  });
}

function initLightboxClose() {
  const lightbox = document.getElementById("admin-lightbox");
  lightbox.addEventListener("click", () => lightbox.classList.remove("open"));
}

/* ---------------- Init ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  initAdminLogin();
  initAdminTabs();
  initLightboxClose();

  document.getElementById("deposits-filter").addEventListener("change", refreshDeposits);
  document.getElementById("withdrawals-filter").addEventListener("change", refreshWithdrawals);

  if (getAdminToken()) {
    await bootAdminDashboard();
  } else {
    showAdminLogin();
  }
});

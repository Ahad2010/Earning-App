/* =========================================================
   api.js — thin fetch wrapper for the InvestWise backend.
   Attaches the JWT (if any) to every request and normalizes
   error handling so callers can just `await` and catch.
   ========================================================= */

const AUTH_TOKEN_KEY = "investwise_token";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** JSON request helper. `body`, when present, is sent as JSON. */
async function apiRequest(path, { method = "GET", body, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  const token = getToken();
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body; // let the browser set the multipart boundary
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, { method, headers: finalHeaders, body: payload });
  } catch (networkErr) {
    throw new ApiError("Can't reach the server. Is it running?", 0);
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status);
  }
  return data;
}

const api = {
  register: (payload) => apiRequest("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) => apiRequest("/api/auth/login", { method: "POST", body: payload }),

  getPlans: () => apiRequest("/api/plans"),
  getMe: () => apiRequest("/api/me"),
  getEarnings: () => apiRequest("/api/earnings"),
  getTeam: () => apiRequest("/api/team"),
  getTransactions: () => apiRequest("/api/transactions"),

  getDeposits: () => apiRequest("/api/deposits"),
  submitDeposit: (formData) => apiRequest("/api/deposits", { method: "POST", body: formData }),

  getWithdrawals: () => apiRequest("/api/withdrawals"),
  submitWithdrawal: (payload) => apiRequest("/api/withdrawals", { method: "POST", body: payload })
};


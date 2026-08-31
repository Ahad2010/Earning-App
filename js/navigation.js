/* =========================================================
   navigation.js — Bottom tab switching (SPA-style, no reload)
   ========================================================= */

const SCREEN_TITLES = {
  "screen-home": "Home",
  "screen-earning": "Earning",
  "screen-team": "Team",
  "screen-profile": "Profile"
};

const LAST_TAB_KEY = "investwise_last_tab";

/**
 * Shows the requested screen and hides the others, updates the
 * bottom nav active state and header title, and re-renders that
 * screen's dynamic content so it always reflects the latest state
 * (e.g. Earning screen after a new "Invest Now").
 */
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("active", el.id === screenId);
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screenId);
  });

  const titleEl = document.getElementById("header-title");
  if (titleEl) titleEl.textContent = SCREEN_TITLES[screenId] || "";

  localStorage.setItem(LAST_TAB_KEY, screenId);

  if (typeof onScreenShown === "function") {
    onScreenShown(screenId);
  }
}

function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });

  const lastTab = localStorage.getItem(LAST_TAB_KEY);
  showScreen(lastTab && SCREEN_TITLES[lastTab] ? lastTab : "screen-home");
}

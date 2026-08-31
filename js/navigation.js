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

  let activeBtn = null;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const isActive = btn.dataset.screen === screenId;
    btn.classList.toggle("active", isActive);
    if (isActive) activeBtn = btn;
  });

  if (activeBtn) moveNavIndicator(activeBtn);

  const titleEl = document.getElementById("header-title");
  if (titleEl) titleEl.textContent = SCREEN_TITLES[screenId] || "";

  const contentEl = document.getElementById("app-content");
  if (contentEl) contentEl.scrollTop = 0;

  localStorage.setItem(LAST_TAB_KEY, screenId);

  if (typeof onScreenShown === "function") {
    onScreenShown(screenId);
  }
}

/** Slides the pill highlight in the bottom nav behind the active tab. */
function moveNavIndicator(activeBtn) {
  const indicator = document.getElementById("nav-indicator");
  const nav = document.getElementById("bottom-nav");
  if (!indicator || !nav) return;

  const navRect = nav.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  const offset = btnRect.left - navRect.left - 8; // account for nav padding
  const width = btnRect.width;

  indicator.style.width = `${width}px`;
  indicator.style.transform = `translateX(${offset}px)`;
}

function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });

  const lastTab = localStorage.getItem(LAST_TAB_KEY);
  showScreen(lastTab && SCREEN_TITLES[lastTab] ? lastTab : "screen-home");

  window.addEventListener("resize", () => {
    const activeBtn = document.querySelector(".nav-btn.active");
    if (activeBtn) moveNavIndicator(activeBtn);
  });
}

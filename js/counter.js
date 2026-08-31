/* =========================================================
   counter.js — Live stats counter widget (Home screen)
   ========================================================= */

/**
 * Animates the big counter from 0 up to `target` using
 * requestAnimationFrame with an ease-out curve, then keeps it
 * ticking upward slowly at random intervals to feel "live".
 */
function initLiveCounter() {
  const el = document.getElementById("counter-value");
  if (!el) return;

  const target = PAYOUTS_COUNTER_TARGET;
  const duration = 1800;
  let start = null;

  function easeOutQuad(t) {
    return t * (2 - t);
  }

  function tick(timestamp) {
    if (start === null) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const value = Math.floor(easeOutQuad(progress) * target);
    el.textContent = formatCurrency(value, false);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = formatCurrency(target, false);
      startLiveDrift(el, target);
    }
  }

  requestAnimationFrame(tick);
}

/** After the initial run-up, keep nudging the counter up slightly
 *  every few seconds so the widget feels continuously "live". */
function startLiveDrift(el, baseValue) {
  let current = baseValue;
  setInterval(() => {
    current += Math.floor(Math.random() * 40) + 5;
    el.textContent = formatCurrency(current, false);
    el.classList.add("pulse");
    setTimeout(() => el.classList.remove("pulse"), 350);
  }, 3500);
}

/**
 * Running Day / Hour / Min / Sec timer calculated from a fixed
 * start date (APP_START_DATE), updated every second.
 */
function initRunningTimer() {
  const dayEl = document.getElementById("stat-day");
  const hourEl = document.getElementById("stat-hour");
  const minEl = document.getElementById("stat-min");
  const secEl = document.getElementById("stat-sec");
  if (!dayEl || !hourEl || !minEl || !secEl) return;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function update() {
    const diffMs = Math.max(Date.now() - APP_START_DATE.getTime(), 0);
    const totalSeconds = Math.floor(diffMs / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    dayEl.textContent = days;
    hourEl.textContent = pad(hours);
    minEl.textContent = pad(minutes);
    secEl.textContent = pad(seconds);
  }

  update();
  setInterval(update, 1000);
}

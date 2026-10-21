// HTML overlay layer: status chips, hand pointer, toast, video window and portfolio window.
const $ = (id) => document.getElementById(id);
const RING = 113.1; // circumference of the pointer's progress circle (r = 18)
const MIN_VIDEO_W = 360;

export function setChip(id, on, label) {
  const chip = $(id);
  chip.classList.toggle("on", on);
  chip.lastChild.textContent = label;
}

export function setStats(text) {
  $("chipStats").textContent = text;
}

export function setHint(html) {
  $("hint").innerHTML = html;
}

export function toggleStats() {
  $("chipStats").classList.toggle("hidden");
}

export function showPointer(x, y, { hover = false, pinch = false, progress = 0 } = {}) {
  const p = $("pointer");
  p.style.display = "block";
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
  p.classList.toggle("hover", hover);
  p.classList.toggle("pinch", pinch);
  $("pointerFill").style.strokeDashoffset = String(RING * (1 - progress));
}

export function hidePointer() {
  $("pointer").style.display = "none";
}

export function toast(html, ms = 3500) {
  const t = $("toast");
  t.innerHTML = html;
  t.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add("hidden"), ms);
}

// The element under a screen point that the hand may press (marked with data-hand).
export function htmlTargetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const hit = el && el.closest("[data-hand]");
  return hit && hit.offsetParent !== null ? hit : null;
}

let htmlHovered = null;
export function setHtmlHover(el) {
  if (htmlHovered === el) return;
  htmlHovered?.classList.remove("hand-hover");
  htmlHovered = el;
  el?.classList.add("hand-hover");
}

export function isVideoOpen() {
  return !$("videoBox").classList.contains("hidden");
}

export function openVideo({ id, title }) {
  $("videoTitle").textContent = title;
  $("videoFrame").innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1"
    title="${title}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  $("videoBox").classList.remove("hidden");
}

export function closeVideo() {
  $("videoFrame").innerHTML = "";
  $("videoBox").classList.add("hidden");
}

// rect: screen-space box of the card, or null to hide while the card is not tracked.
export function placeVideo(rect) {
  const box = $("videoBox");
  if (!rect) { box.style.visibility = "hidden"; return; }
  let { left, top, width, height } = rect;
  if (width < MIN_VIDEO_W) {
    const k = MIN_VIDEO_W / width;
    left -= (width * k - width) / 2; top -= (height * k - height) / 2;
    width *= k; height *= k;
  }
  Object.assign(box.style, { visibility: "visible", left: `${left}px`, top: `${top - 34}px`,
    width: `${width}px`, height: `${height + 34}px` });
}

export function isWebOpen() {
  return !$("webModal").classList.contains("hidden");
}

export function openWeb(url) {
  $("webUrl").textContent = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  $("webOpen").href = url;
  if ($("webFrame").src !== url) $("webFrame").src = url;
  $("webModal").classList.remove("hidden");
}

export function closeWeb() {
  $("webModal").classList.add("hidden");
}

export function onUi(handlers) {
  $("videoClose").addEventListener("click", handlers.closeVideo);
  $("webClose").addEventListener("click", closeWeb);
  $("webModal").addEventListener("click", (e) => { if (e.target.id === "webModal") closeWeb(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeWeb(); handlers.closeVideo(); } });
}

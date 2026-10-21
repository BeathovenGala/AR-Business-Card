import { createHandLandmarker, HandPointer } from "./hand-tracker.js?v=5";
import { dwellStep, pinchTarget, canActivate, mirrorX, zoomFromSpread, clampZoom } from "./gesture.js?v=5";
import * as ui from "./ui.js?v=5";
import { buildButtons, setButtonState, flash, buildContactPanel, buildSkillsPanel, showPanel, hidePanel,
  isPanelVisible, setCloseHover, tweenScale } from "./scene3d.js?v=5";

const cfg = window.CARD_CONFIG;
const CARD_W = 1, CARD_H = 600 / 1050;
const REENTRY_MS = 1500;
const ZOOM_EASE = 0.3;
// Phones use the back camera (no mirror) and the touch screen for tapping and zooming.
const IS_TOUCH = matchMedia("(pointer: coarse)").matches;
const HINTS = {
  normal: IS_TOUCH
    ? "<b>Tap</b> a button &middot; <b>pinch the screen</b> with two fingers to zoom"
    : "Point at a button &middot; <b>pinch</b> or <b>hold still</b> to press &middot; scroll to zoom",
  panel: "<b>Tap anywhere on the panel</b> to close it",
  zoom: "<b>Spread</b> fingers = bigger &middot; <b>pinch</b> = smaller &middot; hold on <b>DONE</b> to finish",
};

const $ = (id) => document.getElementById(id);
const scene = $("scene");
const target = $("target");
const content = $("content");
const zoomable = $("zoomable");

// Exposed so the test harness can read timing data and drive the UI.
const stats = { startedAt: 0, firstFoundMs: null, found: false, fps: 0, fpsLog: [], handMs: [], pinches: 0, actions: [] };
window.arStats = stats;

const state = {
  mirrored: cfg.mirror && !IS_TOUCH, open: null, hover: null, lastHover: null, dwell: null,
  lastActivation: null, lastLost: -Infinity, handActive: false,
  zoom: 1, zoomTarget: 1, zoomMode: false, zoomAnchor: null,
};
let buttons, contactPanel, skills;

// Zoom scales the card content only; the buttons stay put so they are always reachable.
function applyScale() {
  zoomable.object3D.scale.setScalar(state.zoom);
}

function applyMirror() {
  document.body.classList.toggle("mirrored", state.mirrored);
  const s = content.object3D.scale;
  s.x = Math.abs(s.x) * (state.mirrored ? -1 : 1);
}

// Landscape: buttons right of the card. Portrait (phones): the same column, smaller, under the card.
function layoutButtons() {
  const portrait = innerHeight > innerWidth;
  const box = $("buttons").object3D;
  box.position.set(portrait ? 0 : 0.7, portrait ? -0.62 : 0, 0.3);
  box.scale.setScalar(portrait ? 0.85 : 1);
}

function phoneStartScreen() {
  const steps = document.querySelectorAll(".steps li span");
  ["Point the back camera at the printed card.", "Tap a button on the screen to open it.",
   "Pinch the screen with two fingers to zoom.", "Tap an open panel to close it."]
    .forEach((t, i) => { if (steps[i]) steps[i].textContent = t; });
  document.querySelector(".start-copy .small").textContent = "Allow the camera when asked. Internet is needed.";
}

function updateHint() {
  ui.setHint(state.zoomMode ? HINTS.zoom : state.open ? HINTS.panel : HINTS.normal);
}

function setZoomMode(on) {
  state.zoomMode = on;
  state.zoomAnchor = null;
  updateHint();
}

// ---------- 3D hit testing (screen point -> button) ----------
const raycaster = new THREE.Raycaster();
function hitButton(x, y) {
  if (!stats.found) return null;
  const cx = mirrorX(x, innerWidth, state.mirrored);
  raycaster.setFromCamera(new THREE.Vector2((cx / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), scene.camera);
  const targets = Object.values(buttons).map((b) => b.hit);
  for (const base of [contactPanel, skills]) if (isPanelVisible(base)) targets.push(base.hit);
  const hits = raycaster.intersectObjects(targets.map((t) => t.object3D), true);
  return hits.length ? hits[0].object.el.dataset.action : null;
}

function buttonScreenPos(action) {
  const v = new THREE.Vector3();
  buttons[action].hit.object3D.getWorldPosition(v);
  v.project(scene.camera);
  return { x: mirrorX(((v.x + 1) / 2) * innerWidth, innerWidth, state.mirrored), y: ((1 - v.y) / 2) * innerHeight };
}
window.arDebug = {
  buttonScreenPos,
  state: () => ({ open: state.open, video: ui.isVideoOpen(), web: ui.isWebOpen(), zoomMode: state.zoomMode,
    zoom: +state.zoomTarget.toFixed(2) }),
  // Lets the automated test drive the finger-spread zoom without a real hand.
  spread: (ratio) => onSpread(ratio),
};

function cardScreenRect() {
  const obj = target.object3D;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const v = obj.localToWorld(new THREE.Vector3((sx * CARD_W * state.zoom) / 2, (sy * CARD_H * state.zoom) / 2, 0)).project(scene.camera);
    const x = mirrorX(((v.x + 1) / 2) * innerWidth, innerWidth, state.mirrored), y = ((1 - v.y) / 2) * innerHeight;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}

// ---------- actions ----------
function refreshButtons(progress = 0) {
  for (const [action, b] of Object.entries(buttons)) {
    const active = action === "video" ? ui.isVideoOpen() : action === "zoom" ? state.zoomMode : state.open === action;
    setButtonState(b, { hover: state.hover === action, active, progress: state.hover === action ? progress : 0 });
  }
  setCloseHover(contactPanel, state.hover === "close" && state.open === "contact");
  setCloseHover(skills, state.hover === "close" && state.open === "skills");
}

function closePanels() {
  hidePanel(contactPanel);
  hidePanel(skills);
  state.open = null;
  updateHint();
}

function closeVideo() {
  ui.closeVideo();
  refreshButtons();
}

function togglePanel(name) {
  const wasOpen = state.open === name;
  closePanels();
  if (wasOpen) return;
  ui.closeVideo();
  state.open = name;
  showPanel(name === "contact" ? contactPanel : skills);
  updateHint();
}

function activate(action) {
  stats.actions.push({ action, t: Math.round(performance.now() - stats.startedAt) });
  if (buttons[action]) flash(buttons[action]);
  if (action === "close") {
    closePanels();
  } else if (action === "zoom") {
    setZoomMode(!state.zoomMode);
  } else if (action === "video") {
    if (ui.isVideoOpen()) ui.closeVideo();
    else { closePanels(); setZoomMode(false); ui.openVideo(cfg.video); }
  } else if (action === "portfolio") {
    ui.openWeb(cfg.website);
  } else {
    setZoomMode(false);
    togglePanel(action);
  }
  refreshButtons();
}

// While in zoom mode, the thumb-index spread resizes the content relative to where it started.
function onSpread(ratio) {
  if (!state.zoomMode || ratio === null) return;
  if (state.hover === "zoom") { state.zoomAnchor = null; return; }
  if (!state.zoomAnchor) state.zoomAnchor = { scale: state.zoomTarget, ratio };
  state.zoomTarget = zoomFromSpread(state.zoomAnchor.scale, state.zoomAnchor.ratio, ratio);
}

// One entry point for mouse clicks, pinches and dwell: a 3D action name or a [data-hand] element.
function press(tgt, now = performance.now()) {
  if (!tgt || !canActivate(state.lastActivation, now)) return;
  state.lastActivation = now;
  if (typeof tgt === "string") activate(tgt);
  else tgt.click();
}

function resolveTarget(x, y) {
  const html = ui.htmlTargetAt(x, y);
  if (html || ui.isWebOpen()) return html;
  return hitButton(x, y);
}

function updatePointer(x, y, { fromHand, pinching = false }) {
  const now = performance.now();
  const tgt = resolveTarget(x, y);
  ui.setHtmlHover(tgt && typeof tgt !== "string" ? tgt : null);
  state.hover = typeof tgt === "string" ? tgt : null;
  if (tgt) state.lastHover = { id: tgt, t: now };

  let progress = 0;
  // In zoom mode only DONE reacts to hold-still, so resizing never presses anything else.
  const dwellTarget = state.zoomMode && tgt !== "zoom" ? null : tgt;
  if (fromHand && !pinching) {
    const d = dwellStep(state.dwell, dwellTarget, now);
    state.dwell = d.state;
    progress = d.progress;
    if (d.fire) press(tgt, now);
  }
  refreshButtons(progress);
  document.body.style.cursor = !fromHand && tgt ? "pointer" : "";
  if (fromHand) ui.showPointer(x, y, { hover: !!tgt, pinch: pinching, progress });
  return tgt;
}

// ---------- loops ----------
function startFrameLoop() {
  let frames = 0, last = performance.now();
  const tick = (now) => {
    frames++;
    if (now - last >= 1000) {
      stats.fps = Math.round((frames * 1000) / (now - last));
      stats.fpsLog.push(stats.fps);
      ui.setStats(`${stats.fps} FPS`);
      frames = 0; last = now;
    }
    if (Math.abs(state.zoomTarget - state.zoom) > 0.001) {
      state.zoom += (state.zoomTarget - state.zoom) * ZOOM_EASE;
      applyScale();
    }
    if (ui.isVideoOpen()) ui.placeVideo(stats.found ? cardScreenRect() : null);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function startHands(video) {
  try {
    const landmarker = await createHandLandmarker();
    ui.setChip("chipHand", false, "Show your hand");
    new HandPointer(landmarker, video, $("handCanvas"), {
      isMirrored: () => state.mirrored,
      onMove: ({ x, y }, pinching, ratio) => {
        state.handActive = true;
        updatePointer(x, y, { fromHand: true, pinching: pinching && !state.zoomMode });
        onSpread(ratio);
      },
      onPinchStart: ({ x, y }) => {
        stats.pinches++;
        const now = performance.now();
        const tgt = pinchTarget(resolveTarget(x, y), state.lastHover, now);
        if (state.zoomMode && tgt !== "zoom") return; // closing the fingers means "zoom out" here
        press(tgt, now);
      },
      onLost: () => {
        state.handActive = false;
        state.hover = null;
        state.dwell = null;
        state.zoomAnchor = null;
        ui.hidePointer();
        ui.setHtmlHover(null);
        refreshButtons();
      },
      onFrame: ({ ms, detected }) => {
        if (stats.handMs.length < 2000) stats.handMs.push(+ms.toFixed(2));
        ui.setChip("chipHand", detected, detected ? "Hand tracked" : "Show your hand");
      },
    }).start();
  } catch (err) {
    ui.setChip("chipHand", false, "Hand tracking off");
    ui.toast("Hand tracking could not load. The mouse still works.");
    console.error(err);
  }
}

function wireMouse() {
  window.addEventListener("mousemove", (e) => {
    if (!state.handActive && stats.startedAt) updatePointer(e.clientX, e.clientY, { fromHand: false });
  });
  window.addEventListener("click", (e) => {
    if (!stats.startedAt || e.target.closest("[data-hand], #webModal")) return;
    press(hitButton(e.clientX, e.clientY));
  });
  window.addEventListener("wheel", (e) => {
    if (!stats.startedAt || ui.isWebOpen()) return;
    state.zoomTarget = clampZoom(state.zoomTarget * Math.exp(-e.deltaY * 0.0015));
  }, { passive: true });
}

// Two-finger pinch on the screen resizes the content, like zooming a photo.
function wireTouch() {
  let start = null;
  const gap = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  window.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2 && stats.startedAt) start = { gap: gap(e.touches), zoom: state.zoomTarget };
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (start && e.touches.length === 2) state.zoomTarget = clampZoom(start.zoom * gap(e.touches) / start.gap);
  }, { passive: true });
  window.addEventListener("touchend", (e) => { if (e.touches.length < 2) start = null; }, { passive: true });
}

function wireTarget() {
  target.addEventListener("targetFound", () => {
    const now = performance.now();
    stats.found = true;
    if (stats.firstFoundMs === null) stats.firstFoundMs = Math.round(now - stats.startedAt);
    if (now - state.lastLost > REENTRY_MS) tweenScale(content.object3D, 0.6, 1, 420);
    ui.setChip("chipCard", true, "Card tracked");
  });
  target.addEventListener("targetLost", () => {
    stats.found = false;
    state.lastLost = performance.now();
    state.hover = null;
    ui.setChip("chipCard", false, "Looking for card");
    refreshButtons();
  });
}

async function start() {
  $("start").classList.add("hidden");
  stats.startedAt = performance.now();
  ui.setChip("chipCard", false, "Looking for card");
  ui.setChip("chipHand", false, "Loading hand model");
  const ar = scene.systems["mindar-image-system"];
  await ar.start();
  applyMirror();
  updateHint();
  startFrameLoop();
  startHands(ar.video);
}

function init() {
  $("nameText").setAttribute("value", cfg.name.toUpperCase());
  $("roleText").setAttribute("value", `${cfg.role}  -  ADIT`);
  buttons = buildButtons($("buttons"));
  contactPanel = buildContactPanel($("panels"), cfg);
  skills = buildSkillsPanel($("panels"), cfg);
  applyMirror();
  if (IS_TOUCH) phoneStartScreen();
  layoutButtons();
  window.addEventListener("resize", layoutButtons);
  wireTarget();
  wireMouse();
  wireTouch();
  ui.onUi({ closeVideo });
  $("startBtn").addEventListener("click", start);
  window.addEventListener("keydown", (e) => {
    if (e.key === "h") ui.toggleStats();
    if (e.key === "m") { state.mirrored = !state.mirrored; applyMirror(); }
    if (e.key === "z") setZoomMode(!state.zoomMode);
    if (e.key === "+" || e.key === "=") state.zoomTarget = clampZoom(state.zoomTarget * 1.15);
    if (e.key === "-") state.zoomTarget = clampZoom(state.zoomTarget / 1.15);
    if (e.key === "0") state.zoomTarget = 1;
    refreshButtons();
  });
  if (new URLSearchParams(location.search).has("autostart")) start();
}

if (scene.hasLoaded) init();
else scene.addEventListener("loaded", init);

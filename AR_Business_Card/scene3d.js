// Builds the 3D buttons and panels anchored to the card, plus small tween helpers.
const BTN = { w: 0.37, h: 0.105, gap: 0.13, depth: 0.03 };
const HOVER_LIFT = 0.05;
const PANEL = { w: 0.98, h: 0.56, depth: 0.03 };
const PZ = PANEL.depth + 0.01; // z of anything drawn on a panel's front face

export const ACTIONS = {
  video: { label: "INTRO VIDEO", active: "STOP VIDEO", color: "#ff8a3d", hover: "#ffa463", icon: "play" },
  portfolio: { label: "PORTFOLIO", active: "PORTFOLIO", color: "#1a9bc0", hover: "#2fb9de", icon: "globe" },
  skills: { label: "SKILLS", active: "CLOSE", color: "#3b4fa8", hover: "#5468c6", icon: "bars" },
  contact: { label: "CONTACT", active: "CLOSE", color: "#ffd23f", hover: "#ffe07a", icon: "at", text: "#0f1b3d" },
  zoom: { label: "ZOOM", active: "DONE", color: "#22a06b", hover: "#34c584", icon: "zoom" },
};

function el(tag, attrs = {}, parent) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

// Scales an object3D from `from` to `to` (uniform, sign of x preserved for the mirrored group).
export function tweenScale(obj, from, to, ms = 320, delay = 0) {
  const signX = Math.sign(obj.scale.x) || 1;
  const t0 = performance.now() + delay;
  obj.scale.set(signX * from, from, from);
  const step = (now) => {
    const k = Math.min(1, Math.max(0, (now - t0) / ms));
    const s = from + (to - from) * easeOutBack(k);
    obj.scale.set(signX * s, s, s);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function shadow(parent, w, h, r) {
  el("a-entity", { "rounded-panel": `width: ${w}; height: ${h}; radius: ${r}; color: #000000; opacity: 0.32`,
    position: "0.018 -0.024 -0.012" }, parent);
}

export function buildButtons(container) {
  const buttons = {};
  Object.entries(ACTIONS).forEach(([action, def], i) => {
    const y = BTN.gap * (2 - i);
    const root = el("a-entity", { position: `0 ${y} 0` }, container);
    shadow(root, BTN.w, BTN.h, BTN.h / 2);
    const body = el("a-entity", {}, root);
    const pill = el("a-entity", { "rounded-panel": `width: ${BTN.w}; height: ${BTN.h}; radius: ${BTN.h / 2}; depth: ${BTN.depth}; color: ${def.color}; shaded: true` }, body);
    const front = BTN.depth + 0.008;
    el("a-entity", { "rounded-panel": "width: 0.07; height: 0.07; radius: 0.035; color: #ffffff; opacity: 0.25", position: `-0.125 0 ${front}` }, body);
    el("a-entity", { "btn-icon": `type: ${def.icon}; color: ${def.text || "#ffffff"}`, position: `-0.125 0 ${front + 0.002}` }, body);
    const label = el("a-text", { value: def.label, font: "exo2bold", anchor: "left", color: def.text || "#ffffff",
      width: 0.6, position: `-0.072 0.002 ${front}` }, body);
    const bar = el("a-entity", { "rounded-panel": `width: 0.28; height: 0.009; radius: 0.0045; color: ${def.text || "#ffffff"}; opacity: 0.9`,
      position: `-0.14 -0.036 ${front}`, scale: "0.001 1 1" }, body);
    const hit = el("a-plane", { width: BTN.w + 0.05, height: BTN.gap - 0.004, material: "visible: false; side: double",
      position: "0 0 0.06" }, root);
    hit.dataset.action = action;
    buttons[action] = { root, body, pill, label, bar, hit, def };
  });
  return buttons;
}

export function setButtonState(btn, { hover = false, active = false, progress = 0 }) {
  const mesh = btn.pill.getObject3D("mesh");
  if (mesh) mesh.material.color.set(hover || active ? btn.def.hover : btn.def.color);
  btn.body.object3D.position.z = hover ? HOVER_LIFT : 0;
  const s = hover ? 1.08 : 1;
  btn.body.object3D.scale.set(s, s, 1);
  btn.label.setAttribute("value", active ? btn.def.active : btn.def.label);
  const p = Math.max(0.001, progress);
  btn.bar.object3D.scale.x = p;
  btn.bar.object3D.position.x = -0.14 + 0.14 * p;
  btn.bar.object3D.visible = progress > 0;
}

export function flash(btn) {
  tweenScale(btn.body.object3D, 0.86, 1, 260);
}

function text(parent, value, { x = 0, y = 0, z = PZ + 0.004, width = 0.8, color = "#0f1b3d", anchor = "left", font = "exo2bold" } = {}) {
  return el("a-text", { value, font, anchor, align: anchor === "center" ? "center" : "left", color, width,
    position: `${x} ${y} ${z}` }, parent);
}

// Thick rounded slab with a shadow, a close (x) badge and an invisible hit plane: tapping anywhere closes it.
function panelBase(container, color, dark) {
  const p = el("a-entity", { visible: false }, container);
  shadow(p, PANEL.w, PANEL.h, 0.05);
  el("a-entity", { "rounded-panel": `width: ${PANEL.w}; height: ${PANEL.h}; radius: 0.05; depth: ${PANEL.depth}; color: ${color}; shaded: true` }, p);
  const close = el("a-entity", { position: `${PANEL.w / 2 - 0.06} ${PANEL.h / 2 - 0.06} ${PZ + 0.004}` }, p);
  el("a-entity", { "rounded-panel": `width: 0.07; height: 0.07; radius: 0.035; color: ${dark ? "#ffffff" : "#0f1b3d"}; opacity: 0.9` }, close);
  el("a-entity", { "btn-icon": `type: close; color: ${dark ? "#0f1b3d" : "#ffffff"}`, position: "0 0 0.003" }, close);
  const hit = el("a-plane", { width: PANEL.w, height: PANEL.h, material: "visible: false; side: double",
    position: `0 0 ${PZ + 0.02}` }, p);
  hit.dataset.action = "close";
  return { panel: p, hit, close };
}

export function buildContactPanel(container, cfg) {
  const base = panelBase(container, "#ffffff", false);
  const p = base.panel;
  el("a-entity", { "rounded-panel": "width: 0.98; height: 0.13; radius: 0.05; color: #ffd23f", position: `0 0.215 ${PZ}` }, p);
  el("a-entity", { "rounded-panel": "width: 0.98; height: 0.05; radius: 0.001; color: #ffd23f", position: `0 0.175 ${PZ}` }, p);
  text(p, "GET IN TOUCH", { x: -0.43, y: 0.21, width: 1.0 });
  const rows = [
    ["#1a9bc0", "WEBSITE", cfg.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")],
    ["#ff3b30", "YOUTUBE", cfg.youtube],
    cfg.email && ["#ff8a3d", "EMAIL", cfg.email],
    cfg.phone && ["#22a06b", "PHONE", cfg.phone],
  ].filter(Boolean);
  rows.forEach(([color, key, value], i) => {
    const y = 0.08 - i * 0.085;
    el("a-entity", { "rounded-panel": `width: 0.026; height: 0.026; radius: 0.013; color: ${color}`, position: `-0.41 ${y} ${PZ + 0.002}` }, p);
    text(p, key, { x: -0.37, y, width: 0.5, color: "#6b7280" });
    text(p, value, { x: -0.16, y, width: 0.78 });
  });
  text(p, "Tap anywhere on this panel to close", { x: 0, y: -0.235, width: 0.6, color: "#9aa3b2", anchor: "center" });
  return base;
}

export function buildSkillsPanel(container, cfg) {
  const base = panelBase(container, "#0f1b3d", true);
  const p = base.panel;
  text(p, "SKILLS & TOOLS", { x: -0.43, y: 0.2, width: 1.0, color: "#ffffff" });
  const colors = ["#22c3e6", "#ff8a3d", "#ffd23f", "#8b9cf7", "#34d399", "#f472b6"];
  base.chips = cfg.skills.slice(0, 6).map((skill, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const chip = el("a-entity", { position: `${-0.3 + col * 0.3} ${0.04 - row * 0.15} ${PZ}` }, p);
    el("a-entity", { "rounded-panel": `width: 0.27; height: 0.1; radius: 0.05; depth: 0.02; color: ${colors[i]}; shaded: true` }, chip);
    text(chip, skill, { width: 0.62, anchor: "center", z: 0.036, color: "#0f1b3d" });
    return chip;
  });
  text(p, "Tap anywhere on this panel to close", { x: 0, y: -0.235, width: 0.6, color: "#9fb0d6", anchor: "center" });
  return base;
}

export function showPanel(base) {
  base.panel.setAttribute("visible", true);
  tweenScale(base.panel.object3D, 0.7, 1, 300);
  (base.chips || []).forEach((c, i) => tweenScale(c.object3D, 0.01, 1, 280, 80 + i * 60));
}

export function hidePanel(base) {
  base.panel.setAttribute("visible", false);
}

export function isPanelVisible(base) {
  return base.panel.object3D.visible;
}

export function setCloseHover(base, hover) {
  const s = hover ? 1.35 : 1;
  base.close.object3D.scale.set(s, s, 1);
}

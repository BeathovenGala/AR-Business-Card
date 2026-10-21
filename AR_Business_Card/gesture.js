// Pure gesture maths, kept free of browser/CDN imports so it can be unit-tested with Node.

// Pinch ratio = thumb-tip to index-tip distance / palm length (wrist to middle knuckle).
// Two thresholds (hysteresis) stop the pinch flickering on and off near the boundary.
export const PINCH_ON = 0.35;
export const PINCH_OFF = 0.5;
export const SMOOTHING = 0.5;
export const DWELL_MS = 800;
// Closing the fingers drags the index tip off the button, so a pinch counts for the
// button that was under the pointer this recently.
export const PINCH_GRACE_MS = 400;
export const COOLDOWN_MS = 700;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
// Small changes in finger spread are hand jitter, not a zoom.
export const ZOOM_DEADZONE = 0.08;

export const THUMB_TIP = 4, INDEX_TIP = 8, WRIST = 0, MIDDLE_MCP = 9;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function pinchRatio(lm) {
  return dist(lm[THUMB_TIP], lm[INDEX_TIP]) / Math.max(dist(lm[WRIST], lm[MIDDLE_MCP]), 1e-6);
}

export function nextPinchState(wasPinching, ratio) {
  return wasPinching ? ratio < PINCH_OFF : ratio < PINCH_ON;
}

export function smooth(prev, next, alpha = SMOOTHING) {
  if (!prev) return next;
  return { x: prev.x + (next.x - prev.x) * alpha, y: prev.y + (next.y - prev.y) * alpha };
}

export function mirrorX(x, width, mirrored) {
  return mirrored ? width - x : x;
}

// Hold-to-press: progress runs 0..1 while the pointer stays on one target, fires once,
// and re-arms only after the pointer leaves that target.
export function dwellStep(state, targetId, now) {
  if (!targetId) return { state: { id: null, start: now, fired: false }, progress: 0, fire: false };
  const s = state && state.id === targetId ? state : { id: targetId, start: now, fired: false };
  const progress = Math.min(1, (now - s.start) / DWELL_MS);
  const fire = progress >= 1 && !s.fired;
  return { state: { ...s, fired: s.fired || fire }, progress: s.fired ? 0 : progress, fire };
}

export function pinchTarget(hitNow, lastHover, now) {
  if (hitNow) return hitNow;
  return lastHover && now - lastHover.t <= PINCH_GRACE_MS ? lastHover.id : null;
}

// Phone-style zoom: the scale grows with the thumb-index spread relative to the spread when zoom started.
export function zoomFromSpread(startScale, startRatio, ratio) {
  const k = ratio / Math.max(startRatio, 1e-6);
  if (Math.abs(k - 1) < ZOOM_DEADZONE) return startScale;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, startScale * k));
}

export function clampZoom(s) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s));
}

export function canActivate(lastActivation, now) {
  return lastActivation === null || now - lastActivation >= COOLDOWN_MS;
}

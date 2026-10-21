import { test } from "node:test";
import assert from "node:assert/strict";
import { pinchRatio, nextPinchState, smooth, mirrorX, dwellStep, pinchTarget, canActivate, zoomFromSpread, clampZoom,
  ZOOM_MIN, ZOOM_MAX,
  PINCH_ON, PINCH_OFF, DWELL_MS, PINCH_GRACE_MS, COOLDOWN_MS } from "../gesture.js";

// Builds a 21-point hand with palm length 0.2 and the thumb/index tips `gap` apart.
function hand(gap) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  lm[0] = { x: 0.5, y: 0.8 };
  lm[9] = { x: 0.5, y: 0.6 };
  lm[4] = { x: 0.5, y: 0.4 };
  lm[8] = { x: 0.5 + gap, y: 0.4 };
  return lm;
}

test("pinch ratio is tip gap divided by palm length", () => {
  assert.ok(Math.abs(pinchRatio(hand(0.05)) - 0.25) < 1e-9);
  assert.ok(Math.abs(pinchRatio(hand(0.2)) - 1.0) < 1e-9);
});

test("ratio does not change with hand distance from camera", () => {
  const near = hand(0.06).map((p) => ({ x: p.x * 2, y: p.y * 2 }));
  assert.ok(Math.abs(pinchRatio(near) - pinchRatio(hand(0.06))) < 1e-9);
});

test("pinch starts only below PINCH_ON", () => {
  assert.equal(nextPinchState(false, PINCH_ON + 0.01), false);
  assert.equal(nextPinchState(false, PINCH_ON - 0.01), true);
});

test("hysteresis keeps pinch held between the two thresholds", () => {
  const mid = (PINCH_ON + PINCH_OFF) / 2;
  assert.equal(nextPinchState(true, mid), true);
  assert.equal(nextPinchState(false, mid), false);
  assert.equal(nextPinchState(true, PINCH_OFF + 0.01), false);
});

test("noisy ratio around one threshold gives a single pinch event", () => {
  const ratios = [0.6, 0.4, 0.34, 0.37, 0.33, 0.36, 0.45, 0.48, 0.52, 0.6];
  let state = false, starts = 0;
  for (const r of ratios) {
    const next = nextPinchState(state, r);
    if (next && !state) starts++;
    state = next;
  }
  assert.equal(starts, 1);
});

test("smoothing moves halfway and passes through the first sample", () => {
  assert.deepEqual(smooth(null, { x: 10, y: 10 }), { x: 10, y: 10 });
  assert.deepEqual(smooth({ x: 0, y: 0 }, { x: 10, y: 20 }), { x: 5, y: 10 });
});

test("mirroring flips x across the screen width", () => {
  assert.equal(mirrorX(100, 1280, true), 1180);
  assert.equal(mirrorX(100, 1280, false), 100);
});

test("dwell fires once after holding still on a target", () => {
  let d = dwellStep(null, "contact", 0);
  assert.equal(d.fire, false);
  d = dwellStep(d.state, "contact", DWELL_MS / 2);
  assert.ok(Math.abs(d.progress - 0.5) < 1e-9);
  d = dwellStep(d.state, "contact", DWELL_MS);
  assert.equal(d.fire, true);
  d = dwellStep(d.state, "contact", DWELL_MS * 3);
  assert.equal(d.fire, false);
});

test("dwell restarts when the pointer moves to another target", () => {
  let d = dwellStep(null, "video", 0);
  d = dwellStep(d.state, "video", DWELL_MS * 0.9);
  d = dwellStep(d.state, "skills", DWELL_MS);
  assert.equal(d.progress, 0);
  assert.equal(d.fire, false);
});

test("leaving and returning re-arms the dwell", () => {
  let d = dwellStep(null, "contact", 0);
  d = dwellStep(d.state, "contact", DWELL_MS);
  d = dwellStep(d.state, null, DWELL_MS + 10);
  d = dwellStep(d.state, "contact", DWELL_MS + 20);
  d = dwellStep(d.state, "contact", DWELL_MS * 2 + 20);
  assert.equal(d.fire, true);
});

test("pinch uses the recently hovered button when the finger slips off", () => {
  assert.equal(pinchTarget(null, { id: "contact", t: 1000 }, 1000 + PINCH_GRACE_MS - 1), "contact");
  assert.equal(pinchTarget(null, { id: "contact", t: 1000 }, 1000 + PINCH_GRACE_MS + 1), null);
  assert.equal(pinchTarget("video", { id: "contact", t: 1000 }, 1001), "video");
});

test("cooldown blocks a double press", () => {
  assert.equal(canActivate(null, 0), true);
  assert.equal(canActivate(1000, 1000 + COOLDOWN_MS - 1), false);
  assert.equal(canActivate(1000, 1000 + COOLDOWN_MS), true);
});

test("spreading fingers zooms in, pinching zooms out", () => {
  assert.ok(Math.abs(zoomFromSpread(1, 0.5, 1.0) - 2) < 1e-9);
  assert.ok(Math.abs(zoomFromSpread(1, 0.8, 0.4) - 0.5) < 1e-9);
});

test("tiny finger jitter does not change the zoom", () => {
  assert.equal(zoomFromSpread(1.3, 0.6, 0.62), 1.3);
});

test("zoom stays within limits", () => {
  assert.equal(zoomFromSpread(2, 0.3, 1.5), ZOOM_MAX);
  assert.equal(zoomFromSpread(0.6, 1.0, 0.2), ZOOM_MIN);
  assert.equal(clampZoom(10), ZOOM_MAX);
});

import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { INDEX_TIP, pinchRatio, nextPinchState, smooth, mirrorX } from "./gesture.js?v=6";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numHands: 1,
  });
  try {
    return await HandLandmarker.createFromOptions(vision, options("GPU"));
  } catch {
    return await HandLandmarker.createFromOptions(vision, options("CPU"));
  }
}

// Tracks one hand and reports a smoothed screen-space pointer plus pinch start/end edges.
export class HandPointer {
  constructor(landmarker, video, canvas, { isMirrored, onMove, onPinchStart, onLost, onFrame }) {
    this.landmarker = landmarker;
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.isMirrored = isMirrored;
    this.cb = { onMove, onPinchStart, onLost, onFrame };
    this.pinching = false;
    this.pos = null;
    this.lastVideoTime = -1;
  }

  start() {
    const loop = () => { this.step(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  toScreen(p) {
    const r = this.video.getBoundingClientRect();
    return { x: mirrorX(r.left + p.x * r.width, innerWidth, this.isMirrored()), y: r.top + p.y * r.height };
  }

  step() {
    const v = this.video;
    if (v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;

    const t0 = performance.now();
    const result = this.landmarker.detectForVideo(v, t0);
    const ms = performance.now() - t0;
    const lm = result.landmarks?.[0];
    this.draw(lm);

    if (!lm) {
      if (this.pos) this.cb.onLost();
      this.pos = null;
      this.pinching = false;
      this.cb.onFrame({ ms, detected: false, ratio: null, pinching: false });
      return;
    }

    const tip = this.toScreen(lm[INDEX_TIP]);
    this.pos = smooth(this.pos, tip);

    const ratio = pinchRatio(lm);
    const wasPinching = this.pinching;
    this.pinching = nextPinchState(wasPinching, ratio);

    this.cb.onMove(this.pos, this.pinching, ratio);
    if (this.pinching && !wasPinching) this.cb.onPinchStart(this.pos);
    this.cb.onFrame({ ms, detected: true, ratio, pinching: this.pinching });
  }

  draw(lm) {
    const c = this.canvas, dpr = window.devicePixelRatio || 1;
    if (c.width !== innerWidth * dpr) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!lm) return;
    const pts = lm.map((p) => this.toScreen(p));
    ctx.strokeStyle = "rgba(34,195,230,0.75)";
    ctx.lineWidth = 3;
    for (const { start, end } of HandLandmarker.HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(pts[start].x, pts[start].y);
      ctx.lineTo(pts[end].x, pts[end].y);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffd23f";
    for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); }
  }
}

/**
 * frameSampler.js — Measures real frame times with requestAnimationFrame.
 *
 * Runs only while something is subscribed (the dev overlay is open), keeps the
 * last FRAME_SAMPLES frame durations in a ring buffer, and computes summary
 * stats on demand. No React state is touched per frame.
 */

export const FRAME_SAMPLES = 240; // ~4 s at 60 fps

const samples = new Float32Array(FRAME_SAMPLES);
let count = 0;      // number of valid samples (<= FRAME_SAMPLES)
let head = 0;       // next write index
let lastTime = 0;
let rafId = null;
let subscribers = 0;

function tick(now) {
  if (lastTime) {
    // Ignore huge gaps (tab hidden, debugger pause) so they don't skew stats
    const dt = now - lastTime;
    if (dt < 1000) {
      samples[head] = dt;
      head = (head + 1) % FRAME_SAMPLES;
      if (count < FRAME_SAMPLES) count++;
    }
  }
  lastTime = now;
  rafId = requestAnimationFrame(tick);
}

/** Start sampling (reference counted). Returns an unsubscribe function. */
export function subscribeFrameSampler() {
  subscribers++;
  if (subscribers === 1) {
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }
  return () => {
    subscribers = Math.max(0, subscribers - 1);
    if (subscribers === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

/** Frame times, oldest first. */
export function getFrameTimes() {
  const out = new Array(count);
  const start = (head - count + FRAME_SAMPLES) % FRAME_SAMPLES;
  for (let i = 0; i < count; i++) out[i] = samples[(start + i) % FRAME_SAMPLES];
  return out;
}

/**
 * Summary of recent frames.
 * @returns {{ fps: number, avg: number, p95: number, max: number, longFrames: number, samples: number }}
 */
export function getFrameStats(times = getFrameTimes()) {
  if (times.length === 0) return { fps: 0, avg: 0, p95: 0, max: 0, longFrames: 0, samples: 0 };

  // FPS over (up to) the last second of samples
  let elapsed = 0;
  let frames = 0;
  for (let i = times.length - 1; i >= 0 && elapsed < 1000; i--) {
    elapsed += times[i];
    frames++;
  }
  const fps = elapsed > 0 ? Math.round((frames / elapsed) * 1000) : 0;

  let sum = 0;
  let max = 0;
  let longFrames = 0;
  for (const t of times) {
    sum += t;
    if (t > max) max = t;
    if (t > 33.4) longFrames++;
  }
  const sorted = [...times].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];

  return { fps, avg: sum / times.length, p95, max, longFrames, samples: times.length };
}

/** Test helper: clear all samples. */
export function resetFrameSampler() {
  samples.fill(0);
  count = 0;
  head = 0;
  lastTime = 0;
}

/** Test helper: push a frame duration directly. */
export function pushFrameTime(ms) {
  samples[head] = ms;
  head = (head + 1) % FRAME_SAMPLES;
  if (count < FRAME_SAMPLES) count++;
}

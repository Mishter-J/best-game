// RINGWARDEN boot: canvas, state, the loop, and the ?shot= staging hook the
// screenshot scenes use. The game runs at a fixed 1280x720 internal resolution and
// scales to the window with CSS.
import { createState } from './state.js';
import { SoundBank } from './audio.js';
import { attachInput } from './input.js';
import { render } from './render.js';
import { step } from './world.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0
  ? Math.floor(seedParam)
  : (Date.now() % 2147483647) || 1;

const state = createState(seed);
state.sound = new SoundBank();
window.__rw = state;

attachInput(canvas, state);

const shot = params.get('shot');
if (shot) {
  // Staged screenshot: play the real rules forward deterministically, draw one frame.
  stageShot(shot, state);
  render(state, ctx);
  document.getElementById('status').textContent = `RINGWARDEN staged scene: ${shot}`;
  window.__shotReady = true;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (state.screen === 'play' || state.screen === 'title') {
      step(state, dt * state.speed);
    }
    render(state, ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

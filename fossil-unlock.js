/* F7: every five first completions among levels 1–50 open the next fossil, in the order the child meets
   these dinosaurs. Reads the main game's completed list only and never writes it, so replaying a level
   cannot earn a fossil twice. The forest-route unlocks in fossil-store.js still apply alongside this. */
(() => {
  'use strict';
  const KEY = 'dino-math-island-completed-v4', LEVELS = 50, PER = 5;
  const ORDER = Object.freeze(['trike', 'stego', 'brachio', 'raptor', 'trex', 'anky', 'parasaur', 'allo', 'ptero', 'compso']);
  function done() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? new Set(raw.filter(n => Number.isInteger(n) && n >= 0 && n < LEVELS)).size : 0;
    } catch (_) { return 0; }
  }
  function status() {
    const count = done(), opened = Math.min(ORDER.length, Math.floor(count / PER));
    return { done: count, unlocked: ORDER.slice(0, opened), next: ORDER[opened] || null, left: opened < ORDER.length ? PER - count % PER : 0 };
  }
  window.DinoFossilUnlock = Object.freeze({ ORDER, PER, LEVELS, status, unlocked: id => status().unlocked.includes(id) });
})();

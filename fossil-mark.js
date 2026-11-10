/* Read-only helper for the codex: has this dinosaur's fossil been dug up and put into the museum?
   It only reads the F1/F2 save (dino-math-island-fossils-v1) and never writes it. A kind counts when the museum list names it
   and that fossil's own record is a finished one (six knocks, brushed, pieces placed, step "museum"). */
(() => {
  'use strict';
  const KEY = 'dino-math-island-fossils-v1';
  function found() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw?.version !== 1 || !Array.isArray(raw.museum)) return new Set();
      return new Set(raw.museum.filter(id => {
        const d = raw.dig?.[id];
        return typeof id === 'string' && d?.step === 'museum' && d.hits === 6 && Array.isArray(d.cleared) && d.cleared.length > 0 && Array.isArray(d.placed) && d.placed.length > 0;
      }));
    } catch (_) { return new Set(); }
  }
  window.DinoFossilMark = Object.freeze({ has: id => found().has(id), all: () => [...found()] });
})();

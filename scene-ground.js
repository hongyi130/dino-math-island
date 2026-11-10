/* Fit the existing landscape to the full-size math board. No new artwork. */
(() => {
  const MAX_ZOOM = 1.5;
  const MARGIN = .02;
  const EPS = 1e-8;
  const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  function onSegment(a, b, p) {
    return Math.abs(cross(a, b, p)) < EPS && p[0] >= Math.min(a[0], b[0]) - EPS && p[0] <= Math.max(a[0], b[0]) + EPS && p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS;
  }
  function intersects(a, b, c, d) {
    return (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) ||
      onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
  }
  function inside(p, polygon) {
    let result = false;
    polygon.forEach((a, i) => {
      const b = polygon[(i + 1) % polygon.length];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    });
    return result;
  }
  function distance(p, a, b, aspect) {
    const dx = (b[0] - a[0]) * aspect, dy = b[1] - a[1];
    const px = (p[0] - a[0]) * aspect, py = p[1] - a[1];
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - t * dx, py - t * dy);
  }
  function upperAt(upper, x) {
    for (let i = 1; i < upper.length; i++) {
      if (x <= upper[i][0]) {
        const [ax, ay] = upper[i - 1], [bx, by] = upper[i];
        return ay + (by - ay) * (x - ax) / (bx - ax);
      }
    }
    return upper[upper.length - 1][1];
  }
  function clearance(polygons, ground) {
    const aspect = ground.size[0] / ground.size[1];
    let minimum = Infinity;
    for (const polygon of polygons) {
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        minimum = Math.min(minimum, a[1] - upperAt(ground.upper, a[0]), 1 - a[1], a[0] * aspect, (1 - a[0]) * aspect);
        // Test each bend in the ground boundary along each cell edge, not just vertices.
        for (const [x, y] of ground.upper) {
          if (x > Math.min(a[0], b[0]) && x < Math.max(a[0], b[0])) minimum = Math.min(minimum, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]) - y);
        }
      }
      for (const obstacle of ground.exclusions) {
        if (polygon.some(p => inside(p, obstacle)) || (polygon.length > 2 && obstacle.some(p => inside(p, polygon)))) return -1;
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i], b = polygon[(i + 1) % polygon.length];
          for (let j = 0; j < obstacle.length; j++) {
            const c = obstacle[j], d = obstacle[(j + 1) % obstacle.length];
            if (intersects(a, b, c, d)) return -1;
            minimum = Math.min(minimum, distance(a, c, d, aspect), distance(b, c, d, aspect), distance(c, a, b, aspect), distance(d, a, b, aspect));
          }
        }
      }
    }
    return minimum;
  }
  function evaluate(polygons, ground, width, height, zoom, shift = 0) {
    const scale = Math.max(width / ground.size[0], height / ground.size[1]) * zoom;
    const imageWidth = ground.size[0] * scale, imageHeight = ground.size[1] * scale;
    const left = (width - imageWidth) / 2 + shift, top = height - imageHeight;
    const source = polygons.map(polygon => polygon.map(([x, y]) => [(x - left) / imageWidth, (y - top) / imageHeight]));
    const margin = clearance(source, ground);
    return {zoom, shift, imageWidth, imageHeight, left, top, margin, pass: margin + EPS >= MARGIN && left <= EPS && left + imageWidth >= width - EPS};
  }
  function relevantGeometry(polygons) {
    // Feet already enclosed by a complete cell cannot impose a stricter constraint.
    const cells = polygons.filter(p => p.length > 2);
    return polygons.filter(p => p.length > 1 || !cells.some(cell => inside(p[0], cell)));
  }
  function solve(polygons, ground, width, height) {
    if (!polygons.length || !ground || width <= 0 || height <= 0) return null;
    polygons = relevantGeometry(polygons);
    let best = null;
    for (let step = 0; step <= 50; step++) {
      const zoom = 1 + step / 100;
      const maxShift = Math.min(width * .12, Math.max(0, (Math.max(width / ground.size[0], height / ground.size[1]) * ground.size[0] * zoom - width) / 2));
      const shifts = [0, -.5 * maxShift, .5 * maxShift, -maxShift, maxShift];
      for (const shift of shifts) {
        const result = evaluate(polygons, ground, width, height, zoom, shift);
        if (!best || result.margin > best.margin) best = result;
        if (!result.pass) continue;
        if (zoom === 1) return result;
        let low = Math.max(1, zoom - .01), high = zoom;
        for (let i = 0; i < 9; i++) {
          const mid = (low + high) / 2;
          if (evaluate(polygons, ground, width, height, mid, shift).pass) high = mid;
          else low = mid;
        }
        return evaluate(polygons, ground, width, height, Math.min(MAX_ZOOM, high + .00002), shift);
      }
    }
    return {...best, limited: true};
  }
  function measure(board) {
    const polygons = [];
    const project = (element, x, y) => {
      const matrix = element.getScreenCTM();
      if (!matrix) return null;
      const p = new DOMPoint(x, y).matrixTransform(matrix);
      return [p.x, p.y];
    };
    board.querySelectorAll('.cell > .tile-base').forEach(element => {
      polygons.push(Array.from(element.points, p => project(element, p.x, p.y)).filter(Boolean));
    });
    board.querySelectorAll('.cell .tile-image').forEach(element => {
      // Use its SVG box and inherited transform, not the transient idle animation.
      const box = element.getBBox();
      const x = parseFloat(element.style.getPropertyValue('--foot-x')) / 100;
      const y = parseFloat(element.style.getPropertyValue('--foot-y')) / 100;
      // figure() uses board coordinates. Its actor parent animates during entry;
      // project through the stable SVG camera so the landscape never chases it.
      const p = project(board, box.x + box.width * x, box.y + box.height * y);
      if (p && p.every(Number.isFinite)) polygons.push([p]);
    });
    return polygons.filter(p => p.length);
  }
  const cache = new WeakMap();
  let current = null, scheduled = 0, last = null;
  function refresh() {
    scheduled = 0;
    const backdrop = document.querySelector('.scene-backdrop.is-visible');
    const board = document.getElementById('board');
    if (!current || !backdrop || !board) return;
    if (!current.math || !current.scene.ground) {
      document.querySelectorAll('.scene-backdrop').forEach(layer => {
        layer.removeAttribute('data-ground-fit');
        layer.style.backgroundPosition = current.scene.position || 'center center';
        layer.style.backgroundSize = current.scene.size || 'cover';
      });
      last = null;
      return;
    }
    const width = backdrop.clientWidth, height = backdrop.clientHeight;
    const polygons = measure(board);
    const ground = current.scene.ground;
    if (!cache.has(ground)) cache.set(ground, new Map());
    const sceneCache = cache.get(ground);
    const key = JSON.stringify([width, height, relevantGeometry(polygons)]);
    let result = sceneCache.get(key);
    if (!result) {
      result = solve(polygons, ground, width, height);
      if (result) sceneCache.set(key, result);
      if (sceneCache.size > 64) sceneCache.delete(sceneCache.keys().next().value);
    }
    if (!result) return;
    backdrop.dataset.groundFit = result.pass ? 'fit' : 'limited';
    backdrop.style.backgroundSize = result.imageWidth + 'px ' + result.imageHeight + 'px';
    backdrop.style.backgroundPosition = result.left + 'px ' + result.top + 'px';
    last = {...result, scene: current.scene.image, viewport: [width, height]};
  }
  function schedule(scene, math) {
    if (scene) current = {scene, math};
    if (!scheduled) scheduled = requestAnimationFrame(refresh);
  }
  window.DinoSceneGround = {MAX_ZOOM, MARGIN, solve, evaluate, measure, schedule, refresh, getLast: () => last};
  window.addEventListener('resize', () => schedule());
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(() => schedule());
    ['board', 'sceneA', 'sceneB'].forEach(id => { const e = document.getElementById(id); if (e) observer.observe(e); });
    const footer = document.querySelector('.interaction-bar');
    if (footer) observer.observe(footer);
  }
})();

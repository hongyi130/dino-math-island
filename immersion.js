/* Living island: soft light and cloud shadows over the painted backdrop (no floating
   objects: they distracted from the maths),
   plus full-screen / home-screen app polish. Purely decorative; never blocks play. */
(() => {
  const root = document.documentElement;
  const backdrops = document.querySelector('.scene-backdrops');
  if (!backdrops) return;

  // Each decoration stays inside its own backdrop. The existing ground-fit CSS
  // keeps levels 1–50 still; later scene breathing carries its light/shadow with it.
  // This never writes the backdrop transform, size, position, or ground-fit result.
  const layers = [...backdrops.querySelectorAll('.scene-backdrop')].map((backdrop, index) => {
    const layer = document.createElement('div');
    const clipId = 'ambient-ground-' + index;
    layer.className = 'scene-ambient';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<svg width="0" height="0" class="ambient-clip-defs"><defs>' +
      '<clipPath id="' + clipId + '" clipPathUnits="userSpaceOnUse"><path class="ambient-ground-path" /></clipPath>' +
      '<clipPath id="' + clipId + '-clear" clipPathUnits="userSpaceOnUse"><path class="ambient-clear-path" clip-rule="evenodd" /></clipPath>' +
      '</defs></svg><div class="ambient-light"></div>' +
      '<div class="ambient-ground"><div class="ambient-shadow-field"><div class="ambient-cloud ambient-cloud-a"></div>' +
      '<div class="ambient-cloud ambient-cloud-b"></div></div></div>';
    layer.querySelector('.ambient-ground').style.clipPath = 'url("#' + clipId + '")';
    layer.querySelector('.ambient-shadow-field').style.clipPath = 'url("#' + clipId + '-clear")';
    backdrop.append(layer);
    return {backdrop, layer, path: layer.querySelector('.ambient-ground-path'),
      clearPath: layer.querySelector('.ambient-clear-path'), scene: null};
  });
  let currentScene = null, scheduled = 0;

  function length(value, available) {
    return value.endsWith('%') ? parseFloat(value) * available / 100 : parseFloat(value);
  }
  function groundClip(record) {
    const {backdrop, layer, path, clearPath, scene} = record;
    const ground = scene?.ground;
    if (!ground?.upper?.length || !ground.size) {
      layer.dataset.ground = 'none';
      return;
    }
    const width = backdrop.clientWidth, height = backdrop.clientHeight;
    const style = getComputedStyle(backdrop);
    const [sourceWidth, sourceHeight] = ground.size;
    let imageWidth, imageHeight;
    if (style.backgroundSize === 'cover' || style.backgroundSize === 'contain') {
      const scale = Math[style.backgroundSize === 'cover' ? 'max' : 'min'](width / sourceWidth, height / sourceHeight);
      imageWidth = sourceWidth * scale;
      imageHeight = sourceHeight * scale;
    } else {
      const [x, y = 'auto'] = style.backgroundSize.split(/\s+/);
      imageWidth = x === 'auto' ? NaN : length(x, width);
      imageHeight = y === 'auto' ? NaN : length(y, height);
      if (!Number.isFinite(imageWidth)) imageWidth = imageHeight * sourceWidth / sourceHeight;
      if (!Number.isFinite(imageHeight)) imageHeight = imageWidth * sourceHeight / sourceWidth;
    }
    const [x = '50%', y = '50%'] = style.backgroundPosition.split(/\s+/);
    const left = length(x, width - imageWidth), top = length(y, height - imageHeight);
    if (![imageWidth, imageHeight, left, top].every(Number.isFinite)) {
      layer.dataset.ground = 'none';
      return;
    }
    const project = ([px, py]) => [(left + px * imageWidth).toFixed(2), (top + py * imageHeight).toFixed(2)].join(' ');
    const polygon = points => 'M' + points.map(project).join('L') + 'Z';
    // Intersect the ground polygon with a second clip that subtracts obstacles.
    // Keeping them separate prevents an exclusion above the shoreline from being
    // filled again by even-odd parity (which would cast a shadow on water).
    path.setAttribute('d', polygon([...ground.upper, [1, 1], [0, 1]]));
    clearPath.setAttribute('d', 'M0 0H' + width + 'V' + height + 'H0Z' +
      (ground.exclusions || []).map(polygon).join(''));
    layer.dataset.ground = 'clipped';
  }
  function syncLayers() {
    scheduled = 0;
    layers.forEach(record => {
      if (record.backdrop.dataset.scene === currentScene?.image) record.scene = currentScene;
      record.layer.dataset.daylight = record.scene?.daylight || 'none';
      groundClip(record);
    });
  }
  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(syncLayers);
  }
  function setScene(scene, math = false) {
    // Set before the incoming backdrop becomes visible, including its first frame.
    backdrops.dataset.math = String(math);
    currentScene = scene;
    schedule();
  }
  // setScene precedes the incoming image switch; the observer also follows fitted
  // source-image bounds and orientation-specific artwork without restarting play.
  const observer = new MutationObserver(schedule);
  layers.forEach(({backdrop}) => observer.observe(backdrop, {
    attributes: true, attributeFilter: ['class', 'style', 'data-scene', 'data-ground-fit']
  }));
  window.addEventListener('resize', schedule);
  if (window.ResizeObserver) {
    const resize = new ResizeObserver(schedule);
    layers.forEach(({backdrop}) => resize.observe(backdrop));
  }

  // Hidden tabs should not spend battery on decoration.
  const syncVisibility = () => root.classList.toggle('ambient-paused', document.hidden);
  document.addEventListener('visibilitychange', syncVisibility);
  syncVisibility();

  // Home-screen app and full screen.
  const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
  root.classList.toggle('is-standalone', standalone);
  const canFullscreen = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  const actions = document.querySelector('.top-actions');
  if (canFullscreen && !standalone && actions) {
    const button = document.createElement('button');
    button.id = 'fullscreenButton';
    button.className = 'icon-button fullscreen-button';
    button.type = 'button';
    button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const element = () => document.fullscreenElement || document.webkitFullscreenElement;
    const sync = () => {
      const on = Boolean(element());
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', on ? '退出全屏' : '全屏游玩');
      button.title = on ? '退出全屏' : '全屏游玩';
    };
    button.addEventListener('click', () => {
      if (element()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        const request = root.requestFullscreen || root.webkitRequestFullscreen;
        Promise.resolve(request.call(root, { navigationUI: 'hide' })).catch(() => {});
      }
    });
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
    actions.insertBefore(button, document.querySelector('#soundButton'));
  }

  window.dinoAmbient = { setScene };
})();

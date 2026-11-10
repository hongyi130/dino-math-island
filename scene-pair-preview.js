/* Opt-in paired valley paintings; load after scene-preview.js, before game.js. */
(() => {
  if (typeof location === 'undefined') return;
  const query = new URLSearchParams(location.search);
  if (query.get('valleyPair') !== '1') return;

  // Conservative terrain boundary inspected on both native 852 x 1846 paintings.
  // Side ferns and rocks are above this boundary; use this map only for this art.
  const PORTRAIT_GROUND = {
    size: [852, 1846],
    upper: [[0,.65],[.1,.63],[.2,.59],[.3,.565],[.4,.555],[.5,.555],[.6,.555],[.7,.57],[.8,.60],[.9,.635],[1,.66]],
    exclusions: []
  };
  const PORTRAIT_ASSET = 'assets/scenes-ground-preview/scene-07-portrait-clear.webp';
  const LANDSCAPE_ASSET = 'assets/scenes-ground-preview/scene-07-landscape-pair.webp';
  const VERSION = '20261023-valley-pair-r1';
  // Inspected on the downloaded native 1672 x 941 landscape; leave a conservative
  // buffer at the distant edge and exclude the near side roots / fern clusters.
  const LANDSCAPE_GROUND = {
    size: [1672, 941],
    upper: [[0,.50],[.1,.48],[.2,.46],[.3,.46],[.4,.455],[.5,.455],[.6,.46],[.7,.46],[.8,.47],[.9,.49],[1,.52]],
    exclusions: [
      [[0,.69],[.06,.71],[.09,.78],[.08,.89],[.15,1],[0,1]],
      [[1,.70],[.98,.74],[.975,.92],[.96,1],[1,1]]
    ]
  };
  const scene = window.DINO_SCENES?.[6];
  if (!scene || !PORTRAIT_GROUND) return;

  const landscape = {
    image: LANDSCAPE_ASSET.replace(/^assets\//, '') + '?v=' + VERSION, ground: LANDSCAPE_GROUND,
    position: scene.position, size: scene.size, filter: scene.filter
  };
  const portrait = {
    ...landscape,
    image: PORTRAIT_ASSET.replace(/^assets\//, '') + '?v=' + VERSION,
    ground: PORTRAIT_GROUND
  };
  // Tall phones use the long portrait; wider tablets keep the mountain panorama.
  const media = window.matchMedia('(max-aspect-ratio: 2/3)');
  let appliedPortrait = media.matches;
  let generation = 0;

  // game.js caches these scene objects by reference. Choose synchronously for
  // its initial preload, and retain this same object for all subsequent changes.
  Object.assign(scene, appliedPortrait ? portrait : landscape);

  function preload(path) {
    if (window.DinoBoot?.image) return window.DinoBoot.image(path);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth ? resolve(path) : reject(new Error('Empty valley pair image'));
      image.onerror = () => reject(new Error('Valley pair image unavailable'));
      image.src = path;
    });
  }

  function changeOrientation() {
    const token = ++generation;
    const wantsPortrait = media.matches;
    if (wantsPortrait === appliedPortrait) return;
    const next = wantsPortrait ? portrait : landscape;
    preload('./assets/' + next.image).then(loadedUrl => {
      // Rapid rotation can finish older downloads last. They must not change
      // either the scene metadata or a backdrop selected by a newer request.
      if (token !== generation || wantsPortrait !== media.matches) return;
      const previousImage = scene.image;
      Object.assign(scene, next);
      appliedPortrait = wantsPortrait;
      let visibleChanged = false;
      document.querySelectorAll('.scene-backdrop').forEach(layer => {
        if (layer.dataset.scene !== previousImage) return;
        layer.style.backgroundImage = 'url("' + loadedUrl + '")';
        layer.dataset.scene = next.image;
        layer.style.backgroundPosition = next.position || 'center center';
        layer.style.backgroundSize = next.size || 'cover';
        layer.style.filter = next.filter || 'none';
        layer.removeAttribute('data-ground-fit');
        if (layer.classList.contains('is-visible')) visibleChanged = true;
      });
      if (visibleChanged) window.DinoSceneGround?.refresh();
    }).catch(() => {
      // Keep the previous decoded painting and its matching ground metadata.
      // A later orientation change can retry without resetting the level.
    });
  }

  if (media.addEventListener) media.addEventListener('change', changeOrientation);
  else media.addListener(changeOrientation);
})();

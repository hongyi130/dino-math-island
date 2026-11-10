/* Web-painted sand candidate, kept opt-in until the parent reviews it in play. */
(() => {
  if (typeof location === 'undefined') return;
  const query = new URLSearchParams(location.search);
  if (query.get('beachDetail') === '0') return;
  if (query.get('valleyPair') !== '1' && query.get('beachDetail') !== '1') return;
  const scene = window.DINO_SCENES?.[10];
  if (!scene) return;

  const asset = 'assets/scenes-ground-preview/scene-11-sand-detail.webp';
  Object.assign(scene, {
    image: asset.replace(/^assets\//, '') + '?v=20261024-sand-detail-r1',
    // Rechecked on the native 1672 x 941 candidate. Keep a buffer below the
    // slightly changed shoreline and the vegetation at both sides.
    ground: {
      size: [1672, 941],
      upper: [[0,.56],[.1,.48],[.2,.42],[.3,.42],[.4,.43],[.5,.44],
              [.6,.44],[.7,.44],[.8,.46],[.9,.49],[1,.53]],
      exclusions: []
    }
  });
})();

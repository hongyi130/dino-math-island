/* Opt-in candidate paintings; the normal itinerary keeps its existing art. */
(() => {
  if (typeof location === 'undefined' ||
      new URLSearchParams(location.search).get('scenePreview') !== 'ground-higher') return;
  document.documentElement.dataset.scenePreview = 'ground-higher';
  const candidates = [
    {
      index: 1, asset: 'assets/scenes-ground-preview/scene-02.webp',
      ground: {
        size: [1672, 941],
        upper: [[0,1],[.1,.69],[.2,.58],[.3,.54],[.4,.53],[.5,.52],[.6,.51],[.7,.49],[.8,.50],[.9,.62],[1,1]],
        exclusions: [
          [[0,.34],[.105,.34],[.165,.45],[.195,.53],[.205,.63],[.25,.72],[.28,.84],[.36,.91],[.405,1],[0,1]],
          [[1,.39],[.93,.43],[.89,.50],[.83,.62],[.80,.72],[.79,.80],[.73,.90],[.70,1],[1,1]]
        ]
      }
    },
    {
      index: 19, asset: 'assets/scenes-ground-preview/scene-20-contrast.webp',
      ground: {
        size: [1672, 941],
        upper: [[0,.70],[.1,.65],[.2,.58],[.3,.56],[.4,.56],[.5,.57],[.6,.58],[.7,.59],[.8,.61],[.9,.67],[1,.70]],
        exclusions: [
          [[0,.64],[.06,.65],[.13,.71],[.17,.77],[.19,.84],[.27,.91],[.37,1],[0,1]],
          [[1,.85],[.95,.88],[.91,.94],[.86,1],[1,1]]
        ]
      }
    },
    {
      index: 6, asset: 'assets/scenes-ground-preview/scene-07-ground.webp', version: '20261023-preview-r4',
      ground: {
        size: [1672, 941],
        upper: [[0,1],[.1,.88],[.2,.63],[.3,.55],[.4,.55],[.5,.55],[.6,.55],[.7,.56],[.8,.58],[.9,.70],[1,1]],
        exclusions: [
          [[0,.43],[.12,.48],[.18,.56],[.18,.67],[.25,.79],[.24,.87],[.30,1],[0,1]],
          [[1,.48],[.94,.54],[.90,.58],[.84,.72],[.82,.82],[.77,.94],[.75,1],[1,1]]
        ]
      }
    },
    {
      index: 15, asset: 'assets/scenes-ground-preview/scene-16-ground.webp', version: '20261023-preview-r4',
      ground: {
        size: [1672, 941],
        upper: [[0,.58],[.1,.57],[.2,.52],[.3,.48],[.4,.47],[.5,.47],[.6,.47],[.7,.48],[.8,.51],[.9,.55],[1,.58]],
        exclusions: []
      }
    }
  ];
  for (const {index, asset, ground, version = '20261023-preview-r2'} of candidates) {
    window.DINO_SCENES[index] = {
      ...window.DINO_SCENES[index], image: asset.replace(/^assets\//, '') + '?v=' + version, ground
    };
  }
})();

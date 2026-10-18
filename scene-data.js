/* Visual itinerary is independent of the mathematics sequence. */
(() => {
  const original = ['火山双瀑谷','蕨叶森林','碧蓝湖湾','红岩峡谷','彩虹花谷','巨杉秘境','晨雾溪谷','高山湖畔','琥珀海湾','阳光花海'];
  const discoveries = ['白岸石拱','银杏秋谷','紫晶洞口','雪山温泉','沙漠绿洲','萤火蕨谷'];
  window.DINO_SCENES = original.concat(discoveries).map((name,index) => ({
    name,
    image: (index < 10 ? 'scenes-v2/' : 'scenes-v3/') + 'scene-' + String(index + 1).padStart(2,'0') + '.png',
    position: 'center center', size: 'cover', filter: 'none'
  }));
  const route = [0,10,1,11,2,12,3,13,4,14,5,15,6,7,8,9];
  window.dinoSceneForLevel = (index) => {
    const region = index >= 110 ? route[(index-110) % route.length] : index < 50 ? route[Math.floor(Math.max(0,index) / 2) % route.length] : 10 + (index - 50) % discoveries.length;
    return window.DINO_SCENES[region];
  };
})();

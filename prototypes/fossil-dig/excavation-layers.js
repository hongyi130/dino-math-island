(() => {
  'use strict';
  const {fossils}=window.FOSSILS;
  // Stone centers and their resting spots, as percentages of the registered rock.
  const positions={
    spino: [[78,47,87,77,20],[57,55,64,82,21],[39,36,39,78,19],[20,48,14,69,19]],
    pachy: [[47,63,40,83,21],[78,45,84,76,19],[48,42,63,81,20],[22,37,15,73,20]],
    therizino: [[20,54,17,79,21],[59,59,58,83,19],[48,35,38,86,20],[81,44,83,71,19]]
  };
  const surfaces={
    spino: [[.025,.48],[.12,.25],[.35,.13],[.73,.16],[.96,.31],[.99,.52],[.90,.66],[.74,.71],[.21,.71],[.045,.63]],
    pachy: [[.018,.45],[.09,.28],[.32,.14],[.65,.16],[.88,.27],[.98,.42],[.995,.51],[.91,.65],[.74,.73],[.19,.75],[.06,.62]],
    therizino: [[.018,.53],[.073,.22],[.105,.07],[.18,.052],[.37,.13],[.68,.22],[.87,.31],[.98,.42],[.99,.57],[.89,.68],[.70,.78],[.38,.81],[.11,.74]]
  };
  Object.entries(positions).forEach(([id,pieces])=>{
    const fossil=fossils[id];
    const dir=fossil.stages[0].slice(0,fossil.stages[0].lastIndexOf('/'));
    fossil.excavationLayers={file:dir+'/fragments.webp',pieces};
    fossil.art.interior=surfaces[id];
    fossil.art.sand={file:dir+'/buried.webp',full:true};
  });
})();

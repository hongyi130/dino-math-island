/* Existing fossil art joins the forest challenge without changing saved records. */
(() => {
  'use strict';
  const fallback = {routes:['cedar','waterfall'],route:'cedar',name:'森林挑战',sample:'g2-multiply',firstLevel:76};
  for (const fossil of Object.values(window.FOSSILS.fossils)) {
    if (fossil.journey) continue;
    fossil.journey = {...fallback, routes:[...fallback.routes]};
    fossil.camp = fallback.name;
    const item = window.FOSSILS.catalog.find(entry => entry.id === fossil.id);
    if (item) Object.assign(item, {dig:true, location:fallback.name});
  }
})();

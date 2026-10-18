/* Load the game in order; never expose an empty, apparently playable island. */
(() => {
  const cover = document.querySelector('#bootCover');
  const title = document.querySelector('#bootTitle');
  const detail = document.querySelector('#bootDetail');
  const action = document.querySelector('#bootAction');
  const app = document.querySelector('.app');
  app.inert = true;
  const resolved = new Map(), pending = new Map(), failures = new Set();
  let scriptsReady = false, started = false, failed = false, generation = 0;
  let retry = () => location.reload(), enter = null, imagesReady = false;
  const absolute = path => new URL(path, document.baseURI).href;
  function show(heading, message, label = '') {
    cover.hidden = false;
    app.inert = true;
    title.textContent = heading;
    detail.textContent = message;
    action.textContent = label;
    action.hidden = !label;
    cover.setAttribute('aria-busy', String(!label));
  }
  function dismiss() {
    cover.hidden = true;
    app.inert = false;
  }
  function ready() {
    if (failed || !scriptsReady || !imagesReady) return;
    if (!started) {
      show('恐龙伙伴到齐啦！', '点一下出发，听听这次的小任务。', '开始探险 · 听任务');
      action.focus();
    } else dismiss();
  }
  function retryUrl(url, attempt) {
    const next = new URL(url);
    next.searchParams.set('retry', Date.now() + '-' + attempt);
    return next.href;
  }
  function repairImages(original, replacement) {
    document.querySelectorAll('img, svg image').forEach(node => {
      const name = node.tagName.toLowerCase() === 'image' ? 'href' : 'src';
      const current = node.getAttribute(name);
      if (current && absolute(current) === original) node.setAttribute(name, replacement);
    });
    document.querySelectorAll('.scene-backdrop').forEach(node => {
      if (node.dataset.scene && absolute('./assets/' + node.dataset.scene) === original) {
        node.style.backgroundImage = 'url("' + replacement + '")';
      }
    });
  }
  function image(path) {
    const url = absolute(path);
    if (resolved.has(url)) {
      const target = resolved.get(url);
      if (target !== url) repairImages(url, target);
      return Promise.resolve(target);
    }
    if (pending.has(url)) return pending.get(url);
    const attempt = index => new Promise((resolve, reject) => {
      const picture = new Image();
      const target = index ? retryUrl(url, index) : url;
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        picture.onload = picture.onerror = null;
        if (ok && picture.naturalWidth) resolve(target);
        else reject(new Error('Image unavailable: ' + url));
      };
      const timer = setTimeout(() => finish(false), 15000);
      picture.onload = () => finish(true);
      picture.onerror = () => finish(false);
      picture.src = target;
    }).catch(error => index < 1 ? attempt(index + 1) : Promise.reject(error));
    const work = attempt(failures.has(url) ? 1 : 0).then(target => {
      resolved.set(url, target);
      failures.delete(url);
      if (target !== url) repairImages(url, target);
      return target;
    }).catch(error => { failures.add(url); throw error; }).finally(() => pending.delete(url));
    pending.set(url, work);
    return work;
  }
  function prepareLevel(paths, onEnter) {
    const token = ++generation;
    const urls = [...new Set(paths.filter(Boolean))];
    imagesReady = false;
    enter = onEnter;
    retry = () => prepareLevel(paths, onEnter);
    show('恐龙正在赶来…', '正在准备这片岛屿和恐龙伙伴。');
    let done = 0;
    return Promise.all(urls.map(path => image(path).then(() => {
      done++;
      if (token === generation && !failed) detail.textContent = '伙伴和场景准备中 · ' + done + ' / ' + urls.length;
    }))).then(() => {
      if (token !== generation) return;
      imagesReady = true;
      ready();
    }).catch(() => {
      if (token !== generation || failed) return;
      show('有伙伴还没赶到', '图片暂时没有加载成功。点一下重试，进度不会丢失。', '重新加载图片');
    });
  }
  action.addEventListener('click', () => {
    if (scriptsReady && imagesReady && !failed) {
      started = true;
      dismiss();
      enter?.(); // play() stays inside the real click gesture on mobile.
    } else retry();
  });
  // Lazy gallery images and later SVG renders also get one visible recovery path.
  const recovered = new WeakSet();
  document.addEventListener('error', event => {
    // Required level assets are handled together by prepareLevel; a second
    // handler must not replace that retry with a gallery-only dismissal.
    if (!cover.hidden) return;
    const node = event.target;
    if (!node?.matches?.('img, svg image') || recovered.has(node)) return;
    recovered.add(node);
    const name = node.tagName.toLowerCase() === 'image' ? 'href' : 'src';
    const path = node.getAttribute(name);
    if (!path) return;
    image(path).then(target => {
      if (node.isConnected) node.setAttribute(name, target === absolute(path) ? retryUrl(target, 2) : target);
    }).catch(() => {
      if (!node.isConnected || !node.getClientRects().length) return;
      retry = () => { recovered.delete(node); node.setAttribute(name, retryUrl(absolute(path), 3)); dismiss(); };
      show('这只恐龙还没加载好', '点一下再接它过来。', '重试图片');
      imagesReady = false;
    });
  }, true);
  window.DinoBoot = { prepareLevel, image };
  function fail(message) {
    failed = true;
    retry = () => location.reload();
    show('探险准备被打断了', message + '，请重新加载。学习进度会保留。', '重新加载游戏');
  }
  window.addEventListener('error', event => {
    if (event.message && !scriptsReady) fail('游戏还没有成功启动');
  });
  async function loadScript(path, attempt = 0) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = attempt ? retryUrl(absolute(path), attempt) : path;
      const timer = setTimeout(() => fail('游戏文件下载较慢或已经中断'), 20000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error(path)); };
      document.body.appendChild(script);
    }).catch(error => attempt < 1 ? loadScript(path, attempt + 1) : Promise.reject(error));
  }
  (async () => {
    try {
      const scripts = JSON.parse(document.querySelector('#runtimeScripts').textContent);
      for (const path of scripts) {
        if (failed) return;
        await loadScript(path);
      }
      if (!failed) { scriptsReady = true; ready(); }
    } catch (_) { fail('部分游戏文件没有下载成功'); }
  })();
})();

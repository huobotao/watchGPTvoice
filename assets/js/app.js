// App bootstrap, router, overlay system.
window.App = (function () {
  const I = window.Icons;
  const stack = []; // array of { hash, page, opts }
  const tabRoots = {}; // cached tab pages so scroll position survives switching
  let inited = false;
  let currentHash = '';

  const TAB_ROUTES = {
    '#/chats':    { tab: 'chats',    view: () => V.chats() },
    '#/contacts': { tab: 'contacts', view: () => V.contacts() },
    '#/discover': { tab: 'discover', view: () => V.discover() },
    '#/me':       { tab: 'me',       view: () => V.me() },
  };

  // ============== Init ==============
  async function init() {
    if (inited) return; inited = true;
    setupStatusBar();
    setupTabBar();
    await D.load();
    if (!location.hash) location.hash = '#/chats';
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
  }

  function setupStatusBar() {
    const tEl = document.querySelector('.sb-time');
    const tick = () => {
      const d = new Date();
      tEl.textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    };
    tick(); setInterval(tick, 30000);
  }

  function setupTabBar() {
    document.querySelectorAll('#tabbar .tab').forEach(tab => {
      const key = tab.dataset.tab;
      tab.querySelector('.tab-icon').innerHTML = I[`tab${key[0].toUpperCase()}${key.slice(1)}`](false);
    });
    refreshTabBadges();
  }

  function refreshTabBadges() {
    const totalUnread = (D.state.chats || []).filter(c => !c.muted).reduce((a, c) => a + (c.unread || 0), 0);
    const mutedUnread = (D.state.chats || []).filter(c => c.muted).reduce((a, c) => a + (c.unread || 0), 0);
    setBadge('chats', totalUnread, mutedUnread > 0);
  }
  function setBadge(tab, count, dot) {
    const el = document.querySelector(`#tabbar .tab-badge[data-badge="${tab}"]`);
    el.classList.remove('show', 'dot');
    if (count > 0) {
      el.classList.add('show');
      el.textContent = count > 99 ? '99+' : count;
    } else if (dot) {
      el.classList.add('show', 'dot');
      el.textContent = '';
    }
  }

  // ============== Router ==============
  async function onHashChange() {
    const hash = location.hash || '#/chats';
    if (hash === currentHash) return;
    const prevHash = currentHash;
    currentHash = hash;

    // tab routes
    if (TAB_ROUTES[hash]) {
      const t = TAB_ROUTES[hash];
      setActiveTab(t.tab);
      let page = tabRoots[hash];
      const isFirst = !page;
      if (!page) {
        page = await Promise.resolve(t.view());
        tabRoots[hash] = page;
      }
      // tab switch — replace, no animation
      replaceWith(page);
      return;
    }

    // detail routes
    const detailPage = await resolveDetail(hash);
    if (!detailPage) {
      location.hash = '#/chats';
      return;
    }
    // animate push
    pushPage(detailPage, { hash });
  }

  async function resolveDetail(hash) {
    let m;
    if ((m = hash.match(/^#\/chat\/(.+)$/))) return await V.chat(decodeURIComponent(m[1]));
    if ((m = hash.match(/^#\/profile\/(.+)$/))) return V.profile(decodeURIComponent(m[1]));
    if ((m = hash.match(/^#\/group\/(.+)$/))) return V.profile(decodeURIComponent(m[1]));
    if (hash === '#/moments') return V.moments();
    if (hash === '#/settings') return V.settings();
    if (hash === '#/me/profile') return V.meProfile();
    return null;
  }

  function setActiveTab(tab) {
    document.getElementById('tabbar').classList.remove('hidden');
    document.querySelectorAll('#tabbar .tab').forEach(t => {
      const active = t.dataset.tab === tab;
      t.classList.toggle('active', active);
      const key = t.dataset.tab;
      t.querySelector('.tab-icon').innerHTML = I[`tab${key[0].toUpperCase()}${key.slice(1)}`](active);
    });
  }

  function replaceWith(page) {
    const root = document.getElementById('page-stack');
    root.innerHTML = '';
    root.appendChild(page);
    if (page._scrollToBottom) page._scrollToBottom();
    // detail pages may want tabbar hidden
    if (!page.classList.contains('tab-page')) document.getElementById('tabbar').classList.add('hidden');
    else document.getElementById('tabbar').classList.remove('hidden');
    stack.length = 0;
    stack.push({ hash: currentHash, page, tab: true });
  }

  function pushPage(page, { hash }) {
    const root = document.getElementById('page-stack');
    // hide tabbar for detail
    if (!page.classList.contains('tab-page')) document.getElementById('tabbar').classList.add('hidden');
    page.classList.add('page-enter');
    root.appendChild(page);
    if (page._scrollToBottom) page._scrollToBottom();
    page.addEventListener('animationend', () => page.classList.remove('page-enter'), { once: true });
    stack.push({ hash, page });
  }

  function back() {
    if (stack.length <= 1) {
      location.hash = '#/chats';
      return;
    }
    const top = stack.pop();
    const root = document.getElementById('page-stack');
    top.page.classList.add('page-pop-exit');
    top.page.addEventListener('animationend', () => {
      top.page.remove();
      currentHash = stack[stack.length - 1].hash;
      history.replaceState(null, '', currentHash);
      // restore tabbar if returning to a tab page
      const cur = stack[stack.length - 1].page;
      if (cur.classList.contains('tab-page')) document.getElementById('tabbar').classList.remove('hidden');
    }, { once: true });
  }

  // ============== Overlays ==============
  function toast(text, ms) {
    const root = document.getElementById('toast-root');
    const t = U.el(`<div class="toast">${U.esc(text)}</div>`);
    root.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 200ms'; setTimeout(() => t.remove(), 200); }, ms || 1500);
  }

  function actionSheet(items, cancelLabel) {
    const root = document.getElementById('overlay-root');
    const mask = U.el(`<div class="sheet-mask"><div class="sheet">
      <div class="group">${items.map(it => `<div class="item ${it.destructive ? 'destructive' : ''}" data-idx="${items.indexOf(it)}">${U.esc(it.label)}</div>`).join('')}</div>
      <div class="group"><div class="item cancel">${U.esc(cancelLabel || '取消')}</div></div>
    </div></div>`);
    root.appendChild(mask);
    const dismiss = () => mask.remove();
    mask.addEventListener('click', dismiss);
    mask.querySelector('.sheet').addEventListener('click', e => e.stopPropagation());
    mask.querySelectorAll('.item[data-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const it = items[+el.dataset.idx];
        dismiss();
        it && it.onTap && it.onTap();
      });
    });
    mask.querySelector('.item.cancel').addEventListener('click', dismiss);
  }

  function viewImage(src) {
    const root = document.getElementById('overlay-root');
    const v = U.el(`<div class="img-viewer"><img src="${U.esc(src)}"><div class="iv-bar"><span></span><span>查看原图</span></div></div>`);
    root.appendChild(v);
    v.addEventListener('click', () => v.remove());
  }

  function playVideo(src) {
    const root = document.getElementById('overlay-root');
    const v = U.el(`<div class="img-viewer" style="background:#000"><video src="${U.esc(src)}" controls autoplay style="max-width:100%; max-height:100%"></video></div>`);
    root.appendChild(v);
    v.addEventListener('click', (e) => { if (e.target === v) v.remove(); });
  }

  // ============== Boot ==============
  document.addEventListener('DOMContentLoaded', init);

  return { init, toast, actionSheet, viewImage, playVideo, back, refreshTabBadges };
})();

// Page views. Each view returns a DOM element with class="page".
// Tab pages also carry class="tab-page" so the tab bar pads correctly.
window.V = (function () {
  const { el, esc, avatar, avatarSmall, avatarLarge, avatarXL,
    chatListTime, convTimeBlock, fileSize, pinyinInitial, colorFor, initialFor } = U;
  const I = window.Icons;

  // ============== 微信 — 聊天列表 ==============
  function chats() {
    const page = el(`<div class="page tab-page chats-page">
      <div class="nav">
        <div class="nav-title">微信<span id="net-state" style="display:none"></span></div>
        <div class="nav-right">
          <button class="nav-btn" data-action="search">${I.search}</button>
          <button class="nav-btn" data-action="plus">${I.plus}</button>
        </div>
      </div>
      <div class="page-body">
        <div class="search-bar"><div class="search-input-wrap">${I.search}<span>搜索</span></div></div>
        <div class="list" id="chat-list"></div>
        <div class="empty" id="chat-empty" style="display:none">
          <div class="big">💬</div>
          <div>还没有聊天</div>
          <div style="margin-top:6px; color:#B2B2B2">把数据放进 <code>data/messages/&lt;id&gt;.json</code></div>
        </div>
      </div>
    </div>`);

    const list = page.querySelector('#chat-list');
    const empty = page.querySelector('#chat-empty');
    const chats = [...D.state.chats].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (new Date(b.lastTime || 0)) - (new Date(a.lastTime || 0));
    });
    if (!chats.length) empty.style.display = '';
    for (const ch of chats) {
      const c = D.contact(ch.id) || { id: ch.id, name: ch.id };
      const row = el(`<a class="chat-row ${ch.pinned ? 'pinned' : ''}" href="#/chat/${esc(ch.id)}">
        <div class="chat-avatar-wrap">
          ${avatar(c)}
          ${ch.muted
            ? `<span class="chat-badge dot" style="display:${ch.unread > 0 ? 'flex' : 'none'}"></span>`
            : (ch.unread ? `<span class="chat-badge">${ch.unread > 99 ? '99+' : ch.unread}</span>` : '')}
        </div>
        <div class="chat-info">
          <div class="chat-head">
            <div class="chat-name">${esc(c.remark || c.name || c.id)}</div>
            <div class="chat-time">${chatListTime(ch.lastTime)}</div>
          </div>
          <div class="chat-body">
            <div class="chat-preview">${
              ch.draft ? `<span class="draft">[草稿]</span> ${esc(ch.draft)}` :
              (ch.atMe ? `<span class="at">[有人@我]</span> ` : '') + esc(ch.lastMessage || '')
            }</div>
            ${ch.muted ? `<span class="chat-mute">${I.mute}</span>` : ''}
          </div>
        </div>
      </a>`);
      list.appendChild(row);
    }

    // nav actions
    page.querySelector('[data-action="search"]').addEventListener('click', () => App.toast('搜索（演示）'));
    page.querySelector('[data-action="plus"]').addEventListener('click', () => sheetTopRight(page));
    page.querySelector('.search-bar').addEventListener('click', () => App.toast('搜索（演示）'));
    return page;
  }

  function sheetTopRight(anchor) {
    App.actionSheet([
      { label: '发起群聊', onTap: () => App.toast('发起群聊（演示）') },
      { label: '添加朋友', onTap: () => App.toast('添加朋友（演示）') },
      { label: '扫一扫', onTap: () => App.toast('扫一扫（演示）') },
      { label: '收付款', onTap: () => App.toast('收付款（演示）') },
      { label: '帮助与反馈', onTap: () => App.toast('帮助与反馈（演示）') },
    ]);
  }

  // ============== 通讯录 ==============
  function contacts() {
    const page = el(`<div class="page tab-page contacts-page">
      <div class="nav">
        <div class="nav-title">通讯录</div>
        <div class="nav-right">
          <button class="nav-btn" data-action="search">${I.search}</button>
          <button class="nav-btn" data-action="plus">${I.plus}</button>
        </div>
      </div>
      <div class="page-body">
        <div class="search-bar"><div class="search-input-wrap">${I.search}<span>搜索</span></div></div>
        <div class="list" id="fixed-list"></div>
        <div id="contacts-list"></div>
        <div class="ax-bar" id="ax-bar"></div>
      </div>
    </div>`);

    const fixed = page.querySelector('#fixed-list');
    [
      { icon: '🤝', color: '#FAA635', title: '新的朋友' },
      { icon: '💬', color: '#10AEFF', title: '仅聊天的朋友' },
      { icon: '👥', color: '#07C160', title: '群聊' },
      { icon: '🏷️', color: '#4798F5', title: '标签' },
      { icon: '📰', color: '#FA9D3B', title: '公众号' },
      { icon: '🏢', color: '#FA9D3B', title: '服务号' },
    ].forEach((it, i) => {
      const r = el(`<div class="row ${i === 0 ? 'first' : ''}">
        <div class="avatar small" style="background:${it.color}; font-size:18px">${it.icon}</div>
        <div class="row-body"><div class="row-title">${it.title}</div></div>
      </div>`);
      r.addEventListener('click', () => App.toast(it.title + '（演示）'));
      fixed.appendChild(r);
    });

    const list = page.querySelector('#contacts-list');
    const sorted = [...D.state.contacts]
      .filter(c => !c.isGroup)
      .map(c => ({ ...c, _ax: pinyinInitial(c.remark || c.name || c.id) }))
      .sort((a, b) => a._ax.localeCompare(b._ax));
    const groups = {};
    for (const c of sorted) { (groups[c._ax] = groups[c._ax] || []).push(c); }
    const keys = Object.keys(groups).sort();
    for (const k of keys) {
      list.appendChild(el(`<div class="contacts-section">${esc(k)}</div>`));
      const section = el(`<div class="list"></div>`);
      groups[k].forEach((c, i) => {
        const row = el(`<a class="row ${i === 0 ? 'first' : ''}" href="#/profile/${esc(c.id)}">
          ${avatar(c, 'small')}
          <div class="row-body"><div class="row-title">${esc(c.remark || c.name)}</div></div>
        </a>`);
        section.appendChild(row);
      });
      list.appendChild(section);
    }

    const axBar = page.querySelector('#ax-bar');
    ['↑', ...keys].forEach(k => {
      const s = el(`<span>${esc(k)}</span>`);
      s.addEventListener('click', () => {
        if (k === '↑') page.querySelector('.page-body').scrollTo({ top: 0, behavior: 'smooth' });
        else {
          const sec = [...page.querySelectorAll('.contacts-section')].find(e => e.textContent === k);
          if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      axBar.appendChild(s);
    });

    page.querySelector('[data-action="search"]').addEventListener('click', () => App.toast('搜索（演示）'));
    page.querySelector('[data-action="plus"]').addEventListener('click', () => sheetTopRight(page));
    return page;
  }

  // ============== 发现 ==============
  function discover() {
    const page = el(`<div class="page tab-page discover-page">
      <div class="nav"><div class="nav-title">发现</div></div>
      <div class="page-body" style="background:var(--wx-bg)">
        ${section([
          { icon: I.dMoments, color: '#FA9D3B', title: '朋友圈', href: '#/moments', dot: true },
          { icon: I.dVideo, color: '#FA5151', title: '视频号', sub: '老朋友的新动态' },
          { icon: I.dLive, color: '#FA5151', title: '直播' },
        ])}
        ${section([
          { icon: I.dScan, color: '#07C160', title: '扫一扫' },
          { icon: I.dShake, color: '#576B95', title: '摇一摇' },
        ])}
        ${section([
          { icon: I.dLook, color: '#FA9D3B', title: '看一看' },
          { icon: I.dSearch, color: '#10AEFF', title: '搜一搜' },
        ])}
        ${section([
          { icon: I.dNearby, color: '#07C160', title: '附近' },
        ])}
        ${section([
          { icon: I.dShopping, color: '#FA9D3B', title: '购物' },
          { icon: I.dGame, color: '#576B95', title: '游戏' },
          { icon: I.dMiniprog, color: '#10AEFF', title: '小程序' },
        ])}
      </div>
    </div>`);

    page.querySelectorAll('.row[data-href]').forEach(r => {
      r.addEventListener('click', () => {
        const href = r.dataset.href;
        if (href) location.hash = href; else App.toast(r.dataset.title + '（演示）');
      });
    });
    return page;

    function section(items) {
      return `<div class="list" style="margin-top:8px">
        ${items.map((it, i) => `<div class="row ${i === 0 ? 'first' : ''}" data-href="${it.href || ''}" data-title="${esc(it.title)}">
          <div class="avatar small" style="background:${it.color}; color:#fff">${it.icon}</div>
          <div class="row-body">
            <div class="row-title">${it.title}</div>
            ${it.sub ? `<div class="row-sub">${it.sub}</div>` : ''}
          </div>
          <div class="row-right">${it.dot ? '<span style="width:8px;height:8px;background:#FA5151;border-radius:50%"></span>' : ''}<span class="row-chevron"></span></div>
        </div>`).join('')}
      </div>`;
    }
  }

  // ============== 我 ==============
  function me() {
    const m = D.state.me;
    const page = el(`<div class="page tab-page me-page">
      <div class="page-body" style="background:var(--wx-bg)">
        <div class="me-profile">
          ${avatarLarge(m)}
          <div class="me-info">
            <div class="me-name">${esc(m.name || '未命名')}</div>
            <div class="me-wxid">微信号：${esc(m.wxidShort || m.wxid || '未设置')}　＋状态</div>
          </div>
          <div class="me-qr">${I.qr}<span class="row-chevron"></span></div>
        </div>
        <div class="list" style="margin-top:8px">
          <div class="row first" data-toast="服务"><div class="avatar small" style="background:#FA9D3B; color:#fff">${I.services}</div><div class="row-body"><div class="row-title">服务</div></div><div class="row-right"><span class="row-chevron"></span></div></div>
        </div>
        <div class="list" style="margin-top:8px">
          <div class="row first" data-toast="收藏"><div class="avatar small" style="background:#576B95; color:#fff">${I.collect}</div><div class="row-body"><div class="row-title">收藏</div></div><div class="row-right"><span class="row-chevron"></span></div></div>
          <div class="row" data-href="#/moments"><div class="avatar small" style="background:#FA9D3B; color:#fff">${I.dMoments}</div><div class="row-body"><div class="row-title">朋友圈</div></div><div class="row-right"><span class="row-chevron"></span></div></div>
          <div class="row" data-toast="视频号"><div class="avatar small" style="background:#FA5151; color:#fff">${I.dVideo}</div><div class="row-body"><div class="row-title">视频号</div></div><div class="row-right"><span class="row-chevron"></span></div></div>
          <div class="row" data-toast="卡包"><div class="avatar small" style="background:#FA5151; color:#fff">${I.card}</div><div class="row-body"><div class="row-title">卡包</div></div><div class="row-right"><span class="row-chevron"></span></div></div>
          <div class="row" data-toast="表情"><div class="avatar small" style="background:#FA9D3B; color:#fff">${I.emojiManage}</div><div class="row-body"><div class="row-title">表情</div></div><div class="row-right"><span class="row-chevron"></span></div></div>
        </div>
        <div class="list" style="margin-top:8px">
          <div class="row first" data-href="#/settings"><div class="avatar small" style="background:#7F7F7F; color:#fff">${I.setting}</div><div class="row-body"><div class="row-title">设置</div></div><div class="row-right"><span class="row-chevron"></span></div></div>
        </div>
      </div>
    </div>`);

    page.querySelector('.me-profile').addEventListener('click', () => location.hash = '#/me/profile');
    page.querySelectorAll('[data-href]').forEach(r => r.addEventListener('click', () => location.hash = r.dataset.href));
    page.querySelectorAll('[data-toast]').forEach(r => r.addEventListener('click', () => App.toast(r.dataset.toast + '（演示）')));
    return page;
  }

  // ============== 我的资料 ==============
  function meProfile() {
    const m = D.state.me;
    const page = el(`<div class="page">
      <div class="nav">
        <button class="nav-back tappable">${I.back}<span>我</span></button>
        <div class="nav-title">个人信息</div>
      </div>
      <div class="page-body" style="background:var(--wx-bg)">
        <div class="list" style="margin-top:8px">
          <div class="row first">
            <div class="row-body"><div class="row-title">头像</div></div>
            <div class="row-right">${avatar(m, 'small')}<span class="row-chevron"></span></div>
          </div>
          <div class="row">
            <div class="row-body"><div class="row-title">名字</div></div>
            <div class="row-right"><span>${esc(m.name)}</span><span class="row-chevron"></span></div>
          </div>
          <div class="row">
            <div class="row-body"><div class="row-title">微信号</div></div>
            <div class="row-right"><span>${esc(m.wxidShort || '')}</span></div>
          </div>
          <div class="row">
            <div class="row-body"><div class="row-title">微信豆</div></div>
            <div class="row-right"><span>0</span><span class="row-chevron"></span></div>
          </div>
          <div class="row">
            <div class="row-body"><div class="row-title">二维码名片</div></div>
            <div class="row-right">${I.qr}<span class="row-chevron"></span></div>
          </div>
          <div class="row">
            <div class="row-body"><div class="row-title">+ 状态</div></div>
            <div class="row-right"><span class="row-chevron"></span></div>
          </div>
        </div>
        <div class="list" style="margin-top:8px">
          <div class="row first">
            <div class="row-body"><div class="row-title">地区</div></div>
            <div class="row-right"><span>${esc(m.region || '')}</span><span class="row-chevron"></span></div>
          </div>
          <div class="row">
            <div class="row-body"><div class="row-title">个性签名</div></div>
            <div class="row-right"><span style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${esc(m.signature || '')}</span><span class="row-chevron"></span></div>
          </div>
          <div class="row">
            <div class="row-body"><div class="row-title">性别</div></div>
            <div class="row-right"><span>${m.gender === 2 ? '女' : '男'}</span><span class="row-chevron"></span></div>
          </div>
        </div>
      </div>
    </div>`);
    bindBack(page);
    return page;
  }

  // ============== 设置 ==============
  function settings() {
    const page = el(`<div class="page">
      <div class="nav">
        <button class="nav-back tappable">${I.back}<span>我</span></button>
        <div class="nav-title">设置</div>
      </div>
      <div class="page-body" style="background:var(--wx-bg)">
        ${settingsGroup(['账号与安全', '青少年模式', '关怀模式'])}
        ${settingsGroup(['新消息通知', '聊天', '通用'])}
        ${settingsGroup(['朋友权限', '个人信息与权限', '隐私'])}
        ${settingsGroup(['插件', '关于微信', '帮助与反馈'])}
        ${settingsGroup(['切换账号'])}
        ${settingsGroup(['退出'])}
        <div class="about">微信查看器 · 离线版<br>v1.0.0</div>
      </div>
    </div>`);
    page.querySelectorAll('.row').forEach(r => {
      r.addEventListener('click', () => App.toast(r.querySelector('.row-title').textContent + '（演示）'));
    });
    bindBack(page);
    return page;
  }
  function settingsGroup(items) {
    return `<div class="list" style="margin-top:8px">
      ${items.map((t, i) => `<div class="row ${i === 0 ? 'first' : ''}">
        <div class="row-body"><div class="row-title">${esc(t)}</div></div>
        <div class="row-right"><span class="row-chevron"></span></div>
      </div>`).join('')}
    </div>`;
  }

  // ============== 联系人资料 ==============
  function profile(id) {
    const c = D.contact(id);
    const isGroup = c && c.isGroup;
    const page = el(`<div class="page">
      <div class="nav">
        <button class="nav-back tappable">${I.back}<span>${isGroup ? '通讯录' : '通讯录'}</span></button>
        <div class="nav-right">
          <button class="nav-btn">${I.more}</button>
        </div>
      </div>
      <div class="page-body" style="background:var(--wx-bg)">
        <div class="profile-head">
          ${avatarXL(c)}
          <div class="info">
            <div class="profile-name">${esc(c.remark || c.name || c.id)}${c.remark && c.name ? `<span class="nick">昵称：${esc(c.name)}</span>` : ''}</div>
            ${c.wxidShort ? `<div class="profile-id">微信号：${esc(c.wxidShort)}</div>` : ''}
            ${c.region ? `<div class="profile-region">地区：${esc(c.region)}</div>` : ''}
          </div>
        </div>
        ${!isGroup ? `<div class="list" style="margin-top:8px"><div class="row first"><div class="row-body"><div class="row-title">设置备注和标签</div></div><div class="row-right"><span class="row-chevron"></span></div></div>
        <div class="row"><div class="row-body"><div class="row-title">朋友权限</div></div><div class="row-right"><span class="row-chevron"></span></div></div></div>` : ''}
        ${c.signature ? `<div class="list" style="margin-top:8px"><div class="row first"><div class="row-body"><div class="row-title">个性签名</div><div class="row-sub">${esc(c.signature)}</div></div></div></div>` : ''}
        ${isGroup ? groupMembersBlock(c) : ''}
        <div class="profile-actions" style="margin-top:8px">
          <a class="btn primary tappable" href="#/chat/${esc(c.id)}">${I.actionMsg}<span>发消息</span></a>
          ${!isGroup ? `<button class="btn tappable" data-act="call">${I.actionCall}<span>音视频通话</span></button>` : ''}
        </div>
      </div>
    </div>`);
    bindBack(page);
    page.querySelectorAll('[data-act="call"]').forEach(b => b.addEventListener('click', () => App.toast('通话（演示）')));
    return page;
  }
  function groupMembersBlock(c) {
    const members = c.members || [];
    return `<div class="list" style="margin-top:8px; padding: 12px 16px 16px">
      <div style="font-size:14px; color:var(--wx-text-2); margin-bottom:10px">群成员（${members.length}）</div>
      <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:12px">
        ${members.map(m => `<div style="display:flex; flex-direction:column; align-items:center; gap:4px">
          ${avatar(m, 'small')}
          <div style="font-size:11px; color:var(--wx-text-2); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${esc(m.name)}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  // ============== 朋友圈 ==============
  function moments() {
    const m = D.state.me;
    const cover = m.coverImage || 'linear-gradient(135deg,#3a4663 0%,#6a85a5 100%)';
    const page = el(`<div class="page">
      <div class="nav" style="background:transparent; border-bottom: 0; position:absolute; left:0; right:0; z-index:5">
        <button class="nav-back tappable" style="color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5)"><svg viewBox="0 0 12 21" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,1 1.5,10.5 10,20"/></svg></button>
        <div class="nav-right"><button class="nav-btn" style="color:#fff">${I.mCamera}</button></div>
      </div>
      <div class="page-body">
        <div class="moments-cover" style="background:${cover};${m.coverImage ? `background-image:url('${esc(m.coverImage)}');background-size:cover;background-position:center;` : ''}">
          <div class="author">
            <span class="name">${esc(m.name)}</span>
            ${avatarLarge(m)}
          </div>
        </div>
        <div class="moments-list" id="moments-list"></div>
      </div>
    </div>`);

    const list = page.querySelector('#moments-list');
    if (!D.state.moments || !D.state.moments.length) {
      list.innerHTML = '<div class="empty"><div class="big">📷</div><div>暂无动态</div></div>';
    }
    for (const p of (D.state.moments || [])) {
      const author = D.contact(p.author);
      const node = el(`<div class="moments-post">
        ${avatar(author)}
        <div class="moments-body">
          <div class="moments-name">${esc(author.remark || author.name)}</div>
          ${p.text ? `<div class="moments-text">${esc(p.text)}</div>` : ''}
          ${renderMomentsImages(p.images)}
          ${p.location ? `<div class="moments-loc">📍 ${esc(p.location)}</div>` : ''}
          <div class="moments-foot">
            <div class="moments-meta">${convTimeBlock(p.time)}</div>
            <div class="moments-actions" data-act="more"><span>···</span></div>
          </div>
          ${renderLikesAndComments(p)}
        </div>
      </div>`);
      list.appendChild(node);
    }
    bindBack(page);
    page.querySelectorAll('[data-act="more"]').forEach(b => b.addEventListener('click', () => {
      App.actionSheet([
        { label: '赞', onTap: () => App.toast('已点赞') },
        { label: '评论', onTap: () => App.toast('评论（演示）') },
      ]);
    }));
    page.querySelectorAll('.moments-imgs img').forEach(img => {
      img.addEventListener('click', (e) => { e.stopPropagation(); App.viewImage(img.src); });
    });
    return page;
  }
  function renderMomentsImages(imgs) {
    if (!imgs || !imgs.length) return '';
    const n = Math.min(imgs.length, 9);
    const cls = n === 1 ? 'g1' : n === 2 ? 'g2' : n === 4 ? 'g4' : 'g' + n;
    return `<div class="moments-imgs ${cls}">${imgs.slice(0, 9).map(src => `<div><img src="${esc(src)}" loading="lazy"></div>`).join('')}</div>`;
  }
  function renderLikesAndComments(p) {
    const likes = p.likes || [];
    const comments = p.comments || [];
    if (!likes.length && !comments.length) return '';
    let html = '';
    if (likes.length) {
      html += `<div class="moments-likes"><span class="heart">${I.heart}</span>${likes.map(l => `<span class="lname">${esc(l.name)}</span>`).join('，')}</div>`;
    }
    if (comments.length) {
      html += `<div class="moments-comments ${likes.length ? 'with-likes' : ''}">${
        comments.map(c => `<div class="moments-comment"><span class="cname">${esc(c.name)}</span>${c.reply ? `<span> 回复 </span><span class="cname">${esc(c.reply)}</span>` : ''}：${esc(c.content)}</div>`).join('')
      }</div>`;
    }
    return html;
  }

  // ============== 聊天会话 ==============
  async function chat(id) {
    const c = D.contact(id);
    const ch = D.chatById(id) || { id };
    const page = el(`<div class="page chat-conv">
      <div class="nav">
        <button class="nav-back tappable">${I.back}<span>微信</span></button>
        <div class="nav-title">${esc(c.remark || c.name || id)}${ch.muted ? `<span class="row-icon" style="display:inline-flex; width:14px; height:14px; vertical-align:middle; margin-left:4px">${I.mute}</span>` : ''}${c.isGroup && c.members ? `<div class="nav-sub">（${c.members.length}）</div>` : ''}</div>
        <div class="nav-right"><button class="nav-btn" data-act="more">${I.more}</button></div>
      </div>
      <div class="conv-body" id="conv-body"></div>
      <div class="input-bar" id="input-bar">
        <button class="ib-btn" data-act="voice">${I.ibVoice}</button>
        <div class="ib-input" contenteditable="true" data-ph="" id="ib-input"></div>
        <button class="ib-btn" data-act="emoji">${I.ibEmoji}</button>
        <button class="ib-btn" data-act="plus">${I.ibPlus}</button>
        <button class="ib-send" id="ib-send" style="display:none">发送</button>
      </div>
      <div class="plus-panel hidden" id="plus-panel">
        ${plusItem(I.album, '相册')}${plusItem(I.camera, '拍摄')}${plusItem(I.video, '视频通话')}${plusItem(I.location, '位置')}
        ${plusItem(I.redpacket, '红包')}${plusItem(I.transfer, '转账')}${plusItem(I.voiceInput, '语音输入')}${plusItem(I.favorite, '收藏')}
        ${plusItem(I.contactCard, '个人名片')}${plusItem(I.file, '文件')}${plusItem(I.card, '卡券')}${plusItem(I.miniprogram, '小程序')}
      </div>
      <div class="emoji-panel hidden" id="emoji-panel">
        <div class="emoji-grid" id="emoji-grid"></div>
        <div class="emoji-tabs">
          <div class="et active">😀</div><div class="et">🐱</div><div class="et">🍔</div><div class="et">⚽</div><div class="et">🚗</div><div class="et">💡</div>
        </div>
      </div>
      <div class="voice-rec hidden" id="voice-rec">
        <div class="box">
          <div class="mic"><svg viewBox="0 0 64 64" fill="#fff"><rect x="26" y="12" width="12" height="32" rx="6"/><path d="M16 36a16 16 0 0 0 32 0M32 52v6M22 58h20" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg></div>
          <div class="tip">手指上滑，取消发送</div>
        </div>
      </div>
    </div>`);

    // populate emoji grid
    const grid = page.querySelector('#emoji-grid');
    const emojis = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','🥴','😠','😡','🤬','🥺','😇','🤠','🤡','🥳','🥸','😈','👍','👎','👏','🙏','❤️','💔','🎉','🌹','☕'];
    for (const e of emojis) {
      const c = el(`<div class="emoji-cell">${e}</div>`);
      c.addEventListener('click', () => {
        const inp = page.querySelector('#ib-input');
        inp.textContent += e;
        inp.dispatchEvent(new Event('input'));
        placeCaretEnd(inp);
      });
      grid.appendChild(c);
    }

    // load messages
    const body = page.querySelector('#conv-body');
    const messages = await D.loadMessages(id);
    renderMessages(body, messages, c);

    // Scroll to bottom after attach (handled by app after appending page)
    page._scrollToBottom = () => {
      requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
    };

    bindBack(page);
    bindInputBar(page, c);
    page.querySelector('[data-act="more"]').addEventListener('click', () => {
      location.hash = c.isGroup ? `#/group/${id}` : `#/profile/${id}`;
    });
    return page;
  }
  function plusItem(svg, label) {
    return `<div class="plus-item"><div class="plus-icon">${svg}</div><div class="plus-label">${esc(label)}</div></div>`;
  }
  function placeCaretEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el); range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
    el.focus();
  }

  function renderMessages(body, messages, peer) {
    body.innerHTML = '';
    let lastTime = 0;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const t = U.parseTime(m.time);
      if (t && (!lastTime || (t - lastTime) > 5 * 60 * 1000)) {
        body.appendChild(el(`<div class="conv-time">${U.convTimeBlock(m.time)}</div>`));
        lastTime = t;
      }
      const node = renderMessage(m, peer);
      if (node) body.appendChild(node);
    }
  }

  function renderMessage(m, peer) {
    if (m.type === 'system') {
      return el(`<div class="conv-sys">${esc(m.content)}</div>`);
    }
    const isMe = m.from === D.meId() || m.from === 'me';
    const sender = isMe ? D.state.me : (D.contact(m.from) || { id: m.from, name: m.from });
    const showSender = peer && peer.isGroup && !isMe;
    const inner = renderBubble(m);
    const wrap = el(`<div class="msg ${isMe ? 'me' : 'other'}">
      <div class="msg-avatar" data-prof="${esc(sender.id || '')}"></div>
      <div class="msg-content">
        ${showSender ? `<div class="msg-sender">${esc(sender.name || sender.id)}</div>` : ''}
      </div>
    </div>`);
    const av = wrap.querySelector('.msg-avatar');
    if (sender.avatar) {
      av.innerHTML = `<img src="${esc(sender.avatar)}" onerror="this.parentNode.style.background='${colorFor(sender.name||sender.id)}';this.parentNode.textContent='${esc(initialFor(sender.name||sender.id))}';">`;
    } else {
      av.style.background = colorFor(sender.name || sender.id || 'x');
      av.textContent = initialFor(sender.name || sender.id || '?');
    }
    if (sender.id && sender.id !== D.meId() && sender.id !== 'me') {
      av.addEventListener('click', () => location.hash = `#/profile/${sender.id}`);
    }
    wrap.querySelector('.msg-content').appendChild(inner);

    // long press menu
    let timer;
    inner.addEventListener('touchstart', (e) => {
      timer = setTimeout(() => showMsgMenu(e.touches[0], inner, m), 480);
    }, { passive: true });
    inner.addEventListener('touchend', () => clearTimeout(timer));
    inner.addEventListener('touchmove', () => clearTimeout(timer));
    inner.addEventListener('contextmenu', (e) => { e.preventDefault(); showMsgMenu(e, inner, m); });
    return wrap;
  }

  function renderBubble(m) {
    switch (m.type) {
      case 'text': {
        return el(`<div class="bubble text">${esc(m.content || '')}</div>`);
      }
      case 'image': {
        const wrap = el(`<div class="bubble image"><img src="${esc(m.src)}" loading="lazy"></div>`);
        wrap.querySelector('img').addEventListener('click', () => App.viewImage(m.src));
        return wrap;
      }
      case 'sticker': {
        const wrap = el(`<div class="bubble sticker"><img src="${esc(m.src)}" loading="lazy"></div>`);
        return wrap;
      }
      case 'voice': {
        const d = Math.max(1, Math.round(m.duration || 1));
        const width = Math.min(160, 50 + d * 6);
        const wrap = el(`<div class="bubble voice" style="width:${width}px">
          <div class="voice-wave"><span></span><span></span><span></span></div>
          <div class="voice-duration">${d}"</div>
        </div>`);
        let audio;
        wrap.addEventListener('click', () => {
          if (m.src) {
            if (!audio) { audio = new Audio(m.src); }
            if (audio.paused) audio.play().catch(() => App.toast('无法播放音频'));
            else audio.pause();
          } else {
            App.toast('未提供音频文件');
          }
        });
        return wrap;
      }
      case 'video': {
        const wrap = el(`<div class="bubble video">
          ${m.poster ? `<img src="${esc(m.poster)}">` : ''}
          <div class="play">${I.play}</div>
          ${m.duration ? `<div class="dur">${fmtDur(m.duration)}</div>` : ''}
        </div>`);
        wrap.addEventListener('click', () => {
          if (m.src) App.playVideo(m.src); else App.toast('未提供视频文件');
        });
        return wrap;
      }
      case 'file': {
        const fi = m.fileType === 'pdf' ? I.filePdf
          : m.fileType === 'word' ? I.fileWord
          : m.fileType === 'excel' ? I.fileExcel
          : I.fileGeneric;
        const wrap = el(`<div class="bubble file">
          <div class="info">
            <div class="name">${esc(m.name || '文件')}</div>
            <div class="meta">${fileSize(m.size)}</div>
          </div>
          <div class="icon">${fi}</div>
        </div>`);
        wrap.addEventListener('click', () => {
          if (m.src) window.open(m.src, '_blank');
          else App.toast('未提供文件');
        });
        return wrap;
      }
      case 'link': {
        const wrap = el(`<div class="bubble link">
          <div class="ltitle">${esc(m.title || '')}</div>
          <div class="lbody">
            <div class="ldesc">${esc(m.description || '')}</div>
            ${m.thumbnail ? `<div class="lthumb"><img src="${esc(m.thumbnail)}"></div>` : ''}
          </div>
          ${m.source ? `<div class="lsrc">📎 ${esc(m.source)}</div>` : ''}
        </div>`);
        wrap.addEventListener('click', () => { if (m.url) window.open(m.url, '_blank'); });
        return wrap;
      }
      case 'location': {
        const wrap = el(`<div class="bubble location">
          <div class="head">
            <div class="ltitle">${esc(m.title || '位置')}</div>
            <div class="laddr">${esc(m.address || '')}</div>
          </div>
          <div class="map"><span class="pin">${I.mapPin}</span></div>
        </div>`);
        return wrap;
      }
      case 'redpacket': {
        const wrap = el(`<div class="bubble redpacket">
          <div class="top">
            <div class="rp-icon">¥</div>
            <div>
              <div class="rp-title">${esc(m.title || '恭喜发财，大吉大利')}</div>
              <div class="rp-sub">微信红包</div>
            </div>
          </div>
          <div class="bottom">微信红包</div>
        </div>`);
        wrap.addEventListener('click', () => App.toast('红包详情（演示）'));
        return wrap;
      }
      case 'transfer': {
        const wrap = el(`<div class="bubble transfer">
          <div class="ti">¥</div>
          <div class="tb">
            <div class="amt">¥${esc((m.amount || 0).toFixed(2))}</div>
            <div class="tt">${esc(m.memo || '微信转账')}</div>
          </div>
        </div>`);
        return wrap;
      }
      case 'quote': {
        const wrap = el(`<div class="bubble quote">
          <div class="q-content">${esc(m.content || '')}</div>
          ${m.quote ? `<div class="q-ref">${esc(m.quote.fromName || '')}: ${esc(m.quote.content || '')}</div>` : ''}
        </div>`);
        return wrap;
      }
      case 'card': {
        const c = m.card || {};
        const wrap = el(`<div class="bubble card-wrap">
          <div class="lbl">个人名片</div>
          <div class="card" style="padding:12px">
            ${avatar({ name: c.name, avatar: c.avatar })}
            <div style="flex:1; min-width:0; margin-left:12px">
              <div style="font-size:15px">${esc(c.name || '')}</div>
              <div style="font-size:12px; color:var(--wx-text-2); margin-top:4px">微信号：${esc(c.wxid || '')}</div>
            </div>
          </div>
        </div>`);
        return wrap;
      }
      default:
        return el(`<div class="bubble text">[不支持的消息类型: ${esc(m.type)}]</div>`);
    }
  }
  function fmtDur(sec) {
    const m = Math.floor(sec / 60), s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function showMsgMenu(touch, target, m) {
    const items = ['复制', '转发', '收藏', '翻译', '引用', '多选', '删除'];
    const menu = el(`<div class="lp-menu">${items.map(t => `<span class="it">${esc(t)}</span>`).join('')}</div>`);
    document.getElementById('overlay-root').appendChild(menu);
    const rect = target.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let top = rect.top - mh - 8;
    let cls = '';
    if (top < 60) { top = rect.bottom + 8; cls = 'up'; }
    if (cls) menu.classList.add('up');
    let left = rect.left + rect.width / 2 - mw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    const arrow = rect.left + rect.width / 2 - left;
    menu.style.setProperty('--arrow', arrow + 'px');
    menu.addEventListener('click', (e) => {
      const it = e.target.closest('.it');
      if (!it) return;
      if (it.textContent === '复制' && m.content) {
        navigator.clipboard.writeText(m.content).then(() => App.toast('已复制'), () => App.toast('已复制'));
      } else {
        App.toast(it.textContent + '（演示）');
      }
      menu.remove();
    });
    setTimeout(() => {
      const dismiss = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', dismiss, true); document.removeEventListener('touchstart', dismiss, true); } };
      document.addEventListener('click', dismiss, true);
      document.addEventListener('touchstart', dismiss, true);
    }, 0);
  }

  function bindInputBar(page, peer) {
    const bar = page.querySelector('#input-bar');
    const inp = page.querySelector('#ib-input');
    const sendBtn = page.querySelector('#ib-send');
    const plusBtn = page.querySelector('[data-act="plus"]');
    const emojiBtn = page.querySelector('[data-act="emoji"]');
    const voiceBtn = page.querySelector('[data-act="voice"]');
    const plusPanel = page.querySelector('#plus-panel');
    const emojiPanel = page.querySelector('#emoji-panel');
    const voiceRec = page.querySelector('#voice-rec');

    let voiceMode = false;
    function refreshSend() {
      const txt = inp.textContent.trim();
      sendBtn.style.display = txt ? '' : 'none';
      const showPlusEmoji = !txt;
      plusBtn.style.display = showPlusEmoji ? '' : 'none';
      emojiBtn.style.display = showPlusEmoji ? '' : 'none';
    }
    inp.addEventListener('input', refreshSend);
    inp.addEventListener('focus', () => { plusPanel.classList.add('hidden'); emojiPanel.classList.add('hidden'); });

    voiceBtn.addEventListener('click', () => {
      voiceMode = !voiceMode;
      if (voiceMode) {
        voiceBtn.innerHTML = I.ibKeyboard;
        inp.style.display = 'none';
        const vb = el(`<div class="ib-voicebtn">按住 说话</div>`);
        inp.parentNode.insertBefore(vb, inp);
        vb.addEventListener('touchstart', () => voiceRec.classList.remove('hidden'));
        vb.addEventListener('touchend', () => voiceRec.classList.add('hidden'));
        vb.addEventListener('mousedown', () => voiceRec.classList.remove('hidden'));
        vb.addEventListener('mouseup', () => voiceRec.classList.add('hidden'));
      } else {
        voiceBtn.innerHTML = I.ibVoice;
        inp.style.display = '';
        const vb = page.querySelector('.ib-voicebtn'); if (vb) vb.remove();
      }
      plusPanel.classList.add('hidden'); emojiPanel.classList.add('hidden');
    });

    plusBtn.addEventListener('click', () => {
      const wasHidden = plusPanel.classList.contains('hidden');
      plusPanel.classList.toggle('hidden', !wasHidden);
      emojiPanel.classList.add('hidden');
      if (wasHidden) inp.blur();
    });
    emojiBtn.addEventListener('click', () => {
      const wasHidden = emojiPanel.classList.contains('hidden');
      emojiPanel.classList.toggle('hidden', !wasHidden);
      plusPanel.classList.add('hidden');
      if (wasHidden) inp.blur();
    });

    sendBtn.addEventListener('click', () => {
      const txt = inp.textContent.trim();
      if (!txt) return;
      // since this is a viewer, append to local view only (won't persist)
      const body = page.querySelector('#conv-body');
      const fakeMsg = { id: 'tmp_' + Date.now(), type: 'text', from: 'me', time: new Date().toISOString(), content: txt };
      body.appendChild(renderMessage(fakeMsg, peer));
      body.scrollTop = body.scrollHeight;
      inp.textContent = '';
      refreshSend();
    });

    refreshSend();
  }

  // ============== Helpers ==============
  function bindBack(page) {
    const btn = page.querySelector('.nav-back');
    if (btn) btn.addEventListener('click', () => App.back());
  }

  return { chats, contacts, discover, me, meProfile, settings, profile, moments, chat };
})();

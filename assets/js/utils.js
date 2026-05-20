// Misc helpers — DOM, time, avatar fallback
window.U = (function () {
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  function hash(s) {
    let h = 5381; s = String(s || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return Math.abs(h);
  }
  const palette = [
    '#FA5151', '#FAA635', '#FACC15', '#10AEFF', '#576B95',
    '#07C160', '#FA9D3B', '#A0A0A0', '#9E7FFF', '#FF8AB1',
  ];
  function colorFor(name) { return palette[hash(name) % palette.length]; }
  function initialFor(name) {
    if (!name) return '?';
    const m = String(name).match(/[一-龥]|[A-Za-z0-9]/);
    return m ? m[0] : '?';
  }

  function avatar(c, size) {
    size = size || '';
    if (!c) return `<div class="avatar ${size}" style="background:#C8C8C8"></div>`;
    if (c.avatar) {
      return `<div class="avatar ${size}"><img src="${esc(c.avatar)}" alt="" onerror="this.style.display='none';this.parentNode.style.background='${colorFor(c.name)}';this.parentNode.textContent='${esc(initialFor(c.name))}'"></div>`;
    }
    if (c.isGroup && c.members && c.members.length) {
      const ms = c.members.slice(0, 9);
      const gcls = `g${Math.min(ms.length, 9)}`;
      return `<div class="avatar ${size} group ${gcls}">${ms.map(m => {
        const bg = colorFor(m.name || m.id || '?');
        const init = initialFor(m.name || m.id || '?');
        return `<div style="background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px">${m.avatar ? `<img src="${esc(m.avatar)}" onerror="this.style.display='none'">` : esc(init)}</div>`;
      }).join('')}</div>`;
    }
    return `<div class="avatar ${size}" style="background:${colorFor(c.name)}">${esc(initialFor(c.name))}</div>`;
  }

  function avatarSmall(c) { return avatar(c, 'small'); }
  function avatarLarge(c) { return avatar(c, 'large'); }
  function avatarXL(c) { return avatar(c, 'xl'); }

  function parseTime(t) {
    if (!t) return null;
    if (t instanceof Date) return t;
    if (typeof t === 'number') return new Date(t);
    // ISO or "YYYY-MM-DD HH:mm:ss"
    const m = String(t).match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }

  function chatListTime(t) {
    const d = parseTime(t); if (!d) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000);
    if (sameDay) return ampm(d);
    if (d.toDateString() === yesterday.toDateString()) return '昨天';
    // within 7 days
    const diff = (now - d) / 86400000;
    if (diff < 7) {
      const w = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
      return w[d.getDay()];
    }
    if (d.getFullYear() === now.getFullYear()) {
      return `${d.getMonth()+1}月${d.getDate()}日`;
    }
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
  }

  function convTimeBlock(t) {
    const d = parseTime(t); if (!d) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000);
    if (sameDay) return ampm(d);
    if (d.toDateString() === yesterday.toDateString()) return '昨天 ' + ampm(d);
    const diff = (now - d) / 86400000;
    if (diff < 7) {
      const w = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
      return `${w[d.getDay()]} ${ampm(d)}`;
    }
    const yr = d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}年` : '';
    return `${yr}${d.getMonth()+1}月${d.getDate()}日 ${ampm(d)}`;
  }

  function ampm(d) {
    const h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0');
    const ap = h < 6 ? '凌晨' : h < 12 ? '上午' : h < 13 ? '中午' : h < 18 ? '下午' : '晚上';
    let hh = h % 12; if (hh === 0) hh = 12;
    return `${ap}${hh}:${m}`;
  }

  function fileSize(n) {
    if (n == null) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n/1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n/1048576).toFixed(1) + ' MB';
    return (n/1073741824).toFixed(2) + ' GB';
  }

  function pinyinInitial(s) {
    if (!s) return '#';
    const c = s.charCodeAt(0);
    if (c >= 0x30 && c <= 0x39) return '#';
    if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) return s[0].toUpperCase();
    // crude chinese -> pinyin first letter ranges (good enough for indexing)
    const ranges = [
      ['A','啊嗄阿吖锕'], ['B','八疤巴芭笆茇捌钯把鲅靶坝爸罢吧'],
      ['C','嚓擦礤拆侪猜才材财裁睬采彩踩菜蔡参骖餐残蚕惨灿仓沧苍舱藏操糙曹槽草册策侧厕恻测层蹭叉差插嚓茬查搽察衩岔诧拆豺侪柴瘥虿觇掺搀蝉婵谗馋缠铲产阐颤场尝偿常长肠厂敞畅倡唱抄超巢吵炒车扯彻撤澈尘臣辰沉陈晨闯衬称撑成呈承诚城乘惩程橙秤吃池迟持匙尺侈齿耻斥赤翅敕炽冲充崇虫宠重抽仇绸畴稠愁筹酬丑瞅臭出初除厨锄雏滁蜍蹰刍橱躇础楚处畜搐触矗揣踹川穿椽传船串疮窗床闯创吹炊垂陲锤捶春纯莼唇淳醇蠢戳啜辍踔绰疵词慈祠瓷雌辞磁糍鹚此次刺从匆葱囱聪丛凑粗醋簇蹿窜篡崔催摧脆翠村存忖寸搓撮磋蹉嵯痤矬瘥蹴'],
      ['D','搭瘩答打大呆歹傣戴带殆代贷岱黛玳怠殚单担丹耽郸掸胆旦但诞蛋啖弹氮淡当裆铛挡党荡档刀叨忉倒捣岛祷蹈导到悼盗道稻得德的灯登蹬等戥邓凳镫低堤滴迪敌涤笛嫡狄籴抵底蒂地弟帝递第娣谛递滇颠掂癫典点碘踮典电佃甸店玷垫淀殿奠惦掂雕貂凋刁碉吊钓掉调跌迭叠瓞蝶蹀爹叠丁仃叮玎钉疔顶鼎订定锭东冬岽董懂动栋冻洞侗都兜蚪斗豆窦逗读独渎犊牍黩堵睹赌杜肚渡度妒镀端短锻段缎椴煅断对兑碓队敦墩蹲盾顿钝多哆夺铎度躲堕舵剁朵驮饳']
    ];
    for (const [k, chars] of ranges) {
      if (chars.indexOf(s[0]) >= 0) return k;
    }
    if (s.charCodeAt(0) >= 0x4e00) {
      // fallback: map by unicode bucket to a letter — imperfect but stable
      const i = (s.charCodeAt(0) - 0x4e00) % 26;
      return String.fromCharCode(65 + i);
    }
    return '#';
  }

  return { el, esc, hash, colorFor, initialFor, avatar, avatarSmall, avatarLarge, avatarXL,
    parseTime, chatListTime, convTimeBlock, ampm, fileSize, pinyinInitial };
})();

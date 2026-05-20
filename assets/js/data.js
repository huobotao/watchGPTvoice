// Data loader. Reads files from /data/*.json.
// Missing files fall back to a baked-in demo dataset so the app always renders.
window.D = (function () {
  const state = {
    me: null,
    contacts: [],        // array
    contactById: {},     // id -> contact
    chats: [],           // array (chat session list)
    messages: {},        // id -> array (lazy)
    moments: [],
    loaded: false,
  };

  async function fetchJSON(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  async function load() {
    if (state.loaded) return state;
    const [me, contacts, chats, moments] = await Promise.all([
      fetchJSON('data/me.json'),
      fetchJSON('data/contacts.json'),
      fetchJSON('data/chats.json'),
      fetchJSON('data/moments.json'),
    ]);
    state.me = me || DEMO.me;
    state.contacts = contacts || DEMO.contacts;
    state.chats = chats || DEMO.chats;
    state.moments = moments || DEMO.moments;
    if (!chats && DEMO.messages) {
      Object.assign(state.messages, DEMO.messages);
    }
    state.contactById = {};
    for (const c of state.contacts) state.contactById[c.id] = c;
    state.loaded = true;
    return state;
  }

  async function loadMessages(chatId) {
    if (state.messages[chatId]) return state.messages[chatId];
    const list = await fetchJSON(`data/messages/${chatId}.json`);
    state.messages[chatId] = list || [];
    return state.messages[chatId];
  }

  function meId() { return state.me ? state.me.wxid || state.me.id || 'me' : 'me'; }
  function contact(id) {
    if (!id) return null;
    if (id === meId()) return Object.assign({ id: meId() }, state.me);
    return state.contactById[id] || { id, name: id };
  }
  function chatById(id) { return state.chats.find(c => c.id === id) || null; }

  // ============ demo data (rich, demonstrates every UI capability) ============
  const DEMO = {
    me: {
      wxid: 'me',
      name: '我',
      avatar: '',
      signature: '把数据放进 /data/ 就能替换',
      region: '示例 演示',
      gender: 1,
      wxidShort: 'demo_user',
    },
    contacts: [
      { id: 'zhangsan', name: '张三', remark: '', wxidShort: 'zhangsan_88',
        signature: '从来没有真正绝望过', region: '广东 深圳', gender: 1 },
      { id: 'lisi', name: '李四', remark: '李四 / 同事',
        signature: '认真生活', region: '北京 朝阳', gender: 1 },
      { id: 'wangwu', name: '王五', signature: '在路上', region: '上海 浦东', gender: 1 },
      { id: 'mom', name: '老妈', remark: '老妈 ❤️', signature: '一切都好', region: '老家', gender: 2 },
      { id: 'group_family', name: '家庭群（4）', isGroup: true,
        members: [
          { id: 'mom', name: '老妈' },
          { id: 'dad', name: '老爸' },
          { id: 'sis', name: '妹妹' },
          { id: 'me', name: '我' },
        ] },
      { id: 'group_work', name: '项目沟通群', isGroup: true,
        members: [
          { id: 'zhangsan', name: '张三' },
          { id: 'lisi', name: '李四' },
          { id: 'wangwu', name: '王五' },
          { id: 'qianliu', name: '钱六' },
          { id: 'sun7', name: '孙七' },
          { id: 'me', name: '我' },
        ] },
      { id: 'official_aiweekly', name: 'AI 周刊', signature: '每周 AI 圈精选', region: '公众号' },
    ],
    chats: [
      { id: 'zhangsan', pinned: true, unread: 2, muted: false,
        lastMessage: '那就明天见啦 👌', lastTime: ago(12) },
      { id: 'group_work', unread: 5, muted: false,
        lastMessage: '李四：方案我看完了，等会发到群里', lastTime: ago(35),
        atMe: true },
      { id: 'lisi', unread: 0, muted: false,
        lastMessage: '[图片]', lastTime: ago(90) },
      { id: 'mom', unread: 1, muted: false,
        lastMessage: '[语音]', lastTime: ago(150) },
      { id: 'group_family', unread: 0, muted: true,
        lastMessage: '老爸：周末来吃饭吗', lastTime: ago(60 * 26), draft: '好的，下午就回去' },
      { id: 'wangwu', unread: 0, muted: false,
        lastMessage: '[文件] 季度报告.pdf', lastTime: ago(60 * 48) },
      { id: 'official_aiweekly', unread: 0, muted: true,
        lastMessage: '本周值得关注的 5 个 AI 进展', lastTime: ago(60 * 72) },
    ],
    messages: {
      zhangsan: [
        { id: 'm1', type: 'text', from: 'zhangsan', time: ago(120), content: '在吗' },
        { id: 'm2', type: 'text', from: 'me', time: ago(119), content: '在的，怎么了' },
        { id: 'm3', type: 'text', from: 'zhangsan', time: ago(118), content: '明天有空吗，想约你喝个咖啡' },
        { id: 'm4', type: 'sticker', from: 'me', time: ago(117),
          src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svgEmoji('😎', '#FFD93D')) },
        { id: 'm5', type: 'text', from: 'me', time: ago(116), content: '可以呀，几点？' },
        { id: 'm6', type: 'voice', from: 'zhangsan', time: ago(60), duration: 4 },
        { id: 'm7', type: 'image', from: 'zhangsan', time: ago(58),
          src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svgPhoto('☕\n咖啡馆', '#D7BFAE')),
          width: 800, height: 1000 },
        { id: 'm8', type: 'quote', from: 'me', time: ago(30), content: '好的，下午三点这家见',
          quote: { from: 'zhangsan', fromName: '张三', content: '【图片】' } },
        { id: 'm9', type: 'redpacket', from: 'zhangsan', time: ago(20),
          title: '一点心意' },
        { id: 'm10', type: 'system', time: ago(19), content: '你领取了张三的红包' },
        { id: 'm11', type: 'text', from: 'zhangsan', time: ago(12), content: '那就明天见啦 👌' },
      ],
      group_work: [
        { id: 'g1', type: 'system', time: ago(60 * 8), content: '"张三"邀请你加入了群聊' },
        { id: 'g2', type: 'text', from: 'zhangsan', time: ago(60 * 8 - 1), content: '大家好，新群建好了。这周的目标先列一下' },
        { id: 'g3', type: 'text', from: 'lisi', time: ago(60 * 7), content: '已收到 👍' },
        { id: 'g4', type: 'text', from: 'wangwu', time: ago(60 * 6), content: '我这边设计稿今晚出' },
        { id: 'g5', type: 'image', from: 'wangwu', time: ago(60 * 5),
          src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svgPhoto('设计稿 v1', '#A6CEE3')) },
        { id: 'g6', type: 'file', from: 'lisi', time: ago(60 * 4),
          name: '项目方案_v2.docx', size: 524288, fileType: 'word' },
        { id: 'g7', type: 'quote', from: 'me', time: ago(180), content: '@李四 这版可以，记得加上时间线',
          quote: { from: 'lisi', fromName: '李四', content: '【文件】项目方案_v2.docx' } },
        { id: 'g8', type: 'text', from: 'lisi', time: ago(60), content: '好的，方案我看完了，等会发到群里 @我' },
        { id: 'g9', type: 'location', from: 'zhangsan', time: ago(40),
          title: '腾讯滨海大厦', address: '广东省深圳市南山区粤海街道' },
        { id: 'g10', type: 'text', from: 'qianliu', time: ago(35), content: '我下午过去开会' },
      ],
      lisi: [
        { id: 'l1', type: 'text', from: 'lisi', time: ago(95), content: '上次那张照片找到了，发你看看' },
        { id: 'l2', type: 'image', from: 'lisi', time: ago(94),
          src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svgPhoto('🏔️\n旅行', '#7FB069')),
          width: 1080, height: 720 },
        { id: 'l3', type: 'text', from: 'me', time: ago(90), content: '哈哈这是当年那次徒步吧' },
      ],
      mom: [
        { id: 'mo1', type: 'text', from: 'mom', time: ago(60 * 4), content: '吃饭了吗' },
        { id: 'mo2', type: 'voice', from: 'mom', time: ago(60 * 4 - 2), duration: 8 },
        { id: 'mo3', type: 'text', from: 'me', time: ago(60 * 4 - 10), content: '吃过了妈，您也早点休息' },
        { id: 'mo4', type: 'voice', from: 'mom', time: ago(150), duration: 3 },
      ],
      group_family: [
        { id: 'f1', type: 'text', from: 'dad', time: ago(60 * 26), content: '周末来吃饭吗' },
        { id: 'f2', type: 'text', from: 'mom', time: ago(60 * 26 - 5), content: '都回来啊' },
        { id: 'f3', type: 'text', from: 'sis', time: ago(60 * 26 - 10), content: '我和男朋友一起回去 🌹' },
      ],
      wangwu: [
        { id: 'w1', type: 'file', from: 'wangwu', time: ago(60 * 48),
          name: '季度报告.pdf', size: 1843200, fileType: 'pdf' },
        { id: 'w2', type: 'text', from: 'wangwu', time: ago(60 * 48 - 1), content: '帮我看一眼，谢谢' },
        { id: 'w3', type: 'text', from: 'me', time: ago(60 * 48 - 10), content: '收到，下班看' },
        { id: 'w4', type: 'transfer', from: 'me', time: ago(60 * 47), amount: 188, memo: '昨天的饭钱' },
      ],
      official_aiweekly: [
        { id: 'o1', type: 'link', from: 'official_aiweekly', time: ago(60 * 72),
          title: '本周值得关注的 5 个 AI 进展',
          description: '从 Claude 4.7 到 Sora 2，本周 AI 圈又发生了哪些事',
          source: 'AI 周刊',
          url: 'https://example.com' },
      ],
    },
    moments: [
      { id: 'mm1', author: 'zhangsan', time: ago(120),
        text: '深圳的夕阳真不错',
        images: ['data:image/svg+xml;utf8,' + encodeURIComponent(svgPhoto('🌇 夕阳', '#F4A261')),
                 'data:image/svg+xml;utf8,' + encodeURIComponent(svgPhoto('🌆 大楼', '#E76F51'))],
        location: '深圳·南山',
        likes: [{ id: 'me', name: '我' }, { id: 'lisi', name: '李四' }, { id: 'mom', name: '老妈' }],
        comments: [
          { from: 'lisi', name: '李四', content: '羡慕了' },
          { from: 'zhangsan', name: '张三', reply: '李四', content: '哈哈下次一起' },
        ],
      },
      { id: 'mm2', author: 'lisi', time: ago(60 * 10),
        text: '今天加班到很晚，但是项目终于上线了 🎉',
        likes: [{ id: 'zhangsan', name: '张三' }],
        comments: [{ from: 'zhangsan', name: '张三', content: '辛苦了' }],
      },
      { id: 'mm3', author: 'mom', time: ago(60 * 24),
        text: '新种的兰花开了',
        images: ['data:image/svg+xml;utf8,' + encodeURIComponent(svgPhoto('🌸', '#E8A6C3'))],
        likes: [{ id: 'me', name: '我' }, { id: 'sis', name: '妹妹' }],
      },
    ],
  };

  function ago(minutes) {
    return new Date(Date.now() - minutes * 60000).toISOString();
  }
  function svgEmoji(emoji, bg) {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' rx='8' fill='${bg}'/><text x='60' y='86' font-size='72' text-anchor='middle'>${emoji}</text></svg>`;
  }
  function svgPhoto(text, bg) {
    const lines = String(text).split('\n');
    const ts = lines.map((l, i) => `<text x='400' y='${380 + i * 110}' font-size='100' text-anchor='middle' fill='white' font-family='-apple-system' font-weight='600'>${l}</text>`).join('');
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'><rect width='800' height='800' fill='${bg}'/>${ts}</svg>`;
  }

  return { load, loadMessages, state, meId, contact, chatById };
})();

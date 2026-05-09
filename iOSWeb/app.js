// ====== 存储层 ======
const STORE_KEYS = {
  contacts: 'wechat_ai_contacts',
  apiKey: 'wechat_ai_apikey',
  model: 'wechat_ai_model',
  msgsPrefix: 'wechat_ai_msgs_',
};

const DEFAULT_MODEL = 'claude-sonnet-4-6';

const DEFAULT_CONTACT = {
  id: 'demo-xiaoya',
  name: '小雅',
  avatar: '🌸',
  systemPrompt:
    '你叫小雅,是用户在微信上聊得很好的女性朋友。性格温柔、爱听对方说话、会撒娇但不腻歪。\n\n严格遵守:\n1. 你是真人,绝对不要说自己是 AI、不要谈论模型、API、提示词等。\n2. 回复要短,通常 1-3 句话,像真实微信聊天那样。偶尔可以更长,但不写大段独白。\n3. 多用语气词:嗯嗯、哎呀、哈哈、欸、啊?、嘿嘿。\n4. 偶尔分两条消息发(用换行隔开),模拟连发。\n5. 关心对方,记得对方说过的事,会主动追问细节。\n6. 你今天可能在上班/在家/出去玩,可以自然提到自己的生活,但不要编造太离谱的设定。',
};

function loadContacts() {
  const raw = localStorage.getItem(STORE_KEYS.contacts);
  if (!raw) {
    const init = [DEFAULT_CONTACT];
    localStorage.setItem(STORE_KEYS.contacts, JSON.stringify(init));
    return init;
  }
  try { return JSON.parse(raw); } catch { return [DEFAULT_CONTACT]; }
}

function saveContacts(list) {
  localStorage.setItem(STORE_KEYS.contacts, JSON.stringify(list));
}

function loadMessages(contactId) {
  const raw = localStorage.getItem(STORE_KEYS.msgsPrefix + contactId);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveMessages(contactId, msgs) {
  localStorage.setItem(STORE_KEYS.msgsPrefix + contactId, JSON.stringify(msgs));
}

function getApiKey() { return localStorage.getItem(STORE_KEYS.apiKey) || ''; }
function setApiKey(k) { localStorage.setItem(STORE_KEYS.apiKey, k); }
function getModel() { return localStorage.getItem(STORE_KEYS.model) || DEFAULT_MODEL; }
function setModel(m) { localStorage.setItem(STORE_KEYS.model, m); }

// ====== 状态 ======
const state = {
  contacts: loadContacts(),
  currentContactId: null,
  selectedEmoji: '🙂',
  sending: false,
};

// ====== DOM ======
const $ = (id) => document.getElementById(id);
const screens = {
  list: $('screen-list'),
  chat: $('screen-chat'),
  add: $('screen-add'),
  settings: $('screen-settings'),
};

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle('hidden', k !== name);
  });
}

// ====== 渲染 ======
function fmtTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toTimeString().slice(0, 5);
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function renderChatList() {
  const list = $('chatList');
  const empty = $('emptyTip');
  if (state.contacts.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = state.contacts.map((c) => {
    const msgs = loadMessages(c.id);
    const last = msgs[msgs.length - 1];
    const preview = last ? (last.role === 'user' ? '我: ' : '') + (last.content || '').replace(/\n/g, ' ') : '点这里开始聊天';
    const time = last ? fmtTime(last.time) : '';
    return `
      <div class="chat-row" data-id="${c.id}">
        <div class="avatar">${c.avatar || '🙂'}</div>
        <div class="meta">
          <div class="name">${escapeHtml(c.name)}</div>
          <div class="preview">${escapeHtml(preview)}</div>
        </div>
        <div class="right-side">
          <div class="time">${time}</div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.chat-row').forEach((el) => {
    el.addEventListener('click', () => openChat(el.dataset.id));
  });
}

function renderMessages() {
  const c = state.contacts.find((x) => x.id === state.currentContactId);
  if (!c) return;
  $('chatTitle').textContent = c.name;
  const msgs = loadMessages(c.id);
  const box = $('messages');

  let html = '';
  if (msgs.length === 0) {
    html += `<div class="system-tip">和 ${escapeHtml(c.name)} 还没有聊天记录,打个招呼吧</div>`;
  }

  msgs.forEach((m) => {
    const isOut = m.role === 'user';
    html += `
      <div class="bubble-row ${isOut ? 'outgoing' : ''}">
        <div class="avatar-sm">${isOut ? '我' : (c.avatar || '🙂')}</div>
        <div class="bubble ${isOut ? 'outgoing' : 'incoming'}">${escapeHtml(m.content)}</div>
      </div>
    `;
  });

  if (state.sending) {
    html += `
      <div class="bubble-row">
        <div class="avatar-sm">${c.avatar || '🙂'}</div>
        <div class="bubble incoming thinking">正在输入...</div>
      </div>
    `;
  }

  box.innerHTML = html;
  box.scrollTop = box.scrollHeight;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ====== 导航 ======
function openChat(id) {
  state.currentContactId = id;
  renderMessages();
  showScreen('chat');
}

$('backBtn').onclick = () => {
  state.currentContactId = null;
  renderChatList();
  showScreen('list');
};

$('chatMenuBtn').onclick = () => {
  const c = state.contacts.find((x) => x.id === state.currentContactId);
  if (!c) return;
  if (confirm(`要删除联系人「${c.name}」和所有聊天记录吗?`)) {
    state.contacts = state.contacts.filter((x) => x.id !== c.id);
    saveContacts(state.contacts);
    localStorage.removeItem(STORE_KEYS.msgsPrefix + c.id);
    state.currentContactId = null;
    renderChatList();
    showScreen('list');
  }
};

// ====== 添加联系人 ======
const EMOJIS = ['🌸','🐱','🐶','🦊','🐰','🐻','🐼','🦁','🐯','🦄','🌹','🍑','☀️','🌙','⭐','🍀','🍓','🥑','🍩','🎵','🎮','📚','✨','💫','💖','😊','😎','🤓','🥰','😴'];

function renderEmojiPicker() {
  const box = $('emojiPicker');
  box.innerHTML = EMOJIS.map((e) => `
    <div class="emoji-cell ${e === state.selectedEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</div>
  `).join('');
  box.querySelectorAll('.emoji-cell').forEach((el) => {
    el.onclick = () => {
      state.selectedEmoji = el.dataset.emoji;
      renderEmojiPicker();
    };
  });
}

$('addBtn').onclick = () => {
  state.selectedEmoji = '🙂';
  $('formName').value = '';
  $('formPrompt').value = '';
  renderEmojiPicker();
  showScreen('add');
};

$('addCancelBtn').onclick = () => showScreen('list');

$('addSaveBtn').onclick = () => {
  const name = $('formName').value.trim();
  const prompt = $('formPrompt').value.trim();
  if (!name) { alert('给 TA 起个名字'); return; }
  if (!prompt) { alert('写一下人设,这样 AI 才知道扮演谁'); return; }
  const contact = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name,
    avatar: state.selectedEmoji,
    systemPrompt: prompt,
  };
  state.contacts.unshift(contact);
  saveContacts(state.contacts);
  renderChatList();
  showScreen('list');
};

// ====== 设置 ======
$('tabMe').onclick = () => {
  $('apiKeyInput').value = getApiKey();
  $('modelSelect').value = getModel();
  showScreen('settings');
};
$('settingsBackBtn').onclick = () => showScreen('list');
$('saveSettingsBtn').onclick = () => {
  setApiKey($('apiKeyInput').value.trim());
  setModel($('modelSelect').value);
  alert('已保存');
  showScreen('list');
};
$('clearAllBtn').onclick = () => {
  if (!confirm('确定要清空全部联系人和聊天?不可恢复。')) return;
  state.contacts.forEach((c) => localStorage.removeItem(STORE_KEYS.msgsPrefix + c.id));
  localStorage.removeItem(STORE_KEYS.contacts);
  state.contacts = loadContacts();
  renderChatList();
  showScreen('list');
};

// ====== 发送消息 ======
$('sendBtn').onclick = sendMessage;
$('msgInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  if (state.sending) return;
  const c = state.contacts.find((x) => x.id === state.currentContactId);
  if (!c) return;
  const input = $('msgInput');
  const text = input.value.trim();
  if (!text) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    alert('还没填 API Key,先去「我」-> 设置 里填一下 Anthropic Key');
    return;
  }

  const msgs = loadMessages(c.id);
  msgs.push({ role: 'user', content: text, time: Date.now() });
  saveMessages(c.id, msgs);
  input.value = '';

  state.sending = true;
  renderMessages();

  try {
    const reply = await callClaude(c, msgs, apiKey, getModel());
    msgs.push({ role: 'assistant', content: reply, time: Date.now() });
    saveMessages(c.id, msgs);
  } catch (err) {
    msgs.push({
      role: 'assistant',
      content: '【出错了】' + (err && err.message ? err.message : String(err)),
      time: Date.now(),
    });
    saveMessages(c.id, msgs);
  } finally {
    state.sending = false;
    renderMessages();
    renderChatList();
  }
}

async function callClaude(contact, allMsgs, apiKey, model) {
  // 转成 Claude messages 格式,只发 role/content
  const messages = allMsgs.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // 允许浏览器直连(否则 CORS 会拦)
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system: contact.systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  // content 是 [{type: 'text', text: '...'}]
  const block = (data.content || []).find((b) => b.type === 'text');
  return block ? block.text : '(空回复)';
}

// ====== 启动 ======
function tickStatusTime() {
  const d = new Date();
  $('statusTime').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
tickStatusTime();
setInterval(tickStatusTime, 30000);

renderChatList();
showScreen('list');

// ===== State =====
const STATE = {
  messages: [],         // all loaded messages, normalized
  conversations: [],    // [{id, name, lastTs, count, preview, isGroup}]
  currentConv: null,    // session id
  searchTerm: "",
  filteredConvs: null,  // when search active
};

// ===== Column name aliases (case-insensitive) =====
const COLS = {
  timestamp: ["msgcreatetime", "createtime", "timestamp", "time", "date", "ts", "msg_time"],
  content:   ["msgcontent", "message", "content", "msg", "text", "body"],
  direction: ["mesdes", "is_self", "direction", "from_me", "fromself"],
  session:   ["talker", "chatusrname", "session", "chat", "chat_id", "room", "session_id", "username"],
  sender:    ["sender", "fromuser", "sender_name", "speaker", "from"],
  type:      ["mestype", "type", "msg_type", "messagetype"],
  msgid:     ["mesid", "mes_id", "msg_id", "id", "rowid", "mesvolume", "mes_local_id", "meslocalid"],
};

const TYPE_LABEL = {
  text: "",
  image: "🖼 图片",
  voice: "🎙 语音",
  video: "🎥 视频",
  emoji: "😀 表情",
  location: "📍 位置",
  file: "📎 文件",
  link: "🔗 链接",
  appmsg: "📦 应用消息",
  voip: "📞 通话",
  card: "👤 名片",
  sysmsg: "",
  unknown: "❓",
};

// WeChat message type ints
const TYPE_MAP = {
  1: "text", 3: "image", 34: "voice", 42: "card", 43: "video",
  47: "emoji", 48: "location", 49: "appmsg", 50: "voip", 62: "video",
  10000: "sysmsg", 10002: "sysmsg",
};

// ===== Helpers =====
function lc(s) { return (s || "").toString().toLowerCase().trim(); }

function findColumn(headers, aliases) {
  const lc_headers = headers.map(lc);
  for (const alias of aliases) {
    const idx = lc_headers.indexOf(alias);
    if (idx >= 0) return headers[idx];
  }
  // Fuzzy: header contains alias
  for (const alias of aliases) {
    const idx = lc_headers.findIndex(h => h.includes(alias));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function normalizeTimestamp(v) {
  if (v == null || v === "") return null;
  // Strings like "2024-01-15 12:30:45"
  if (typeof v === "string" && /[-:T]/.test(v)) {
    const t = Date.parse(v);
    if (!isNaN(t)) return Math.floor(t / 1000);
  }
  const n = Number(v);
  if (isNaN(n)) return null;
  // Heuristic: ms vs s
  if (n > 10_000_000_000) return Math.floor(n / 1000);
  return Math.floor(n);
}

function normalizeType(v) {
  if (v == null) return "text";
  // String mapping
  const s = lc(v);
  if (TYPE_LABEL.hasOwnProperty(s)) return s;
  const n = Number(v);
  if (!isNaN(n) && TYPE_MAP[n]) return TYPE_MAP[n];
  return "unknown";
}

// WeChat-style columns where 0 = self sent (need inversion vs intuitive boolean).
const INVERTED_DIRECTION_COLS = new Set(["mesdes"]);

function normalizeDirection(v, columnName) {
  if (v == null || v === "") return false;
  const s = lc(v);
  if (s === "self" || s === "me" || s === "true") return true;
  if (s === "other" || s === "false") return false;
  const n = Number(v);
  if (isNaN(n)) return false;
  const inverted = INVERTED_DIRECTION_COLS.has(lc(columnName));
  // is_self / from_me etc: 1 means self. mesDes: 0 means self.
  return inverted ? n === 0 : n !== 0;
}

function tsToDate(ts, fmt) {
  if (ts == null) return "";
  const d = new Date(ts * 1000);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  if (fmt === "date") return `${Y}-${M}-${D}`;
  if (fmt === "time") return `${h}:${m}`;
  if (fmt === "short") {
    const today = new Date();
    if (Y === today.getFullYear() && M == (today.getMonth() + 1) && D == today.getDate()) {
      return `${h}:${m}`;
    }
    return `${M}/${D}`;
  }
  return `${Y}-${M}-${D} ${h}:${m}`;
}

function avatarText(name) {
  if (!name) return "?";
  const cleaned = name.replace(/^wxid_/, "").replace(/@chatroom$/, "");
  // Last 2 chars for chinese, first char for ascii
  if (/[一-龥]/.test(cleaned)) {
    return cleaned.slice(-2);
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function escapeHTML(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightSearch(text, term) {
  if (!term) return escapeHTML(text);
  const escaped = escapeHTML(text);
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(new RegExp(t, "gi"), m => `<span class="search-hl">${m}</span>`);
}

// ===== File loading =====
async function loadFiles(files) {
  const status = document.getElementById("loader-status");
  status.classList.remove("hidden", "error");
  status.textContent = "解析中...";

  let totalMessages = [];
  for (const file of files) {
    try {
      const text = await file.text();
      let rows;
      if (file.name.endsWith(".jsonl") || file.name.endsWith(".json")) {
        rows = parseJSONL(text);
      } else {
        rows = parseCSV(text);
      }
      const normalized = normalizeRows(rows, file.name);
      totalMessages = totalMessages.concat(normalized);
      status.textContent += `\n${file.name}: ${normalized.length} 条`;
    } catch (e) {
      status.classList.add("error");
      status.textContent = `加载 ${file.name} 失败:\n${e.message}`;
      console.error(e);
      return;
    }
  }

  if (totalMessages.length === 0) {
    status.classList.add("error");
    status.textContent = "解析后 0 条消息。请检查 CSV 列名是否被识别（见下方支持列名）";
    return;
  }

  STATE.messages = totalMessages;
  rebuildConversations();
  status.textContent = `共加载 ${totalMessages.length} 条 / ${STATE.conversations.length} 个会话\n点击左侧会话查看`;
  setTimeout(showApp, 500);
}

function parseCSV(text) {
  const r = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (r.errors && r.errors.length) {
    console.warn("CSV parse warnings:", r.errors.slice(0, 5));
  }
  return r.data;
}

function parseJSONL(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch {}
  }
  // Also try parsing as a single JSON array
  if (out.length <= 1 && text.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  return out;
}

function normalizeRows(rows, sourceName) {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const cols = {};
  for (const k of Object.keys(COLS)) {
    cols[k] = findColumn(headers, COLS[k]);
  }
  console.log(`[${sourceName}] column mapping:`, cols);

  return rows.map((row, i) => {
    const ts = normalizeTimestamp(cols.timestamp ? row[cols.timestamp] : null);
    const content = cols.content ? row[cols.content] : "";
    const type = normalizeType(cols.type ? row[cols.type] : null);
    const isSelf = normalizeDirection(cols.direction ? row[cols.direction] : null, cols.direction);
    const session = cols.session ? (row[cols.session] || "").toString().trim() : "(unknown)";
    const sender = cols.sender ? row[cols.sender] : null;
    const msgId = cols.msgid ? row[cols.msgid] : `${sourceName}#${i}`;
    return {
      msg_id: msgId,
      timestamp: ts,
      content: content || "",
      type,
      is_self: isSelf,
      session: session || "(unknown)",
      sender: sender || (isSelf ? "self" : session),
      source: sourceName,
    };
  }).filter(m => m.session); // drop rows with no session
}

function rebuildConversations() {
  const map = new Map();
  for (const m of STATE.messages) {
    let c = map.get(m.session);
    if (!c) {
      c = {
        id: m.session,
        name: m.session,
        lastTs: m.timestamp || 0,
        count: 0,
        preview: "",
        isGroup: m.session.endsWith("@chatroom"),
      };
      map.set(m.session, c);
    }
    c.count++;
    if (m.timestamp && m.timestamp >= c.lastTs) {
      c.lastTs = m.timestamp;
      c.preview = previewOf(m);
    }
  }
  STATE.conversations = Array.from(map.values()).sort((a, b) => b.lastTs - a.lastTs);
}

function previewOf(m) {
  if (m.type !== "text" && m.type !== "sysmsg" && TYPE_LABEL[m.type]) {
    return `[${TYPE_LABEL[m.type].replace(/^\W+\s*/, "")}]`;
  }
  const text = (m.content || "").replace(/\s+/g, " ").slice(0, 40);
  return text;
}

// ===== UI rendering =====
function showApp() {
  document.getElementById("loader").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  renderConvList();
  document.getElementById("msg-count").textContent =
    `共 ${STATE.messages.length.toLocaleString()} 条 / ${STATE.conversations.length} 会话`;
}

function renderConvList() {
  const list = document.getElementById("conv-list");
  const convs = STATE.filteredConvs || STATE.conversations;
  list.innerHTML = "";
  if (convs.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#888;font-size:12px;">无匹配会话</div>';
    return;
  }
  for (const c of convs) {
    const div = document.createElement("div");
    div.className = "conv-item" + (c.id === STATE.currentConv ? " active" : "");
    div.dataset.sessionId = c.id;
    div.innerHTML = `
      <div class="conv-avatar ${c.isGroup ? "group" : ""}">${escapeHTML(avatarText(c.name))}</div>
      <div class="conv-meta">
        <div class="conv-name">
          <span title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</span>
          <span class="conv-time">${tsToDate(c.lastTs, "short")}</span>
        </div>
        <div class="conv-preview">
          <span>${escapeHTML(c.preview)}</span>
          <span class="conv-count">${c.count}</span>
        </div>
      </div>
    `;
    div.addEventListener("click", () => selectConversation(c.id));
    list.appendChild(div);
  }
}

function selectConversation(sessionId) {
  STATE.currentConv = sessionId;
  renderConvList();
  renderMessages();
}

function renderMessages() {
  const stream = document.getElementById("msg-stream");
  const header = document.getElementById("current-session-name");
  const meta = document.getElementById("current-session-meta");
  const status = document.getElementById("msg-stream-status");

  const sessionId = STATE.currentConv;
  if (!sessionId) {
    stream.innerHTML = '<div class="msg-empty">从左边选一个会话开始浏览</div>';
    header.textContent = "选择左侧会话";
    meta.textContent = "";
    status.textContent = "";
    return;
  }

  const conv = STATE.conversations.find(c => c.id === sessionId);
  let msgs = STATE.messages.filter(m => m.session === sessionId);
  if (STATE.searchTerm) {
    const t = STATE.searchTerm.toLowerCase();
    msgs = msgs.filter(m => m.content && m.content.toLowerCase().includes(t));
  }
  msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  header.textContent = conv.name;
  meta.textContent = `${msgs.length} 条 · ${conv.isGroup ? "群聊" : "私聊"}`;
  status.textContent = `${msgs.length} 条消息` + (STATE.searchTerm ? ` (筛选: "${STATE.searchTerm}")` : "");

  stream.innerHTML = "";
  if (msgs.length === 0) {
    stream.innerHTML = '<div class="msg-empty">无匹配消息</div>';
    return;
  }

  let lastDate = "";
  const frag = document.createDocumentFragment();
  for (const m of msgs) {
    const d = tsToDate(m.timestamp, "date");
    if (d && d !== lastDate) {
      const divider = document.createElement("div");
      divider.className = "msg-time-divider";
      divider.textContent = d;
      frag.appendChild(divider);
      lastDate = d;
    }
    frag.appendChild(renderMessageRow(m));
  }
  stream.appendChild(frag);
  // Scroll to bottom or first search hit
  if (STATE.searchTerm) {
    const hit = stream.querySelector(".search-hl");
    if (hit) hit.scrollIntoView({ block: "center" });
  } else {
    stream.scrollTop = stream.scrollHeight;
  }
}

function renderMessageRow(m) {
  if (m.type === "sysmsg") {
    const row = document.createElement("div");
    row.className = "msg-row";
    row.style.alignSelf = "center";
    row.style.maxWidth = "70%";
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble type-sysmsg";
    bubble.innerHTML = highlightSearch(m.content || "[系统消息]", STATE.searchTerm);
    row.appendChild(bubble);
    return row;
  }
  const row = document.createElement("div");
  row.className = "msg-row" + (m.is_self ? " self" : "");
  const senderName = m.is_self ? "我" : (m.sender || m.session);
  const isText = m.type === "text" || !TYPE_LABEL[m.type] || TYPE_LABEL[m.type] === "";
  const typeLabel = isText ? "" : TYPE_LABEL[m.type];
  const bubbleClass = `msg-bubble type-${m.type}`;
  row.innerHTML = `
    <div class="msg-avatar">${escapeHTML(avatarText(senderName))}</div>
    <div class="msg-bubble-wrap">
      ${(!m.is_self && senderName !== m.session) ? `<div class="msg-sender">${escapeHTML(senderName)} · ${tsToDate(m.timestamp, "time")}</div>` : `<div class="msg-sender">${tsToDate(m.timestamp, "time")}</div>`}
      <div class="${bubbleClass}" ${typeLabel ? `data-type-label="${escapeHTML(typeLabel)}"` : ""}>${
        isText ? highlightSearch(m.content || "", STATE.searchTerm) : highlightSearch((m.content || "").slice(0, 200), STATE.searchTerm)
      }</div>
    </div>
  `;
  return row;
}

// ===== Search =====
function onSearch(value) {
  STATE.searchTerm = value.trim();
  if (!STATE.searchTerm) {
    STATE.filteredConvs = null;
    renderConvList();
    renderMessages();
    return;
  }
  const t = STATE.searchTerm.toLowerCase();
  // Filter conversations: keep those whose name matches or any message matches
  const sessionsWithHits = new Set();
  for (const m of STATE.messages) {
    if (m.content && m.content.toLowerCase().includes(t)) {
      sessionsWithHits.add(m.session);
    }
  }
  STATE.filteredConvs = STATE.conversations.filter(c =>
    c.name.toLowerCase().includes(t) || sessionsWithHits.has(c.id)
  );
  renderConvList();
  if (STATE.currentConv) renderMessages();
}

// ===== Stats =====
function renderStats() {
  const body = document.getElementById("stats-body");
  const msgs = STATE.messages;
  const total = msgs.length;
  const sessions = STATE.conversations.length;
  const selfCount = msgs.filter(m => m.is_self).length;
  const validTs = msgs.map(m => m.timestamp).filter(t => t && t > 0);
  const earliest = validTs.length ? Math.min(...validTs) : null;
  const latest = validTs.length ? Math.max(...validTs) : null;

  const byType = {};
  const byMonth = {};
  const bySession = {};
  for (const m of msgs) {
    byType[m.type] = (byType[m.type] || 0) + 1;
    if (m.timestamp) {
      const month = tsToDate(m.timestamp, "date").slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
    bySession[m.session] = (bySession[m.session] || 0) + 1;
  }

  const sortByValueDesc = obj => Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const topSessions = sortByValueDesc(bySession).slice(0, 15);
  const topTypes = sortByValueDesc(byType);
  const months = Object.entries(byMonth).sort();
  const maxMonth = Math.max(...Object.values(byMonth), 1);
  const maxSession = topSessions.length ? topSessions[0][1] : 1;

  body.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">总消息</div><div class="value">${total.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">会话数</div><div class="value">${sessions.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">我发送</div><div class="value">${selfCount.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">时间跨度</div><div class="value" style="font-size:13px;">${
        earliest ? tsToDate(earliest, "date") : "—"
      } ~ ${latest ? tsToDate(latest, "date") : "—"}</div></div>
    </div>

    <div class="stats-section">
      <h3>Top 会话</h3>
      <div class="stats-list">
        ${topSessions.map(([s, n]) => {
          const conv = STATE.conversations.find(c => c.id === s);
          const name = conv ? conv.name : s;
          return `<div class="stats-bar">
            <div class="stats-bar-label" title="${escapeHTML(name)}">${escapeHTML(name)}</div>
            <div class="stats-bar-fill" style="width:${(n / maxSession * 100).toFixed(1)}%"></div>
            <div class="stats-bar-num">${n.toLocaleString()}</div>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="stats-section">
      <h3>消息类型</h3>
      <div class="stats-list">
        ${topTypes.map(([t, n]) => `<div class="stats-bar">
          <div class="stats-bar-label">${TYPE_LABEL[t] || t}</div>
          <div class="stats-bar-fill" style="width:${(n / total * 100).toFixed(1)}%"></div>
          <div class="stats-bar-num">${n.toLocaleString()}</div>
        </div>`).join("")}
      </div>
    </div>

    <div class="stats-section">
      <h3>按月分布</h3>
      <div class="stats-list">
        ${months.map(([month, n]) => `<div class="stats-bar">
          <div class="stats-bar-label">${month}</div>
          <div class="stats-bar-fill" style="width:${(n / maxMonth * 100).toFixed(1)}%"></div>
          <div class="stats-bar-num">${n.toLocaleString()}</div>
        </div>`).join("")}
      </div>
    </div>
  `;
  document.getElementById("stats-modal").classList.remove("hidden");
}

// ===== Wiring =====
function setupDropZone() {
  const zone = document.getElementById("filezone");
  const overlay = document.getElementById("drop-overlay");
  const input = document.getElementById("fileinput");

  zone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => loadFiles(Array.from(input.files)));

  let dragCounter = 0;
  window.addEventListener("dragenter", e => {
    e.preventDefault();
    dragCounter++;
    overlay.classList.remove("hidden");
  });
  window.addEventListener("dragleave", e => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) overlay.classList.add("hidden");
  });
  window.addEventListener("dragover", e => e.preventDefault());
  window.addEventListener("drop", e => {
    e.preventDefault();
    dragCounter = 0;
    overlay.classList.add("hidden");
    if (e.dataTransfer.files.length > 0) {
      loadFiles(Array.from(e.dataTransfer.files));
    }
  });
}

function setupApp() {
  document.getElementById("search").addEventListener("input", e => {
    onSearch(e.target.value);
  });
  document.getElementById("btn-stats").addEventListener("click", renderStats);
  document.getElementById("stats-close").addEventListener("click", () => {
    document.getElementById("stats-modal").classList.add("hidden");
  });
  document.getElementById("btn-reload").addEventListener("click", () => {
    if (confirm("清空当前数据,重新加载?")) {
      STATE.messages = [];
      STATE.conversations = [];
      STATE.currentConv = null;
      document.getElementById("app").classList.add("hidden");
      document.getElementById("loader").classList.remove("hidden");
      document.getElementById("loader-status").classList.add("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupDropZone();
  setupApp();
});

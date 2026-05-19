/* 庭审质证策略助手 - 本地存储 + AI 分析 */

const STORAGE_KEY = "legal-defense-state-v1";
const SETTINGS_KEY = "legal-defense-settings-v1";

const defaultState = {
  caseInfo: {
    type: "", role: "", jurisdiction: "", stage: "",
    claims: "", summary: "", concerns: ""
  },
  accusations: [],
  facts: [],
  evidence: [],
  analyses: { elements: "", cross: "", priority: "", strategy: "" }
};

const defaultSettings = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-sonnet-4-6"
};

let state = loadState();
let settings = loadSettings();

/* ---------- 持久化 ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return Object.assign(structuredClone(defaultState), JSON.parse(raw));
  } catch { return structuredClone(defaultState); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return Object.assign({ ...defaultSettings }, JSON.parse(raw));
  } catch { return { ...defaultSettings }; }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

/* ---------- Toast ---------- */
const toastEl = document.getElementById("toast");
let toastTimer = null;
function toast(msg, type = "") {
  toastEl.textContent = msg;
  toastEl.className = "toast " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2400);
}

/* ---------- Tab 切换 ---------- */
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const name = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach(p => {
      p.classList.toggle("hidden", p.dataset.panel !== name);
    });
  });
});

/* ---------- ① 案件信息 ---------- */
function renderCaseInfo() {
  const f = state.caseInfo;
  document.getElementById("case-type").value = f.type || "";
  document.getElementById("case-role").value = f.role || "";
  document.getElementById("case-jurisdiction").value = f.jurisdiction || "";
  document.getElementById("case-stage").value = f.stage || "";
  document.getElementById("case-claims").value = f.claims || "";
  document.getElementById("case-summary").value = f.summary || "";
  document.getElementById("case-concerns").value = f.concerns || "";
}
document.getElementById("case-save").addEventListener("click", () => {
  state.caseInfo = {
    type: document.getElementById("case-type").value.trim(),
    role: document.getElementById("case-role").value,
    jurisdiction: document.getElementById("case-jurisdiction").value.trim(),
    stage: document.getElementById("case-stage").value,
    claims: document.getElementById("case-claims").value.trim(),
    summary: document.getElementById("case-summary").value.trim(),
    concerns: document.getElementById("case-concerns").value.trim()
  };
  saveState();
  toast("案件信息已保存", "ok");
});

/* ---------- ② 对方指控 ---------- */
const accusationFields = [
  { key: "claim", label: "对方主张的事实 / 指控内容", type: "textarea", rows: 2,
    ph: "如：被告于 2024-03-15 在某微信群发布……" },
  { key: "legalBasis", label: "对方援引的法律依据（如知道）", type: "text",
    ph: "如：《民法典》第 1024 条" },
  { key: "evidence", label: "对方可能提交的证据", type: "textarea", rows: 2,
    ph: "如：微信聊天截图、证人 A 的证言" },
  { key: "weakness", label: "你认为这条指控的弱点 / 你的反驳", type: "textarea", rows: 2,
    ph: "如：截图未经公证 / 时间与事实不符 / 我方有反证" }
];

function renderAccusations() {
  const list = document.getElementById("accusation-list");
  list.innerHTML = "";
  if (state.accusations.length === 0) {
    list.innerHTML = '<p class="hint">还没有录入指控，点下方按钮新增。</p>';
    return;
  }
  state.accusations.forEach((a, i) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="row-head">
        <strong>指控 #${i + 1}</strong>
        <button class="del" data-i="${i}">删除</button>
      </div>
      ${accusationFields.map(f => `
        <label class="block">${f.label}
          ${f.type === "textarea"
            ? `<textarea rows="${f.rows}" data-i="${i}" data-key="${f.key}" placeholder="${f.ph}">${escapeHtml(a[f.key] || "")}</textarea>`
            : `<input type="text" data-i="${i}" data-key="${f.key}" value="${escapeAttr(a[f.key] || "")}" placeholder="${f.ph}" />`
          }
        </label>
      `).join("")}
    `;
    list.appendChild(card);
  });
  list.querySelectorAll("[data-key]").forEach(el => {
    el.addEventListener("input", () => {
      const i = +el.dataset.i, k = el.dataset.key;
      state.accusations[i][k] = el.value;
      saveState();
    });
  });
  list.querySelectorAll(".del").forEach(b => {
    b.addEventListener("click", () => {
      if (!confirm("删除这条指控？")) return;
      state.accusations.splice(+b.dataset.i, 1);
      saveState(); renderAccusations();
    });
  });
}
document.getElementById("add-accusation").addEventListener("click", () => {
  state.accusations.push({ claim: "", legalBasis: "", evidence: "", weakness: "" });
  saveState(); renderAccusations();
});

/* ---------- ③ 我方事实 ---------- */
function renderFacts() {
  const list = document.getElementById("facts-list");
  list.innerHTML = "";
  if (state.facts.length === 0) {
    list.innerHTML = '<p class="hint">尚未录入事实主张。</p>';
    return;
  }
  state.facts.forEach((f, i) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="row-head">
        <strong>事实 #${i + 1}</strong>
        <button class="del" data-i="${i}">删除</button>
      </div>
      <label class="block">事实陈述
        <textarea rows="3" data-i="${i}" placeholder="我方版本的事实">${escapeHtml(f.text || "")}</textarea>
      </label>
    `;
    list.appendChild(card);
  });
  list.querySelectorAll("textarea").forEach(t => {
    t.addEventListener("input", () => {
      state.facts[+t.dataset.i].text = t.value;
      saveState();
    });
  });
  list.querySelectorAll(".del").forEach(b => {
    b.addEventListener("click", () => {
      if (!confirm("删除这条事实主张？")) return;
      state.facts.splice(+b.dataset.i, 1);
      saveState(); renderFacts();
    });
  });
}
document.getElementById("add-fact").addEventListener("click", () => {
  state.facts.push({ text: "" });
  saveState(); renderFacts();
});

/* ---------- ③ 我方证据 ---------- */
const evidenceFields = [
  { key: "name", label: "证据名称", type: "text", ph: "如：2024-03-12 银行转账回单" },
  { key: "type", label: "证据类型",
    options: ["书证", "物证", "电子数据", "证人证言", "鉴定意见", "勘验/视听资料", "当事人陈述"] },
  { key: "proves", label: "证明对象（你想用它证明什么事实）", type: "textarea", rows: 2,
    ph: "如：证明 2024-03-12 转账 5 万元属于借款而非赠与" },
  { key: "source", label: "来源 / 取得方式", type: "text",
    ph: "如：银行 APP 自助下载 / 第三方公证" },
  { key: "weakness", label: "可能被对方质疑的点", type: "textarea", rows: 2,
    ph: "如：仅显示转账金额，未显示用途备注" }
];

function renderEvidence() {
  const list = document.getElementById("evidence-list");
  list.innerHTML = "";
  if (state.evidence.length === 0) {
    list.innerHTML = '<p class="hint">尚未录入证据。</p>';
    return;
  }
  state.evidence.forEach((e, i) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="row-head">
        <strong>证据 #${i + 1}</strong>
        <button class="del" data-i="${i}">删除</button>
      </div>
      ${evidenceFields.map(f => {
        if (f.options) {
          return `<label class="block">${f.label}
            <select data-i="${i}" data-key="${f.key}">
              <option value="">请选择</option>
              ${f.options.map(o => `<option value="${o}" ${e[f.key] === o ? "selected" : ""}>${o}</option>`).join("")}
            </select>
          </label>`;
        }
        if (f.type === "textarea") {
          return `<label class="block">${f.label}
            <textarea rows="${f.rows}" data-i="${i}" data-key="${f.key}" placeholder="${f.ph}">${escapeHtml(e[f.key] || "")}</textarea>
          </label>`;
        }
        return `<label class="block">${f.label}
          <input type="text" data-i="${i}" data-key="${f.key}" value="${escapeAttr(e[f.key] || "")}" placeholder="${f.ph}" />
        </label>`;
      }).join("")}
    `;
    list.appendChild(card);
  });
  list.querySelectorAll("[data-key]").forEach(el => {
    el.addEventListener("input", () => {
      state.evidence[+el.dataset.i][el.dataset.key] = el.value;
      saveState();
    });
    el.addEventListener("change", () => {
      state.evidence[+el.dataset.i][el.dataset.key] = el.value;
      saveState();
    });
  });
  list.querySelectorAll(".del").forEach(b => {
    b.addEventListener("click", () => {
      if (!confirm("删除这份证据？")) return;
      state.evidence.splice(+b.dataset.i, 1);
      saveState(); renderEvidence();
    });
  });
}
document.getElementById("add-evidence").addEventListener("click", () => {
  state.evidence.push({ name: "", type: "", proves: "", source: "", weakness: "" });
  saveState(); renderEvidence();
});

/* ---------- ④ AI 分析 ---------- */
const analysisPrompts = {
  elements: {
    title: "构成要件分解",
    sys: `你是一位经验丰富的诉讼律师，擅长把对方的指控拆解为法律构成要件。
针对用户提供的每一条指控，请：
1. 标明该指控所对应的请求权 / 罪名 / 法律关系；
2. 列出该请求权或主张依法所需的全部**构成要件**（要件式列表）；
3. 指出每个要件的**举证责任**通常归属于哪一方；
4. 针对每个要件，分析对方目前的事实主张和证据能否满足；
5. 标出最有可能被打破的"软肋要件"（critical weakness），并说明为什么。
输出使用清晰的小标题与编号，禁止笼统空话。如果用户未指明司法管辖，请明确说明你假设的体系（如中国大陆民事诉讼）。`
  },
  cross: {
    title: "逐条质证思路",
    sys: `你是一位实务派庭审律师。针对对方可能提交的每一份证据，输出质证清单：
- **真实性**质疑点（来源、形成过程、是否原件、是否经过篡改）；
- **合法性**质疑点（取证程序、是否侵权、是否经过公证 / 鉴证）；
- **关联性**质疑点（与待证事实是否有逻辑关联、能否单独证明）；
- 针对该证据可以问对方/证人的**追问话术（直接给出可朗读的中文句子）**至少 3 句；
- 一句话总结：是否申请不予采纳，还是仅否认证明力。
按"证据 #1 / 证据 #2"分块输出。`
  },
  priority: {
    title: "庭审优先级排序",
    sys: `你是一位资深律师，帮当事人对庭审打法做优先级排序。
请把对方的每条指控划分为：
- **P0 主战场**：必须打赢，输了案件就输了；
- **P1 重要**：尽量打掉，否则会显著加重责任；
- **P2 次要**：可以战略让步或不与纠缠，省下时间和注意力；
- **🪤 陷阱条款**：对方故意抛出诱使你掉入的争议点，绝不要在庭上恋战。

每一条给出：
1. 优先级；
2. 理由（结合证据形势、举证责任、潜在判决影响）；
3. 在庭上对应的时间预算建议（如"5 分钟内说完"）。
最后给出一份"庭审注意力分配表"。`
  },
  strategy: {
    title: "整体辩护策略大纲",
    sys: `你是一位即将上庭的辩护律师，请为当事人输出一份**可直接带去庭审现场**的策略大纲，结构如下：

## 一、核心论点（一句话）
## 二、开场陈述要点（3-5 个 bullet，可朗读）
## 三、举证顺序（证据 #X → 证明什么 → 顺序的理由）
## 四、对每条指控的应对脚本
   - 摘录指控
   - 我方回应核心句
   - 关键反诘问 2-3 个
## 五、风险预案
   - 若对方抛出 X，我方应对：…
## 六、最后陈述要点

要求：语言精炼、可执行、避免学院腔。如果用户信息不足以判断某一节，请明确指出"需要补充：……"。`
  }
};

document.querySelectorAll("[data-analysis]").forEach(btn => {
  btn.addEventListener("click", () => runAnalysis(btn.dataset.analysis));
});

async function runAnalysis(kind) {
  if (!settings.apiKey) {
    toast("请先在右上角【设置】里填入 API Key", "error");
    openSettings();
    return;
  }
  const cfg = analysisPrompts[kind];
  const out = document.getElementById("analysis-output");
  out.innerHTML = '<span class="status">⏳ 正在调用模型，可能需要 10-30 秒…</span>';

  const userPrompt = buildUserPrompt(kind);
  try {
    const text = await callAI(cfg.sys, userPrompt);
    state.analyses[kind] = text;
    saveState();
    out.innerHTML = `<h3>【${cfg.title}】</h3>` + renderMarkdownLite(text);
  } catch (err) {
    out.innerHTML = `<span class="err">❌ 调用失败：${escapeHtml(err.message || String(err))}</span>`;
  }
}

function buildUserPrompt(kind) {
  const ci = state.caseInfo;
  const parts = [
    "## 案件基本信息",
    `- 案由：${ci.type || "(未填)"}`,
    `- 我方角色：${ci.role || "(未填)"}`,
    `- 司法管辖：${ci.jurisdiction || "(未指明)"}`,
    `- 当前阶段：${ci.stage || "(未填)"}`,
    "",
    "### 对方诉讼请求",
    ci.claims || "(未填)",
    "",
    "### 案情简述",
    ci.summary || "(未填)",
    "",
    "### 我方关注/担忧",
    ci.concerns || "(未填)",
    "",
    "## 对方指控（逐条）"
  ];
  if (state.accusations.length === 0) parts.push("(尚未录入)");
  state.accusations.forEach((a, i) => {
    parts.push(`### 指控 #${i + 1}`);
    parts.push(`- 主张事实：${a.claim || "(未填)"}`);
    parts.push(`- 法律依据：${a.legalBasis || "(未填)"}`);
    parts.push(`- 对方证据：${a.evidence || "(未填)"}`);
    parts.push(`- 我方初步反驳：${a.weakness || "(未填)"}`);
  });
  parts.push("", "## 我方事实主张");
  if (state.facts.length === 0) parts.push("(尚未录入)");
  state.facts.forEach((f, i) => parts.push(`${i + 1}. ${f.text || "(空)"}`));
  parts.push("", "## 我方现有证据");
  if (state.evidence.length === 0) parts.push("(尚未录入)");
  state.evidence.forEach((e, i) => {
    parts.push(`### 证据 #${i + 1} ${e.name || "(未命名)"}`);
    parts.push(`- 类型：${e.type || "(未填)"}`);
    parts.push(`- 证明对象：${e.proves || "(未填)"}`);
    parts.push(`- 来源：${e.source || "(未填)"}`);
    parts.push(`- 可能被质疑：${e.weakness || "(未填)"}`);
  });
  parts.push("", "---", `请基于以上材料执行任务：**${analysisPrompts[kind].title}**。`);
  return parts.join("\n");
}

/* ---------- API 调用 ---------- */
async function callAI(systemPrompt, userPrompt) {
  if (settings.provider === "anthropic") {
    return callAnthropic(systemPrompt, userPrompt);
  }
  return callOpenAI(systemPrompt, userPrompt);
}

async function callAnthropic(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: settings.model || "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content || []).map(c => c.text || "").join("\n").trim();
}

async function callOpenAI(systemPrompt, userPrompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + settings.apiKey
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

/* ---------- 极简 Markdown 渲染（不引依赖） ---------- */
function renderMarkdownLite(md) {
  const esc = escapeHtml(md);
  return esc
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/* ---------- ⑤ 导出 ---------- */
document.getElementById("export-md").addEventListener("click", () => {
  const md = buildExportMarkdown();
  downloadFile("案件策略.md", md, "text/markdown");
});
document.getElementById("export-json").addEventListener("click", () => {
  downloadFile("case-backup.json", JSON.stringify(state, null, 2), "application/json");
});
document.getElementById("import-json").addEventListener("click", () => {
  document.getElementById("import-file").click();
});
document.getElementById("import-file").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.caseInfo) throw new Error("文件结构不对");
      state = Object.assign(structuredClone(defaultState), parsed);
      saveState();
      renderAll();
      toast("已恢复", "ok");
    } catch (err) {
      toast("恢复失败：" + err.message, "error");
    }
  };
  reader.readAsText(file);
});
document.getElementById("reset-all").addEventListener("click", () => {
  if (!confirm("将清空全部案件数据（设置保留）。继续？")) return;
  state = structuredClone(defaultState);
  saveState();
  renderAll();
  toast("已清空", "ok");
});

function buildExportMarkdown() {
  const ci = state.caseInfo;
  const lines = [
    "# 案件策略汇总", "",
    "## 案件信息",
    `- **案由**：${ci.type}`,
    `- **角色**：${ci.role}`,
    `- **管辖**：${ci.jurisdiction}`,
    `- **阶段**：${ci.stage}`,
    "",
    "### 对方诉讼请求", ci.claims || "(无)", "",
    "### 案情简述", ci.summary || "(无)", "",
    "### 关注 / 担忧", ci.concerns || "(无)", "",
    "## 对方指控"
  ];
  state.accusations.forEach((a, i) => {
    lines.push(`### 指控 #${i + 1}`,
      `- 主张事实：${a.claim}`,
      `- 法律依据：${a.legalBasis}`,
      `- 对方证据：${a.evidence}`,
      `- 我方反驳：${a.weakness}`, "");
  });
  lines.push("## 我方事实主张");
  state.facts.forEach((f, i) => lines.push(`${i + 1}. ${f.text}`));
  lines.push("", "## 我方证据");
  state.evidence.forEach((e, i) => {
    lines.push(`### 证据 #${i + 1}：${e.name}`,
      `- 类型：${e.type}`,
      `- 证明对象：${e.proves}`,
      `- 来源：${e.source}`,
      `- 弱点：${e.weakness}`, "");
  });
  lines.push("## AI 分析输出");
  for (const k of ["elements", "cross", "priority", "strategy"]) {
    if (state.analyses[k]) {
      lines.push(`### ${analysisPrompts[k].title}`, "", state.analyses[k], "");
    }
  }
  return lines.join("\n");
}

function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- 设置弹窗 ---------- */
const modal = document.getElementById("settings-modal");
function openSettings() {
  document.getElementById("set-provider").value = settings.provider;
  document.getElementById("set-key").value = settings.apiKey;
  document.getElementById("set-model").value = settings.model;
  modal.classList.remove("hidden");
}
document.getElementById("btn-settings").addEventListener("click", openSettings);
document.getElementById("set-cancel").addEventListener("click", () => modal.classList.add("hidden"));
document.getElementById("set-save").addEventListener("click", () => {
  settings.provider = document.getElementById("set-provider").value;
  settings.apiKey = document.getElementById("set-key").value.trim();
  settings.model = document.getElementById("set-model").value.trim() ||
    (settings.provider === "anthropic" ? "claude-sonnet-4-6" : "gpt-4o");
  saveSettings();
  modal.classList.add("hidden");
  toast("设置已保存", "ok");
});
document.getElementById("set-provider").addEventListener("change", e => {
  const m = document.getElementById("set-model");
  if (!m.value.trim()) {
    m.value = e.target.value === "anthropic" ? "claude-sonnet-4-6" : "gpt-4o";
  }
});

/* ---------- helpers ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

/* ---------- 初始渲染 ---------- */
function renderAll() {
  renderCaseInfo();
  renderAccusations();
  renderFacts();
  renderEvidence();
  const out = document.getElementById("analysis-output");
  const last = ["strategy", "priority", "cross", "elements"].find(k => state.analyses[k]);
  if (last) {
    out.innerHTML = `<h3>【${analysisPrompts[last].title}】（上次结果）</h3>` +
      renderMarkdownLite(state.analyses[last]);
  }
}
renderAll();

const SPEAKER_PALETTE = [
  "#1f6feb", "#d97706", "#7c3aed", "#059669",
  "#db2777", "#0891b2", "#65a30d", "#dc2626",
];

const state = {
  transcript: null,
  ws: null,
  speakerNames: {},
  speakerColors: {},
  showLowConf: true,
  showDiff: true,
  autoscroll: true,
  currentWordEl: null,
  currentSegEl: null,
  storageKey: "courtSpeakers",
  jobId: null,
  pollTimer: null,
  selectedFile: null,
  health: null,
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const fmtTime = (s) => {
  if (!isFinite(s)) return "00:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

function show(screen) {
  ["uploadScreen", "progressScreen", "viewerScreen"].forEach(id => {
    $("#" + id).classList.toggle("hidden", id !== screen);
  });
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3000);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// ---------------- Upload flow ----------------

async function loadHealth() {
  try {
    const r = await fetch("/api/health");
    state.health = await r.json();
    const engs = state.health.engines_configured || [];
    const trans = state.health.translators_configured || [];
    $("#healthInfo").innerHTML = `
      <div class="health-line">已配置转写引擎: <b>${engs.join(", ") || "无"}</b></div>
      <div class="health-line">已配置翻译引擎: <b>${trans.join(", ") || "无"}</b></div>
    `;
    $$("#engineGrid .engine-row").forEach(row => {
      const eng = row.dataset.engine;
      if (!engs.includes(eng)) {
        row.classList.add("disabled");
        row.querySelector("input").disabled = true;
        row.querySelector("input").checked = false;
      }
    });
  } catch (e) {
    $("#healthInfo").innerHTML = `<div class="health-line err">无法连接后端</div>`;
  }
}

async function loadRecentJobs() {
  try {
    const r = await fetch("/api/jobs");
    if (!r.ok) return;
    const jobs = await r.json();
    if (!jobs.length) { $("#recentJobs").innerHTML = ""; return; }
    $("#recentJobs").innerHTML = `
      <h3>最近任务</h3>
      <div class="job-list">
        ${jobs.slice(0, 10).map(j => `
          <button class="job-item" data-id="${j.id}" data-status="${j.status}">
            <span class="ji-name">${escapeHTML(j.filename || j.id)}</span>
            <span class="ji-status ${j.status}">${
              j.status === "done" ? `✓ ${j.stats?.review_words || 0} 待核` :
              j.status === "failed" ? "✗ 失败" :
              j.status === "running" ? "⟳ 进行中" : "○ 等待"
            }</span>
          </button>
        `).join("")}
      </div>
    `;
    $$("#recentJobs .job-item").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (btn.dataset.status === "done") openViewer(id);
        else openProgress(id);
      };
    });
  } catch {}
}

function bindUpload() {
  const input = $("#fileInput");
  const drop = $("#fileDrop");
  const name = $("#fileName");

  function setFile(f) {
    state.selectedFile = f;
    if (f) {
      name.textContent = `${f.name} · ${(f.size / 1024 / 1024).toFixed(1)} MB`;
      name.classList.remove("hidden");
    } else {
      name.classList.add("hidden");
    }
  }
  input.onchange = (e) => setFile(e.target.files[0]);
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => {
    e.preventDefault();
    drop.classList.remove("over");
    if (e.dataTransfer.files[0]) {
      input.files = e.dataTransfer.files;
      setFile(e.dataTransfer.files[0]);
    }
  });

  $("#startBtn").onclick = startUpload;
  $("#newJobBtn").onclick = () => {
    state.jobId = null;
    if (state.pollTimer) clearTimeout(state.pollTimer);
    show("uploadScreen");
    loadRecentJobs();
  };
  $("#cancelBtn").onclick = () => {
    if (state.pollTimer) clearTimeout(state.pollTimer);
    show("uploadScreen");
  };
}

async function startUpload() {
  if (!state.selectedFile) { toast("请先选择音频文件"); return; }
  const engines = $$("#engineGrid input:checked").map(i => i.value);
  if (!engines.length) { toast("至少选一个转写引擎"); return; }

  const fd = new FormData();
  fd.append("file", state.selectedFile);
  fd.append("engines", engines.join(","));

  $("#startBtn").disabled = true;
  $("#startBtn").textContent = "上传中…";
  try {
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    openProgress(data.job_id);
  } catch (e) {
    toast("上传失败: " + e.message);
    $("#startBtn").disabled = false;
    $("#startBtn").textContent = "开始转写";
  }
}

function openProgress(jobId) {
  state.jobId = jobId;
  show("progressScreen");
  $("#progressTitle").textContent = "转写中…";
  $("#engineProgress").innerHTML = "";
  $("#jobLog").innerHTML = "";
  pollJob();
}

async function pollJob() {
  if (!state.jobId) return;
  try {
    const r = await fetch(`/api/jobs/${state.jobId}`);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const job = await r.json();
    renderProgress(job);
    if (job.status === "done") {
      $("#progressTitle").textContent = "完成 · 加载查看器…";
      setTimeout(() => openViewer(state.jobId), 600);
      return;
    }
    if (job.status === "failed") {
      $("#progressTitle").textContent = "失败";
      return;
    }
  } catch (e) {
    $("#jobLog").innerHTML += `<div class="log-line err">轮询失败: ${e.message}</div>`;
  }
  state.pollTimer = setTimeout(pollJob, 2000);
}

function renderProgress(job) {
  const labels = {
    deepgram: "Deepgram", assemblyai: "AssemblyAI",
    groq: "Groq", replicate: "Replicate WhisperX",
  };
  $("#engineProgress").innerHTML = job.engines.map(e => {
    const st = job.engine_status[e] || "queued";
    const icon = { queued: "○", running: "⟳", done: "✓", failed: "✗" }[st];
    return `<div class="engine-status ${st}">
      <span class="es-icon">${icon}</span>
      <span class="es-name">${labels[e] || e}</span>
      <span class="es-status">${st}</span>
    </div>`;
  }).join("");
  $("#jobLog").innerHTML = job.logs.map(l =>
    `<div class="log-line">${escapeHTML(l)}</div>`).join("");
  $("#jobLog").scrollTop = $("#jobLog").scrollHeight;
}

// ---------------- Viewer ----------------

async function openViewer(jobId) {
  show("viewerScreen");
  const r = await fetch(`/api/jobs/${jobId}/transcript`);
  if (!r.ok) { toast("加载转写失败"); show("uploadScreen"); return; }
  state.transcript = await r.json();
  state.jobId = jobId;
  loadSpeakerNames();
  assignSpeakerColors();
  updateMeta();
  initWaveform();
  renderSpeakers();
  renderReviewJumps();
  renderTranscript();
}

function loadSpeakerNames() {
  try {
    const all = JSON.parse(localStorage.getItem(state.storageKey) || "{}");
    state.speakerNames = all[state.jobId] || {};
  } catch { state.speakerNames = {}; }
}
function saveSpeakerNames() {
  const all = JSON.parse(localStorage.getItem(state.storageKey) || "{}");
  all[state.jobId] = state.speakerNames;
  localStorage.setItem(state.storageKey, JSON.stringify(all));
}

function assignSpeakerColors() {
  state.speakerColors = {};
  const ids = [...new Set(state.transcript.segments.map(s => s.speaker))].sort();
  ids.forEach((id, i) => state.speakerColors[id] = SPEAKER_PALETTE[i % SPEAKER_PALETTE.length]);
}

function speakerLabel(rawId) {
  return state.speakerNames[rawId] || `说话人 ${rawId}`;
}

function initWaveform() {
  if (state.ws) { try { state.ws.destroy(); } catch {} }
  state.ws = WaveSurfer.create({
    container: "#waveform",
    waveColor: "#c8c5bb",
    progressColor: "#1f6feb",
    cursorColor: "#1a1a1a",
    height: 60, barWidth: 2, barGap: 1, barRadius: 2,
    url: state.transcript.audio,
  });
  state.ws.on("ready", () => {
    $("#durationLabel").textContent = fmtTime(state.ws.getDuration());
    updateTimeLabel();
  });
  state.ws.on("timeupdate", onAudioProcess);
  state.ws.on("seeking", onAudioProcess);
  state.ws.on("play", () => $("#playPause").textContent = "⏸");
  state.ws.on("pause", () => $("#playPause").textContent = "▶");

  $("#playPause").onclick = () => state.ws.playPause();
  $("#back5").onclick = () => state.ws.setTime(Math.max(0, state.ws.getCurrentTime() - 5));
  $("#fwd5").onclick = () => state.ws.setTime(state.ws.getCurrentTime() + 5);
  $("#speed").onchange = (e) => state.ws.setPlaybackRate(parseFloat(e.target.value));
}

function updateTimeLabel() {
  $("#timeLabel").textContent =
    `${fmtTime(state.ws.getCurrentTime())} / ${fmtTime(state.ws.getDuration())}`;
}

function onAudioProcess() {
  updateTimeLabel();
  highlightAt(state.ws.getCurrentTime());
}

function highlightAt(t) {
  const seg = state.transcript.segments.find(s => t >= s.start && t <= s.end);
  if (seg) {
    const segEl = document.getElementById(`seg-${seg.id}`);
    if (segEl !== state.currentSegEl) {
      state.currentSegEl?.classList.remove("active");
      segEl?.classList.add("active");
      state.currentSegEl = segEl;
      if (state.autoscroll && segEl) {
        const rect = segEl.getBoundingClientRect();
        if (rect.top < 220 || rect.bottom > window.innerHeight - 50) {
          segEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
    const word = seg.words.find(w => t >= w.start && t <= w.end);
    if (word) {
      const idx = seg.words.indexOf(word);
      const wEl = segEl?.querySelector(`[data-w="${idx}"]`);
      if (wEl !== state.currentWordEl) {
        state.currentWordEl?.classList.remove("playing");
        wEl?.classList.add("playing");
        state.currentWordEl = wEl;
      }
    }
  } else if (state.currentSegEl) {
    state.currentSegEl.classList.remove("active");
    state.currentWordEl?.classList.remove("playing");
    state.currentSegEl = state.currentWordEl = null;
  }
}

function renderSpeakers() {
  const ids = Object.keys(state.speakerColors);
  $("#speakerList").innerHTML = ids.map(id => `
    <div class="speaker-row" data-id="${id}">
      <span class="speaker-swatch" style="background:${state.speakerColors[id]}"></span>
      <span class="speaker-name">
        <input type="text" data-spk="${id}" value="${escapeHTML(speakerLabel(id))}"
               placeholder="说话人 ${id}">
      </span>
    </div>
  `).join("");
  $$("#speakerList input").forEach(inp => {
    inp.addEventListener("change", e => {
      const id = e.target.dataset.spk;
      const v = e.target.value.trim();
      if (v && v !== `说话人 ${id}`) state.speakerNames[id] = v;
      else delete state.speakerNames[id];
      saveSpeakerNames();
      renderTranscript();
    });
  });
}

function renderReviewJumps() {
  const jumps = [];
  state.transcript.segments.forEach(seg => {
    const n = seg.words.filter(w => w.needs_review).length;
    if (n > 0) jumps.push({ id: seg.id, time: seg.start, count: n });
  });
  $("#reviewJump").innerHTML = jumps.length
    ? jumps.slice(0, 80).map(j => `
        <button class="jumplink" data-time="${j.time}" data-seg="${j.id}">
          ${fmtTime(j.time)} · ⚠ ${j.count}
        </button>`).join("")
    : `<div style="font-size:12px;color:var(--ink-mute)">无待核</div>`;
  $$("#reviewJump .jumplink").forEach(btn => {
    btn.onclick = () => {
      state.ws.setTime(parseFloat(btn.dataset.time));
      document.getElementById(`seg-${btn.dataset.seg}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  });
}

function wordClass(w) {
  const c = ["word"];
  if (state.showLowConf && w.conf < 0.7) c.push("low-conf");
  if (state.showDiff && (w.alternatives?.length || 0) > 0) c.push("diff");
  return c.join(" ");
}

function renderTranscript() {
  const html = state.transcript.segments.map(seg => `
    <div class="segment" id="seg-${seg.id}" data-seg="${seg.id}">
      <div class="seg-meta">
        <span class="speaker-chip" style="background:${state.speakerColors[seg.speaker]}">
          ${escapeHTML(speakerLabel(seg.speaker))}
        </span>
        <span class="seg-time mono" data-time="${seg.start}">${fmtTime(seg.start)}</span>
      </div>
      <div class="seg-text">
        ${seg.words.map((w, i) =>
          `<span class="${wordClass(w)}" data-seg="${seg.id}" data-w="${i}">${escapeHTML(w.w)}</span>`
        ).join(" ")}
      </div>
      <div class="seg-actions">
        <button class="btn-translate" data-seg="${seg.id}" title="翻译比对">🌐 译</button>
      </div>
    </div>
  `).join("");
  $("#transcript").innerHTML = html;
  bindTranscriptEvents();
}

function bindTranscriptEvents() {
  $$(".seg-time").forEach(el => {
    el.onclick = () => state.ws.setTime(parseFloat(el.dataset.time));
  });
  $$(".word").forEach(el => {
    el.addEventListener("click", (e) => {
      const segId = parseInt(el.dataset.seg);
      const wIdx = parseInt(el.dataset.w);
      const seg = state.transcript.segments.find(s => s.id === segId);
      openPopover(e, seg.words[wIdx]);
    });
  });
  $$(".btn-translate").forEach(el => {
    el.onclick = () => openTranslatePanel(parseInt(el.dataset.seg));
  });
}

function openPopover(evt, word) {
  const pop = $("#popover");
  pop.querySelector(".pop-current").innerHTML = `
    <div class="pop-word">${escapeHTML(word.w)}</div>
    <div class="conf">置信度 ${(word.conf * 100).toFixed(0)}% ·
      ${fmtTime(word.start)}–${fmtTime(word.end)}</div>
  `;
  const alts = word.alternatives || [];
  pop.querySelector(".pop-alts").innerHTML = alts.length
    ? alts.map(a => `
        <div class="alt">
          <span class="alt-w">${escapeHTML(a.w)}</span>
          <span class="alt-engine">${a.engine} · ${(a.conf * 100).toFixed(0)}%</span>
        </div>`).join("")
    : `<div class="alt-empty">所有引擎一致</div>`;
  pop.querySelector(".pop-play").onclick = () => {
    state.ws.setTime(Math.max(0, word.start - 0.3));
    state.ws.play();
    setTimeout(() => state.ws.pause(), Math.max(900, (word.end - word.start) * 1000 + 600));
  };
  pop.classList.remove("hidden");
  const rect = evt.target.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - 300);
  const top = rect.bottom + 6;
  pop.style.left = `${left}px`;
  pop.style.top = `${top + (top + 320 > window.innerHeight ? -340 : 0)}px`;
}

async function openTranslatePanel(segId) {
  const seg = state.transcript.segments.find(s => s.id === segId);
  const panel = $("#translatePanel");
  panel.querySelector(".tp-range").textContent =
    `${fmtTime(seg.start)} – ${fmtTime(seg.end)} · ${speakerLabel(seg.speaker)}`;
  panel.querySelector(".tp-en").textContent = seg.text;

  const next = state.transcript.segments[segId + 1];
  const humanBody = panel.querySelector('[data-engine=human] .tcard-body');
  if (next && next.speaker !== seg.speaker && next.start - seg.end < 8) {
    humanBody.textContent = next.text;
  } else {
    humanBody.textContent = "（未自动定位到翻译员的对应段）";
  }
  humanBody.classList.remove("loading");

  ["claude", "gpt", "gemini"].forEach(e => {
    const b = panel.querySelector(`[data-engine=${e}] .tcard-body`);
    b.textContent = "翻译中…";
    b.className = "tcard-body loading";
  });
  panel.classList.remove("hidden");

  try {
    const r = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: seg.text }),
    });
    const data = await r.json();
    ["claude", "gpt", "gemini"].forEach(e => {
      const b = panel.querySelector(`[data-engine=${e}] .tcard-body`);
      if (!(e in data)) {
        b.textContent = "（未配置）";
        b.className = "tcard-body loading";
        return;
      }
      const v = data[e] || "";
      if (v.startsWith("[ERROR")) {
        b.textContent = v;
        b.className = "tcard-body error";
      } else {
        b.textContent = v;
        b.className = "tcard-body";
      }
    });
  } catch (e) {
    toast(`翻译失败: ${e.message}`);
  }
}

function updateMeta() {
  const m = state.transcript;
  $("#engineLabel").textContent =
    `主: ${m.primary_engine}` +
    (m.compared_engines?.length ? ` · 比对: ${m.compared_engines.join(", ")}` : "");
  $("#reviewLabel").textContent = `待核 ${m.stats.review_words}/${m.stats.total_words}`;
}

function bindGlobal() {
  $$(".close").forEach(b => {
    b.onclick = () => document.getElementById(b.dataset.target).classList.add("hidden");
  });
  document.addEventListener("click", (e) => {
    const pop = $("#popover");
    if (!pop.classList.contains("hidden") &&
        !pop.contains(e.target) &&
        !e.target.classList.contains("word")) {
      pop.classList.add("hidden");
    }
  });
  $("#toggleLowConf").onchange = e => { state.showLowConf = e.target.checked; renderTranscript(); };
  $("#toggleDiff").onchange = e => { state.showDiff = e.target.checked; renderTranscript(); };
  $("#toggleAutoscroll").onchange = e => { state.autoscroll = e.target.checked; };
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") return;
    if (!$("#viewerScreen") || $("#viewerScreen").classList.contains("hidden")) return;
    if (e.code === "Space") { e.preventDefault(); state.ws?.playPause(); }
    if (e.code === "ArrowLeft") state.ws?.setTime(Math.max(0, state.ws.getCurrentTime() - 3));
    if (e.code === "ArrowRight") state.ws?.setTime(state.ws.getCurrentTime() + 3);
    if (e.key === "Escape") {
      $("#popover").classList.add("hidden");
      $("#translatePanel").classList.add("hidden");
    }
  });
}

(async function init() {
  bindUpload();
  bindGlobal();
  await loadHealth();
  await loadRecentJobs();
  show("uploadScreen");
})();

(() => {
  const KEY_STORAGE = 'openai_api_key';
  const COLOR_MAP = {
    'sleep':         '#5e5ce6',
    'cooking':       '#ff9f0a',
    'meeting':       '#0a84ff',
    'one-on-one':    '#10a37f',
    'silence':       '#3a3a3c',
    'entertainment': '#bf5af2',
    'commuting':     '#64d2ff',
    'work':          '#30d158',
    'phone-call':    '#ff375f',
    'uncertain':     '#8e8e93',
  };

  function colorFor(label) {
    if (COLOR_MAP[label]) return COLOR_MAP[label];
    // Hash unknown labels to a stable HSL
    let h = 0;
    for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) & 0xFFFF;
    return `hsl(${h % 360}, 60%, 55%)`;
  }

  function formatMMSS(sec) {
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${m}:${String(ss).padStart(2, '0')}`;
  }

  function estimateCost(durationSec, numWindows) {
    const whisper = (durationSec / 60) * 0.006;
    const tokensPerWindow = 700; // ~500 in + 200 out
    const classify = (numWindows * tokensPerWindow / 1_000_000) * 0.3;
    return { whisper, classify, total: whisper + classify };
  }

  // ---------- DOM refs ----------
  let drop, fileInput, status, stage, progress, costEl, goBtn, cancelBtn;
  let canvasWrap, canvas, tooltip, searchInput, snippet;
  let keyModal, keyInput, keySave, keyCancel, keyBtn;
  let segmentsCache = [];
  let wordsCache = [];
  let durationCache = 0;
  let pendingFile = null;
  let pendingSha = null;
  let pendingChunks = null;
  let pendingWindowCount = 0;
  let runController = null;
  let searchHighlights = [];

  function $(id) { return document.getElementById(id); }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function setStage(text) { if (stage) stage.textContent = text; }
  function setProgress(done, total) {
    if (!progress) return;
    if (total > 0) { progress.max = total; progress.value = done; }
  }

  // ---------- Key management ----------
  function getKey() { return localStorage.getItem(KEY_STORAGE) || ''; }
  function setKey(k) { localStorage.setItem(KEY_STORAGE, k); }
  function clearKey() { localStorage.removeItem(KEY_STORAGE); }
  function maskKey(k) {
    if (!k) return '(none)';
    if (k.length <= 8) return 'sk-…';
    return `${k.slice(0, 3)}…${k.slice(-4)}`;
  }

  function showKeyModal(reason = 'Paste your OpenAI API key') {
    if (!keyModal) return;
    keyInput.value = '';
    keyModal.querySelector('.key-modal-reason').textContent = reason;
    show(keyModal);
    setTimeout(() => keyInput.focus(), 50);
  }

  function showKeyPanel() {
    const cur = getKey();
    if (!cur) { showKeyModal(); return; }
    if (confirm(`Current key: ${maskKey(cur)}\n\nClear it?`)) {
      clearKey();
    }
  }

  // ---------- Pipeline ----------
  function resetUI() {
    hide(status);
    hide(canvasWrap);
    hide(searchInput);
    hide(snippet);
    setStage('');
    setProgress(0, 1);
    pendingFile = null;
    pendingSha = null;
    pendingChunks = null;
    pendingWindowCount = 0;
    searchHighlights = [];
  }

  async function onFile(file) {
    if (!file) return;
    if (!getKey()) { showKeyModal('Need an OpenAI API key to transcribe'); return; }

    resetUI();
    show(status);
    setStage('Inspecting file…');
    goBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      await window.TLMP3.detectFormat(file);
    } catch (e) {
      setStage(String(e.message || e));
      return;
    }

    setStage('Hashing file (cache check)…');
    let sha;
    try {
      sha = await window.TLMP3.sha256OfFile(file, (done, total) => setProgress(done, total));
    } catch (e) {
      setStage(`Hash failed: ${e.message || e}`);
      return;
    }

    const cached = await window.TLDB.get(sha);
    if (cached) {
      setStage('Loaded from cache');
      durationCache = cached.durationSec;
      wordsCache = cached.transcript || [];
      segmentsCache = cached.segments || [];
      render();
      return;
    }

    setStage('Scanning frames…');
    setProgress(0, file.size);
    const chunks = [];
    for await (const c of window.TLMP3.chunkFile(file, {
      onProgress: (done, total) => setProgress(done, total),
    })) {
      chunks.push(c);
    }
    if (!chunks.length) {
      setStage('No audio frames found.');
      return;
    }

    const duration = chunks[chunks.length - 1].endSec;
    const numWindows = Math.ceil(duration / 300);
    const cost = estimateCost(duration, numWindows);

    pendingFile = file;
    pendingSha = sha;
    pendingChunks = chunks;
    pendingWindowCount = numWindows;
    durationCache = duration;

    setStage(`${formatMMSS(duration)} · ${chunks.length} chunk${chunks.length > 1 ? 's' : ''} · ~${numWindows} window${numWindows > 1 ? 's' : ''}`);
    costEl.textContent = `Est. cost: $${cost.total.toFixed(3)} (Whisper $${cost.whisper.toFixed(3)} + classify $${cost.classify.toFixed(3)})`;
    goBtn.disabled = false;
    setProgress(0, 1);
  }

  async function runPipeline() {
    if (!pendingFile || !pendingChunks) return;
    goBtn.disabled = true;
    cancelBtn.disabled = false;
    runController = new AbortController();
    const signal = runController.signal;

    const apiKey = getKey();
    if (!apiKey) { showKeyModal(); goBtn.disabled = false; return; }

    try {
      setStage(`Transcribing 0/${pendingChunks.length}…`);
      setProgress(0, pendingChunks.length);
      const transcript = await window.TLWhisper.transcribeAll(pendingChunks, apiKey, {
        concurrency: 3,
        signal,
        onChunkDone: (i, total) => {
          setStage(`Transcribing ${i + 1}/${total}…`);
          setProgress(i + 1, total);
        },
        onError: (i, e) => {
          console.warn(`Chunk ${i} failed:`, e);
        },
      });

      if (signal.aborted) return;

      setStage('Bucketing windows…');
      const windows = window.TLActivity.windowize(transcript.words, 300);
      window.TLActivity.prefilterSilence(windows);

      const toClassify = windows.filter(w => !w.prefiltered).length;
      setStage(`Classifying 0/${toClassify}…`);
      setProgress(0, Math.max(1, Math.ceil(toClassify / 10)));

      await window.TLActivity.classifyAll(windows, apiKey, {
        batchSize: 10,
        concurrency: 2,
        signal,
        onProgress: (done, total) => {
          setStage(`Classifying batch ${done}/${total}…`);
          setProgress(done, total);
        },
      });

      if (signal.aborted) return;

      const segments = window.TLActivity.mergeAdjacent(windows);
      wordsCache = transcript.words;
      segmentsCache = segments;
      durationCache = transcript.duration;

      await window.TLDB.put({
        sha256: pendingSha,
        filename: pendingFile.name,
        durationSec: transcript.duration,
        transcript: transcript.words,
        segments,
        createdAt: Date.now(),
        schemaVersion: 1,
      });

      const failedNote = transcript.failedChunks.length
        ? ` (${transcript.failedChunks.length} chunk failures shown as uncertain)`
        : '';
      setStage(`Done${failedNote}`);
      render();
    } catch (e) {
      if (e.name === 'AbortError') {
        setStage('Cancelled.');
      } else {
        setStage(`Error: ${e.message || e}`);
        console.error(e);
      }
    } finally {
      runController = null;
      cancelBtn.disabled = true;
      goBtn.disabled = false;
    }
  }

  function cancel() {
    if (runController) runController.abort();
  }

  // ---------- Rendering ----------
  function fitCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvasWrap.clientWidth || 260;
    const cssH = 60;
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    return { dpr, cssW, cssH };
  }

  function drawTimeline() {
    if (!canvas || !segmentsCache.length || !durationCache) return;
    const { dpr, cssW, cssH } = fitCanvas();
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // Background bar
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(0, 8, cssW, cssH - 24);

    // Segments
    for (const seg of segmentsCache) {
      const x = (seg.startSec / durationCache) * cssW;
      const w = Math.max(1, ((seg.endSec - seg.startSec) / durationCache) * cssW);
      ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.min(1, seg.confidence || 0));
      ctx.fillStyle = colorFor(seg.label);
      ctx.fillRect(x, 8, w, cssH - 24);
    }
    ctx.globalAlpha = 1;

    // Search highlights (yellow underline)
    if (searchHighlights.length) {
      ctx.fillStyle = '#ffd60a';
      for (const seg of searchHighlights) {
        const x = (seg.startSec / durationCache) * cssW;
        const w = Math.max(2, ((seg.endSec - seg.startSec) / durationCache) * cssW);
        ctx.fillRect(x, cssH - 14, w, 3);
      }
    }

    // Time ruler (start / mid / end)
    ctx.fillStyle = '#8e8e93';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('0:00', 2, cssH - 10);
    const midText = formatMMSS(durationCache / 2);
    const midW = ctx.measureText(midText).width;
    ctx.fillText(midText, cssW / 2 - midW / 2, cssH - 10);
    const endText = formatMMSS(durationCache);
    const endW = ctx.measureText(endText).width;
    ctx.fillText(endText, cssW - endW - 2, cssH - 10);
  }

  function render() {
    hide(status);
    show(canvasWrap);
    show(searchInput);
    show(snippet);
    snippet.textContent = 'Tap a segment to see what was said.';
    drawTimeline();
  }

  function segmentAtX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    if (ratio < 0 || ratio > 1) return null;
    const t = ratio * durationCache;
    return segmentsCache.find(s => t >= s.startSec && t < s.endSec) || null;
  }

  function onCanvasClick(e) {
    const seg = segmentAtX(e.clientX);
    if (!seg) return;
    const segWords = wordsCache
      .filter(w => w.start >= seg.startSec && w.start < seg.endSec)
      .map(w => w.word)
      .join('')
      .trim();
    const head = `[${formatMMSS(seg.startSec)}–${formatMMSS(seg.endSec)}] ${seg.label} (${(seg.confidence * 100).toFixed(0)}%)`;
    snippet.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'tl-snippet-head';
    h.textContent = head;
    const b = document.createElement('div');
    b.className = 'tl-snippet-body';
    b.textContent = segWords || '(no transcript for this segment)';
    snippet.appendChild(h);
    snippet.appendChild(b);
  }

  function onCanvasMove(e) {
    const seg = segmentAtX(e.clientX);
    if (!seg) { hide(tooltip); return; }
    const rect = canvas.getBoundingClientRect();
    tooltip.textContent = `${seg.label} · ${formatMMSS(seg.startSec)}–${formatMMSS(seg.endSec)}`;
    tooltip.style.left = (e.clientX - rect.left + 8) + 'px';
    tooltip.style.top = (e.clientY - rect.top - 24) + 'px';
    show(tooltip);
  }

  function onSearch() {
    const q = (searchInput.value || '').trim().toLowerCase();
    if (!q) { searchHighlights = []; drawTimeline(); return; }
    searchHighlights = segmentsCache.filter(s => (s.text || '').toLowerCase().includes(q));
    drawTimeline();
  }

  // ---------- Entry/exit ----------
  function enter() {
    if (!drop) bind();
    if (!getKey()) showKeyModal('Need an OpenAI API key to transcribe');
  }

  function leave() {
    cancel();
  }

  function bind() {
    drop = $('tlDrop');
    fileInput = $('tlFile');
    status = $('tlStatus');
    stage = $('tlStage');
    progress = $('tlProgress');
    costEl = $('tlCost');
    goBtn = $('tlGo');
    cancelBtn = $('tlCancel');
    canvasWrap = $('tlCanvasWrap');
    canvas = $('tlCanvas');
    tooltip = $('tlTooltip');
    searchInput = $('tlSearch');
    snippet = $('tlSnippet');
    keyModal = $('keyModal');
    keyInput = $('keyInput');
    keySave = $('keySave');
    keyCancel = $('keyCancel');
    keyBtn = $('tlKeyBtn');

    if (!drop) return;

    drop.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) onFile(f);
    });
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('is-dragover');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-dragover'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-dragover');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onFile(f);
    });

    goBtn.addEventListener('click', () => runPipeline());
    cancelBtn.addEventListener('click', () => cancel());
    keyBtn.addEventListener('click', () => showKeyPanel());

    keySave.addEventListener('click', () => {
      const v = keyInput.value.trim();
      if (!v) return;
      setKey(v);
      hide(keyModal);
    });
    keyCancel.addEventListener('click', () => hide(keyModal));
    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') keySave.click();
      if (e.key === 'Escape') hide(keyModal);
    });

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMove);
    canvas.addEventListener('mouseleave', () => hide(tooltip));
    searchInput.addEventListener('input', onSearch);

    window.addEventListener('resize', () => {
      if (segmentsCache.length) drawTimeline();
    });
  }

  window.TL = { enter, leave };
})();

/* 替尔泊肽 / 司美格鲁肽 一键记录
 * 数据存 localStorage，纯前端
 * 事件结构: { id, t (ms), type: 'meal'|'shot'|'weight', drug?, dose?, value? }
 */

const KEY = 'glp1.events.v1';

/* ---------- 存储 ---------- */
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
let events = load();

/* ---------- 工具 ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function fmtAgo(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60)   return s + ' 秒前';
  const m = Math.floor(s / 60);
  if (m < 60)   return m + ' 分钟前';
  const h = m / 60;
  if (h < 24)   return h.toFixed(h < 10 ? 1 : 0) + ' 小时前';
  const d = h / 24;
  return d.toFixed(d < 10 ? 1 : 0) + ' 天前';
}

function fmtClock(t) {
  const d = new Date(t);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm}`;
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `昨天 ${hh}:${mm}`;
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${mo}-${da} ${hh}:${mm}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function lastOf(type) {
  for (let i = events.length - 1; i >= 0; i--) if (events[i].type === type) return events[i];
  return null;
}

/* ---------- 渲染：顶部状态 ---------- */
function renderStatus() {
  const now = Date.now();
  const lm = lastOf('meal');
  const ls = lastOf('shot');
  const lw = lastOf('weight');
  $('#sinceMeal').textContent = lm ? fmtAgo(now - lm.t) : '—';
  $('#sinceShot').textContent = ls ? fmtAgo(now - ls.t) : '—';
  $('#latestWeight').textContent = lw ? lw.value.toFixed(1) + ' kg' : '—';
}

/* ---------- 渲染：日志 ---------- */
function renderLog() {
  const ul = $('#log');
  ul.innerHTML = '';
  const empty = $('#emptyHint');
  if (events.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  // 倒序显示，最多 50 条
  const recent = [...events].slice(-50).reverse();
  for (const e of recent) {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.dataset.id = e.id;

    const icon = document.createElement('div');
    icon.className = 'log-icon ' + e.type;
    icon.textContent = e.type === 'meal' ? '🍽️' : e.type === 'shot' ? '💉' : '⚖️';

    const main = document.createElement('div');
    main.className = 'log-main';
    const title = document.createElement('div');
    title.className = 'log-title';
    const sub = document.createElement('div');
    sub.className = 'log-sub';

    if (e.type === 'meal') {
      title.textContent = '吃了一顿';
      sub.textContent = '一顿饭';
    } else if (e.type === 'shot') {
      const name = e.drug === 'semaglutide' ? '司美格鲁肽' : '替尔泊肽';
      title.textContent = `${name} 一针`;
      sub.textContent = e.dose ? `剂量 ${e.dose} mg` : '剂量未填';
    } else {
      title.textContent = '称了体重';
      sub.textContent = `${e.value.toFixed(1)} kg`;
    }

    const time = document.createElement('div');
    time.className = 'log-time';
    time.textContent = fmtClock(e.t);

    main.append(title, sub);
    li.append(icon, main, time);
    li.addEventListener('click', () => openEdit(e.id));
    ul.appendChild(li);
  }
}

/* ---------- 渲染：图表 ---------- */
function renderChart() {
  const cvs = $('#chart');
  const ctx = cvs.getContext('2d');
  const cssW = cvs.clientWidth || 600;
  const cssH = cvs.clientHeight || 220;
  const dpr = window.devicePixelRatio || 1;
  cvs.width = cssW * dpr;
  cvs.height = cssH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  // 取最近 30 天，按本地日期分桶
  const DAYS = 30;
  const DAY_MS = 86400000;
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const buckets = []; // { day, mealCount, shotCount, weight (last of day) }
  for (let i = DAYS - 1; i >= 0; i--) {
    const t = dayStart - i * DAY_MS;
    buckets.push({ day: t, mealCount: 0, shotCount: 0, weight: null });
  }
  const byDayIndex = (t) => {
    const d = new Date(t);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return DAYS - 1 - Math.round((dayStart - ds) / DAY_MS);
  };

  for (const e of events) {
    const i = byDayIndex(e.t);
    if (i < 0 || i >= DAYS) continue;
    if (e.type === 'meal') buckets[i].mealCount++;
    else if (e.type === 'shot') buckets[i].shotCount++;
    else if (e.type === 'weight') buckets[i].weight = e.value; // 一天多次取最后一次
  }

  // 布局
  const padL = 30, padR = 34, padT = 14, padB = 24;
  const w = cssW - padL - padR;
  const h = cssH - padT - padB;
  const colW = w / DAYS;

  // 顿数 Y 轴范围
  const maxMeals = Math.max(4, ...buckets.map(b => b.mealCount));

  // 体重范围：仅在有数据时
  const wList = buckets.map(b => b.weight).filter(v => v != null);
  let wMin = null, wMax = null;
  if (wList.length > 0) {
    wMin = Math.min(...wList);
    wMax = Math.max(...wList);
    if (wMin === wMax) { wMin -= 1; wMax += 1; }
    const pad = (wMax - wMin) * 0.2;
    wMin -= pad; wMax += pad;
  }

  // 背景网格（仅水平线）
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (h * i / 4);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke();
  }

  // 顿数柱
  for (let i = 0; i < DAYS; i++) {
    const b = buckets[i];
    if (b.mealCount > 0) {
      const bx = padL + i * colW + colW * 0.18;
      const bw = colW * 0.64;
      const bh = (b.mealCount / maxMeals) * h;
      const by = padT + h - bh;
      ctx.fillStyle = 'rgba(245, 166, 35, .8)';
      ctx.fillRect(bx, by, bw, bh);
    }
  }

  // 打针标记（屏底下方小三角）
  for (let i = 0; i < DAYS; i++) {
    const b = buckets[i];
    if (b.shotCount > 0) {
      const cx = padL + i * colW + colW / 2;
      const cy = padT + h + 6;
      ctx.fillStyle = '#4ea1ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx - 4, cy + 4);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 体重折线
  if (wMin != null) {
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < DAYS; i++) {
      const v = buckets[i].weight;
      if (v == null) continue;
      const x = padL + i * colW + colW / 2;
      const y = padT + h - ((v - wMin) / (wMax - wMin)) * h;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 圆点
    ctx.fillStyle = '#34d399';
    for (let i = 0; i < DAYS; i++) {
      const v = buckets[i].weight;
      if (v == null) continue;
      const x = padL + i * colW + colW / 2;
      const y = padT + h - ((v - wMin) / (wMax - wMin)) * h;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 左轴：顿数
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.font = '10px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = Math.round(maxMeals * (1 - i / 4));
    const y = padT + (h * i / 4);
    ctx.fillText(String(v), padL - 4, y);
  }
  // 右轴：体重
  if (wMin != null) {
    ctx.fillStyle = 'rgba(52, 211, 153, .8)';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const v = wMax - (wMax - wMin) * (i / 4);
      const y = padT + (h * i / 4);
      ctx.fillText(v.toFixed(1), padL + w + 4, y);
    }
  }

  // X 轴标注：仅显示首末日期
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const fmtDay = (t) => {
    const d = new Date(t);
    return (d.getMonth() + 1) + '/' + d.getDate();
  };
  ctx.fillText(fmtDay(buckets[0].day), padL + colW / 2, padT + h + 12);
  ctx.fillText(fmtDay(buckets[DAYS - 1].day), padL + w - colW / 2, padT + h + 12);
}

/* ---------- 渲染：合 ---------- */
function renderAll() {
  renderStatus();
  renderLog();
  renderChart();
}

/* ---------- 添加事件 ---------- */
function addEvent(e) {
  events.push(e);
  events.sort((a, b) => a.t - b.t);
  save(events);
  renderAll();
}

function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  save(events);
  renderAll();
}

/* ---------- 按钮：吃饭 ---------- */
$('.action-meal').addEventListener('click', () => {
  addEvent({ id: uid(), t: Date.now(), type: 'meal' });
  flash('.action-meal');
});

/* ---------- 按钮：打针 → 弹窗 ---------- */
const shotModal = $('#shotModal');
let selectedDrug = 'tirzepatide';
$$('#shotDrug .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('#shotDrug .seg-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    selectedDrug = btn.dataset.drug;
  });
});
$('.action-shot').addEventListener('click', () => {
  // 默认沿用上次的药与剂量
  const last = lastOf('shot');
  if (last) {
    selectedDrug = last.drug || 'tirzepatide';
    $$('#shotDrug .seg-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.drug === selectedDrug);
    });
    $('#shotDose').value = last.dose ?? '';
  } else {
    selectedDrug = 'tirzepatide';
    $$('#shotDrug .seg-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.drug === selectedDrug);
    });
    $('#shotDose').value = '';
  }
  openModal(shotModal);
  setTimeout(() => $('#shotDose').focus(), 50);
});
$('#shotSave').addEventListener('click', () => {
  const dose = parseFloat($('#shotDose').value);
  addEvent({
    id: uid(),
    t: Date.now(),
    type: 'shot',
    drug: selectedDrug,
    dose: Number.isFinite(dose) ? dose : null,
  });
  closeModal(shotModal);
  flash('.action-shot');
});

/* ---------- 按钮：体重 → 弹窗 ---------- */
const weightModal = $('#weightModal');
$('.action-weight').addEventListener('click', () => {
  const last = lastOf('weight');
  $('#weightValue').value = last ? last.value : '';
  openModal(weightModal);
  setTimeout(() => $('#weightValue').focus(), 50);
});
$('#weightSave').addEventListener('click', () => {
  const v = parseFloat($('#weightValue').value);
  if (!Number.isFinite(v) || v <= 0) {
    $('#weightValue').focus();
    return;
  }
  addEvent({ id: uid(), t: Date.now(), type: 'weight', value: v });
  closeModal(weightModal);
  flash('.action-weight');
});

/* ---------- 弹窗：编辑/删除 ---------- */
const editModal = $('#editModal');
let editingId = null;
function openEdit(id) {
  const e = events.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  let desc;
  if (e.type === 'meal') desc = '一顿饭';
  else if (e.type === 'shot') {
    const name = e.drug === 'semaglutide' ? '司美格鲁肽' : '替尔泊肽';
    desc = `${name}${e.dose ? '  ·  ' + e.dose + ' mg' : ''}`;
  } else desc = `体重 ${e.value.toFixed(1)} kg`;
  $('#editSummary').innerHTML = `<strong>${desc}</strong><br/>${fmtClock(e.t)}`;
  openModal(editModal);
}
$('#editDelete').addEventListener('click', () => {
  if (editingId) deleteEvent(editingId);
  editingId = null;
  closeModal(editModal);
});

/* ---------- 弹窗通用 ---------- */
function openModal(m) { m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false'); }
function closeModal(m) { m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true'); }
$$('[data-close]').forEach(btn => {
  btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal')));
});
$$('.modal').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
});

/* ---------- 按钮反馈 ---------- */
function flash(sel) {
  const el = document.querySelector(sel);
  if (!el) return;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 180);
}

/* ---------- 导出 CSV ---------- */
$('#exportCsv').addEventListener('click', () => {
  const rows = [['id', 'time_iso', 'time_local', 'type', 'drug', 'dose_mg', 'weight_kg']];
  for (const e of events) {
    rows.push([
      e.id,
      new Date(e.t).toISOString(),
      fmtClock(e.t),
      e.type,
      e.drug || '',
      e.dose ?? '',
      e.type === 'weight' ? e.value : '',
    ]);
  }
  const csv = rows.map(r => r.map(v => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `glp1-tracker-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------- 清空 ---------- */
$('#clearAll').addEventListener('click', () => {
  if (!confirm('确定清空所有记录？该操作不可撤销。建议先导出 CSV。')) return;
  events = [];
  save(events);
  renderAll();
});

/* ---------- 启动 ---------- */
renderAll();

// 让"距上一次"每分钟更新
setInterval(renderStatus, 60000);

// 屏幕方向 / 大小变化时重画
window.addEventListener('resize', renderChart);

// 切到前台时刷新
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderAll();
});

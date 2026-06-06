/*
 * 澳洲穿越地图 — 自定义图层
 * 底图: OpenStreetMap (Leaflet)，图层数据: Overpass API（均免费、无需 API Key）
 *
 * 设计要点：
 *  - 每个图层都按"当前地图视野(bbox)"查询，避免一次性加载全澳数据。
 *  - 道路类图层数据量大，设置了最低缩放级别(minZoom)，未达到时提示放大。
 *  - 平移/缩放后防抖 700ms 再请求；新请求会中断上一批未完成的请求。
 */

(() => {
  'use strict';

  // ---------- 地图初始化（默认聚焦澳大利亚） ----------
  const map = L.map('map', {
    center: [-25.0, 134.0], // 澳洲大致中心
    zoom: 5,
    zoomControl: true,
    worldCopyJump: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  // ---------- Overpass 端点（带备用，自动故障转移） ----------
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  // 单图层渲染上限，超出则提示放大（防止浏览器卡死）
  const MAX_FEATURES = 5000;

  /*
   * 图层定义
   *  id      唯一标识
   *  name    显示名
   *  color   颜色
   *  kind    'point' | 'line'
   *  minZoom 低于此缩放级别不加载（提示放大）
   *  query   (bboxStr) => Overpass QL 主体（南,西,北,东）
   */
  const LAYERS = [
    {
      id: 'kmart',
      name: 'Kmart 门店',
      color: '#e4002b',
      kind: 'point',
      minZoom: 4,
      query: (b) => `
        nwr["brand"~"Kmart",i](${b});
        nwr["name"~"Kmart",i](${b});`,
    },
    {
      id: 'mcdonalds',
      name: '麦当劳',
      color: '#d9a400',
      kind: 'point',
      minZoom: 5,
      query: (b) => `
        nwr["amenity"="fast_food"]["brand"~"McDonald",i](${b});
        nwr["amenity"="fast_food"]["name"~"McDonald",i](${b});`,
    },
    {
      id: 'towns',
      name: '城镇 / 定居点',
      color: '#4aa3ff',
      kind: 'point',
      minZoom: 4,
      query: (b) => `
        node["place"~"^(city|town|village)$"](${b});`,
    },
    {
      id: 'food',
      name: '可补给食物的地点',
      color: '#34c759',
      kind: 'point',
      minZoom: 8,
      query: (b) => `
        nwr["shop"~"^(supermarket|convenience|general|grocery)$"](${b});
        nwr["amenity"~"^(fast_food|restaurant|cafe)$"](${b});`,
    },
    {
      id: 'diesel',
      name: '加油站（含柴油）',
      color: '#ff9500',
      kind: 'point',
      minZoom: 6,
      query: (b) => `
        nwr["amenity"="fuel"](${b});`,
    },
    {
      id: 'asphalt',
      name: '柏油 / 铺装路面',
      color: '#222831',
      kind: 'line',
      minZoom: 10,
      query: (b) => `
        way["highway"]["surface"~"^(asphalt|paved|concrete|chipseal)$"](${b});`,
    },
    {
      id: 'roads',
      name: '所有道路',
      color: '#9aa3b2',
      kind: 'line',
      minZoom: 9,
      query: (b) => `
        way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|road)$"](${b});`,
    },
    {
      id: 'tracks',
      name: '可能的路 / 越野道',
      color: '#b5651d',
      kind: 'line',
      dashed: true,
      minZoom: 11,
      query: (b) => `
        way["highway"~"^(track|path)$"](${b});
        way["4wd_only"="yes"](${b});
        way["highway"]["surface"~"^(unpaved|dirt|ground|gravel|fine_gravel|compacted|sand|earth)$"](${b});`,
    },
  ];

  // 每个图层的运行时状态
  const state = {};
  LAYERS.forEach((l) => {
    state[l.id] = {
      enabled: false,
      group: L.layerGroup(),
      controller: null, // AbortController，用于中断进行中的请求
      countEl: null,
      hintEl: null,
      spinnerEl: null,
    };
  });

  // ---------- 构建控制面板 ----------
  const layersEl = document.getElementById('layers');
  const statusEl = document.getElementById('status');
  const toastEl = document.getElementById('toast');

  LAYERS.forEach((layer) => {
    const row = document.createElement('label');
    row.className = 'layer-row';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.id = layer.id;

    const swatch = document.createElement('span');
    swatch.className = 'swatch' + (layer.kind === 'line' ? ' line' : '');
    if (layer.kind === 'line') {
      swatch.style.borderTopColor = layer.color;
      if (layer.dashed) swatch.style.borderTopStyle = 'dashed';
    } else {
      swatch.style.background = layer.color;
    }

    const meta = document.createElement('span');
    meta.className = 'layer-meta';
    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = layer.name;
    const hint = document.createElement('div');
    hint.className = 'layer-hint';
    meta.appendChild(name);
    meta.appendChild(hint);

    const count = document.createElement('span');
    count.className = 'layer-count';

    row.appendChild(cb);
    row.appendChild(swatch);
    row.appendChild(meta);
    row.appendChild(count);
    layersEl.appendChild(row);

    state[layer.id].countEl = count;
    state[layer.id].hintEl = hint;

    cb.addEventListener('change', () => {
      const s = state[layer.id];
      s.enabled = cb.checked;
      if (cb.checked) {
        s.group.addTo(map);
        loadLayer(layer);
      } else {
        if (s.controller) s.controller.abort();
        s.group.clearLayers();
        s.group.remove();
        count.textContent = '';
      }
      updateHint(layer);
    });
  });

  // 折叠/展开面板
  const panel = document.getElementById('panel');
  document.getElementById('panelToggle').addEventListener('click', (e) => {
    panel.classList.toggle('collapsed');
    e.target.textContent = panel.classList.contains('collapsed') ? '+' : '−';
  });

  // ---------- 工具函数 ----------
  function bboxStr() {
    const b = map.getBounds();
    // Overpass 顺序: 南,西,北,东
    return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]
      .map((n) => n.toFixed(5))
      .join(',');
  }

  function updateHint(layer) {
    const s = state[layer.id];
    if (!s.enabled) {
      s.hintEl.textContent = '';
      s.hintEl.className = 'layer-hint';
      return;
    }
    if (map.getZoom() < layer.minZoom) {
      s.hintEl.textContent = `放大到 ${layer.minZoom} 级加载`;
      s.hintEl.className = 'layer-hint warn';
    } else {
      s.hintEl.className = 'layer-hint';
      s.hintEl.textContent = '';
    }
  }

  function setSpinner(layer, on) {
    const s = state[layer.id];
    if (on) {
      s.countEl.innerHTML = '<span class="spinner"></span>';
    }
  }

  let toastTimer = null;
  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.className = 'toast';
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ---------- Overpass 请求（带端点故障转移） ----------
  async function overpass(qlBody, signal) {
    const ql = `[out:json][timeout:25];(${qlBody});out geom;`;
    let lastErr;
    for (const url of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(ql),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal,
        });
        if (res.status === 429 || res.status === 504) {
          lastErr = new Error('overpass busy ' + res.status);
          continue; // 换下一个端点
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        lastErr = err;
      }
    }
    throw lastErr || new Error('all endpoints failed');
  }

  // ---------- 渲染 ----------
  function pointLatLng(el) {
    if (el.type === 'node') return [el.lat, el.lon];
    if (el.center) return [el.center.lat, el.center.lon];
    if (el.geometry && el.geometry.length) {
      // 退化情况：取首点
      return [el.geometry[0].lat, el.geometry[0].lon];
    }
    return null;
  }

  function popupFor(layer, el) {
    const t = el.tags || {};
    const title = t.name || t.brand || layer.name;
    let html = `<b>${escapeHtml(title)}</b>`;

    if (layer.id === 'diesel') {
      const diesel = t['fuel:diesel'];
      if (diesel === 'yes') html += `<br><span class="poi-tag yes">柴油 ✓</span>`;
      else if (diesel === 'no') html += `<br><span class="poi-tag no">无柴油</span>`;
      else html += `<br><span class="poi-tag">柴油未标注</span>`;
      if (t.operator) html += ` <span class="poi-tag">${escapeHtml(t.operator)}</span>`;
    }

    if (layer.id === 'food') {
      const kind = t.shop || t.amenity || '';
      if (kind) html += `<br><span class="poi-tag">${escapeHtml(kind)}</span>`;
    }

    if (layer.id === 'towns' && t.place) {
      html += `<br><span class="poi-tag">${escapeHtml(t.place)}</span>`;
      if (t.population) html += ` 人口 ${escapeHtml(t.population)}`;
    }

    if (layer.kind === 'line') {
      if (t.highway) html += `<br><span class="poi-tag">${escapeHtml(t.highway)}</span>`;
      if (t.surface) html += ` <span class="poi-tag">${escapeHtml(t.surface)}</span>`;
      if (t['4wd_only'] === 'yes') html += ` <span class="poi-tag">4WD</span>`;
    }

    if (t.opening_hours) html += `<br><small>${escapeHtml(t.opening_hours)}</small>`;
    return html;
  }

  function render(layer, elements) {
    const s = state[layer.id];
    s.group.clearLayers();

    const capped = elements.length > MAX_FEATURES;
    const list = capped ? elements.slice(0, MAX_FEATURES) : elements;

    if (layer.kind === 'point') {
      for (const el of list) {
        const ll = pointLatLng(el);
        if (!ll) continue;
        L.circleMarker(ll, {
          radius: 6,
          color: '#fff',
          weight: 1.5,
          fillColor: layer.color,
          fillOpacity: 0.95,
        })
          .bindPopup(popupFor(layer, el))
          .addTo(s.group);
      }
    } else {
      for (const el of list) {
        if (!el.geometry || el.geometry.length < 2) continue;
        const line = el.geometry.map((p) => [p.lat, p.lon]);
        L.polyline(line, {
          color: layer.color,
          weight: layer.id === 'asphalt' ? 3 : 2,
          opacity: 0.85,
          dashArray: layer.dashed ? '4 5' : null,
        })
          .bindPopup(popupFor(layer, el))
          .addTo(s.group);
      }
    }

    s.countEl.textContent = capped ? `${MAX_FEATURES}+` : String(list.length);
    if (capped) toast(`「${layer.name}」结果过多，仅显示前 ${MAX_FEATURES} 项，请放大查看`);
  }

  // ---------- 加载单个图层 ----------
  async function loadLayer(layer) {
    const s = state[layer.id];
    if (!s.enabled) return;

    updateHint(layer);
    if (map.getZoom() < layer.minZoom) {
      s.group.clearLayers();
      s.countEl.textContent = '';
      return;
    }

    // 中断上一批未完成的请求
    if (s.controller) s.controller.abort();
    s.controller = new AbortController();

    setSpinner(layer, true);
    try {
      const data = await overpass(layer.query(bboxStr()), s.controller.signal);
      // 请求返回时图层可能已被关闭
      if (!s.enabled) return;
      render(layer, data.elements || []);
    } catch (err) {
      if (err.name === 'AbortError') return; // 被新请求/关闭中断，静默
      s.countEl.textContent = '!';
      toast(`「${layer.name}」加载失败：${err.message}（可稍后重试，Overpass 有时限流）`, true);
    } finally {
      s.controller = null;
    }
  }

  function loadAllEnabled() {
    LAYERS.forEach((layer) => {
      updateHint(layer);
      if (state[layer.id].enabled) loadLayer(layer);
    });
  }

  // ---------- 地图移动后防抖刷新 ----------
  let moveTimer = null;
  map.on('moveend zoomend', () => {
    statusEl.textContent = `视野中心 ${map.getCenter().lat.toFixed(2)}, ${map.getCenter().lng.toFixed(2)} · 缩放 ${map.getZoom()}`;
    clearTimeout(moveTimer);
    moveTimer = setTimeout(loadAllEnabled, 700);
  });

  statusEl.textContent = '就绪 · 勾选上方图层开始';
})();

(() => {
  'use strict';

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const els = {
    origin: $('origin'),
    destination: $('destination'),
    apiKey: $('apiKey'),
    goBtn: $('goBtn'),
    threshold: $('threshold'),
    thresholdLabel: $('thresholdLabel'),
    result: $('result'),
    verdict: $('verdict'),
    freeTime: $('freeTime'),
    freeMeta: $('freeMeta'),
    tollTime: $('tollTime'),
    tollMeta: $('tollMeta'),
    tollCost: $('tollCost'),
    savedMin: $('savedMin'),
    pricePerMin: $('pricePerMin'),
    extraInfo: $('extraInfo'),
    segments: $('segments'),
    segmentList: $('segmentList'),
  };

  // ---------- Demo dataset (matches the Sydney M1 → CBD screenshot) ----------
  // Free  : 1h 24m, 70 km, A$0  · 沿 Pacific Hwy / Pennant Hills Rd / 北部桥梁
  // Toll  : 1h  8m, 78 km, A$28.31 · M1 + Lane Cove Tunnel + Cross City Tunnel + Eastern Distributor
  const DEMO = {
    free: {
      durationSec: 84 * 60,
      distanceMeters: 70_000,
      tollAUD: 0,
      maneuvers: 38,
      highwayShareKm: 22,
      polyline: [
        [-33.420, 151.198], [-33.470, 151.190], [-33.540, 151.170],
        [-33.610, 151.135], [-33.670, 151.110], [-33.713, 151.099],
        [-33.749, 151.083], [-33.780, 151.080], [-33.815, 151.090],
        [-33.838, 151.110], [-33.852, 151.135], [-33.860, 151.160],
        [-33.870, 151.180], [-33.890, 151.190], [-33.910, 151.187],
        [-33.920, 151.181],
      ],
      tolledRanges: [],
    },
    toll: {
      durationSec: 68 * 60,
      distanceMeters: 78_000,
      tollAUD: 28.31,
      maneuvers: 18,
      highwayShareKm: 58,
      polyline: [
        [-33.420, 151.198], [-33.470, 151.180], [-33.540, 151.160],
        [-33.610, 151.150], [-33.670, 151.150], [-33.713, 151.145],
        [-33.749, 151.140], [-33.780, 151.150], [-33.810, 151.155],
        [-33.831, 151.170], [-33.845, 151.190], [-33.860, 151.210],
        [-33.880, 151.215], [-33.900, 151.200], [-33.918, 151.185],
        [-33.920, 151.181],
      ],
      // index ranges in `polyline` that are tolled segments
      tolledRanges: [
        { from: 1, to: 6, name: 'M1 Pacific Motorway', priceAUD: 8.20 },
        { from: 6, to: 9, name: 'Lane Cove Tunnel', priceAUD: 4.50 },
        { from: 9, to: 12, name: 'Cross City Tunnel', priceAUD: 6.65 },
        { from: 12, to: 15, name: 'Eastern Distributor', priceAUD: 8.96 },
      ],
    },
  };

  // ---------- Core math ----------
  function compareRoutes(free, toll) {
    const savedSec = free.durationSec - toll.durationSec;
    const savedMin = savedSec / 60;
    const cost = toll.tollAUD;
    const pricePerMin = savedMin > 0 ? cost / savedMin : Infinity;
    return {
      savedMin,
      cost,
      pricePerMin,
      maneuversSaved: free.maneuvers - toll.maneuvers,
      highwayDeltaKm: toll.highwayShareKm - free.highwayShareKm,
      distanceDeltaKm: (toll.distanceMeters - free.distanceMeters) / 1000,
    };
  }

  function recommend(pricePerMin, thresholdPerMin) {
    if (!isFinite(pricePerMin)) return 'free';
    return pricePerMin <= thresholdPerMin ? 'toll' : 'free';
  }

  // ---------- Formatting ----------
  const fmtDur = (sec) => {
    const m = Math.round(sec / 60);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h ? `${h}h ${mm}m` : `${mm}m`;
  };
  const fmtKm = (m) => `${(m / 1000).toFixed(1)} km`;
  const fmtAUD = (v) => `A$${v.toFixed(2)}`;

  // ---------- Map ----------
  let map, freeLayer, tollLayer, tolledLayer;

  function initMap() {
    if (map) return;
    map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView([-33.7, 151.15], 10);
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors',
      }
    ).addTo(map);
  }

  function drawRoutes(free, toll) {
    initMap();
    [freeLayer, tollLayer, tolledLayer].forEach((l) => l && map.removeLayer(l));

    freeLayer = L.polyline(free.polyline, {
      color: '#6dd58c', weight: 5, opacity: 0.85,
    }).bindTooltip('免费路线').addTo(map);

    tollLayer = L.polyline(toll.polyline, {
      color: '#f6a96b', weight: 5, opacity: 0.85, dashArray: '2 6',
    }).bindTooltip('收费路线').addTo(map);

    // Highlight tolled sub-segments thicker
    const tolled = L.layerGroup();
    (toll.tolledRanges || []).forEach((r) => {
      const seg = toll.polyline.slice(r.from, r.to + 1);
      L.polyline(seg, {
        color: '#ff8a3b', weight: 8, opacity: 0.95,
      }).bindTooltip(`${r.name} · ${fmtAUD(r.priceAUD)}`).addTo(tolled);
    });
    tolled.addTo(map);
    tolledLayer = tolled;

    const all = [...free.polyline, ...toll.polyline];
    map.fitBounds(L.latLngBounds(all).pad(0.1));
  }

  // ---------- Google Routes API (browser direct call) ----------
  async function fetchRoute({ origin, destination, avoidTolls, apiKey }) {
    const body = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      extraComputations: ['TOLLS'],
      routeModifiers: { avoidTolls },
      units: 'METRIC',
    };
    const r = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'routes.duration',
            'routes.distanceMeters',
            'routes.polyline.encodedPolyline',
            'routes.travelAdvisory.tollInfo',
            'routes.legs.steps.navigationInstruction',
            'routes.legs.steps.distanceMeters',
          ].join(','),
        },
        body: JSON.stringify(body),
      }
    );
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Routes API ${r.status}: ${text}`);
    }
    return r.json();
  }

  // Google's polyline encoding -> [[lat,lng], ...]
  function decodePolyline(str) {
    let index = 0, lat = 0, lng = 0;
    const coords = [];
    while (index < str.length) {
      let b, shift = 0, result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      coords.push([lat * 1e-5, lng * 1e-5]);
    }
    return coords;
  }

  function parseRoute(apiRoute) {
    const tollInfo = apiRoute.travelAdvisory && apiRoute.travelAdvisory.tollInfo;
    let tollAUD = 0;
    if (tollInfo && Array.isArray(tollInfo.estimatedPrice) && tollInfo.estimatedPrice.length) {
      const p = tollInfo.estimatedPrice[0];
      tollAUD = Number(p.units || 0) + Number(p.nanos || 0) / 1e9;
    }
    const durationSec = Number(String(apiRoute.duration).replace('s', ''));
    return {
      durationSec,
      distanceMeters: apiRoute.distanceMeters || 0,
      tollAUD,
      maneuvers: (apiRoute.legs || []).reduce(
        (n, leg) => n + (leg.steps ? leg.steps.length : 0), 0
      ),
      highwayShareKm: 0, // not exposed directly; left blank in real mode
      polyline: apiRoute.polyline && apiRoute.polyline.encodedPolyline
        ? decodePolyline(apiRoute.polyline.encodedPolyline)
        : [],
      tolledRanges: [], // segment-level toll attribution not available; would need step inspection
    };
  }

  // ---------- Render ----------
  function render(free, toll, threshold) {
    const d = compareRoutes(free, toll);
    const pick = recommend(d.pricePerMin, threshold);

    els.freeTime.textContent = fmtDur(free.durationSec);
    els.freeMeta.textContent = `${fmtKm(free.distanceMeters)} · ${free.maneuvers} 个动作`;

    els.tollTime.textContent = fmtDur(toll.durationSec);
    els.tollMeta.textContent = `${fmtKm(toll.distanceMeters)} · ${toll.maneuvers} 个动作`;
    els.tollCost.textContent = fmtAUD(toll.tollAUD);

    els.savedMin.textContent = d.savedMin.toFixed(1);
    els.pricePerMin.textContent = isFinite(d.pricePerMin)
      ? `单价 ${fmtAUD(d.pricePerMin)} / 分钟`
      : '收费路线没省时间';
    const extras = [];
    if (d.maneuversSaved > 0) extras.push(`少 ${d.maneuversSaved} 个转弯`);
    if (d.highwayDeltaKm > 0) extras.push(`多 ${d.highwayDeltaKm.toFixed(0)} km 封闭路`);
    if (d.distanceDeltaKm) extras.push(`${d.distanceDeltaKm > 0 ? '+' : ''}${d.distanceDeltaKm.toFixed(1)} km`);
    els.extraInfo.textContent = extras.join(' · ') || '—';

    // Verdict
    els.verdict.classList.remove('go-toll', 'go-free');
    if (pick === 'toll') {
      els.verdict.classList.add('go-toll');
      els.verdict.innerHTML =
        `💡 <b>走收费路线</b>：花 ${fmtAUD(toll.tollAUD)} 省 ${d.savedMin.toFixed(0)} 分钟，` +
        `相当于 ${fmtAUD(d.pricePerMin)}/分钟，<b>低于</b>你设定的 ${fmtAUD(threshold)}/分钟。`;
    } else {
      els.verdict.classList.add('go-free');
      els.verdict.innerHTML = isFinite(d.pricePerMin)
        ? `🚗 <b>走免费路线</b>：付 ${fmtAUD(toll.tollAUD)} 只省 ${d.savedMin.toFixed(0)} 分钟，` +
          `单价 ${fmtAUD(d.pricePerMin)}/分钟，<b>高于</b>你设定的 ${fmtAUD(threshold)}/分钟。`
        : `🚗 <b>走免费路线</b>：付费路线并没省时间。`;
    }

    // Segment list
    els.segmentList.innerHTML = '';
    (toll.tolledRanges || []).forEach((r) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${r.name}</b> — ${fmtAUD(r.priceAUD)}`;
      els.segmentList.appendChild(li);
    });
    els.segments.style.display = (toll.tolledRanges || []).length ? '' : 'none';

    drawRoutes(free, toll);
    els.result.hidden = false;
  }

  // ---------- State ----------
  let lastFree = null, lastToll = null;

  function threshold() {
    // slider is in cents/min · range 0..500 (=A$5/min)
    return Number(els.threshold.value) / 100;
  }

  function refreshThresholdLabel() {
    els.thresholdLabel.textContent = `${fmtAUD(threshold())} / 分钟`;
  }

  // ---------- Wire up ----------
  els.threshold.addEventListener('input', () => {
    refreshThresholdLabel();
    if (lastFree && lastToll) render(lastFree, lastToll, threshold());
  });

  els.goBtn.addEventListener('click', async () => {
    const key = els.apiKey.value.trim();
    els.goBtn.disabled = true;
    els.goBtn.textContent = '计算中…';
    try {
      if (!key) {
        // Demo mode
        lastFree = DEMO.free;
        lastToll = DEMO.toll;
      } else {
        const o = els.origin.value.trim();
        const d = els.destination.value.trim();
        if (!o || !d) throw new Error('请填写起点和终点');
        const [freeRes, tollRes] = await Promise.all([
          fetchRoute({ origin: o, destination: d, avoidTolls: true, apiKey: key }),
          fetchRoute({ origin: o, destination: d, avoidTolls: false, apiKey: key }),
        ]);
        if (!freeRes.routes || !freeRes.routes.length) throw new Error('未找到免费路线');
        if (!tollRes.routes || !tollRes.routes.length) throw new Error('未找到收费路线');
        lastFree = parseRoute(freeRes.routes[0]);
        lastToll = parseRoute(tollRes.routes[0]);
      }
      render(lastFree, lastToll, threshold());
    } catch (e) {
      alert(`出错了：${e.message}`);
      console.error(e);
    } finally {
      els.goBtn.disabled = false;
      els.goBtn.textContent = '对比路线';
    }
  });

  // First paint
  refreshThresholdLabel();
  lastFree = DEMO.free;
  lastToll = DEMO.toll;
  render(lastFree, lastToll, threshold());
})();

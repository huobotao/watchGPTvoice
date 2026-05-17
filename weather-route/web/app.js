'use strict';

const DIRECTIONS = [
  { name: '正北', short: 'N',  bearing: 0   },
  { name: '东北', short: 'NE', bearing: 45  },
  { name: '正东', short: 'E',  bearing: 90  },
  { name: '东南', short: 'SE', bearing: 135 },
  { name: '正南', short: 'S',  bearing: 180 },
  { name: '西南', short: 'SW', bearing: 225 },
  { name: '正西', short: 'W',  bearing: 270 },
  { name: '西北', short: 'NW', bearing: 315 },
];

const SAMPLE_DISTANCES_KM = [20, 50, 100];
const DRY_THRESHOLD_MM    = 0.1;
const AVG_SPEED_KMH       = 60;
const FORECAST_HOURS      = 6;
const EARTH_R_KM          = 6371;

const $ = id => document.getElementById(id);
const toRad = d => d * Math.PI / 180;
const toDeg = r => r * 180 / Math.PI;

function destinationPoint(lat, lon, bearingDeg, distanceKm) {
  const phi1 = toRad(lat);
  const lam1 = toRad(lon);
  const theta = toRad(bearingDeg);
  const delta = distanceKm / EARTH_R_KM;
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) +
    Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );
  const lam2 = lam1 + Math.atan2(
    Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
  );
  return { lat: toDeg(phi2), lon: ((toDeg(lam2) + 540) % 360) - 180 };
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('设备不支持定位'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => reject(new Error('无法获取位置：' + err.message)),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

async function fetchPrecipBatch(points) {
  const lats = points.map(p => p.lat.toFixed(4)).join(',');
  const lons = points.map(p => p.lon.toFixed(4)).join(',');
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lats}`
    + `&longitude=${lons}`
    + '&hourly=precipitation,precipitation_probability'
    + `&forecast_hours=${FORECAST_HOURS}`
    + '&timezone=auto';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('天气服务暂时不可用 (' + resp.status + ')');
  const data = await resp.json();
  return Array.isArray(data) ? data : [data];
}

function buildSamplePoints(origin) {
  const points = [{ lat: origin.lat, lon: origin.lon, dir: null, km: 0 }];
  for (const dir of DIRECTIONS) {
    for (const km of SAMPLE_DISTANCES_KM) {
      const p = destinationPoint(origin.lat, origin.lon, dir.bearing, km);
      points.push({ ...p, dir, km });
    }
  }
  return points;
}

async function findEscape(origin) {
  const points = buildSamplePoints(origin);
  const responses = await fetchPrecipBatch(points);
  const enriched = points.map((p, i) => ({
    ...p,
    precip: responses[i]?.hourly?.precipitation ?? [],
    prob:   responses[i]?.hourly?.precipitation_probability ?? [],
  }));

  const originPoint = enriched[0];
  const byDir = DIRECTIONS.map(dir => {
    const samples = enriched
      .filter(p => p.dir && p.dir.short === dir.short)
      .sort((a, b) => a.km - b.km);
    let escapeKm = null;
    let escapePrecipAtArrival = null;
    for (const s of samples) {
      const etaH = s.km / AVG_SPEED_KMH;
      const idx  = Math.min(Math.round(etaH), s.precip.length - 1);
      const precipOnArrival = s.precip[idx] ?? 0;
      if (precipOnArrival <= DRY_THRESHOLD_MM) {
        escapeKm = s.km;
        escapePrecipAtArrival = precipOnArrival;
        break;
      }
    }
    return { direction: dir, samples, escapeKm, escapePrecipAtArrival };
  });

  const best = byDir.reduce((a, b) => {
    const ka = a.escapeKm ?? Infinity;
    const kb = b.escapeKm ?? Infinity;
    if (ka !== kb) return ka < kb ? a : b;
    return (a.escapePrecipAtArrival ?? 0) <= (b.escapePrecipAtArrival ?? 0) ? a : b;
  });

  return { origin: originPoint, byDir, best };
}

async function planDrivingRoute(from, to) {
  const url = 'https://router.project-osrm.org/route/v1/driving/'
    + `${from.lon.toFixed(5)},${from.lat.toFixed(5)};`
    + `${to.lon.toFixed(5)},${to.lat.toFixed(5)}`
    + '?overview=full&geometries=geojson';
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const r = data?.routes?.[0];
    if (!r) return null;
    return {
      geometry: r.geometry,
      distanceKm: r.distance / 1000,
      durationMin: r.duration / 60,
    };
  } catch (_) {
    return null;
  }
}

function colorForPrecip(mm) {
  if (mm < 0.1) return '#22c55e';
  if (mm < 1)   return '#facc15';
  if (mm < 5)   return '#f97316';
  return '#ef4444';
}

let map, originMarker, targetMarker, routeLayer, sampleLayer;

function ensureMap(lat, lon) {
  if (map) return;
  map = L.map('map', { zoomControl: false, attributionControl: false })
        .setView([lat, lon], 9);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);
  L.control.attribution({ position: 'topright', prefix: '' }).addTo(map);
}

function drawCompass(bestBearing) {
  const dial = document.querySelector('.dial');
  const ns = 'http://www.w3.org/2000/svg';
  while (dial.firstChild) dial.removeChild(dial.firstChild);

  for (let i = 0; i < 360; i += 15) {
    const major = i % 90 === 0;
    const len = major ? 14 : 6;
    const x1 = 95 * Math.sin(toRad(i));
    const y1 = -95 * Math.cos(toRad(i));
    const x2 = (95 - len) * Math.sin(toRad(i));
    const y2 = -(95 - len) * Math.cos(toRad(i));
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', major ? '#94a3b8' : '#475569');
    line.setAttribute('stroke-width', major ? 2 : 1);
    dial.appendChild(line);
  }

  const labels = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  for (const [t, d] of labels) {
    const x = 76 * Math.sin(toRad(d));
    const y = -76 * Math.cos(toRad(d)) + 5;
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', x); text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    const isBest = bestBearing != null && Math.abs(d - bestBearing) < 1;
    text.setAttribute('fill', isBest ? '#22d3ee' : '#94a3b8');
    text.setAttribute('font-size', isBest ? '20' : '15');
    text.setAttribute('font-weight', isBest ? '700' : '500');
    text.setAttribute('font-family', 'sans-serif');
    text.textContent = t;
    dial.appendChild(text);
  }

  if (bestBearing == null) return;
  const tipX  = 58 * Math.sin(toRad(bestBearing));
  const tipY  = -58 * Math.cos(toRad(bestBearing));
  const leftAngle  = bestBearing + 155;
  const rightAngle = bestBearing - 155;
  const leftX  = tipX + 20 * Math.sin(toRad(leftAngle));
  const leftY  = tipY - 20 * Math.cos(toRad(leftAngle));
  const rightX = tipX + 20 * Math.sin(toRad(rightAngle));
  const rightY = tipY - 20 * Math.cos(toRad(rightAngle));
  const arrow = document.createElementNS(ns, 'polygon');
  arrow.setAttribute('points',
    `${tipX},${tipY} ${leftX},${leftY} 0,0 ${rightX},${rightY}`);
  arrow.setAttribute('fill', '#22d3ee');
  dial.appendChild(arrow);

  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', '0'); dot.setAttribute('cy', '0');
  dot.setAttribute('r', '4');
  dot.setAttribute('fill', '#0b1220');
  dot.setAttribute('stroke', '#22d3ee');
  dot.setAttribute('stroke-width', '2');
  dial.appendChild(dot);
}

function drawSamplesOnMap(result) {
  if (sampleLayer) sampleLayer.remove();
  sampleLayer = L.layerGroup().addTo(map);
  for (const info of result.byDir) {
    for (const s of info.samples) {
      const precipNow = s.precip[0] ?? 0;
      const color = colorForPrecip(precipNow);
      L.circleMarker([s.lat, s.lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 0.75,
        weight: 1,
      }).addTo(sampleLayer)
        .bindTooltip(`${info.direction.name} ${s.km}km · ${precipNow.toFixed(1)} mm/h`);
    }
  }
}

async function drawRouteOnMap(origin, target) {
  if (routeLayer) routeLayer.remove();
  const route = await planDrivingRoute(origin, target);
  if (!route) {
    routeLayer = L.polyline(
      [[origin.lat, origin.lon], [target.lat, target.lon]],
      { color: '#22d3ee', weight: 4, dashArray: '6,8', opacity: 0.85 }
    ).addTo(map);
    return null;
  }
  routeLayer = L.geoJSON(route.geometry, {
    style: { color: '#22d3ee', weight: 5, opacity: 0.9 },
  }).addTo(map);
  return route;
}

function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 1.0;
  speechSynthesis.speak(u);
}

function plainText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

function setAdvice({ best, origin, drivingRoute }) {
  const card = $('adviceCard');
  card.classList.remove('is-warning', 'is-ok');

  const originPrecip = origin.precip[0] ?? 0;
  const originDry = originPrecip <= DRY_THRESHOLD_MM;

  if (originDry && best.escapeKm === 0) {
    card.classList.add('is-ok');
    $('primaryAdvice').innerHTML = '☀️ 你脚下是晴天，附近也基本无雨';
    $('secondaryAdvice').textContent = '安心开吧，未来几小时该位置都没问题。';
    $('centerLabel').textContent = '晴';
    return;
  }

  if (best.escapeKm == null) {
    card.classList.add('is-warning');
    $('primaryAdvice').innerHTML = '⚠️ 周边各方向 100 km 内都有雨';
    $('secondaryAdvice').textContent =
      '建议就地停车避雨或休息，等待 30-60 分钟后再试一次。';
    $('centerLabel').textContent = '!';
    return;
  }

  const km = best.escapeKm;
  const minutes = Math.round(km / AVG_SPEED_KMH * 60);
  const dirName = best.direction.name;
  $('centerLabel').textContent = dirName;
  $('primaryAdvice').innerHTML =
    `往 <b>${dirName}</b> 方向开约 <b>${km} 公里</b>`;
  let sec = `按 60 km/h 估算 ${minutes} 分钟脱离雨区`;
  sec += `（当前头顶 ${originPrecip.toFixed(1)} mm/h）`;
  if (drivingRoute) {
    sec += ` · 实际行车 ${drivingRoute.distanceKm.toFixed(0)} km / `
         + `${Math.round(drivingRoute.durationMin)} 分钟`;
  }
  $('secondaryAdvice').textContent = sec;
}

let busy = false;
let lastSpoken = '';

async function runSearch() {
  if (busy) return;
  busy = true;
  $('searchBtn').disabled = true;
  $('searchBtn').textContent = '查询中…';
  $('primaryAdvice').textContent = '正在定位…';
  $('secondaryAdvice').textContent = '';

  try {
    const origin = await getPosition();
    $('locText').textContent =
      `当前 ${origin.lat.toFixed(3)}, ${origin.lon.toFixed(3)}`;
    ensureMap(origin.lat, origin.lon);
    if (originMarker) originMarker.remove();
    originMarker = L.marker([origin.lat, origin.lon])
      .addTo(map).bindTooltip('当前位置');

    $('primaryAdvice').textContent = '正在分析周边天气…';
    const result = await findEscape(origin);
    drawSamplesOnMap(result);
    drawCompass(result.best.direction.bearing);

    let drivingRoute = null;
    if (result.best.escapeKm != null) {
      const target = destinationPoint(
        origin.lat, origin.lon,
        result.best.direction.bearing, result.best.escapeKm
      );
      if (targetMarker) targetMarker.remove();
      targetMarker = L.marker([target.lat, target.lon])
        .addTo(map).bindTooltip('目标晴朗点');
      drivingRoute = await drawRouteOnMap(origin, target);
      map.fitBounds(L.latLngBounds(
        [[origin.lat, origin.lon], [target.lat, target.lon]]
      ), { padding: [30, 30] });
    } else {
      map.setView([origin.lat, origin.lon], 8);
    }

    setAdvice({ best: result.best, origin: result.origin, drivingRoute });
    lastSpoken = plainText($('primaryAdvice').innerHTML) + '。'
               + $('secondaryAdvice').textContent;
    speak(lastSpoken);
  } catch (e) {
    console.error(e);
    $('adviceCard').classList.add('is-warning');
    $('primaryAdvice').textContent = '出错';
    $('secondaryAdvice').textContent = e.message || String(e);
  } finally {
    busy = false;
    $('searchBtn').disabled = false;
    $('searchBtn').textContent = '重新查询';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  drawCompass(null);
  $('searchBtn').addEventListener('click', runSearch);
  $('speakBtn').addEventListener('click', () =>
    speak(lastSpoken || '请先点击查询脱雨方向'));
  runSearch();
});

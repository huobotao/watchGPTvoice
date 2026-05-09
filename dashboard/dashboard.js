const $ = (sel) => document.querySelector(sel);
const grid = $('#grid');
const statusEl = $('#status');

async function loadHealth() {
  try {
    const res = await fetch('/api/health').then((r) => r.json());
    statusEl.textContent = `source: ${res.source} · model: ${res.visionModel} · API key: ${res.hasAnthropicKey ? 'OK' : 'missing'}`;
    statusEl.style.color = res.hasAnthropicKey ? '#8a92a6' : '#f87171';
  } catch (err) {
    statusEl.textContent = `unreachable: ${err.message}`;
  }
}

async function loadListings() {
  const res = await fetch('/api/listings').then((r) => r.json());
  render(res.items);
}

function getParams() {
  const suburbs = $('#suburbs').value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    suburbs,
    minBedrooms: Number($('#minBeds').value) || undefined,
    maxBedrooms: Number($('#maxBeds').value) || undefined,
    maxRent: Number($('#maxRent').value) || undefined,
  };
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function withButton(btn, fn) {
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

$('#scrapeBtn').addEventListener('click', (e) =>
  withButton(e.target, async () => {
    const r = await postJson('/api/scrape', getParams());
    statusEl.textContent = `scraped ${r.count} listings from ${r.source}`;
    await loadListings();
  }),
);

$('#analyzeBtn').addEventListener('click', (e) =>
  withButton(e.target, async () => {
    statusEl.textContent = 'analyzing with Claude Vision (this can take a minute)…';
    const r = await postJson('/api/analyze', {});
    statusEl.textContent = `analyzed ${r.analyzed} listings`;
    await loadListings();
  }),
);

$('#runBtn').addEventListener('click', (e) =>
  withButton(e.target, async () => {
    statusEl.textContent = 'scraping + analyzing…';
    const r = await postJson('/api/run', getParams());
    statusEl.textContent = `done: ${r.scraped} scraped, ${r.results.filter((x) => x.ok).length} analyzed`;
    await loadListings();
  }),
);

$('#refreshBtn').addEventListener('click', loadListings);

function classifyScore(n) {
  if (n >= 75) return 'high';
  if (n >= 55) return 'mid';
  return 'low';
}

function render(items) {
  grid.innerHTML = '';
  if (!items || items.length === 0) {
    grid.innerHTML = '<div class="empty">No listings yet — click <strong>Scrape</strong> to load mock data.</div>';
    return;
  }
  const tpl = $('#cardTpl');
  for (const item of items) {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    const l = item.listing;
    const s = item.score || {};
    const v = item.vision;

    if (s.isDeal) card.classList.add('is-deal');
    node.querySelector('.badge').textContent = s.composite != null ? `${s.composite}/100` : 'unscored';

    const thumb = node.querySelector('.thumb');
    if (l.images && l.images[0]) thumb.style.backgroundImage = `url("${l.images[0]}")`;

    node.querySelector('.addr').textContent = l.address;
    node.querySelector('.meta').textContent = `${l.bedrooms}🛏  ${l.bathrooms}🛁  ${l.carSpaces}🚗  · ${l.suburb}`;
    node.querySelector('.rent').textContent = `$${l.weeklyRent}/wk` + (s.suburbMedianRent ? `   median $${s.suburbMedianRent} (${s.priceDeltaPct >= 0 ? '−' : '+'}${Math.abs(s.priceDeltaPct)}%)` : '');

    const setScore = (sel, val) => {
      const el = node.querySelector(sel);
      if (val == null) {
        el.textContent = '—';
      } else {
        el.textContent = val;
        el.classList.add(classifyScore(val));
      }
    };
    setScore('.val.composite', s.composite);
    setScore('.val.vision', s.visionScore || (v && v.overall_score));
    setScore('.val.price', s.priceScore);

    if (v) {
      node.querySelector('.summary').textContent = v.summary;
      const features = node.querySelector('.features');
      for (const f of v.notable_features || []) {
        const t = document.createElement('span');
        t.className = 'tag';
        t.textContent = f;
        features.appendChild(t);
      }
      const flags = node.querySelector('.flags');
      for (const f of v.red_flags || []) {
        const t = document.createElement('span');
        t.className = 'tag flag';
        t.textContent = f;
        flags.appendChild(t);
      }
    } else {
      node.querySelector('.summary').textContent = l.description || '';
    }

    const link = node.querySelector('.link');
    link.href = l.url;
    link.textContent = 'View listing →';

    grid.appendChild(node);
  }
}

loadHealth();
loadListings();

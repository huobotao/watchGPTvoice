const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => root.querySelectorAll(sel);

const grid = $('#grid');
const statusEl = $('#status');
let currentTab = 'DEAL';
let lastItems = [];

async function loadHealth() {
  try {
    const res = await fetch('/api/health').then((r) => r.json());
    statusEl.textContent = `source: ${res.source} · model: ${res.visionModel} · API key: ${res.hasAnthropicKey ? 'OK' : 'missing'}`;
    statusEl.style.color = res.hasAnthropicKey ? 'var(--muted)' : 'var(--bad)';
  } catch (err) {
    statusEl.textContent = `unreachable: ${err.message}`;
  }
}

async function loadListings() {
  const res = await fetch('/api/listings').then((r) => r.json());
  lastItems = res.items;
  updateCounts();
  render();
}

function updateCounts() {
  const counts = { DEAL: 0, SUSPECT: 0, DISCARD: 0, UNANALYZED: 0 };
  for (const item of lastItems) counts[item.effectiveDecision] = (counts[item.effectiveDecision] || 0) + 1;
  for (const [k, v] of Object.entries(counts)) {
    const el = document.querySelector(`[data-count="${k}"]`);
    if (el) el.textContent = v;
  }
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
  } catch (err) {
    statusEl.textContent = `error: ${err.message}`;
    statusEl.style.color = 'var(--bad)';
    throw err;
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// ----- top-level actions -----

$('#scrapeBtn').addEventListener('click', (e) =>
  withButton(e.target, async () => {
    const r = await postJson('/api/scrape', getParams());
    statusEl.textContent = `scraped ${r.scraped} (${r.new} new) from ${r.source}`;
    await loadListings();
  }),
);

$('#analyzeBtn').addEventListener('click', (e) =>
  withButton(e.target, async () => {
    statusEl.textContent = 'analyzing with Claude Vision…';
    const r = await postJson('/api/analyze', {});
    statusEl.textContent = `analyzed ${r.analyzed} listings`;
    await loadListings();
  }),
);

$('#runBtn').addEventListener('click', (e) =>
  withButton(e.target, async () => {
    statusEl.textContent = 'scraping + analyzing…';
    const r = await postJson('/api/run', getParams());
    const ok = r.results.filter((x) => x.ok).length;
    statusEl.textContent = `done: ${r.scraped} scraped, ${ok} analyzed`;
    await loadListings();
  }),
);

$('#refreshBtn').addEventListener('click', loadListings);

// ----- tabs -----

$$('.tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    currentTab = tab.dataset.tab;
    render();
  }),
);

// ----- rubric editor -----

const rubricDialog = $('#rubricDialog');
const rubricText = $('#rubricText');

$('#rubricBtn').addEventListener('click', async () => {
  const r = await fetch('/api/rubric').then((r) => r.json());
  rubricText.value = r.text;
  rubricDialog.showModal();
});

$('#rubricSave').addEventListener('click', async () => {
  await fetch('/api/rubric', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: rubricText.value }),
  });
  rubricDialog.close();
  statusEl.textContent = 'rubric saved. next Analyze run will use the new version.';
});

$('#rubricCancel').addEventListener('click', () => rubricDialog.close());

// ----- render cards -----

function render() {
  grid.innerHTML = '';
  const items = lastItems.filter((x) => x.effectiveDecision === currentTab);
  if (items.length === 0) {
    grid.innerHTML = `<div class="empty">No listings in <strong>${currentTab}</strong>.<br><small>Click Scrape, then Analyze.</small></div>`;
    return;
  }
  const tpl = $('#cardTpl');
  for (const item of items) {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    const l = item.listing;
    const a = item.analysis;
    const pc = item.priceContext;
    const decision = item.effectiveDecision;
    const verdict = item.userVerdict;

    card.classList.add(`decision-${decision}`);
    if (verdict) card.classList.add('has-verdict');
    card.dataset.id = l.id;

    node.querySelector('.badge').textContent = decision;
    const thumb = node.querySelector('.thumb');
    if (l.images && l.images[0]) thumb.style.backgroundImage = `url("${l.images[0]}")`;

    node.querySelector('.addr').textContent = l.address;
    node.querySelector('.meta').textContent = `${l.bedrooms}🛏  ${l.bathrooms}🛁  ${l.carSpaces}🚗  · ${l.suburb}`;

    const rentLine = `$${l.weeklyRent}/wk`;
    const medianLine = pc?.suburbMedianRent
      ? `   median $${pc.suburbMedianRent} (${pc.priceDeltaPct >= 0 ? '−' : '+'}${Math.abs(pc.priceDeltaPct)}%)`
      : '';
    node.querySelector('.rent').textContent = rentLine + medianLine;

    if (a) {
      node.querySelector('.headline').textContent = a.headline;
      node.querySelector('.reasoning-text').textContent = a.reasoning;
      const criteriaBox = node.querySelector('.criteria');
      for (const c of a.matched_criteria || []) {
        const t = document.createElement('span');
        t.className = 'tag';
        t.textContent = c;
        criteriaBox.appendChild(t);
      }
      const pros = node.querySelector('.pros');
      for (const p of a.pros || []) {
        const t = document.createElement('span');
        t.className = 'tag';
        t.textContent = p;
        pros.appendChild(t);
      }
      const cons = node.querySelector('.cons');
      for (const c of a.cons || []) {
        const t = document.createElement('span');
        t.className = 'tag con';
        t.textContent = c;
        cons.appendChild(t);
      }
    } else {
      node.querySelector('.headline').textContent = l.description || 'Not yet analyzed.';
      node.querySelector('.reasoning').style.display = 'none';
    }

    node.querySelectorAll('.actions button').forEach((btn) => {
      btn.addEventListener('click', () => onReview(l.id, btn.dataset.action));
    });

    node.querySelector('.link').href = l.url;
    node.querySelector('.link').textContent = 'View listing →';

    grid.appendChild(node);
  }
}

async function onReview(id, action) {
  const verdict = action === 'undo' ? null : action;
  await postJson(`/api/listings/${id}/review`, { verdict });
  await loadListings();
}

loadHealth();
loadListings();

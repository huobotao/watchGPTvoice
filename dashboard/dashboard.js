const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => root.querySelectorAll(sel);

const grid = $('#grid');
const statusEl = $('#status');
let currentTab = 'DEAL';
let lastItems = [];
let DEMO_MODE = false;

// --------------------------------------------------------------------
// Embedded demo data — used when no backend is reachable (file:// open
// or no server running). All state then lives in localStorage.
// --------------------------------------------------------------------

const DEMO_LISTINGS = [
  { id: 'dom-001', address: '12/45 Bayswater Rd, Potts Point NSW 2011', suburb: 'Potts Point', bedrooms: 1, bathrooms: 1, carSpaces: 0, weeklyRent: 650, propertyType: 'Apartment', listedDate: '2026-05-08', url: 'https://www.domain.com.au/12-45-bayswater-rd-potts-point-nsw-2011-dom-001', images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1400','https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1400','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1400'], description: 'Recently renovated 1BR with district views, walking distance to Kings Cross.' },
  { id: 'dom-002', address: '1502/88 Kent St, Sydney NSW 2000', suburb: 'Sydney', bedrooms: 2, bathrooms: 2, carSpaces: 1, weeklyRent: 1100, propertyType: 'Apartment', listedDate: '2026-05-07', url: 'https://www.domain.com.au/1502-88-kent-st-sydney-nsw-2000-dom-002', images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1400','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1400','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400'], description: 'Stunning 2BR + study with floor-to-ceiling windows and harbour views from level 15.' },
  { id: 'dom-003', address: '7/210 Bondi Rd, Bondi NSW 2026', suburb: 'Bondi', bedrooms: 2, bathrooms: 1, carSpaces: 0, weeklyRent: 850, propertyType: 'Apartment', listedDate: '2026-05-09', url: 'https://www.domain.com.au/7-210-bondi-rd-bondi-nsw-2026-dom-003', images: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1400','https://images.unsplash.com/photo-1558211583-d26f610c1eb1?w=1400'], description: 'Bright 2BR top floor unit, 800m to Bondi Beach. Original 1970s interior, recently painted.' },
  { id: 'dom-004', address: '302/15 Hunter St, Sydney NSW 2000', suburb: 'Sydney', bedrooms: 1, bathrooms: 1, carSpaces: 0, weeklyRent: 720, propertyType: 'Apartment', listedDate: '2026-05-09', url: 'https://www.domain.com.au/302-15-hunter-st-sydney-nsw-2000-dom-004', images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1400','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1400','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400'], description: 'Compact 1BR studio-style apartment in heart of CBD. Internal-facing, no balcony.' },
  { id: 'dom-005', address: '5/12 Mosman St, Mosman NSW 2088', suburb: 'Mosman', bedrooms: 2, bathrooms: 1, carSpaces: 1, weeklyRent: 950, propertyType: 'Apartment', listedDate: '2026-05-06', url: 'https://www.domain.com.au/5-12-mosman-st-mosman-nsw-2088-dom-005', images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1400','https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1400'], description: 'Quiet leafy 2BR with sunroom, 5min walk to Mosman Junction. Lots of natural light.' },
  { id: 'dom-006', address: '1801/161 Clarence St, Sydney NSW 2000', suburb: 'Sydney', bedrooms: 2, bathrooms: 2, carSpaces: 1, weeklyRent: 1250, propertyType: 'Apartment', listedDate: '2026-05-08', url: 'https://www.domain.com.au/1801-161-clarence-st-sydney-nsw-2000-dom-006', images: ['https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1400','https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1400','https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1400'], description: 'Penthouse-level 2BR with expansive city skyline views, full kitchen renovation 2024.' },
  { id: 'dom-007', address: '3/88 Marine Pde, Maroubra NSW 2035', suburb: 'Maroubra', bedrooms: 2, bathrooms: 1, carSpaces: 1, weeklyRent: 780, propertyType: 'Apartment', listedDate: '2026-05-09', url: 'https://www.domain.com.au/3-88-marine-pde-maroubra-nsw-2035-dom-007', images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400','https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1400','https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1400'], description: 'Beachside 2BR, partial ocean view from balcony. Walk to Maroubra Beach.' },
  { id: 'dom-008', address: '11/220 Oxford St, Paddington NSW 2021', suburb: 'Paddington', bedrooms: 1, bathrooms: 1, carSpaces: 0, weeklyRent: 580, propertyType: 'Apartment', listedDate: '2026-05-08', url: 'https://www.domain.com.au/11-220-oxford-st-paddington-nsw-2021-dom-008', images: ['https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1400','https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1400'], description: 'Heritage terrace conversion, 1BR with original timber floors. North-facing courtyard.' },
];

const DEMO_BASELINES = {
  Sydney: { 1: 780, 2: 1180, 3: 1650 },
  'Potts Point': { 1: 700, 2: 950, 3: 1400 },
  Bondi: { 1: 720, 2: 1000, 3: 1450 },
  Mosman: { 1: 680, 2: 1000, 3: 1500 },
  Paddington: { 1: 650, 2: 950, 3: 1400 },
  Maroubra: { 1: 580, 2: 820, 3: 1150 },
};

const DEMO_ANALYSES = {
  'dom-001': { decision: 'DEAL', confidence: 0.82, headline: '1BR Potts Point, district views, recent renovation.', pros: ['Recent renovation', 'Floor-to-ceiling windows', 'Walk to Kings Cross station'], cons: ['No car space'], matched_criteria: ['recent full renovation', 'at-or-below median'], reasoning: 'DEAL: photos 1-2 show a fully renovated kitchen with stone benchtop and new bathroom. $650/wk vs $700 median for Potts Point 1BR meets the renovated+below-median criterion.' },
  'dom-002': { decision: 'DEAL', confidence: 0.91, headline: 'Level 15 harbour views, 2BR + study.', pros: ['Unobstructed harbour view', 'Floor-to-ceiling glass', 'Modern kitchen'], cons: ['Premium pricing'], matched_criteria: ['clear unobstructed view', 'at-or-below median'], reasoning: 'DEAL: photo 1 shows clear harbour view with bridge visible. $1100/wk vs $1180 median for Sydney 2BR — the clear-view + at-or-below-median criterion is met decisively.' },
  'dom-003': { decision: 'SUSPECT', confidence: 0.55, headline: 'Bondi 2BR, top floor, dated interior.', pros: ['Top floor', '800m to beach'], cons: ['Original 1970s interior visible', 'Only 2 photos provided'], matched_criteria: ['photo/description mismatch', 'price low but photos acceptable'], reasoning: 'SUSPECT: 15% below median is suggestive but only 2 photos and described as recently painted over original interior. Could be a budget find or hiding condition issues — needs human review.' },
  'dom-004': { decision: 'DISCARD', confidence: 0.88, headline: 'Internal-facing 1BR CBD.', pros: [], cons: ['Internal outlook only', 'No balcony', 'Compact'], matched_criteria: ['windows face internal light well'], reasoning: 'DISCARD: photo 2 shows windows facing directly into the building\'s internal light well. No actual outlook visible from any room.' },
  'dom-005': { decision: 'SUSPECT', confidence: 0.60, headline: 'Mosman 2BR with sunroom.', pros: ['Lots of natural light', 'Quiet leafy street'], cons: ['Smaller kitchen'], matched_criteria: [], reasoning: 'SUSPECT: pleasant but no DEAL trigger met. Price is at median and no renovation flag. Worth a manual inspection.' },
  'dom-006': { decision: 'DEAL', confidence: 0.78, headline: 'Penthouse-level CBD with skyline views.', pros: ['Clear city skyline', '2024 kitchen renovation', 'Two bathrooms'], cons: ['$1250/wk is above median'], matched_criteria: ['clear unobstructed view', 'recent full renovation'], reasoning: 'DEAL: photos 1-3 show full CBD skyline panorama and clearly renovated 2024 kitchen. View+renovation criterion met regardless of slight price premium.' },
  'dom-007': { decision: 'DISCARD', confidence: 0.70, headline: 'Beachside 2BR, partial view.', pros: ['Walk to Maroubra Beach'], cons: ['Only 3 photos', 'Dated kitchen', 'Bathroom looks 90s'], matched_criteria: ['interior clearly pre-2000 with no renovation'], reasoning: 'DISCARD: kitchen tiles and cabinetry in photo 1 match 80s-90s style without subsequent renovation. Original bathroom visible in photo 2.' },
  'dom-008': { decision: 'SUSPECT', confidence: 0.50, headline: 'Heritage terrace 1BR, north-facing courtyard.', pros: ['Original timber floors', 'North-facing'], cons: ['Only 2 photos', 'Heritage can be drafty'], matched_criteria: [], reasoning: 'SUSPECT: heritage charm and good aspect but only 2 photos make it unclear whether interior condition meets the renovated DEAL bar.' },
};

const DEMO_RUBRIC_FALLBACK = `# Sydney Rental Triage Rubric

I'm looking for rental apartments in Sydney. Apply the rules below strictly. If a listing doesn't clearly match a DEAL or DISCARD criterion, classify it as SUSPECT — that means I'll review it manually, which is the correct action when uncertain.

## DEAL — notify me immediately
- Asking price is ≥ 15% below the suburb+bedroom median, AND no red flag
- Photos show a clear unobstructed view (harbour, ocean, city skyline) AND price ≤ median
- Photos show a recent full renovation AND price ≤ median

## DISCARD — silently reject
- Visible mould, water stains, peeling paint
- All windows face a brick wall, light well, or internal corridor
- Interior clearly pre-2000 with no renovation
- Fewer than 3 photos total
- Unit directly above a busy retail strip

## SUSPECT — queue for my manual review
- Everything else — including price-low-but-photos-acceptable, partial views, photo/description mismatch.`;

function priceContextFor(listing) {
  const sub = DEMO_BASELINES[listing.suburb];
  const median = sub ? sub[listing.bedrooms] : null;
  if (!median) return { suburbMedianRent: null, priceDeltaPct: null };
  return {
    suburbMedianRent: median,
    priceDeltaPct: Math.round(((median - listing.weeklyRent) / median) * 100),
  };
}

// --------------------------------------------------------------------
// LocalStorage helpers (demo-mode persistence: verdicts + rubric)
// --------------------------------------------------------------------

const LS_VERDICTS = 'rental.verdicts.v1';
const LS_RUBRIC = 'rental.rubric.v1';

function loadVerdicts() {
  try {
    return JSON.parse(localStorage.getItem(LS_VERDICTS) || '{}');
  } catch {
    return {};
  }
}

function saveVerdict(id, verdict) {
  const v = loadVerdicts();
  if (verdict === null) delete v[id];
  else v[id] = { verdict, reviewedAt: new Date().toISOString() };
  localStorage.setItem(LS_VERDICTS, JSON.stringify(v));
}

function loadDemoRubric() {
  return localStorage.getItem(LS_RUBRIC) || DEMO_RUBRIC_FALLBACK;
}

function saveDemoRubric(text) {
  localStorage.setItem(LS_RUBRIC, text);
}

function buildDemoItems() {
  const verdicts = loadVerdicts();
  return DEMO_LISTINGS.map((listing) => {
    const analysis = DEMO_ANALYSES[listing.id] || null;
    const userVerdict = verdicts[listing.id];
    const effectiveDecision = userVerdict
      ? userVerdict.verdict === 'CONFIRMED_DEAL' ? 'DEAL' : 'DISCARD'
      : analysis?.decision || 'UNANALYZED';
    return {
      listing,
      analysis,
      priceContext: priceContextFor(listing),
      userVerdict,
      effectiveDecision,
    };
  });
}

// --------------------------------------------------------------------
// Backend wiring (works for both demo and live)
// --------------------------------------------------------------------

async function loadHealth() {
  try {
    const res = await fetch('/api/health').then((r) => r.json());
    DEMO_MODE = false;
    statusEl.textContent = `source: ${res.source} · model: ${res.visionModel} · API key: ${res.hasAnthropicKey ? 'OK' : 'missing'}`;
    statusEl.style.color = res.hasAnthropicKey ? 'var(--muted)' : 'var(--bad)';
  } catch (err) {
    DEMO_MODE = true;
    statusEl.innerHTML = `<strong style="color: var(--suspect)">DEMO MODE</strong> — no backend reachable. Showing sample data; verdicts saved to localStorage only.`;
    document.body.classList.add('is-demo');
    // Disable backend-only buttons
    for (const id of ['scrapeBtn', 'analyzeBtn', 'runBtn']) {
      const b = document.getElementById(id);
      b.disabled = true;
      b.title = 'Disabled in demo mode. Run `npm start` to enable.';
    }
  }
}

async function loadListings() {
  if (DEMO_MODE) {
    lastItems = buildDemoItems();
  } else {
    const res = await fetch('/api/listings').then((r) => r.json());
    lastItems = res.items;
  }
  // Sort: DEAL, SUSPECT, DISCARD, UNANALYZED
  const order = { DEAL: 0, SUSPECT: 1, DISCARD: 2, UNANALYZED: 3 };
  lastItems.sort((a, b) => order[a.effectiveDecision] - order[b.effectiveDecision]);
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
  const suburbs = $('#suburbs').value.split(',').map((s) => s.trim()).filter(Boolean);
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
  if (DEMO_MODE) {
    rubricText.value = loadDemoRubric();
  } else {
    const r = await fetch('/api/rubric').then((r) => r.json());
    rubricText.value = r.text;
  }
  rubricDialog.showModal();
});

$('#rubricSave').addEventListener('click', async () => {
  if (DEMO_MODE) {
    saveDemoRubric(rubricText.value);
    rubricDialog.close();
    statusEl.textContent = 'rubric saved to localStorage (demo mode — no AI run).';
  } else {
    await fetch('/api/rubric', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rubricText.value }),
    });
    rubricDialog.close();
    statusEl.textContent = 'rubric saved. next Analyze run will use the new version.';
  }
});

$('#rubricCancel').addEventListener('click', () => rubricDialog.close());

// ----- render cards -----

function render() {
  grid.innerHTML = '';
  const items = lastItems.filter((x) => x.effectiveDecision === currentTab);
  if (items.length === 0) {
    grid.innerHTML = `<div class="empty">No listings in <strong>${currentTab}</strong>.<br><small>${DEMO_MODE ? 'Try the other tabs.' : 'Click Scrape, then Analyze.'}</small></div>`;
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
  if (DEMO_MODE) {
    saveVerdict(id, verdict);
  } else {
    await postJson(`/api/listings/${id}/review`, { verdict });
  }
  await loadListings();
}

// ----- boot -----

(async function init() {
  await loadHealth();
  await loadListings();
})();

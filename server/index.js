require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const domain = require('./domain');
const analyzer = require('./vision/analyzer');
const { priceContext } = require('./scoring/score');
const store = require('./store');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, '..', 'dashboard');
const RUBRIC_PATH = path.join(__dirname, '..', 'data', 'rubric.md');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    source: domain.kind,
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    visionModel: process.env.VISION_MODEL || 'claude-opus-4-7',
  });
});

app.get('/api/rubric', (_req, res) => {
  res.json({ text: analyzer.loadRubric() });
});

app.put('/api/rubric', (req, res) => {
  const text = (req.body && req.body.text) || '';
  if (!text.trim()) return res.status(400).json({ error: 'empty rubric' });
  fs.writeFileSync(RUBRIC_PATH, text);
  res.json({ ok: true, bytes: text.length });
});

app.get('/api/listings', (_req, res) => {
  const items = store.all().map((item) => ({
    ...item,
    effectiveDecision: store.effectiveDecision(item),
  }));
  // Sort: DEAL first, then SUSPECT, then DISCARD, then UNANALYZED.
  const order = { DEAL: 0, SUSPECT: 1, DISCARD: 2, UNANALYZED: 3 };
  items.sort((a, b) => order[a.effectiveDecision] - order[b.effectiveDecision]);
  res.json({ count: items.length, items });
});

app.get('/api/listings/:id', (req, res) => {
  const item = store.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json({ ...item, effectiveDecision: store.effectiveDecision(item) });
});

// Human review on a suspect (or override). Body: { verdict: 'CONFIRMED_DEAL'|'CONFIRMED_DISCARD'|null, note? }
app.post('/api/listings/:id/review', (req, res) => {
  const { verdict, note } = req.body || {};
  const valid = [null, 'CONFIRMED_DEAL', 'CONFIRMED_DISCARD'];
  if (!valid.includes(verdict)) {
    return res.status(400).json({ error: `verdict must be one of ${valid}` });
  }
  const updated = store.setVerdict(req.params.id, verdict, note);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, item: { ...updated, effectiveDecision: store.effectiveDecision(updated) } });
});

// Pull listings from the configured source. No AI yet.
app.post('/api/scrape', async (req, res) => {
  try {
    const params = req.body || {};
    const listings = await domain.search(params);
    let newCount = 0;
    for (const l of listings) {
      if (!store.get(l.id)) newCount++;
      store.upsertListing(l);
    }
    res.json({ scraped: listings.length, new: newCount, source: domain.kind });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run AI triage on listings. Body: { id?, force? }
app.post('/api/analyze', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set in .env' });
  }
  try {
    const { id, force } = req.body || {};
    const targets = id
      ? [store.get(id)].filter(Boolean)
      : store.all().filter((x) => force || !x.analysis);
    if (targets.length === 0) return res.json({ analyzed: 0, message: 'nothing to analyze' });

    const results = [];
    for (const item of targets) {
      try {
        const pc = priceContext(item.listing);
        const analysis = await analyzer.analyze(item.listing, pc);
        store.setAnalysis(item.listing.id, analysis, pc);
        results.push({ id: item.listing.id, ok: true, decision: analysis.decision });
      } catch (err) {
        results.push({ id: item.listing.id, ok: false, error: err.message });
      }
    }
    res.json({ analyzed: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scrape + analyze new listings only.
app.post('/api/run', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set' });
  }
  try {
    const listings = await domain.search(req.body || {});
    const results = [];
    for (const l of listings) {
      const isNew = !store.get(l.id);
      store.upsertListing(l);
      if (!isNew && store.get(l.id).analysis) {
        results.push({ id: l.id, ok: true, skipped: 'already analyzed' });
        continue;
      }
      try {
        const pc = priceContext(l);
        const analysis = await analyzer.analyze(l, pc);
        store.setAnalysis(l.id, analysis, pc);
        results.push({ id: l.id, ok: true, decision: analysis.decision });
      } catch (err) {
        results.push({ id: l.id, ok: false, error: err.message });
      }
    }
    res.json({ scraped: listings.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Rental finder listening on http://localhost:${PORT}`);
  console.log(`  source:        ${domain.kind}`);
  console.log(`  vision model:  ${process.env.VISION_MODEL || 'claude-opus-4-7'}`);
  console.log(`  anthropic key: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}`);
});

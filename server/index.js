require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const domain = require('./domain');
const analyzer = require('./vision/analyzer');
const { score } = require('./scoring/score');
const store = require('./store');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, '..', 'dashboard');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    source: domain.kind,
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    visionModel: process.env.VISION_MODEL || 'claude-opus-4-7',
  });
});

app.get('/api/listings', (_req, res) => {
  const items = store.all().sort((a, b) => {
    const sa = a.score?.composite ?? -1;
    const sb = b.score?.composite ?? -1;
    return sb - sa;
  });
  res.json({ count: items.length, items });
});

app.get('/api/listings/:id', (req, res) => {
  const item = store.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

// Pull listings from the configured source and store them (no AI yet).
app.post('/api/scrape', async (req, res) => {
  try {
    const params = req.body || {};
    const listings = await domain.search(params);
    for (const l of listings) {
      store.upsertListing(l);
      // Compute provisional price-only score so the dashboard has something
      // to show before vision analysis runs.
      const provisional = score(l, null);
      store.setAnalysis(l.id, null, provisional);
    }
    res.json({ count: listings.length, source: domain.kind });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run Claude Vision on a single listing (or all unanalyzed if no id given).
app.post('/api/analyze', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(400)
      .json({ error: 'ANTHROPIC_API_KEY not set in .env' });
  }
  try {
    const { id, force } = req.body || {};
    const targets = id
      ? [store.get(id)].filter(Boolean)
      : store.all().filter((x) => force || !x.vision);
    if (targets.length === 0) {
      return res.json({ analyzed: 0, message: 'nothing to analyze' });
    }
    const results = [];
    for (const item of targets) {
      try {
        const vision = await analyzer.analyze(item.listing);
        const composite = score(item.listing, vision);
        store.setAnalysis(item.listing.id, vision, composite);
        results.push({ id: item.listing.id, ok: true, score: composite });
      } catch (err) {
        results.push({ id: item.listing.id, ok: false, error: err.message });
      }
    }
    res.json({ analyzed: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convenience: scrape then analyze in one shot.
app.post('/api/run', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set' });
  }
  try {
    const listings = await domain.search(req.body || {});
    const results = [];
    for (const l of listings) {
      store.upsertListing(l);
      try {
        const vision = await analyzer.analyze(l);
        const composite = score(l, vision);
        store.setAnalysis(l.id, vision, composite);
        results.push({ id: l.id, ok: true, score: composite.composite });
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

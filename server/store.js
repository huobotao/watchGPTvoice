const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache');
const STATE_FILE = path.join(CACHE_DIR, 'state.json');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function read() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) return { listings: {} };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { listings: {} };
  }
}

function write(state) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function upsertListing(listing) {
  const state = read();
  const existing = state.listings[listing.id] || {};
  state.listings[listing.id] = { ...existing, listing };
  write(state);
}

function setAnalysis(id, analysis, priceContext) {
  const state = read();
  if (!state.listings[id]) return;
  state.listings[id].analysis = analysis;
  state.listings[id].priceContext = priceContext;
  state.listings[id].analyzedAt = new Date().toISOString();
  write(state);
}

// Human verdict on a SUSPECT listing (or override of any AI decision).
// verdict: 'CONFIRMED_DEAL' | 'CONFIRMED_DISCARD' | null (clears)
function setVerdict(id, verdict, note) {
  const state = read();
  if (!state.listings[id]) return null;
  if (verdict === null) {
    delete state.listings[id].userVerdict;
  } else {
    state.listings[id].userVerdict = {
      verdict,
      note: note || '',
      reviewedAt: new Date().toISOString(),
    };
  }
  write(state);
  return state.listings[id];
}

function all() {
  return Object.values(read().listings);
}

function get(id) {
  return read().listings[id] || null;
}

// Effective decision: human verdict wins over AI decision.
function effectiveDecision(item) {
  if (item.userVerdict) {
    return item.userVerdict.verdict === 'CONFIRMED_DEAL' ? 'DEAL' : 'DISCARD';
  }
  return item.analysis?.decision || 'UNANALYZED';
}

module.exports = {
  upsertListing,
  setAnalysis,
  setVerdict,
  all,
  get,
  effectiveDecision,
};

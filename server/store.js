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
  state.listings[listing.id] = { ...existing, ...listing, listing };
  write(state);
}

function setAnalysis(id, vision, score) {
  const state = read();
  if (!state.listings[id]) return;
  state.listings[id].vision = vision;
  state.listings[id].score = score;
  state.listings[id].analyzedAt = new Date().toISOString();
  write(state);
}

function all() {
  return Object.values(read().listings);
}

function get(id) {
  return read().listings[id] || null;
}

module.exports = { upsertListing, setAnalysis, all, get };

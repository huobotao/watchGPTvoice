const fs = require('fs');
const path = require('path');

const SETTINGS_DIR = path.join(__dirname, '..', 'data', 'cache');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

function ensureDir() {
  if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true });
}

function read() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function write(next) {
  ensureDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2));
  // Restrict to owner read/write so the key file isn't world-readable
  try {
    fs.chmodSync(SETTINGS_FILE, 0o600);
  } catch {
    /* best-effort on platforms that don't support chmod */
  }
}

function update(patch) {
  const next = { ...read(), ...patch };
  // Strip empty strings so unsetting works
  for (const k of Object.keys(next)) if (next[k] === '') delete next[k];
  write(next);
  return next;
}

// Effective values: settings file wins, env vars are fallback.
function getAnthropicKey() {
  return read().anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
}

function getDomainKey() {
  return read().domainApiKey || process.env.DOMAIN_API_KEY || '';
}

function getVisionModel() {
  return read().visionModel || process.env.VISION_MODEL || 'claude-opus-4-7';
}

function getSource() {
  return read().source || process.env.SOURCE || 'mock';
}

// Safe-for-UI view: mask secrets, show only first 4 and last 4 chars.
function mask(secret) {
  if (!secret) return '';
  if (secret.length <= 10) return '••••';
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}

function publicView() {
  const s = read();
  return {
    anthropicApiKey: mask(getAnthropicKey()),
    anthropicApiKeySet: Boolean(getAnthropicKey()),
    domainApiKey: mask(getDomainKey()),
    domainApiKeySet: Boolean(getDomainKey()),
    visionModel: getVisionModel(),
    source: getSource(),
    // Note: file-based source (file vs env) so user knows where the key came from
    sources: {
      anthropic: read().anthropicApiKey ? 'settings' : process.env.ANTHROPIC_API_KEY ? 'env' : 'unset',
      domain: read().domainApiKey ? 'settings' : process.env.DOMAIN_API_KEY ? 'env' : 'unset',
    },
  };
}

module.exports = {
  read,
  update,
  getAnthropicKey,
  getDomainKey,
  getVisionModel,
  getSource,
  publicView,
};

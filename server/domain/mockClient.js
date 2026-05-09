const fs = require('fs');
const path = require('path');

const MOCK_PATH = path.join(__dirname, '..', '..', 'data', 'mockListings.json');

function loadMock() {
  return JSON.parse(fs.readFileSync(MOCK_PATH, 'utf8'));
}

async function search({ suburbs, minBedrooms, maxBedrooms, maxRent } = {}) {
  let listings = loadMock();
  if (suburbs && suburbs.length) {
    const set = new Set(suburbs.map((s) => s.toLowerCase()));
    listings = listings.filter((l) => set.has(l.suburb.toLowerCase()));
  }
  if (Number.isFinite(minBedrooms)) {
    listings = listings.filter((l) => l.bedrooms >= minBedrooms);
  }
  if (Number.isFinite(maxBedrooms)) {
    listings = listings.filter((l) => l.bedrooms <= maxBedrooms);
  }
  if (Number.isFinite(maxRent)) {
    listings = listings.filter((l) => l.weeklyRent <= maxRent);
  }
  return listings;
}

async function getById(id) {
  const listings = loadMock();
  return listings.find((l) => l.id === id) || null;
}

module.exports = { search, getById, kind: 'mock' };

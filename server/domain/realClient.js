// Real Domain.com.au API client.
//
// Domain supports two auth methods on different endpoints:
//   (a) Simple X-Api-Key header (project-level "key_..." style key)
//   (b) OAuth 2.0 Client Credentials (Client ID + Secret -> Bearer token)
//
// This client uses method (a). If your project only has a Client ID + Secret
// pair instead of a "key_..." key, swap getToken() to do an OAuth call against
// auth.domain.com.au/v1/connect/token first, then send the token as
// Authorization: Bearer <token>.

const settings = require('../settings');

const API_BASE = 'https://api.domain.com.au/v1';

function authHeaders() {
  const key = settings.getDomainKey();
  if (!key) throw new Error('DOMAIN_API_KEY not set (use Settings dialog or .env)');
  return { 'X-Api-Key': key };
}

async function search(params = {}) {
  const body = {
    listingType: 'Rent',
    propertyTypes: ['Apartment', 'ApartmentUnitFlat', 'Studio'],
    locations: (params.suburbs || []).map((suburb) => ({
      state: 'NSW',
      suburb,
      includeSurroundingSuburbs: false,
    })),
    minBedrooms: params.minBedrooms,
    maxBedrooms: params.maxBedrooms,
    maxRent: params.maxRent,
    pageSize: 50,
  };

  const res = await fetch(`${API_BASE}/listings/residential/_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Domain API ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.map(normalize);
}

async function getById(id) {
  const res = await fetch(`${API_BASE}/listings/${id}`, { headers: authHeaders() });
  if (!res.ok) return null;
  return normalize(await res.json());
}

function normalize(raw) {
  const l = raw.listing || raw;
  return {
    id: String(l.id),
    address: l.addressParts?.displayAddress || l.headline || '',
    suburb: l.addressParts?.suburb || '',
    postcode: l.addressParts?.postcode || '',
    bedrooms: l.bedrooms ?? 0,
    bathrooms: l.bathrooms ?? 0,
    carSpaces: l.carspaces ?? 0,
    weeklyRent: parsePrice(l.priceDetails?.displayPrice || l.price),
    propertyType: l.propertyDetails?.propertyType || 'Apartment',
    listedDate: l.dateListed || l.dateUpdated,
    url: l.seoUrl ? `https://www.domain.com.au${l.seoUrl}` : '',
    images: (l.media || []).filter((m) => m.type === 'photo').map((m) => m.url),
    description: l.description || l.headline || '',
  };
}

function parsePrice(s) {
  if (typeof s === 'number') return s;
  if (!s) return null;
  const m = String(s).match(/(\d[\d,]*)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

module.exports = { search, getById, kind: 'domain' };

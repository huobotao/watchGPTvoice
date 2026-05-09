// Stub for the real Domain.com.au API.
// Domain's developer API: https://developer.domain.com.au/
// Auth flow: OAuth2 client credentials -> Bearer token, then GET /v1/listings/residential/_search
//
// To enable, set DOMAIN_API_KEY (and optionally DOMAIN_CLIENT_ID/DOMAIN_CLIENT_SECRET if using OAuth)
// in .env, switch SOURCE=domain in .env, and replace the throws below with fetch() calls.
//
// Keep the same shape as mockClient (id, address, suburb, bedrooms, weeklyRent, images[], url, ...).

const API_BASE = 'https://api.domain.com.au/v1';

async function getToken() {
  // TODO: implement OAuth2 client credentials flow against Domain's token endpoint
  // and cache the bearer token. For API-key auth, no token call is needed.
  return process.env.DOMAIN_API_KEY;
}

async function search(params = {}) {
  const token = await getToken();
  if (!token) {
    throw new Error('DOMAIN_API_KEY not set. Configure .env or use SOURCE=mock.');
  }
  // Map our params to Domain's residential search body.
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
    headers: {
      'X-Api-Key': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Domain API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.map(normalize);
}

async function getById(id) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/listings/${id}`, {
    headers: { 'X-Api-Key': token },
  });
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

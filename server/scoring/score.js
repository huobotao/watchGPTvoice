const fs = require('fs');
const path = require('path');

const BASELINES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'baselines.json'), 'utf8'),
);

function getMedian(suburb, bedrooms) {
  const suburbBaselines = BASELINES[suburb];
  if (!suburbBaselines) return null;
  return suburbBaselines[String(bedrooms)] || null;
}

// Price context is informational — it's fed into the AI rubric so the model
// can apply price-based criteria. There's no standalone "price score" anymore;
// the AI decides DEAL/SUSPECT/DISCARD using both photos and this context.
function priceContext(listing) {
  const suburbMedianRent = getMedian(listing.suburb, listing.bedrooms);
  if (!suburbMedianRent) {
    return { suburbMedianRent: null, priceDeltaPct: null };
  }
  const priceDeltaPct = Math.round(
    ((suburbMedianRent - listing.weeklyRent) / suburbMedianRent) * 100,
  );
  return { suburbMedianRent, priceDeltaPct };
}

module.exports = { priceContext, getMedian };

const fs = require('fs');
const path = require('path');

const BASELINES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'baselines.json'), 'utf8'),
);

const VISION_WEIGHT = Number(process.env.VISION_WEIGHT || 0.5);
const PRICE_WEIGHT = Number(process.env.PRICE_WEIGHT || 0.5);
const DEAL_THRESHOLD = Number(process.env.DEAL_THRESHOLD || 75);

function getMedian(suburb, bedrooms) {
  const suburbBaselines = BASELINES[suburb];
  if (!suburbBaselines) return null;
  return suburbBaselines[String(bedrooms)] || null;
}

// Price score: how much below the suburb+bedroom median.
//   priceDelta = (median - rent) / median   (positive = below market = good)
// Mapped to 0-100 with 50 = exactly at median, 100 = ~30% below, 0 = ~30% above.
function computePriceScore(rent, median) {
  if (!median) return { score: 50, delta: 0, median: null }; // unknown -> neutral
  const delta = (median - rent) / median;
  const score = Math.round(Math.max(0, Math.min(100, 50 + delta * 167)));
  return { score, delta, median };
}

function score(listing, vision) {
  const median = getMedian(listing.suburb, listing.bedrooms);
  const price = computePriceScore(listing.weeklyRent, median);

  const visionScore = vision?.overall_score ?? 0;
  const composite = Math.round(
    visionScore * VISION_WEIGHT + price.score * PRICE_WEIGHT,
  );

  return {
    composite,
    isDeal: composite >= DEAL_THRESHOLD,
    priceScore: price.score,
    priceDeltaPct: Math.round(price.delta * 100),
    suburbMedianRent: price.median,
    visionScore,
    weights: { vision: VISION_WEIGHT, price: PRICE_WEIGHT },
    threshold: DEAL_THRESHOLD,
  };
}

module.exports = { score, getMedian, DEAL_THRESHOLD };

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const settings = require('../settings');

const RUBRIC_PATH = path.join(__dirname, '..', '..', 'data', 'rubric.md');

// Build client per-call so an API key edited in the UI takes effect immediately.
function buildClient() {
  const apiKey = settings.getAnthropicKey();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set (use Settings dialog or .env)');
  return new Anthropic({ apiKey });
}

function loadRubric() {
  return fs.readFileSync(RUBRIC_PATH, 'utf8');
}

const BASE_SYSTEM = `You are an expert Sydney real estate triage analyst.

You receive (in order): photos of a single rental listing, the listing metadata, and a user-defined rubric. Your job is to classify the listing into DEAL, SUSPECT, or DISCARD strictly according to the rubric.

Calibration rules:
- Sydney rental photos are heavily staged and wide-angle lensed. Score conservatively.
- If you can confidently match a DEAL criterion, choose DEAL.
- If you can confidently match a DISCARD criterion, choose DISCARD.
- Otherwise choose SUSPECT. SUSPECT is the correct answer when uncertain — it is not a failure, it means the case earns human review.
- Never invent criteria not in the user's rubric.
- "reasoning" must name the specific rubric clause you applied and cite the photo evidence supporting it (e.g. "photo 2: visible mould around bathroom ceiling vent").
- "confidence" is your confidence in the decision (0 to 1). For SUSPECT decisions, 0.5 means evenly torn between DEAL and DISCARD; 0.9 means firmly "needs human review, neither edge applies".

The user's rubric follows below. Apply it as written.

---
USER RUBRIC:
`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['DEAL', 'SUSPECT', 'DISCARD'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    headline: { type: 'string', description: 'One short sentence summarising the listing.' },
    pros: { type: 'array', items: { type: 'string' } },
    cons: { type: 'array', items: { type: 'string' } },
    matched_criteria: {
      type: 'array',
      items: { type: 'string' },
      description: 'Which rubric clauses you matched (verbatim short quotes).',
    },
    reasoning: { type: 'string' },
  },
  required: [
    'decision',
    'confidence',
    'headline',
    'pros',
    'cons',
    'matched_criteria',
    'reasoning',
  ],
  additionalProperties: false,
};

async function analyze(listing, priceContext) {
  if (!listing.images || listing.images.length === 0) {
    throw new Error(`Listing ${listing.id} has no images`);
  }

  const rubric = loadRubric();
  const imageBlocks = listing.images.slice(0, 6).map((url) => ({
    type: 'image',
    source: { type: 'url', url },
  }));

  const medianStr = priceContext?.suburbMedianRent
    ? `$${priceContext.suburbMedianRent}/week (this listing is ${priceContext.priceDeltaPct >= 0 ? `${priceContext.priceDeltaPct}% below` : `${Math.abs(priceContext.priceDeltaPct)}% above`} that)`
    : 'unknown (no suburb baseline available)';

  const userText = [
    `Listing: ${listing.address}`,
    `${listing.bedrooms} bed / ${listing.bathrooms} bath / ${listing.carSpaces} car`,
    `Asking: $${listing.weeklyRent}/week`,
    `Suburb+bedroom median: ${medianStr}`,
    listing.description ? `Description from agent: ${listing.description}` : '',
    `Photos provided: ${listing.images.length}`,
    '',
    'Apply the rubric and return JSON matching the schema.',
  ]
    .filter(Boolean)
    .join('\n');

  const client = buildClient();
  const MODEL = settings.getVisionModel();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: BASE_SYSTEM + rubric,
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [...imageBlocks, { type: 'text', text: userText }],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text block in vision response');
  const parsed = JSON.parse(textBlock.text);

  return {
    ...parsed,
    _usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens || 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens || 0,
    },
    _model: settings.getVisionModel(),
    _analyzedAt: new Date().toISOString(),
  };
}

module.exports = { analyze, loadRubric };

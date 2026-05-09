const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();
const MODEL = process.env.VISION_MODEL || 'claude-opus-4-7';

const SYSTEM_PROMPT = `You are an expert Sydney real estate analyst specialising in rental properties.

Given photos of a single rental listing, evaluate it across the criteria below. Be calibrated and honest — Sydney rental photos are heavily staged and wide-angle lensed. Score conservatively.

Scoring guide (0-10 each):
- view_quality: 0 = no view / blocked by neighbouring building / brick wall outlook. 5 = pleasant outlook (trees, courtyard, suburban skyline). 8 = clear district / partial water / partial city. 10 = unobstructed iconic Sydney view (Harbour Bridge, Opera House, ocean horizon, full CBD skyline).
- natural_light: 0 = dim / artificial only / north-side blocked. 5 = adequate. 10 = bright multi-aspect with floor-to-ceiling windows.
- condition: 0 = run-down, mouldy, dated 70s/80s. 5 = clean and liveable but original. 10 = recent full renovation, premium fixtures.
- space_feel: 0 = cramped, awkward layout. 10 = open plan, generous proportions.

Set has_city_view / has_water_view / has_park_or_greenery to true ONLY if clearly visible in the photos (not implied from address).

overall_score (0-100) is your composite visual-quality assessment, weighted: view 30%, light 20%, condition 30%, space 20%. It is NOT a price assessment.

notable_features: 2-5 standout positives ("floor-to-ceiling windows", "balcony with skyline view", "stone benchtops").
red_flags: 0-5 visible issues ("dated bathroom", "internal-facing only", "carpet shows wear", "no balcony").
summary: one sentence, plain English.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    overall_score: { type: 'integer', minimum: 0, maximum: 100 },
    view_quality: { type: 'integer', minimum: 0, maximum: 10 },
    has_city_view: { type: 'boolean' },
    has_water_view: { type: 'boolean' },
    has_park_or_greenery: { type: 'boolean' },
    natural_light: { type: 'integer', minimum: 0, maximum: 10 },
    condition: { type: 'integer', minimum: 0, maximum: 10 },
    space_feel: { type: 'integer', minimum: 0, maximum: 10 },
    notable_features: { type: 'array', items: { type: 'string' } },
    red_flags: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: [
    'overall_score',
    'view_quality',
    'has_city_view',
    'has_water_view',
    'has_park_or_greenery',
    'natural_light',
    'condition',
    'space_feel',
    'notable_features',
    'red_flags',
    'summary',
  ],
  additionalProperties: false,
};

async function analyze(listing) {
  if (!listing.images || listing.images.length === 0) {
    throw new Error(`Listing ${listing.id} has no images`);
  }

  const imageBlocks = listing.images.slice(0, 6).map((url) => ({
    type: 'image',
    source: { type: 'url', url },
  }));

  const userText = [
    `Listing: ${listing.address}`,
    `${listing.bedrooms} bed / ${listing.bathrooms} bath / ${listing.carSpaces} car`,
    `Asking: $${listing.weeklyRent}/week`,
    listing.description ? `Description: ${listing.description}` : '',
    '',
    'Analyse the photos and return JSON matching the schema.',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
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
    _model: MODEL,
    _analyzedAt: new Date().toISOString(),
  };
}

module.exports = { analyze };

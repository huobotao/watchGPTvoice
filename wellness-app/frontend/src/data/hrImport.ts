import type { HrSample, Partner } from './db';
import { db } from './db';

export interface ParsedSample {
  recordedAt: number;
  bpm: number;
}

export interface ImportResult {
  samples: ParsedSample[];
  /** Decoded source label for UI display ("Shortcut JSON", "CSV", etc.). */
  sourceLabel: string;
  /** Error message if parsing failed. */
  error?: string;
}

/**
 * Parse a payload coming from any supported source:
 *  - JSON array of `{ date|recordedAt|timestamp, bpm|value }` objects
 *  - JSON `{ samples: [...] }` wrapper
 *  - CSV lines `<iso-or-ms>,<bpm>`
 *  - Apple Health XML export (subset — first <Record type="HKQuantityTypeIdentifierHeartRate" ...>)
 */
export function parseHrPayload(raw: string): ImportResult {
  const trimmed = raw.trim();
  if (!trimmed) return { samples: [], sourceLabel: 'empty', error: 'No data provided.' };

  // Try JSON first.
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      const list = Array.isArray(data) ? data : Array.isArray(data?.samples) ? data.samples : null;
      if (!list) {
        return { samples: [], sourceLabel: 'json', error: 'JSON did not contain an array.' };
      }
      const samples: ParsedSample[] = [];
      for (const item of list) {
        const ts =
          item.recordedAt ??
          item.timestamp ??
          item.date ??
          item.time ??
          item.startDate ??
          item.t;
        const bpm = item.bpm ?? item.value ?? item.heartRate ?? item.hr;
        const t = typeof ts === 'number' ? ts : Date.parse(String(ts));
        const v = typeof bpm === 'number' ? bpm : Number(bpm);
        if (!Number.isFinite(t) || !Number.isFinite(v) || v <= 0) continue;
        samples.push({ recordedAt: t, bpm: Math.round(v) });
      }
      samples.sort((a, b) => a.recordedAt - b.recordedAt);
      return { samples, sourceLabel: 'JSON' };
    } catch (e) {
      return { samples: [], sourceLabel: 'json', error: `Invalid JSON: ${(e as Error).message}` };
    }
  }

  // Apple Health XML export (very loose subset).
  if (trimmed.startsWith('<?xml') || trimmed.includes('HKQuantityTypeIdentifierHeartRate')) {
    const samples: ParsedSample[] = [];
    const regex =
      /<Record\b[^>]*type="HKQuantityTypeIdentifierHeartRate"[^>]*startDate="([^"]+)"[^>]*value="([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(trimmed))) {
      const t = Date.parse(m[1]);
      const v = Number(m[2]);
      if (!Number.isFinite(t) || !Number.isFinite(v) || v <= 0) continue;
      samples.push({ recordedAt: t, bpm: Math.round(v) });
    }
    samples.sort((a, b) => a.recordedAt - b.recordedAt);
    return { samples, sourceLabel: 'Apple Health XML' };
  }

  // CSV fallback.
  const samples: ParsedSample[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const cols = line.split(/[,\t]/).map(s => s.trim());
    if (cols.length < 2) continue;
    const [tStr, vStr] = cols;
    if (/^(time|date|timestamp)/i.test(tStr)) continue; // header
    const t = /^\d+$/.test(tStr) ? Number(tStr) : Date.parse(tStr);
    const v = Number(vStr);
    if (!Number.isFinite(t) || !Number.isFinite(v) || v <= 0) continue;
    samples.push({ recordedAt: t, bpm: Math.round(v) });
  }
  samples.sort((a, b) => a.recordedAt - b.recordedAt);
  return { samples, sourceLabel: 'CSV' };
}

/** Persist parsed samples to the DB linked to a session + partner. */
export async function saveHrSamples(
  sessionId: number,
  partner: Partner,
  samples: ParsedSample[],
  source: HrSample['source'] = 'watch'
): Promise<number> {
  if (samples.length === 0) return 0;
  const rows: HrSample[] = samples.map(s => ({
    sessionId,
    partner,
    source,
    recordedAt: s.recordedAt,
    bpm: s.bpm
  }));
  await db.hrSamples.bulkAdd(rows);
  return rows.length;
}

/** Decode an `?import=` URL payload. Accepts base64url-encoded JSON or raw JSON. */
export function decodeImportParam(value: string): string {
  // If it parses as JSON directly, use as-is.
  try {
    JSON.parse(value);
    return value;
  } catch {
    /* fall through */
  }
  // Try base64url decode.
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const b64 = padded + '='.repeat((4 - (padded.length % 4)) % 4);
    return atob(b64);
  } catch {
    return value;
  }
}

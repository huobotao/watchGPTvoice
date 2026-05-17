import type { HrSample } from '@/data/db';

interface Props {
  samples: HrSample[];
  /** Optional time window override (ms). Defaults to span of samples. */
  start?: number;
  end?: number;
  height?: number;
}

const COLORS = {
  A: '#5eead4',
  B: '#fb923c'
};

export function HrChart({ samples, start, end, height = 120 }: Props) {
  if (samples.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-500"
        style={{ height }}
      >
        No heart-rate data yet.
      </div>
    );
  }

  const times = samples.map(s => s.recordedAt);
  const bpms = samples.map(s => s.bpm);
  const t0 = start ?? Math.min(...times);
  const t1 = end ?? Math.max(...times);
  const tSpan = Math.max(t1 - t0, 1);
  const bpmMin = Math.min(...bpms, 60) - 5;
  const bpmMax = Math.max(...bpms, 120) + 5;
  const bpmSpan = bpmMax - bpmMin;

  const W = 600;
  const H = height;
  const padL = 28;
  const padR = 8;
  const padT = 6;
  const padB = 18;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xOf = (t: number) => padL + ((t - t0) / tSpan) * innerW;
  const yOf = (b: number) => padT + (1 - (b - bpmMin) / bpmSpan) * innerH;

  // Build one polyline per partner.
  const byPartner: Record<'A' | 'B', HrSample[]> = { A: [], B: [] };
  for (const s of samples) byPartner[s.partner].push(s);

  function pathFor(arr: HrSample[]): string {
    if (arr.length === 0) return '';
    return arr
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${xOf(s.recordedAt).toFixed(1)},${yOf(s.bpm).toFixed(1)}`)
      .join(' ');
  }

  const yTicks = [bpmMin, bpmMin + bpmSpan / 2, bpmMax].map(Math.round);

  function formatTime(ms: number): string {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height, display: 'block' }}
    >
      {/* y-axis grid + labels */}
      {yTicks.map((b, i) => (
        <g key={`y${i}`}>
          <line
            x1={padL}
            x2={W - padR}
            y1={yOf(b)}
            y2={yOf(b)}
            stroke="#1e293b"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text x={4} y={yOf(b) + 3} fontSize={9} fill="#64748b" fontFamily="ui-monospace">
            {b}
          </text>
        </g>
      ))}

      {/* x-axis labels */}
      <text x={padL} y={H - 4} fontSize={9} fill="#64748b" fontFamily="ui-monospace">
        {formatTime(t0)}
      </text>
      <text x={W - padR - 30} y={H - 4} fontSize={9} fill="#64748b" fontFamily="ui-monospace">
        {formatTime(t1)}
      </text>

      {/* Polylines */}
      <path d={pathFor(byPartner.A)} fill="none" stroke={COLORS.A} strokeWidth={1.6} />
      <path d={pathFor(byPartner.B)} fill="none" stroke={COLORS.B} strokeWidth={1.6} />
    </svg>
  );
}

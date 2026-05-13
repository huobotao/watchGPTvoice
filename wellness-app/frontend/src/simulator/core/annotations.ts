import type { Metrics } from './metrics';

export interface Annotation {
  /** Short headline. */
  title: string;
  /** One-sentence explanation referencing the geometric quantity. */
  detail: string;
  /** Severity tier for UI styling. */
  tone: 'info' | 'warn' | 'good';
}

/**
 * Derive human-readable observations from live geometric metrics.
 * These are heuristics — interpret as starting hints, not authoritative anatomy.
 */
export function annotate(m: Metrics): Annotation[] {
  const notes: Annotation[] = [];

  // Distance / engagement
  if (m.pelvicDistance < 0.05) {
    notes.push({
      title: 'Close engagement',
      detail: `Pelvis centers ${(m.pelvicDistance * 100).toFixed(1)} cm apart — pelvises are interlocked.`,
      tone: 'info'
    });
  } else if (m.pelvicDistance > 0.35) {
    notes.push({
      title: 'Disengaged',
      detail: `Pelvises are ${(m.pelvicDistance * 100).toFixed(0)} cm apart — likely transitioning between positions.`,
      tone: 'warn'
    });
  }

  // Facing alignment
  if (m.pelvicYawDelta < 30) {
    notes.push({
      title: 'Facing each other',
      detail: `Pelvic yaw difference ${m.pelvicYawDelta.toFixed(0)}° — partners directly opposed; allows eye contact and chest-to-chest contact.`,
      tone: 'good'
    });
  } else if (m.pelvicYawDelta > 150) {
    notes.push({
      title: 'Same direction',
      detail: `Pelvic yaw delta ${m.pelvicYawDelta.toFixed(0)}° — both pelvises face the same way (e.g. spooning / rear-entry).`,
      tone: 'info'
    });
  } else if (m.pelvicYawDelta > 60 && m.pelvicYawDelta < 120) {
    notes.push({
      title: 'Perpendicular orientation',
      detail: `Pelvic yaw delta ${m.pelvicYawDelta.toFixed(0)}° — partners at ~90°, common in side-on / scissoring variants.`,
      tone: 'info'
    });
  }

  // Engagement depth heuristic
  if (Math.abs(m.engagementDepth) > 0.02 && m.pelvicDistance < 0.2) {
    const sign = m.engagementDepth > 0 ? 'forward of' : 'behind';
    notes.push({
      title: 'Pelvic forward offset',
      detail: `Partner B sits ${Math.abs(m.engagementDepth * 100).toFixed(1)} cm ${sign} A's forward axis — affects angle of contact and felt depth.`,
      tone: 'info'
    });
  }

  // Pitch (tilt) difference
  if (Math.abs(m.pelvicPitchDelta) > 15) {
    notes.push({
      title: 'Mismatched pelvic tilt',
      detail: `Pitch delta ${m.pelvicPitchDelta.toFixed(0)}° — large vertical-axis angle between pelvises changes the felt vector of contact.`,
      tone: 'info'
    });
  }

  // Stability
  if (m.stabilityA < 0.4) {
    notes.push({
      title: 'Partner A needs support',
      detail: `Only ${m.supportPointsA} ground contact point(s) detected — partner A is unstable without external support (wall, bed edge, partner).`,
      tone: 'warn'
    });
  }
  if (m.stabilityB < 0.4) {
    notes.push({
      title: 'Partner B needs support',
      detail: `Only ${m.supportPointsB} ground contact point(s) detected — partner B is unstable without external support.`,
      tone: 'warn'
    });
  }

  if (notes.length === 0) {
    notes.push({
      title: 'Neutral pose',
      detail: 'No notable geometric extremes — adjust joint sliders to explore variations.',
      tone: 'info'
    });
  }

  return notes;
}

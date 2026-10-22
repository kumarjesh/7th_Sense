// ============================================================
// VisionGuard — Proximity Band Configuration
// ============================================================
// Proximity is estimated from bounding box height relative to frame height.
// These are qualitative bands — NOT precise distances. Monocular cameras
// cannot reliably estimate exact meters without depth hardware.

import type { ProximityBand } from '../types';

/** Bbox height / frame height thresholds */
export const PROXIMITY_THRESHOLDS = {
  /** Above this ratio → CRITICAL ("very close", ~1–2m) */
  CRITICAL: 0.45,
  /** Above this ratio → WARNING ("close", ~2–4.5m) */
  WARNING: 0.20,
  /** Below WARNING → BACKGROUND (far, suppress announcements) */
} as const;

/** Human-readable labels for each proximity band */
export const PROXIMITY_LABELS: Record<ProximityBand, string> = {
  CRITICAL: 'very close',
  WARNING: 'close',
  BACKGROUND: 'ahead',
};

/** Minimum frames an object must persist before first announcement */
export const CONFIRM_FRAME_COUNT = 2;

/** Frames missed before a tracked object is considered LOST */
export const LOST_FRAME_COUNT = 3;

/** Minimum IoU overlap to match a detection to an existing track */
export const IOU_MATCH_THRESHOLD = 0.3;

/** Frames an object must stay in a new zone before zone change is accepted */
export const ZONE_HYSTERESIS_FRAMES = 3;

/** EMA smoothing factor for bounding box (0 = no smoothing, 1 = no history) */
export const BBOX_SMOOTHING_ALPHA = 0.4;

/** Rate of bbox area growth (fraction per second) to flag as LOOMING */
export const LOOMING_THRESHOLD = 0.15;

/**
 * Determine the proximity band from bbox height ratio.
 */
export function getProximityBand(bboxHeightRatio: number): ProximityBand {
  if (bboxHeightRatio >= PROXIMITY_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (bboxHeightRatio >= PROXIMITY_THRESHOLDS.WARNING) return 'WARNING';
  return 'BACKGROUND';
}

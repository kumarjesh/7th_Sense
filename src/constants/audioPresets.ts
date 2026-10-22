// ============================================================
// VisionGuard — Spatial Audio & Sonar Presets
// ============================================================

import type { ProximityBand, Zone } from '../types';

/** Stereo panning values per zone (-1 = full left, +1 = full right) */
export const ZONE_PAN: Record<Zone, number> = {
  left: -0.8,
  center: 0.0,
  right: 0.8,
};

/** Oscillator frequency (Hz) per proximity band */
export const SONAR_FREQUENCY: Record<ProximityBand, number> = {
  BACKGROUND: 330,
  WARNING: 440,
  CRITICAL: 880,
};

/** Interval between sonar pings (ms) per proximity band */
export const SONAR_INTERVAL: Record<ProximityBand, number> = {
  BACKGROUND: 1200,
  WARNING: 600,
  CRITICAL: 120,
};

/** Duration of each sonar ping (ms) */
export const SONAR_DURATION: Record<ProximityBand, number> = {
  BACKGROUND: 60,
  WARNING: 80,
  CRITICAL: 50,
};

/** Base gain for sonar pings (before ducking) */
export const SONAR_BASE_GAIN = 0.3;

/** Gain multiplier when audio ducking is active (during speech) */
export const SONAR_DUCK_GAIN = 0.08;

/** Maximum simultaneous sonar sources */
export const MAX_SONAR_SOURCES = 3;

// ============================================================
// Haptic Patterns (vibration durations in ms)
// ============================================================

export const HAPTIC_PATTERNS = {
  /** Triple pulse — STOP (critical, center path) */
  CRITICAL_CENTER: [200, 80, 200, 80, 200] as number[],
  /** Long-short — critical obstacle on left */
  CRITICAL_LEFT: [300, 100, 100] as number[],
  /** Short-long — critical obstacle on right */
  CRITICAL_RIGHT: [100, 100, 300] as number[],
  /** Double pulse — warning, center path */
  WARNING_CENTER: [150, 100, 150] as number[],
  /** Single short pulse — warning, side */
  WARNING_SIDE: [100] as number[],
} as const;

/** Minimum interval between vibration triggers (ms) */
export const HAPTIC_COOLDOWN_MS = 1500;

// ============================================================
// Speech
// ============================================================

/** Per-tracked-object announcement cooldown (ms) */
export const SPEECH_COOLDOWN_MS = 4000;

/** Maximum pending speech items in queue */
export const MAX_SPEECH_QUEUE = 2;

/** Direction labels for speech announcements */
export const ZONE_SPEECH_LABEL: Record<Zone, string> = {
  left: 'on your left',
  center: 'ahead',
  right: 'on your right',
};

// ============================================================
// VisionGuard — Haptics Engine (Navigator Vibration API)
// ============================================================
// Provides directional vibration patterns with iOS-safe fallbacks.
// Distinct patterns for left/center/right and warning/critical.

import { HAPTIC_PATTERNS, HAPTIC_COOLDOWN_MS } from '../constants/audioPresets';
import type { HapticIntensity, ProximityBand, Zone } from '../types';

class HapticsEngineImpl {
  private supported = false;
  private intensity: HapticIntensity = 'NORMAL';
  private lastVibrateTime = 0;

  /** Initialize — check for Vibration API support */
  init(): boolean {
    this.supported =
      typeof navigator !== 'undefined' && 'vibrate' in navigator;
    if (!this.supported) {
      console.info('[Haptics] Vibration API not supported (e.g., iOS Safari)');
    }
    return this.supported;
  }

  /** Set haptic intensity */
  setIntensity(intensity: HapticIntensity): void {
    this.intensity = intensity;
  }

  /**
   * Trigger a directional vibration pattern based on proximity and zone.
   * Respects cooldown to prevent continuous buzzing.
   */
  trigger(band: ProximityBand, zone: Zone): void {
    if (!this.supported || this.intensity === 'OFF') return;
    if (band === 'BACKGROUND') return; // No haptics for distant objects

    const now = Date.now();
    if (now - this.lastVibrateTime < HAPTIC_COOLDOWN_MS) return;

    let pattern: number[];

    if (band === 'CRITICAL') {
      switch (zone) {
        case 'center':
          pattern = [...HAPTIC_PATTERNS.CRITICAL_CENTER];
          break;
        case 'left':
          pattern = [...HAPTIC_PATTERNS.CRITICAL_LEFT];
          break;
        case 'right':
          pattern = [...HAPTIC_PATTERNS.CRITICAL_RIGHT];
          break;
      }
    } else {
      // WARNING
      pattern =
        zone === 'center'
          ? [...HAPTIC_PATTERNS.WARNING_CENTER]
          : [...HAPTIC_PATTERNS.WARNING_SIDE];
    }

    // Apply intensity scaling
    pattern = this.scalePattern(pattern);

    try {
      navigator.vibrate(pattern);
      this.lastVibrateTime = now;
    } catch {
      // Vibration call failed silently
    }
  }

  /** Cancel ongoing vibration */
  cancel(): void {
    if (this.supported) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }

  /** Scale vibration durations based on intensity setting */
  private scalePattern(pattern: number[]): number[] {
    const multiplier =
      this.intensity === 'LOW'
        ? 0.5
        : this.intensity === 'HIGH'
          ? 1.5
          : 1.0;
    return pattern.map((v) => Math.round(v * multiplier));
  }
}

/** Singleton haptics engine */
export const HapticsEngine = new HapticsEngineImpl();

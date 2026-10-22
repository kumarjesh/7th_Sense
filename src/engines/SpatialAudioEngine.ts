// ============================================================
// VisionGuard — Spatial Audio / Sonar Engine (Web Audio API)
// ============================================================
// Generates directional sonar pings using oscillators with stereo
// panning. Pitch and tempo scale with proximity. Audio ducking
// reduces sonar volume during speech announcements.

import {
  SONAR_FREQUENCY,
  SONAR_INTERVAL,
  SONAR_DURATION,
  SONAR_BASE_GAIN,
  SONAR_DUCK_GAIN,
  MAX_SONAR_SOURCES,
  ZONE_PAN,
} from '../constants/audioPresets';
import type { ProximityBand, SonarTarget, Zone } from '../types';

interface ActivePing {
  trackId: number;
  intervalId: ReturnType<typeof setInterval>;
  pan: number;
  frequency: number;
}

class SpatialAudioEngineImpl {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activePings: Map<number, ActivePing> = new Map();
  private isDucking = false;
  private enabled = true;
  private volume = 0.6;

  /** Initialize AudioContext (must be called after user gesture) */
  init(): boolean {
    try {
      this.ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = SONAR_BASE_GAIN * this.volume;
      this.masterGain.connect(this.ctx.destination);
      return true;
    } catch (e) {
      console.warn('[SpatialAudio] AudioContext not available:', e);
      return false;
    }
  }

  /** Resume AudioContext if suspended (needed after page visibility changes) */
  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** Set master volume (0.0–1.0) */
  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      const target = this.isDucking
        ? SONAR_DUCK_GAIN
        : SONAR_BASE_GAIN * this.volume;
      this.masterGain.gain.setTargetAtTime(
        target,
        this.ctx!.currentTime,
        0.05
      );
    }
  }

  /** Enable or disable sonar */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stopAll();
  }

  /** Activate audio ducking (reduce volume during speech) */
  duck(): void {
    if (this.isDucking) return;
    this.isDucking = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        SONAR_DUCK_GAIN,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  /** Release audio ducking */
  unduck(): void {
    if (!this.isDucking) return;
    this.isDucking = false;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        SONAR_BASE_GAIN * this.volume,
        this.ctx.currentTime,
        0.1
      );
    }
  }

  /**
   * Update sonar sources based on currently tracked objects.
   * Accepts an array of sonar targets (max MAX_SONAR_SOURCES).
   */
  updateTargets(targets: SonarTarget[]): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;

    // Limit to max sources
    const limited = targets.slice(0, MAX_SONAR_SOURCES);
    const activeTrackIds = new Set(limited.map((t) => t.trackId));

    // Remove pings for objects no longer tracked
    for (const [id, ping] of this.activePings) {
      if (!activeTrackIds.has(id)) {
        clearInterval(ping.intervalId);
        this.activePings.delete(id);
      }
    }

    // Add or update pings
    for (const target of limited) {
      const existing = this.activePings.get(target.trackId);
      if (existing) {
        // Update if frequency or pan changed significantly
        if (
          Math.abs(existing.frequency - target.frequency) > 20 ||
          Math.abs(existing.pan - target.pan) > 0.2
        ) {
          clearInterval(existing.intervalId);
          this.activePings.delete(target.trackId);
          this.startPing(target);
        }
      } else {
        this.startPing(target);
      }
    }
  }

  /** Create sonar target config from tracked object properties */
  static createTarget(
    trackId: number,
    zone: Zone,
    band: ProximityBand
  ): SonarTarget {
    return {
      trackId,
      pan: ZONE_PAN[zone],
      frequency: SONAR_FREQUENCY[band],
      interval: SONAR_INTERVAL[band],
      gain: band === 'CRITICAL' ? 1.0 : band === 'WARNING' ? 0.7 : 0.4,
    };
  }

  /** Start a repeating sonar ping for one target */
  private startPing(target: SonarTarget): void {
    if (!this.ctx || !this.masterGain) return;

    const ping = () => this.playTone(target);
    ping(); // Play immediately
    const intervalId = setInterval(ping, target.interval);

    this.activePings.set(target.trackId, {
      trackId: target.trackId,
      intervalId,
      pan: target.pan,
      frequency: target.frequency,
    });
  }

  /** Play a single short tone with stereo panning */
  private playTone(target: SonarTarget): void {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const band =
      target.frequency >= 880
        ? 'CRITICAL'
        : target.frequency >= 440
          ? 'WARNING'
          : 'BACKGROUND';
    const duration = SONAR_DURATION[band] / 1000;

    // Oscillator → Gain → Panner → Master Gain → Destination
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.value = target.frequency;

    gain.gain.setValueAtTime(target.gain * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    panner.pan.value = target.pan;

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration);

    // Cleanup after done
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  /** Stop all active sonar pings */
  stopAll(): void {
    for (const [, ping] of this.activePings) {
      clearInterval(ping.intervalId);
    }
    this.activePings.clear();
  }

  /** Play a one-shot alert tone (for critical hazard) */
  playAlertTone(zone: Zone): void {
    if (!this.ctx || !this.masterGain) return;
    this.playTone({
      trackId: -1,
      pan: ZONE_PAN[zone],
      frequency: 880,
      interval: 0,
      gain: 1.0,
    });
    // Play a second tone slightly delayed for urgency
    setTimeout(() => {
      this.playTone({
        trackId: -1,
        pan: ZONE_PAN[zone],
        frequency: 1100,
        interval: 0,
        gain: 0.8,
      });
    }, 100);
  }

  /** Cleanup */
  destroy(): void {
    this.stopAll();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
  }
}

/** Singleton spatial audio engine */
export const SpatialAudioEngine = new SpatialAudioEngineImpl();

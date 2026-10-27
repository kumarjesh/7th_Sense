// ============================================================
// VisionGuard — Target Finder Engine
// ============================================================
// Directs blind users toward specific desired targets (doors, chairs, stairs, elevators)
// using directional beacon sounds and spatial positioning.

import { FIND_TARGET_OPTIONS, FindTargetType } from '../types';
import type { TrackedObject } from '../types';

class TargetFinderEngineImpl {
  private currentTarget: FindTargetType = 'door';
  private isActive = false;
  private lastBeaconTime = 0;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  initAudio(): void {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        // audio context init fallback
      }
    }
  }

  setTarget(target: FindTargetType): void {
    this.currentTarget = target;
  }

  getTarget(): FindTargetType {
    return this.currentTarget;
  }

  cycleNextTarget(): FindTargetType {
    const idx = FIND_TARGET_OPTIONS.indexOf(this.currentTarget);
    const nextIdx = (idx + 1) % FIND_TARGET_OPTIONS.length;
    this.currentTarget = FIND_TARGET_OPTIONS[nextIdx];
    return this.currentTarget;
  }

  cyclePrevTarget(): FindTargetType {
    const idx = FIND_TARGET_OPTIONS.indexOf(this.currentTarget);
    const prevIdx = (idx - 1 + FIND_TARGET_OPTIONS.length) % FIND_TARGET_OPTIONS.length;
    this.currentTarget = FIND_TARGET_OPTIONS[prevIdx];
    return this.currentTarget;
  }

  start(): void {
    this.initAudio();
    this.isActive = true;
  }

  stop(): void {
    this.isActive = false;
  }

  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Play directional beacon tone toward target
   * pan: -0.8 (left), 0.0 (center), +0.8 (right)
   */
  playBeaconTone(pan: number, isDirectAhead: boolean): void {
    if (!this.isActive || !this.ctx || !this.masterGain) return;
    const now = Date.now();
    if (now - this.lastBeaconTime < (isDirectAhead ? 350 : 700)) return;
    this.lastBeaconTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      // Higher chime if directly ahead
      osc.type = isDirectAhead ? 'triangle' : 'sine';
      osc.frequency.value = isDirectAhead ? 987.77 : 587.33; // B5 or D5

      const startTime = this.ctx.currentTime;
      const duration = isDirectAhead ? 0.18 : 0.12;

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      if (panner) {
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        osc.connect(gain);
        gain.connect(this.masterGain);
      }

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    } catch {
      // Audio playback failed
    }
  }

  /**
   * Check if any on-device tracked object matches current target
   */
  checkLocalMatches(trackedObjects: TrackedObject[]): { found: boolean; zone?: string; pan?: number } {
    if (!this.isActive) return { found: false };

    // Direct class match for common COCO categories
    const match = trackedObjects.find(
      (obj) => obj.class.toLowerCase() === this.currentTarget.toLowerCase()
    );

    if (match) {
      const pan = match.zone === 'left' ? -0.8 : match.zone === 'right' ? 0.8 : 0.0;
      this.playBeaconTone(pan, match.zone === 'center');
      return { found: true, zone: match.zone, pan };
    }

    return { found: false };
  }
}

export const TargetFinderEngine = new TargetFinderEngineImpl();

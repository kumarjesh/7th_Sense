// ============================================================
// VisionGuard — Alert Policy Engine (Centralized Alert Logic)
// ============================================================
// Single source of truth for ALL announcement decisions.
// No alert logic should exist anywhere else in the app.
// Manages priority, cooldowns, verbosity modes, and multi-modal output.

import { SPEECH_COOLDOWN_MS, ZONE_SPEECH_LABEL } from '../constants/audioPresets';
import { PROXIMITY_LABELS } from '../constants/proximityBands';
import { getClassPriority, isMovingThreat } from '../constants/threatClasses';
import { HapticsEngine } from './HapticsEngine';
import { SafetyManager } from './SafetyManager';
import { SettingsStore } from './SettingsStore';
import { SpatialAudioEngine } from './SpatialAudioEngine';
import { SpeechEngine } from './SpeechEngine';
import type {
  AlertPriority,
  TrackedObject,
  VerbosityMode,
  HazardStatus,
} from '../types';

/** Per-tracked-object cooldown record */
interface CooldownEntry {
  lastAnnounced: number;
  lastBand: string;
  lastZone: string;
}

class AlertPolicyEngineImpl {
  private cooldowns: Map<number, CooldownEntry> = new Map();
  private lastAmbientStatus = 0;
  private lastSummary: string = 'No immediate hazards detected.';
  private onHazardStatusChange: ((status: HazardStatus) => void) | null = null;

  /** Register callback for hazard status changes */
  onHazardStatus(cb: (status: HazardStatus) => void): void {
    this.onHazardStatusChange = cb;
  }

  /** Get the last spoken summary for double-tap repeat */
  getLastSummary(): string {
    return this.lastSummary;
  }

  /**
   * Main entry point: evaluate all tracked objects and produce alerts.
   * Called every frame by the vision pipeline.
   */
  evaluate(trackedObjects: TrackedObject[]): void {
    const settings = SettingsStore.getAll();
    const now = Date.now();

    // Report to safety manager
    SafetyManager.reportDetections(trackedObjects.length);

    // Determine overall hazard status
    const hazardStatus = this.computeHazardStatus(trackedObjects);
    this.onHazardStatusChange?.(hazardStatus);

    // Filter to announceable objects (WARNING or CRITICAL bands only)
    const alertable = trackedObjects
      .filter(
        (obj) =>
          obj.proximityBand !== 'BACKGROUND' || obj.isLooming
      )
      .sort((a, b) => {
        // Sort by: priority (CRITICAL first) → class priority → proximity
        const aPriority = this.computePriority(a);
        const bPriority = this.computePriority(b);
        const aPVal = this.priorityValue(aPriority);
        const bPVal = this.priorityValue(bPriority);
        if (aPVal !== bPVal) return bPVal - aPVal;
        const aClass = getClassPriority(a.class);
        const bClass = getClassPriority(b.class);
        return bClass - aClass;
      });

    // Update sonar for all WARNING+ objects
    this.updateSonar(alertable, settings.verbosityMode);

    // Process speech alerts (respecting cooldowns)
    for (const obj of alertable) {
      this.processAlert(obj, now, settings.verbosityMode);
    }

    // Ambient "no hazards" status (if nothing alertable)
    if (alertable.length === 0) {
      const ambientInterval = settings.ambientStatusInterval * 1000;
      if (now - this.lastAmbientStatus > ambientInterval) {
        if (settings.verbosityMode !== 'SONAR_ONLY' &&
            settings.verbosityMode !== 'EMERGENCY_ONLY') {
          SpeechEngine.speak(
            'No immediate hazards detected.',
            'LOW',
            'BACKGROUND'
          );
          this.lastSummary = 'No immediate hazards detected.';
        }
        this.lastAmbientStatus = now;
      }
    }

    // Cleanup expired cooldowns
    for (const [trackId, entry] of this.cooldowns) {
      if (now - entry.lastAnnounced > SPEECH_COOLDOWN_MS * 3) {
        this.cooldowns.delete(trackId);
      }
    }
  }

  /** Process a single tracked object for potential alert */
  private processAlert(
    obj: TrackedObject,
    now: number,
    mode: VerbosityMode
  ): void {
    const priority = this.computePriority(obj);

    // Emergency-only mode: skip non-critical alerts
    if (mode === 'EMERGENCY_ONLY' && priority !== 'CRITICAL_INTERRUPT') return;

    // Sonar-only mode: only speak critical alerts
    if (mode === 'SONAR_ONLY' && priority !== 'CRITICAL_INTERRUPT') return;

    // Check per-object cooldown
    const cooldown = this.cooldowns.get(obj.id);
    if (cooldown) {
      const elapsed = now - cooldown.lastAnnounced;
      if (elapsed < SPEECH_COOLDOWN_MS) {
        // Exception: escalation resets cooldown
        if (
          obj.proximityBand === 'CRITICAL' &&
          cooldown.lastBand !== 'CRITICAL'
        ) {
          // Escalation — proceed
        } else if (obj.zone !== cooldown.lastZone) {
          // Zone change — proceed
        } else {
          return; // Still in cooldown
        }
      }
    }

    // Build message
    const message = this.buildMessage(obj, priority);

    // Trigger haptics
    HapticsEngine.trigger(obj.proximityBand, obj.zone);

    // Speak
    SpeechEngine.speak(message, priority, obj.proximityBand);

    // Play alert tone for critical
    if (priority === 'CRITICAL_INTERRUPT') {
      SpatialAudioEngine.playAlertTone(obj.zone);
    }

    // Update cooldown
    this.cooldowns.set(obj.id, {
      lastAnnounced: now,
      lastBand: obj.proximityBand,
      lastZone: obj.zone,
    });

    // Update last summary
    this.lastSummary = message;
  }

  /** Build a concise speech message for a tracked object */
  private buildMessage(obj: TrackedObject, priority: AlertPriority): string {
    const className =
      obj.class.charAt(0).toUpperCase() + obj.class.slice(1);
    const proximity = PROXIMITY_LABELS[obj.proximityBand];
    const direction = ZONE_SPEECH_LABEL[obj.zone];

    if (priority === 'CRITICAL_INTERRUPT') {
      if (obj.zone === 'center') {
        return `Stop. ${className} ${proximity} ${direction}.`;
      }
      return `Stop. ${className} ${proximity}, ${direction}.`;
    }

    // Standard announcements (≤4 words target)
    if (obj.zone === 'center') {
      return `${className} ${direction}.`;
    }
    return `${className}, ${direction}.`;
  }

  /** Compute the alert priority for a tracked object */
  private computePriority(obj: TrackedObject): AlertPriority {
    // Looming objects → always critical
    if (obj.isLooming && obj.zone === 'center') return 'CRITICAL_INTERRUPT';

    if (obj.proximityBand === 'CRITICAL') {
      if (obj.zone === 'center') return 'CRITICAL_INTERRUPT';
      return 'HIGH';
    }

    if (obj.proximityBand === 'WARNING') {
      if (obj.zone === 'center' && isMovingThreat(obj.class)) return 'HIGH';
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /** Update sonar engine with current targets */
  private updateSonar(
    objects: TrackedObject[],
    mode: VerbosityMode
  ): void {
    if (mode === 'VOICE_ONLY') {
      SpatialAudioEngine.updateTargets([]);
      return;
    }

    // Audio ducking when speech is active
    if (SpeechEngine.isSpeaking()) {
      SpatialAudioEngine.duck();
    } else {
      SpatialAudioEngine.unduck();
    }

    const sonarTargets = objects.map((obj) => ({
      trackId: obj.id,
      pan:
        obj.zone === 'left' ? -0.8 : obj.zone === 'right' ? 0.8 : 0.0,
      frequency:
        obj.proximityBand === 'CRITICAL'
          ? 880
          : obj.proximityBand === 'WARNING'
            ? 440
            : 330,
      interval:
        obj.proximityBand === 'CRITICAL'
          ? 120
          : obj.proximityBand === 'WARNING'
            ? 600
            : 1200,
      gain:
        obj.proximityBand === 'CRITICAL'
          ? 1.0
          : obj.proximityBand === 'WARNING'
            ? 0.7
            : 0.4,
    }));

    SpatialAudioEngine.updateTargets(sonarTargets);
  }

  /** Compute overall hazard status for HUD */
  private computeHazardStatus(objects: TrackedObject[]): HazardStatus {
    let hasCritical = false;
    let hasWarning = false;

    for (const obj of objects) {
      if (obj.proximityBand === 'CRITICAL' || obj.isLooming)
        hasCritical = true;
      if (obj.proximityBand === 'WARNING') hasWarning = true;
    }

    if (hasCritical) return 'DANGER';
    if (hasWarning) return 'CAUTION';
    return 'CLEAR';
  }

  /** Numeric priority for sorting */
  private priorityValue(p: AlertPriority): number {
    switch (p) {
      case 'CRITICAL_INTERRUPT':
        return 4;
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 1;
    }
  }

  /** Reset all cooldowns */
  reset(): void {
    this.cooldowns.clear();
    this.lastAmbientStatus = 0;
    this.lastSummary = 'No immediate hazards detected.';
    SpatialAudioEngine.stopAll();
  }
}

/** Singleton alert policy engine */
export const AlertPolicyEngine = new AlertPolicyEngineImpl();

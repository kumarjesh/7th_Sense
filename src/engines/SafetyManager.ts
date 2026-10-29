// ============================================================
// VisionGuard — Safety Manager
// ============================================================
// Handles first-run safety briefing, low-confidence / camera
// obstruction warnings, and emergency pause.

import { SpeechEngine } from './SpeechEngine';
import { SettingsStore } from './SettingsStore';

/** How long (ms) with zero detections before warning */
const NO_DETECTION_WARN_MS = 8000;

/** How long (ms) between repeated low-confidence warnings */
const LOW_CONFIDENCE_COOLDOWN_MS = 15000;

class SafetyManagerImpl {
  private lastDetectionTime = 0;
  private lastLowConfidenceWarn = 0;
  private isEmergencyPaused = false;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private onEmergencyPause: (() => void) | null = null;

  /** The first-run safety briefing text */
  static readonly SAFETY_BRIEFING =
    'Welcome to TriNetra. This app is an awareness aid only. ' +
    'It does not replace a white cane, guide dog, or safe travel training. ' +
    'It cannot detect stairs, curbs, potholes, glass, or all obstacles. ' +
    'Always use your primary mobility aid. ' +
    'Tap the screen to acknowledge and continue.';

  /** Check if safety briefing has been seen */
  needsBriefing(): boolean {
    return !SettingsStore.get('safetyBriefingSeen');
  }

  /** Mark safety briefing as completed */
  completeBriefing(): void {
    SettingsStore.set({ safetyBriefingSeen: true });
  }

  /** Speak the safety briefing */
  speakBriefing(): void {
    SpeechEngine.speak(SafetyManagerImpl.SAFETY_BRIEFING, 'LOW', 'BACKGROUND');
  }

  /** Called each frame when detections are processed */
  reportDetections(count: number): void {
    if (count > 0) {
      this.lastDetectionTime = Date.now();
    }
  }

  /** Start periodic safety checks */
  startMonitoring(onEmergencyPause: () => void): void {
    this.onEmergencyPause = onEmergencyPause;
    this.lastDetectionTime = Date.now();

    this.checkIntervalId = setInterval(() => {
      this.runChecks();
    }, 3000);
  }

  /** Stop monitoring */
  stopMonitoring(): void {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /** Trigger emergency pause */
  emergencyPause(): void {
    if (this.isEmergencyPaused) return;
    this.isEmergencyPaused = true;
    SpeechEngine.speak(
      'TriNetra paused. Tap to resume.',
      'CRITICAL_INTERRUPT',
      'CRITICAL'
    );
    this.onEmergencyPause?.();
  }

  /** Resume from emergency pause */
  resume(): void {
    this.isEmergencyPaused = false;
    this.lastDetectionTime = Date.now();
  }

  /** Check if in emergency pause */
  isPaused(): boolean {
    return this.isEmergencyPaused;
  }

  /** Run periodic safety checks */
  private runChecks(): void {
    if (this.isEmergencyPaused) return;

    const now = Date.now();

    // Check for prolonged no-detection (camera might be obstructed)
    if (
      this.lastDetectionTime > 0 &&
      now - this.lastDetectionTime > NO_DETECTION_WARN_MS &&
      now - this.lastLowConfidenceWarn > LOW_CONFIDENCE_COOLDOWN_MS
    ) {
      SpeechEngine.speak(
        'Camera view unclear. Proceed with caution.',
        'MEDIUM',
        'WARNING'
      );
      this.lastLowConfidenceWarn = now;
    }
  }

  /** Cleanup */
  destroy(): void {
    this.stopMonitoring();
  }
}

/** Singleton safety manager */
export const SafetyManager = new SafetyManagerImpl();

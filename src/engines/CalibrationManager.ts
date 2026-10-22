// ============================================================
// VisionGuard — Calibration Manager
// ============================================================
// Provides optional proximity calibration using known reference distance
// or device presets to fine-tune bounding box height thresholds.
// Ground truth remains qualitative ("close", "very close") to prevent false precision.

import { PROXIMITY_THRESHOLDS } from '../constants/proximityBands';
import type { ProximityBand } from '../types';

export interface DevicePreset {
  name: string;
  verticalFov: number; // in degrees
  scaleFactor: number;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'Standard Smartphone (Default)', verticalFov: 55, scaleFactor: 1.0 },
  { name: 'Wide Angle Camera', verticalFov: 68, scaleFactor: 0.82 },
  { name: 'Narrow / Telephoto Camera', verticalFov: 42, scaleFactor: 1.25 },
];

const STORAGE_KEY = 'visionguard_calibration';

interface CalibrationData {
  scaleFactor: number;
  lastCalibratedAt?: number;
  devicePreset: string;
}

class CalibrationManagerImpl {
  private scaleFactor: number = 1.0;
  private currentPreset: string = 'Standard Smartphone (Default)';

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: CalibrationData = JSON.parse(saved);
        this.scaleFactor = data.scaleFactor || 1.0;
        this.currentPreset = data.devicePreset || 'Standard Smartphone (Default)';
      }
    } catch {
      // Use defaults if parse fails
    }
  }

  private save(): void {
    try {
      const data: CalibrationData = {
        scaleFactor: this.scaleFactor,
        devicePreset: this.currentPreset,
        lastCalibratedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable
    }
  }

  /** Get calibrated thresholds based on device sensitivity factor */
  getCalibratedThresholds() {
    return {
      CRITICAL: Math.min(0.7, Math.max(0.25, PROXIMITY_THRESHOLDS.CRITICAL * this.scaleFactor)),
      WARNING: Math.min(0.45, Math.max(0.12, PROXIMITY_THRESHOLDS.WARNING * this.scaleFactor)),
    };
  }

  /**
   * Determine proximity band with calibrated thresholds
   */
  getProximityBand(bboxHeightRatio: number): ProximityBand {
    const thresholds = this.getCalibratedThresholds();
    if (bboxHeightRatio >= thresholds.CRITICAL) {
      return 'CRITICAL';
    }
    if (bboxHeightRatio >= thresholds.WARNING) {
      return 'WARNING';
    }
    return 'BACKGROUND';
  }

  /**
   * Calibrate using observed bounding box height ratio at a standard distance (e.g. 2 meters)
   * Expected typical person height ratio at 2m is ~0.45
   */
  calibrateWithObservation(observedRatio: number, expectedTargetRatio = 0.45): number {
    if (observedRatio <= 0.05) return this.scaleFactor;
    // Calculate new scale factor
    const newFactor = Math.min(1.8, Math.max(0.5, observedRatio / expectedTargetRatio));
    this.scaleFactor = Math.round(newFactor * 100) / 100;
    this.save();
    return this.scaleFactor;
  }

  applyPreset(presetName: string): boolean {
    const preset = DEVICE_PRESETS.find((p) => p.name === presetName);
    if (!preset) return false;
    this.currentPreset = preset.name;
    this.scaleFactor = preset.scaleFactor;
    this.save();
    return true;
  }

  getScaleFactor(): number {
    return this.scaleFactor;
  }

  getCurrentPreset(): string {
    return this.currentPreset;
  }

  reset(): void {
    this.scaleFactor = 1.0;
    this.currentPreset = 'Standard Smartphone (Default)';
    this.save();
  }
}

export const CalibrationManager = new CalibrationManagerImpl();

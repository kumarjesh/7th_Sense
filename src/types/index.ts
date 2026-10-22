// ============================================================
// VisionGuard — Core Type Definitions
// ============================================================

/** Horizontal zone of the camera frame */
export type Zone = 'left' | 'center' | 'right';

/** Proximity band based on bounding box height ratio */
export type ProximityBand = 'CRITICAL' | 'WARNING' | 'BACKGROUND';

/** Lifecycle state of a tracked object */
export type TrackState = 'TENTATIVE' | 'CONFIRMED' | 'LOST';

/** Alert priority level */
export type AlertPriority = 'CRITICAL_INTERRUPT' | 'HIGH' | 'MEDIUM' | 'LOW';

/** Feedback verbosity mode */
export type VerbosityMode = 'FULL' | 'VOICE_ONLY' | 'SONAR_ONLY' | 'EMERGENCY_ONLY';

/** Haptic intensity setting */
export type HapticIntensity = 'OFF' | 'LOW' | 'NORMAL' | 'HIGH';

/** Power/performance mode */
export type PowerMode = 'NORMAL' | 'POWER_SAVER' | 'CRITICAL_BATTERY';

// ============================================================
// Detection & Tracking
// ============================================================

/** Raw detection output from COCO-SSD */
export interface RawDetection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  timestamp: number;
}

/** Smoothed bounding box with computed properties */
export interface SmoothedBbox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  area: number;
}

/** A tracked object with persistence across frames */
export interface TrackedObject {
  id: number;
  class: string;
  score: number;
  smoothedBbox: SmoothedBbox;
  rawBbox: [number, number, number, number];
  zone: Zone;
  pendingZone: Zone | null;
  zoneFrameCount: number;
  proximityBand: ProximityBand;
  velocity: number; // rate of bbox area change (pixels²/second)
  isLooming: boolean;
  framesSeen: number;
  framesMissed: number;
  state: TrackState;
  lastSeen: number;
  firstSeen: number;
}

// ============================================================
// Alert System
// ============================================================

/** An alert queued for output */
export interface Alert {
  id: string;
  trackId: number;
  priority: AlertPriority;
  class: string;
  zone: Zone;
  proximityBand: ProximityBand;
  isLooming: boolean;
  message: string;
  timestamp: number;
}

/** Entry in the spoken alert log */
export interface AlertLogEntry {
  message: string;
  proximityBand: ProximityBand;
  timestamp: number;
}

// ============================================================
// Sonar Audio
// ============================================================

/** Sonar ping configuration for a tracked object */
export interface SonarTarget {
  trackId: number;
  pan: number; // -1 (left) to +1 (right)
  frequency: number; // Hz
  interval: number; // ms between pings
  gain: number; // 0.0 to 1.0
}

// ============================================================
// Performance
// ============================================================

/** Performance metrics snapshot */
export interface PerformanceMetrics {
  captureFps: number;
  inferenceMs: number;
  trackingMs: number;
  alertLatencyMs: number;
  effectiveFps: number;
  batteryPct: number | null;
  isCharging: boolean | null;
  powerMode: PowerMode;
  targetIntervalMs: number;
}

// ============================================================
// Settings
// ============================================================

/** User-configurable settings persisted to localStorage */
export interface AppSettings {
  speechRate: number;
  verbosityMode: VerbosityMode;
  sonarEnabled: boolean;
  sonarVolume: number;
  hapticIntensity: HapticIntensity;
  confidenceThreshold: number;
  showDebugOverlay: boolean;
  safetyBriefingSeen: boolean;
  ambientStatusInterval: number; // seconds
}

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  speechRate: 1.1,
  verbosityMode: 'FULL',
  sonarEnabled: true,
  sonarVolume: 0.6,
  hapticIntensity: 'NORMAL',
  confidenceThreshold: 0.45,
  showDebugOverlay: false,
  safetyBriefingSeen: false,
  ambientStatusInterval: 15,
};

// ============================================================
// Application State
// ============================================================

/** Top-level hazard status for HUD */
export type HazardStatus = 'CLEAR' | 'CAUTION' | 'DANGER';

/** Scanning state */
export type ScanningState = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'ERROR';

/** Full application state snapshot for HUD */
export interface AppState {
  scanningState: ScanningState;
  hazardStatus: HazardStatus;
  verbosityMode: VerbosityMode;
  trackedObjects: TrackedObject[];
  alertLog: AlertLogEntry[];
  performance: PerformanceMetrics;
  torchActive: boolean;
  torchAvailable: boolean;
}

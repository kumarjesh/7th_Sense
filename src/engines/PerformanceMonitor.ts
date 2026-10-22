// ============================================================
// VisionGuard — Performance Monitor (Adaptive Quality)
// ============================================================
// Tracks inference latency, FPS, battery, and thermal state.
// Automatically adjusts detection interval to prevent overheating.

import type { PerformanceMetrics, PowerMode } from '../types';

/** Rolling window size for averaging metrics */
const WINDOW_SIZE = 30;

/** Thermal detection: if latency rises by this factor over baseline, assume throttling */
const THERMAL_FACTOR = 1.4;

/** Interval targets (ms) */
const INTERVALS = {
  FAST: 200,     // ~5 FPS — ideal conditions
  NORMAL: 250,   // ~4 FPS — default
  SLOW: 500,     // ~2 FPS — power saver
  CRAWL: 700,    // ~1.4 FPS — heavy throttling
  MINIMAL: 1000, // ~1 FPS — critical battery
} as const;

class PerformanceMonitorImpl {
  private inferenceSamples: number[] = [];
  private captureSamples: number[] = [];
  private alertLatencySamples: number[] = [];
  private baselineInference: number | null = null;
  private batteryPct: number | null = null;
  private isCharging: boolean | null = null;
  private powerMode: PowerMode = 'NORMAL';
  private targetInterval: number = INTERVALS.NORMAL;
  private onChange: ((metrics: PerformanceMetrics) => void) | null = null;

  /** Initialize battery monitoring (best-effort) */
  async init(): Promise<void> {
    try {
      // Battery API (Chrome Android; not available on iOS)
      if ('getBattery' in navigator) {
        const battery = await (
          navigator as unknown as {
            getBattery: () => Promise<{
              level: number;
              charging: boolean;
              addEventListener: (
                e: string,
                cb: () => void
              ) => void;
            }>;
          }
        ).getBattery();
        this.batteryPct = Math.round(battery.level * 100);
        this.isCharging = battery.charging;
        battery.addEventListener('levelchange', () => {
          this.batteryPct = Math.round(battery.level * 100);
          this.recalculate();
        });
        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
          this.recalculate();
        });
      }
    } catch {
      // Battery API not available — that's fine
    }
  }

  /** Register callback for metrics changes */
  onMetricsChange(cb: (metrics: PerformanceMetrics) => void): void {
    this.onChange = cb;
  }

  /** Record a capture latency sample (ms) */
  recordCapture(ms: number): void {
    this.addSample(this.captureSamples, ms);
  }

  /** Record an inference latency sample (ms) */
  recordInference(ms: number): void {
    this.addSample(this.inferenceSamples, ms);
    // Establish baseline from first 10 samples
    if (this.baselineInference === null && this.inferenceSamples.length >= 10) {
      this.baselineInference = this.average(this.inferenceSamples);
    }
    this.recalculate();
  }

  /** Record end-to-end alert latency (detection → audio output) */
  recordAlertLatency(ms: number): void {
    this.addSample(this.alertLatencySamples, ms);
  }

  /** Get current recommended detection interval (ms) */
  getTargetInterval(): number {
    return this.targetInterval;
  }

  /** Get a snapshot of all current metrics */
  getMetrics(): PerformanceMetrics {
    const avgInference = this.average(this.inferenceSamples);
    const avgCapture = this.average(this.captureSamples);
    const avgAlert = this.average(this.alertLatencySamples);
    const effectiveFps =
      avgInference > 0 ? Math.round(1000 / (avgInference + 10)) : 0;

    return {
      captureFps: avgCapture > 0 ? Math.round(1000 / avgCapture) : 0,
      inferenceMs: Math.round(avgInference),
      trackingMs: 0, // Populated externally
      alertLatencyMs: Math.round(avgAlert),
      effectiveFps,
      batteryPct: this.batteryPct,
      isCharging: this.isCharging,
      powerMode: this.powerMode,
      targetIntervalMs: this.targetInterval,
    };
  }

  /** Recalculate power mode and target interval */
  private recalculate(): void {
    const avgInference = this.average(this.inferenceSamples);
    const battery = this.batteryPct;

    // Determine power mode
    if (battery !== null && battery < 10) {
      this.powerMode = 'CRITICAL_BATTERY';
      this.targetInterval = INTERVALS.MINIMAL;
    } else if (battery !== null && battery < 20) {
      this.powerMode = 'POWER_SAVER';
      this.targetInterval = INTERVALS.SLOW;
    } else if (
      this.baselineInference !== null &&
      avgInference > this.baselineInference * THERMAL_FACTOR
    ) {
      // Thermal throttling detected
      this.powerMode = 'POWER_SAVER';
      this.targetInterval =
        avgInference > 600 ? INTERVALS.CRAWL : INTERVALS.SLOW;
    } else if (avgInference > 400) {
      this.powerMode = 'POWER_SAVER';
      this.targetInterval = INTERVALS.SLOW;
    } else if (avgInference < 150 && (battery === null || battery > 50)) {
      this.powerMode = 'NORMAL';
      this.targetInterval = INTERVALS.FAST;
    } else {
      this.powerMode = 'NORMAL';
      this.targetInterval = INTERVALS.NORMAL;
    }

    this.onChange?.(this.getMetrics());
  }

  /** Add a sample to a rolling window array */
  private addSample(arr: number[], value: number): void {
    arr.push(value);
    if (arr.length > WINDOW_SIZE) arr.shift();
  }

  /** Compute the average of a samples array */
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}

/** Singleton performance monitor */
export const PerformanceMonitor = new PerformanceMonitorImpl();

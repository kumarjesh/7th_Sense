// ============================================================
// VisionGuard — Vision Pipeline (TF.js + COCO-SSD)
// ============================================================
// Manages model loading, frame capture, and detection loop with
// adaptive throttling controlled by the PerformanceMonitor.

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TrackingManager } from './TrackingManager';
import { SettingsStore } from './SettingsStore';
import type { RawDetection, TrackedObject } from '../types';

class VisionPipelineImpl {
  private model: cocoSsd.ObjectDetection | null = null;
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastInferenceTime = 0;
  private videoElement: HTMLVideoElement | null = null;
  private onDetection: ((objects: TrackedObject[]) => void) | null = null;
  private onRawDetection:
    | ((detections: RawDetection[]) => void)
    | null = null;
  private modelLoading = false;

  /** Load the COCO-SSD model (call once on app init) */
  async loadModel(
    onProgress?: (msg: string) => void
  ): Promise<boolean> {
    if (this.model) return true;
    if (this.modelLoading) return false;

    this.modelLoading = true;
    try {
      onProgress?.('Initializing detection engine...');

      // Set up WebGL backend
      await tf.setBackend('webgl');
      await tf.ready();
      onProgress?.('Loading detection model...');

      // Load COCO-SSD with lite_mobilenet_v2 for mobile performance
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });

      onProgress?.('Model ready.');
      this.modelLoading = false;
      return true;
    } catch (err) {
      console.error('[VisionPipeline] Model load failed:', err);
      onProgress?.('Model failed to load.');
      this.modelLoading = false;
      return false;
    }
  }

  /** Check if model is loaded */
  isModelLoaded(): boolean {
    return this.model !== null;
  }

  /** Set the video element to capture frames from */
  setVideoSource(video: HTMLVideoElement): void {
    this.videoElement = video;
    // Set tracking manager frame dimensions
    if (video.videoWidth && video.videoHeight) {
      TrackingManager.setFrameDimensions(video.videoWidth, video.videoHeight);
    }
  }

  /** Register callback for tracked object updates */
  onTrackedObjects(cb: (objects: TrackedObject[]) => void): void {
    this.onDetection = cb;
  }

  /** Register callback for raw detection data (for debug canvas) */
  onRawDetections(cb: (detections: RawDetection[]) => void): void {
    this.onRawDetection = cb;
  }

  /** Start the detection loop */
  start(): void {
    if (this.isRunning || !this.model || !this.videoElement) return;
    this.isRunning = true;
    this.loop();
  }

  /** Stop the detection loop */
  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    TrackingManager.reset();
  }

  /** Check if pipeline is currently running */
  isActive(): boolean {
    return this.isRunning;
  }

  /** Main detection loop using requestAnimationFrame with timestamp gating */
  private loop = (): void => {
    if (!this.isRunning) return;

    this.animFrameId = requestAnimationFrame(async () => {
      const now = performance.now();
      const interval = PerformanceMonitor.getTargetInterval();

      if (now - this.lastInferenceTime >= interval) {
        await this.runInference(now);
        this.lastInferenceTime = performance.now();
      }

      this.loop();
    });
  };

  /** Run a single inference frame */
  private async runInference(startTime: number): Promise<void> {
    if (!this.model || !this.videoElement) return;
    if (
      this.videoElement.readyState < 2 ||
      this.videoElement.videoWidth === 0
    ) {
      return; // Video not ready
    }

    // Update frame dimensions (may change if video resizes)
    TrackingManager.setFrameDimensions(
      this.videoElement.videoWidth,
      this.videoElement.videoHeight
    );

    try {
      const confidenceThreshold = SettingsStore.get('confidenceThreshold');

      // Run detection
      const predictions = await this.model.detect(
        this.videoElement,
        20, // maxNumBoxes
        confidenceThreshold
      );

      // Abort immediately if paused or stopped while detection was in flight
      if (!this.isRunning) return;

      const inferenceEnd = performance.now();
      PerformanceMonitor.recordInference(inferenceEnd - startTime);

      // Convert to RawDetection format
      const rawDetections: RawDetection[] = predictions.map((p) => ({
        class: p.class,
        score: p.score,
        bbox: p.bbox as [number, number, number, number],
        timestamp: Date.now(),
      }));

      // Send raw detections for debug canvas
      this.onRawDetection?.(rawDetections);

      // Process through tracking manager
      const trackedObjects = TrackingManager.update(rawDetections);

      // Notify listeners
      this.onDetection?.(trackedObjects);
    } catch (err) {
      console.error('[VisionPipeline] Inference error:', err);
    }
  }

  /** Cleanup */
  destroy(): void {
    this.stop();
    this.model = null;
    this.videoElement = null;
  }
}

/** Singleton vision pipeline */
export const VisionPipeline = new VisionPipelineImpl();

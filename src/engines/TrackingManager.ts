// ============================================================
// VisionGuard — Tracking Manager (IoU-based Object Tracking)
// ============================================================
// Provides frame-to-frame object persistence using IoU matching,
// temporal smoothing (EMA), zone hysteresis, and looming detection.
// This is the critical module that prevents jittery/repeated alerts.

import {
  IOU_MATCH_THRESHOLD,
  CONFIRM_FRAME_COUNT,
  LOST_FRAME_COUNT,
  ZONE_HYSTERESIS_FRAMES,
  BBOX_SMOOTHING_ALPHA,
  LOOMING_THRESHOLD,
  getProximityBand,
} from '../constants/proximityBands';
import { isAnnounceable } from '../constants/threatClasses';
import type {
  RawDetection,
  TrackedObject,
  SmoothedBbox,
  Zone,
} from '../types';

let nextTrackId = 1;

class TrackingManagerImpl {
  private tracks: Map<number, TrackedObject> = new Map();
  private frameWidth = 640;
  private frameHeight = 480;

  /** Set the frame dimensions for zone and proximity calculations */
  setFrameDimensions(width: number, height: number): void {
    this.frameWidth = width;
    this.frameHeight = height;
  }

  /**
   * Process a new frame of raw detections.
   * Returns all CONFIRMED tracked objects (ready for alert evaluation).
   */
  update(detections: RawDetection[]): TrackedObject[] {
    const now = Date.now();

    // Filter out ignored classes and low-confidence detections
    const relevant = detections.filter((d) => isAnnounceable(d.class));

    // Step 1: Match new detections to existing tracks via IoU
    const matched = new Set<number>(); // track IDs that got matched
    const matchedDetections = new Set<number>(); // detection indices that got matched
    const matchPairs: { trackId: number; detIdx: number; iou: number }[] = [];

    // Compute all IoU pairs
    for (const [trackId, track] of this.tracks) {
      if (track.state === 'LOST') continue;
      for (let i = 0; i < relevant.length; i++) {
        if (matchedDetections.has(i)) continue;
        const iou = this.computeIoU(track.rawBbox, relevant[i].bbox);
        if (iou >= IOU_MATCH_THRESHOLD) {
          matchPairs.push({ trackId, detIdx: i, iou });
        }
      }
    }

    // Greedy matching: highest IoU first
    matchPairs.sort((a, b) => b.iou - a.iou);
    for (const pair of matchPairs) {
      if (matched.has(pair.trackId) || matchedDetections.has(pair.detIdx))
        continue;
      matched.add(pair.trackId);
      matchedDetections.add(pair.detIdx);

      // Update existing track
      const track = this.tracks.get(pair.trackId)!;
      const det = relevant[pair.detIdx];
      this.updateTrack(track, det, now);
    }

    // Step 2: Increment missedFrames for unmatched tracks
    for (const [trackId, track] of this.tracks) {
      if (!matched.has(trackId) && track.state !== 'LOST') {
        track.framesMissed++;
        if (track.framesMissed >= LOST_FRAME_COUNT) {
          track.state = 'LOST';
        }
      }
    }

    // Step 3: Create new tracks for unmatched detections
    for (let i = 0; i < relevant.length; i++) {
      if (matchedDetections.has(i)) continue;
      this.createTrack(relevant[i], now);
    }

    // Step 4: Cleanup LOST tracks
    for (const [trackId, track] of this.tracks) {
      if (track.state === 'LOST') {
        this.tracks.delete(trackId);
      }
    }

    // Return only CONFIRMED tracks
    return Array.from(this.tracks.values()).filter(
      (t) => t.state === 'CONFIRMED'
    );
  }

  /** Get all currently active (non-LOST) tracks */
  getActiveTracks(): TrackedObject[] {
    return Array.from(this.tracks.values()).filter(
      (t) => t.state !== 'LOST'
    );
  }

  /** Clear all tracks */
  reset(): void {
    this.tracks.clear();
  }

  // ── Private Helpers ──────────────────────────────────────────

  /** Create a new tracked object from a raw detection */
  private createTrack(det: RawDetection, now: number): void {
    const id = nextTrackId++;
    const zone = this.computeZone(det.bbox);
    const heightRatio = det.bbox[3] / this.frameHeight;

    const smoothed = this.rawToSmoothed(det.bbox);

    const track: TrackedObject = {
      id,
      class: det.class,
      score: det.score,
      smoothedBbox: smoothed,
      rawBbox: det.bbox,
      zone,
      pendingZone: null,
      zoneFrameCount: 0,
      proximityBand: getProximityBand(heightRatio),
      velocity: 0,
      isLooming: false,
      framesSeen: 1,
      framesMissed: 0,
      state: 'TENTATIVE',
      lastSeen: now,
      firstSeen: now,
    };

    this.tracks.set(id, track);
  }

  /** Update an existing track with a new detection */
  private updateTrack(
    track: TrackedObject,
    det: RawDetection,
    now: number
  ): void {
    const prevArea = track.smoothedBbox.area;
    const α = BBOX_SMOOTHING_ALPHA;

    // EMA smoothing for bounding box
    const newSmoothed: SmoothedBbox = {
      x: track.smoothedBbox.x * (1 - α) + det.bbox[0] * α,
      y: track.smoothedBbox.y * (1 - α) + det.bbox[1] * α,
      width: track.smoothedBbox.width * (1 - α) + det.bbox[2] * α,
      height: track.smoothedBbox.height * (1 - α) + det.bbox[3] * α,
      centerX: 0,
      centerY: 0,
      area: 0,
    };
    newSmoothed.centerX = newSmoothed.x + newSmoothed.width / 2;
    newSmoothed.centerY = newSmoothed.y + newSmoothed.height / 2;
    newSmoothed.area = newSmoothed.width * newSmoothed.height;

    // Velocity / looming detection (area change rate)
    const dt = (now - track.lastSeen) / 1000; // seconds
    if (dt > 0 && prevArea > 0) {
      const areaChange = (newSmoothed.area - prevArea) / prevArea;
      track.velocity = areaChange / dt; // fraction per second
      track.isLooming = track.velocity > LOOMING_THRESHOLD;
    }

    // Zone with hysteresis
    const rawZone = this.computeZone(det.bbox);
    if (rawZone !== track.zone) {
      if (track.pendingZone === rawZone) {
        track.zoneFrameCount++;
        if (track.zoneFrameCount >= ZONE_HYSTERESIS_FRAMES) {
          track.zone = rawZone;
          track.pendingZone = null;
          track.zoneFrameCount = 0;
        }
      } else {
        track.pendingZone = rawZone;
        track.zoneFrameCount = 1;
      }
    } else {
      track.pendingZone = null;
      track.zoneFrameCount = 0;
    }

    // Update fields
    track.smoothedBbox = newSmoothed;
    track.rawBbox = det.bbox;
    track.score = det.score;
    track.class = det.class;
    track.proximityBand = getProximityBand(
      newSmoothed.height / this.frameHeight
    );
    track.framesSeen++;
    track.framesMissed = 0;
    track.lastSeen = now;

    // Promote TENTATIVE → CONFIRMED
    if (
      track.state === 'TENTATIVE' &&
      track.framesSeen >= CONFIRM_FRAME_COUNT
    ) {
      track.state = 'CONFIRMED';
    }
  }

  /** Compute which horizontal zone a bounding box center falls in */
  private computeZone(bbox: [number, number, number, number]): Zone {
    const centerX = bbox[0] + bbox[2] / 2;
    const ratio = centerX / this.frameWidth;
    if (ratio < 0.33) return 'left';
    if (ratio > 0.67) return 'right';
    return 'center';
  }

  /** Convert raw bbox to SmoothedBbox */
  private rawToSmoothed(bbox: [number, number, number, number]): SmoothedBbox {
    return {
      x: bbox[0],
      y: bbox[1],
      width: bbox[2],
      height: bbox[3],
      centerX: bbox[0] + bbox[2] / 2,
      centerY: bbox[1] + bbox[3] / 2,
      area: bbox[2] * bbox[3],
    };
  }

  /** Compute Intersection over Union between two bboxes */
  private computeIoU(
    a: [number, number, number, number],
    b: [number, number, number, number]
  ): number {
    const ax1 = a[0],
      ay1 = a[1],
      ax2 = a[0] + a[2],
      ay2 = a[1] + a[3];
    const bx1 = b[0],
      by1 = b[1],
      bx2 = b[0] + b[2],
      by2 = b[1] + b[3];

    const ix1 = Math.max(ax1, bx1);
    const iy1 = Math.max(ay1, by1);
    const ix2 = Math.min(ax2, bx2);
    const iy2 = Math.min(ay2, by2);

    if (ix2 <= ix1 || iy2 <= iy1) return 0;

    const intersection = (ix2 - ix1) * (iy2 - iy1);
    const areaA = a[2] * a[3];
    const areaB = b[2] * b[3];
    const union = areaA + areaB - intersection;

    return union > 0 ? intersection / union : 0;
  }
}

/** Singleton tracking manager */
export const TrackingManager = new TrackingManagerImpl();

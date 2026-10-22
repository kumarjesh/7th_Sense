// ============================================================
// VisionGuard — Camera Feed Component
// ============================================================
// Renders the video stream with an optional debug canvas overlay
// showing bounding boxes, zone dividers, and track IDs.

import { useEffect, useRef, useCallback } from 'react';
import type { RawDetection, TrackedObject } from '../types';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showDebug: boolean;
  rawDetections: RawDetection[];
  trackedObjects: TrackedObject[];
}

export function CameraFeed({
  videoRef,
  showDebug,
  rawDetections,
  trackedObjects,
}: CameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawDebugOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !showDebug) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sync canvas to video dimensions
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Scale factors (video resolution → display size)
    const scaleX = displayWidth / (video.videoWidth || 1);
    const scaleY = displayHeight / (video.videoHeight || 1);

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw zone dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);

    const zone1 = displayWidth * 0.33;
    const zone2 = displayWidth * 0.67;

    ctx.beginPath();
    ctx.moveTo(zone1, 0);
    ctx.lineTo(zone1, displayHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(zone2, 0);
    ctx.lineTo(zone2, displayHeight);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw zone labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LEFT', zone1 / 2, 20);
    ctx.fillText('CENTER', (zone1 + zone2) / 2, 20);
    ctx.fillText('RIGHT', (zone2 + displayWidth) / 2, 20);

    // Draw tracked objects
    for (const obj of trackedObjects) {
      const bbox = obj.smoothedBbox;
      const x = bbox.x * scaleX;
      const y = bbox.y * scaleY;
      const w = bbox.width * scaleX;
      const h = bbox.height * scaleY;

      // Color by proximity
      const color =
        obj.proximityBand === 'CRITICAL'
          ? '#FF3B30'
          : obj.proximityBand === 'WARNING'
            ? '#FFFF00'
            : '#44FF44';

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Semi-transparent fill
      ctx.fillStyle =
        obj.proximityBand === 'CRITICAL'
          ? 'rgba(255, 59, 48, 0.15)'
          : obj.proximityBand === 'WARNING'
            ? 'rgba(255, 255, 0, 0.1)'
            : 'rgba(68, 255, 68, 0.05)';
      ctx.fillRect(x, y, w, h);

      // Label background
      const label = `${obj.class} | ${obj.proximityBand} | ID:${obj.id}`;
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(x, y - 22, textWidth + 12, 22);

      // Label text
      ctx.fillStyle = color;
      ctx.fillText(label, x + 6, y - 6);

      // Looming indicator
      if (obj.isLooming) {
        ctx.fillStyle = '#FF3B30';
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.fillText('⚠ LOOMING', x + 6, y + h + 16);
      }
    }

    // Draw raw detections as thin outlines (debug layer)
    if (rawDetections.length > 0) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
      ctx.lineWidth = 1;
      for (const det of rawDetections) {
        const [rx, ry, rw, rh] = det.bbox;
        ctx.strokeRect(rx * scaleX, ry * scaleY, rw * scaleX, rh * scaleY);
      }
    }
  }, [videoRef, showDebug, rawDetections, trackedObjects]);

  // Redraw overlay when data changes
  useEffect(() => {
    if (showDebug) {
      drawDebugOverlay();
    }
  }, [showDebug, drawDebugOverlay]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      {showDebug && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}
    </div>
  );
}

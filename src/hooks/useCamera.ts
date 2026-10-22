// ============================================================
// VisionGuard — useCamera Hook
// ============================================================
// Manages rear camera access with proper iOS/Android handling.

import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeechEngine } from '../engines/SpeechEngine';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure inline playback on iOS
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('webkit-playsinline', '');
        videoRef.current.muted = true;

        await videoRef.current.play();
        setIsActive(true);
      }
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Camera access failed';
      setError(errMsg);
      setIsActive(false);

      // Speak error for accessibility
      if (
        err instanceof DOMException &&
        err.name === 'NotAllowedError'
      ) {
        SpeechEngine.speak(
          'Camera permission denied. VisionGuard requires camera access to detect obstacles.',
          'HIGH',
          'WARNING'
        );
      } else if (
        err instanceof DOMException &&
        err.name === 'NotFoundError'
      ) {
        SpeechEngine.speak(
          'No camera found. Please use a device with a camera.',
          'HIGH',
          'WARNING'
        );
      } else {
        SpeechEngine.speak(
          'Camera unavailable. Use your cane.',
          'HIGH',
          'WARNING'
        );
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { videoRef, stream, isActive, error, start, stop };
}

// ============================================================
// VisionGuard — useTorch Hook
// ============================================================
// Toggles the camera's rear LED flashlight for night navigation.
// Probes capabilities dynamically as camera stream metadata initializes,
// and gracefully reports device/browser constraints (e.g. iOS WebKit restrictions).

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTorchReturn {
  isOn: boolean;
  isAvailable: boolean;
  isRestrictedByBrowser: boolean;
  toggle: () => Promise<boolean>;
  checkAvailability: () => boolean;
}

export function useTorch(stream: MediaStream | null): UseTorchReturn {
  const [isOn, setIsOn] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const streamRef = useRef<MediaStream | null>(stream);
  streamRef.current = stream;

  // Detect iOS WebKit where Apple blocks the Torch constraint completely
  const isRestrictedByBrowser =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  // Check torch capability dynamically
  const checkAvailability = useCallback((): boolean => {
    const currentStream = streamRef.current;
    if (!currentStream) {
      setIsAvailable(false);
      return false;
    }
    const track = currentStream.getVideoTracks()[0];
    if (!track) {
      setIsAvailable(false);
      return false;
    }

    try {
      const capabilities = track.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean })
        | undefined;
      const hasTorch = Boolean(capabilities?.torch);
      setIsAvailable(hasTorch);
      return hasTorch;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  // Monitor stream changes and retry capability probe as video hardware warms up
  useEffect(() => {
    if (!stream) {
      setIsAvailable(false);
      setIsOn(false);
      return;
    }

    // 1. Immediate check
    checkAvailability();

    // 2. Delayed check (Android camera drivers often initialize torch capability after 500ms)
    const timer1 = setTimeout(() => {
      checkAvailability();
    }, 500);

    // 3. Second check once stream is fully warmed up
    const timer2 = setTimeout(() => {
      checkAvailability();
    }, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [stream, checkAvailability]);

  const toggle = useCallback(async (): Promise<boolean> => {
    const currentStream = streamRef.current;
    if (!currentStream) return false;
    const track = currentStream.getVideoTracks()[0];
    if (!track) return false;

    const available = checkAvailability();
    if (!available) return false;

    const nextState = !isOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextState } as MediaTrackConstraintSet],
      });
      setIsOn(nextState);
      return nextState;
    } catch (err) {
      console.warn('[useTorch] Failed to toggle torch:', err);
      return isOn;
    }
  }, [isOn, checkAvailability]);

  return {
    isOn,
    isAvailable,
    isRestrictedByBrowser,
    toggle,
    checkAvailability,
  };
}

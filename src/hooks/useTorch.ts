// ============================================================
// VisionGuard — useTorch Hook
// ============================================================
// Toggles the camera's rear LED flashlight for night navigation.
// Falls back silently if the device/browser doesn't support torch.

import { useCallback, useState } from 'react';

interface UseTorchReturn {
  isOn: boolean;
  isAvailable: boolean;
  toggle: () => Promise<void>;
}

export function useTorch(stream: MediaStream | null): UseTorchReturn {
  const [isOn, setIsOn] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Check torch capability whenever stream changes
  const checkAvailability = useCallback(() => {
    if (!stream) {
      setIsAvailable(false);
      return false;
    }
    const track = stream.getVideoTracks()[0];
    if (!track) {
      setIsAvailable(false);
      return false;
    }
    const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    const hasTorch = capabilities?.torch === true;
    setIsAvailable(hasTorch);
    return hasTorch;
  }, [stream]);

  const toggle = useCallback(async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const hasTorch = checkAvailability();
    if (!hasTorch) return;

    const newState = !isOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: newState } as MediaTrackConstraintSet],
      });
      setIsOn(newState);
    } catch {
      // Torch toggle failed — non-fatal
    }
  }, [stream, isOn, checkAvailability]);

  return { isOn, isAvailable, toggle };
}

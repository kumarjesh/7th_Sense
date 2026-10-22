// ============================================================
// VisionGuard — useWakeLock Hook
// ============================================================
// Prevents screen from sleeping during navigation sessions.
// Re-acquires lock on visibility change (tab switch / screen unlock).

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseWakeLockReturn {
  isLocked: boolean;
  acquire: () => Promise<void>;
  release: () => void;
}

export function useWakeLock(): UseWakeLockReturn {
  const [isLocked, setIsLocked] = useState(false);
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const isSupported = 'wakeLock' in navigator;

  const acquire = useCallback(async () => {
    if (!isSupported) return;
    try {
      sentinel.current = await navigator.wakeLock.request('screen');
      setIsLocked(true);

      sentinel.current.addEventListener('release', () => {
        setIsLocked(false);
      });
    } catch {
      // Wake Lock request failed — non-fatal
    }
  }, [isSupported]);

  const release = useCallback(() => {
    if (sentinel.current) {
      sentinel.current.release().catch(() => {});
      sentinel.current = null;
      setIsLocked(false);
    }
  }, []);

  // Re-acquire on visibility change (e.g., returning from another tab)
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && isLocked) {
        await acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLocked, acquire]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sentinel.current?.release().catch(() => {});
    };
  }, []);

  return { isLocked, acquire, release };
}

// ============================================================
// VisionGuard — useGestures Hook
// ============================================================
// Full-screen gesture recognition for blind-first navigation.
// Differentiates: tap, double-tap, long-press, swipe directions,
// multi-finger gestures. All without requiring visual targeting.

import { useCallback, useEffect, useRef } from 'react';

export type GestureType =
  | 'tap'
  | 'double-tap'
  | 'long-press'
  | 'swipe-up'
  | 'swipe-down'
  | 'swipe-left'
  | 'swipe-right'
  | 'two-finger-tap'
  | 'two-finger-double-tap'
  | 'two-finger-long-press'
  | 'two-finger-swipe-up'
  | 'two-finger-swipe-down'
  | 'two-finger-swipe-left'
  | 'two-finger-swipe-right'
  | 'three-finger-tap';

interface GestureCallbacks {
  onGesture: (gesture: GestureType) => void;
}

/** Minimum displacement (px) to count as a swipe */
const SWIPE_THRESHOLD = 50;
/** Max time (ms) between taps for a double-tap */
const DOUBLE_TAP_DELAY = 300;
/** Min time (ms) to count as a long-press */
const LONG_PRESS_DELAY = 1500;

export function useGestures(
  elementRef: React.RefObject<HTMLElement | null>,
  callbacks: GestureCallbacks
) {
  // Session tracking: from first finger down until ALL fingers lifted
  const sessionRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    maxFingers: number;
    longPressFired: boolean;
  } | null>(null);

  // Tap tracking across multiple lift cycles
  const recentTapRef = useRef<{ time: number; fingers: number } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { onGesture } = callbacks;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const currentTouches = e.touches.length;

      if (!sessionRef.current) {
        // Start of a brand new gesture session (all fingers were previously up)
        const primaryTouch = e.touches[0];
        sessionRef.current = {
          startX: primaryTouch.clientX,
          startY: primaryTouch.clientY,
          startTime: Date.now(),
          maxFingers: currentTouches,
          longPressFired: false,
        };

        // Start long-press detection
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
          if (sessionRef.current && !sessionRef.current.longPressFired) {
            sessionRef.current.longPressFired = true;
            if (sessionRef.current.maxFingers >= 2) {
              onGesture('two-finger-long-press');
            } else {
              onGesture('long-press');
            }
          }
        }, LONG_PRESS_DELAY);
      } else {
        // Additional finger touched down during existing session
        sessionRef.current.maxFingers = Math.max(
          sessionRef.current.maxFingers,
          currentTouches
        );
      }
    },
    [onGesture]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();

      // Only evaluate gesture when ALL fingers have lifted from the screen
      if (e.touches.length > 0) {
        return;
      }

      // Cancel long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const session = sessionRef.current;
      sessionRef.current = null;
      if (!session) return;

      // If long press already fired, consume and exit
      if (session.longPressFired) {
        recentTapRef.current = null;
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        return;
      }

      // Calculate swipe displacement using the last released touch
      const lastTouch = e.changedTouches[0];
      const dx = lastTouch ? lastTouch.clientX - session.startX : 0;
      const dy = lastTouch ? lastTouch.clientY - session.startY : 0;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const fingers = session.maxFingers;

      // 1. Swipe Detection
      if (distance > SWIPE_THRESHOLD) {
        // Cancel pending tap timers
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        recentTapRef.current = null;

        const isHorizontal = Math.abs(dx) > Math.abs(dy);
        if (fingers >= 2) {
          if (isHorizontal) {
            onGesture(dx > 0 ? 'two-finger-swipe-right' : 'two-finger-swipe-left');
          } else {
            onGesture(dy > 0 ? 'two-finger-swipe-down' : 'two-finger-swipe-up');
          }
        } else {
          if (isHorizontal) {
            onGesture(dx > 0 ? 'swipe-right' : 'swipe-left');
          } else {
            onGesture(dy > 0 ? 'swipe-down' : 'swipe-up');
          }
        }
        return;
      }

      // 2. Three-Finger Tap
      if (fingers >= 3) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        recentTapRef.current = null;
        onGesture('three-finger-tap');
        return;
      }

      // 3. Double-Tap vs Single-Tap Detection
      const now = Date.now();
      const prevTap = recentTapRef.current;

      if (prevTap && now - prevTap.time < DOUBLE_TAP_DELAY) {
        // Second tap received within DOUBLE_TAP_DELAY
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
        }
        recentTapRef.current = null;

        // If EITHER tap was multi-finger, treat as two-finger double-tap
        if (fingers >= 2 || prevTap.fingers >= 2) {
          onGesture('two-finger-double-tap');
        } else {
          onGesture('double-tap');
        }
      } else {
        // First tap: buffer it and wait for potential double-tap
        recentTapRef.current = { time: now, fingers };

        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => {
          recentTapRef.current = null;
          if (fingers >= 2) {
            onGesture('two-finger-tap');
          } else {
            onGesture('tap');
          }
        }, DOUBLE_TAP_DELAY);
      }
    },
    [onGesture]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault(); // Prevent browser scroll/zoom
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchmove', handleTouchMove);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, [elementRef, handleTouchStart, handleTouchEnd, handleTouchMove]);
}

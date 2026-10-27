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
  const touchStart = useRef<{ x: number; y: number; time: number; fingers: number } | null>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFingerCount = useRef(0);

  const { onGesture } = callbacks;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const fingerCount = e.touches.length;
      lastFingerCount.current = fingerCount;

      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        fingers: fingerCount,
      };

      // Start long-press timer
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        if (touchStart.current) {
          if (fingerCount >= 2) {
            onGesture('two-finger-long-press');
          } else {
            onGesture('long-press');
          }
          touchStart.current = null; // Consumed
        }
      }, LONG_PRESS_DELAY);
    },
    [onGesture]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      const elapsed = Date.now() - touchStart.current.time;
      const fingers = lastFingerCount.current;
      const distance = Math.sqrt(dx * dx + dy * dy);

      touchStart.current = null;

      // Classify gesture
      if (elapsed > LONG_PRESS_DELAY) {
        return; // Already handled by long-press timer
      }

      if (distance > SWIPE_THRESHOLD) {
        // Multi-finger or single-finger swipe
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

      // Three-finger tap
      if (fingers >= 3) {
        onGesture('three-finger-tap');
        tapCount.current = 0;
        if (tapTimer.current) clearTimeout(tapTimer.current);
        return;
      }

      // Tap / double-tap detection
      tapCount.current++;

      if (tapTimer.current) clearTimeout(tapTimer.current);

      tapTimer.current = setTimeout(() => {
        if (fingers >= 2) {
          if (tapCount.current >= 2) {
            onGesture('two-finger-double-tap');
          } else {
            onGesture('two-finger-tap');
          }
        } else {
          if (tapCount.current >= 2) {
            onGesture('double-tap');
          } else {
            onGesture('tap');
          }
        }
        tapCount.current = 0;
      }, DOUBLE_TAP_DELAY);
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
      if (tapTimer.current) clearTimeout(tapTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, [elementRef, handleTouchStart, handleTouchEnd, handleTouchMove]);
}

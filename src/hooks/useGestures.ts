// ============================================================
// VisionGuard — useGestures Hook
// ============================================================
// Full-screen gesture recognition for blind-first navigation.
// Uses centroid tracking across multiple touch points to eliminate
// false swipes when tapping with multiple fingers side-by-side.
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

/** Minimum centroid displacement (px) to count as a deliberate swipe */
const SWIPE_THRESHOLD = 50;
/** Max time (ms) between taps for a double-tap */
const DOUBLE_TAP_WINDOW = 350;
/** Debounce window (ms) to confirm single-tap */
const SINGLE_TAP_DEBOUNCE = 280;
/** Min time (ms) to count as a long-press */
const LONG_PRESS_DELAY = 700;

interface GestureSession {
  startCentroidX: number;
  startCentroidY: number;
  lastCentroidX: number;
  lastCentroidY: number;
  startTime: number;
  maxFingers: number;
  longPressFired: boolean;
  moved: boolean;
}

/** Helper to compute the geometric center (centroid) of active touches */
function getCentroid(touches: TouchList): { x: number; y: number } {
  const n = touches.length;
  if (n === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += touches[i].clientX;
    sumY += touches[i].clientY;
  }
  return { x: sumX / n, y: sumY / n };
}

export function useGestures(
  elementRef: React.RefObject<HTMLElement | null>,
  callbacks: GestureCallbacks
) {
  // Session tracking: from first finger down until ALL fingers lifted
  const sessionRef = useRef<GestureSession | null>(null);

  // Tap tracking across multiple lift cycles for double-tap detection
  const recentTapRef = useRef<{ time: number; fingers: number } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { onGesture } = callbacks;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const currentTouches = e.touches.length;
      const centroid = getCentroid(e.touches);

      if (!sessionRef.current) {
        // Start of a brand new gesture session (all fingers were previously up)
        sessionRef.current = {
          startCentroidX: centroid.x,
          startCentroidY: centroid.y,
          lastCentroidX: centroid.x,
          lastCentroidY: centroid.y,
          startTime: Date.now(),
          maxFingers: currentTouches,
          longPressFired: false,
          moved: false,
        };

        // Start long-press timer with immediate tactile haptic pulse
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
          const session = sessionRef.current;
          if (session && !session.longPressFired && !session.moved) {
            session.longPressFired = true;

            // Tactile feedback signaling the long-press triggered
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(60);
              } catch {
                // Ignore vibration failure
              }
            }

            if (session.maxFingers >= 2) {
              onGesture('two-finger-long-press');
            } else {
              onGesture('long-press');
            }
          }
        }, LONG_PRESS_DELAY);
      } else {
        // Additional finger touched down during existing session
        if (currentTouches > sessionRef.current.maxFingers) {
          sessionRef.current.maxFingers = currentTouches;
          // Re-anchor centroid for the new multi-touch configuration if not swiping
          if (!sessionRef.current.moved) {
            sessionRef.current.startCentroidX = centroid.x;
            sessionRef.current.startCentroidY = centroid.y;
          }
        }
        sessionRef.current.lastCentroidX = centroid.x;
        sessionRef.current.lastCentroidY = centroid.y;
      }
    },
    [onGesture]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (!sessionRef.current) return;

    const centroid = getCentroid(e.touches);
    sessionRef.current.lastCentroidX = centroid.x;
    sessionRef.current.lastCentroidY = centroid.y;

    const dist = Math.hypot(
      centroid.x - sessionRef.current.startCentroidX,
      centroid.y - sessionRef.current.startCentroidY
    );

    // If fingers clearly moved, cancel long-press to allow deliberate swipe
    if (dist > 25) {
      sessionRef.current.moved = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

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

      // If long press already fired while holding, consume and exit
      if (session.longPressFired) {
        recentTapRef.current = null;
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        return;
      }

      // Compute displacement using the centroid difference
      const dx = session.lastCentroidX - session.startCentroidX;
      const dy = session.lastCentroidY - session.startCentroidY;
      const distance = Math.hypot(dx, dy);
      const fingers = session.maxFingers;

      // 1. Three-Finger Tap (Emergency Pause Kill Switch)
      if (fingers >= 3 && distance <= SWIPE_THRESHOLD) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        recentTapRef.current = null;
        onGesture('three-finger-tap');
        return;
      }

      // 2. Deliberate Swipe Detection (centroid moved > SWIPE_THRESHOLD)
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

      // 3. Double-Tap vs Single-Tap Detection
      const now = Date.now();
      const prevTap = recentTapRef.current;

      if (prevTap && now - prevTap.time < DOUBLE_TAP_WINDOW) {
        // Second tap received within DOUBLE_TAP_WINDOW
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
        }
        recentTapRef.current = null;

        // If either tap was multi-finger, classify as two-finger double-tap (Banknote Reader)
        if (fingers >= 2 || prevTap.fingers >= 2) {
          onGesture('two-finger-double-tap');
        } else {
          onGesture('double-tap');
        }
      } else {
        // First tap: buffer it and wait briefly for potential second tap
        recentTapRef.current = { time: now, fingers };

        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => {
          recentTapRef.current = null;
          if (fingers >= 2) {
            onGesture('two-finger-tap');
          } else {
            onGesture('tap');
          }
        }, SINGLE_TAP_DEBOUNCE);
      }
    },
    [onGesture]
  );

  const handleTouchCancel = useCallback(() => {
    sessionRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchcancel', handleTouchCancel);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, [elementRef, handleTouchStart, handleTouchEnd, handleTouchMove, handleTouchCancel]);
}

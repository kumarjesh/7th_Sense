// ============================================================
// VisionGuard — GesturePad Component
// ============================================================
// Full-screen touch interaction surface for blind navigation.
// Intercepts all touches and routes them to useGestures.
// Provides visual ripples and feedback for sighted testing in both themes.

import { useRef, useState, useCallback } from 'react';
import { useGestures, GestureType } from '../hooks/useGestures';
import type { AppTheme } from '../types';

interface Ripple {
  id: number;
  x: number;
  y: number;
  label: string;
}

interface GesturePadProps {
  onGesture: (gesture: GestureType) => void;
  disabled?: boolean;
  theme?: AppTheme;
}

export function GesturePad({ onGesture, disabled = false, theme = 'dark' }: GesturePadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const isDark = theme === 'dark';

  const addRipple = useCallback((gesture: GestureType) => {
    const id = ++rippleIdRef.current;
    const newRipple: Ripple = {
      id,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      label: gesture.replace(/-/g, ' ').toUpperCase(),
    };
    setRipples((prev) => [...prev.slice(-3), newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 700);
  }, []);

  const handleGesture = useCallback(
    (gesture: GestureType) => {
      if (disabled) return;
      addRipple(gesture);
      onGesture(gesture);
    },
    [disabled, onGesture, addRipple]
  );

  useGestures(padRef, { onGesture: handleGesture });

  return (
    <div
      ref={padRef}
      role="application"
      aria-label="VisionGuard gesture navigation pad. Single tap to toggle scanning, double-tap to repeat hazard summary, two-finger tap to describe scene with Google AI, swipe up for flashlight, swipe down for status, two-finger swipe up for text reader, two-finger swipe down for light detector, two-finger swipe left or right to change target object, long press to cycle sound modes, two finger long press for settings, three finger tap for emergency pause."
      tabIndex={0}
      className="absolute inset-0 z-20 touch-none select-none focus:outline-none"
    >
      {/* Visual Ripple Indicators for sighted testers */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-ping-once"
          style={{ left: ripple.x, top: ripple.y }}
        >
          <div
            className={`w-24 h-24 rounded-full border-2 flex items-center justify-center shadow-lg ${
              isDark
                ? 'border-amber-400 bg-amber-400/10'
                : 'border-blue-600 bg-blue-600/10'
            }`}
          >
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded shadow ${
                isDark
                  ? 'text-amber-300 bg-slate-900/90 border border-amber-400/30'
                  : 'text-blue-700 bg-white/95 border border-blue-200'
              }`}
            >
              {ripple.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

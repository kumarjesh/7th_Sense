// ============================================================
// VisionGuard — GesturePad Component
// ============================================================
// Full-screen touch interaction surface for blind navigation.
// Intercepts all touches and routes them to useGestures.
// Provides visual ripples and feedback for sighted testing.

import { useRef, useState, useCallback } from 'react';
import { useGestures, GestureType } from '../hooks/useGestures';

interface Ripple {
  id: number;
  x: number;
  y: number;
  label: string;
}

interface GesturePadProps {
  onGesture: (gesture: GestureType) => void;
  disabled?: boolean;
}

export function GesturePad({ onGesture, disabled = false }: GesturePadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

  const addRipple = useCallback((gesture: GestureType) => {
    const id = ++rippleIdRef.current;
    // Default to center if no direct coordinate
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
      aria-label="VisionGuard gesture navigation pad. Tap to toggle scanning, double-tap to hear hazard summary, swipe up for flashlight, swipe down for status, long press to cycle sound modes, two finger long press for settings."
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
          <div className="w-24 h-24 rounded-full border-2 border-[#FFFF00] bg-[#FFFF00]/10 flex items-center justify-center">
            <span className="text-xs font-mono font-bold text-[#FFFF00] bg-black/80 px-2 py-0.5 rounded shadow">
              {ripple.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

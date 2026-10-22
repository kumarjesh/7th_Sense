// ============================================================
// VisionGuard — Audio Unlock & Initial Start Screen
// ============================================================
// Unlocks Web Audio (AudioContext) and Web Speech (SpeechSynthesis).
// Supports both Dark Mode (Obsidian & Amber) and Light Mode (Porcelain & Cobalt).

import type { AppTheme } from '../types';

interface AudioUnlockModalProps {
  onUnlock: () => void;
  isInitializing: boolean;
  initProgress: string;
  theme: AppTheme;
  onToggleTheme: () => void;
}

export function AudioUnlockModal({
  onUnlock,
  isInitializing,
  initProgress,
  theme,
  onToggleTheme,
}: AudioUnlockModalProps) {
  const isDark = theme === 'dark';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="VisionGuard Activation Screen. Tap anywhere to begin navigation."
      onClick={!isInitializing ? onUnlock : undefined}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 cursor-pointer select-none transition-colors duration-300 ${
        isDark
          ? 'bg-[#090A0F] text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Bar with Branding & Theme Switcher */}
      <div className="w-full flex items-center justify-between pt-4 max-w-xl mx-auto">
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
            isDark
              ? 'bg-slate-900 border border-slate-800 text-amber-400'
              : 'bg-white border border-slate-200 text-amber-700 shadow-sm'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Spatial AI Navigator</span>
        </div>

        {/* Quick Theme Switcher Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTheme();
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
          }`}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          <span>{isDark ? '☀️ Light' : '🌙 Dark'}</span>
        </button>
      </div>

      {/* Main Title */}
      <div className="w-full text-center pt-2">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
          Vision<span className={isDark ? 'text-amber-400' : 'text-blue-600'}>Guard</span>
        </h1>
        <p
          className={`mt-2 text-sm sm:text-base max-w-sm mx-auto font-medium ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Spatial AI Awareness for Blind & Low-Vision Pedestrians
        </p>
      </div>

      {/* Center Target with Animated Radar Ring */}
      <div className="flex flex-col items-center justify-center space-y-6 text-center my-auto">
        <div className="relative">
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
              isDark
                ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_50px_rgba(245,158,11,0.25)]'
                : 'border-blue-600 bg-blue-50 shadow-[0_10px_35px_rgba(37,99,235,0.18)]'
            }`}
          >
            <span className="text-6xl sm:text-7xl select-none">👁️</span>
          </div>
          <div
            className={`absolute inset-0 rounded-full border animate-ping ${
              isDark ? 'border-amber-400/30' : 'border-blue-600/30'
            }`}
          />
        </div>

        <div className="space-y-2">
          <h2
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              isDark ? 'text-amber-400' : 'text-blue-600'
            }`}
          >
            {isInitializing ? 'Starting Engines...' : 'Tap Anywhere to Start'}
          </h2>
          <p
            className={`font-mono text-xs sm:text-sm max-w-xs mx-auto ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {initProgress || 'Activates camera feed, 3D spatial sonar, and voice guidance'}
          </p>
        </div>
      </div>

      {/* Bottom Info & Accessibility Guidance */}
      <div className="w-full max-w-md pb-4 text-center space-y-3">
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-center gap-2 ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}
        >
          <span className="text-amber-500">🛡️</span>
          <span>Assistive Awareness Aid — Use alongside your cane or guide dog</span>
        </div>
        <p
          className={`text-xs ${
            isDark ? 'text-slate-500' : 'text-slate-500'
          }`}
        >
          Double-tap anywhere during navigation to repeat hazard alerts. Long press to change sound mode.
        </p>
      </div>
    </div>
  );
}

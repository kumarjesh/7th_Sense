// ============================================================
// VisionGuard — Safety Briefing Component
// ============================================================
// Full-screen first-run modal with spoken narration and dual-theme styling.
// Displayed once until user acknowledges.

import { useEffect } from 'react';
import { SafetyManager } from '../engines/SafetyManager';
import type { AppTheme } from '../types';

interface SafetyBriefingProps {
  theme: AppTheme;
  onDismiss: () => void;
}

export function SafetyBriefing({ theme, onDismiss }: SafetyBriefingProps) {
  const isDark = theme === 'dark';

  useEffect(() => {
    const timer = setTimeout(() => {
      SafetyManager.speakBriefing();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleAcknowledge = () => {
    SafetyManager.completeBriefing();
    onDismiss();
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="safety-heading"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md transition-colors ${
        isDark ? 'bg-black/90' : 'bg-slate-900/60'
      }`}
    >
      <div
        className={`max-w-lg w-full flex flex-col items-center gap-6 p-6 sm:p-8 rounded-3xl border shadow-2xl transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
          🛡️
        </div>

        <h1
          id="safety-heading"
          className={`text-2xl sm:text-3xl font-extrabold text-center tracking-tight ${
            isDark ? 'text-amber-400' : 'text-blue-600'
          }`}
        >
          Important Safety Notice
        </h1>

        <div className="text-sm sm:text-base leading-relaxed text-center space-y-3.5">
          <div
            className={`p-3.5 rounded-2xl border font-bold text-sm ${
              isDark
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            VisionGuard is an assistive awareness aid only.
          </div>

          <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            It <span className="font-bold underline">does not replace</span> a physical white cane, guide dog, or formal orientation & mobility training.
          </p>

          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            It cannot reliably detect drop-offs, stairs, potholes, transparent glass, or overhead tree branches.
          </p>

          <p className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            Always use your primary mobility aid while walking.
          </p>
        </div>

        <button
          onClick={handleAcknowledge}
          className={`w-full py-4 text-base sm:text-lg font-extrabold rounded-2xl transition-all shadow-md active:scale-98 min-h-[56px] ${
            isDark
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          aria-label="I understand, continue to VisionGuard navigation"
        >
          I Understand — Begin Navigation
        </button>

        <p
          className={`text-xs text-center ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          You can re-read this notice anytime in Settings.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// VisionGuard — HUD Overlay Component
// ============================================================
// Heads-up display over camera feed with dual-theme design (Dark & Light),
// real-time hazard badges, Google Gemini AI quick tools, and rolling alert log.

import type {
  AlertLogEntry,
  AppTheme,
  AssistiveToolMode,
  FindTargetType,
  HazardStatus,
  PerformanceMetrics,
  ScanningState,
  VerbosityMode,
} from '../types';

interface HUDOverlayProps {
  theme: AppTheme;
  scanningState: ScanningState;
  hazardStatus: HazardStatus;
  verbosityMode: VerbosityMode;
  performance: PerformanceMetrics;
  alertLog: AlertLogEntry[];
  showDebug: boolean;
  torchActive: boolean;
  activeAssistiveTool: AssistiveToolMode;
  findTarget: FindTargetType;
  lightLuminancePercent: number;
  isAnalyzingScene: boolean;
  isReadingCurrency?: boolean;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onTriggerDescribe?: () => void;
  onToggleTextReader?: () => void;
  onToggleLightDetector?: () => void;
  onCycleFindTarget?: () => void;
  onTriggerCurrency?: () => void;
}

const MODE_LABELS: Record<VerbosityMode, string> = {
  FULL: '🔊 Full',
  VOICE_ONLY: '🗣️ Voice',
  SONAR_ONLY: '📡 Sonar',
  EMERGENCY_ONLY: '🚨 Emergency',
};

export function HUDOverlay({
  theme,
  scanningState,
  hazardStatus,
  verbosityMode,
  performance,
  alertLog,
  showDebug,
  torchActive,
  activeAssistiveTool,
  findTarget,
  lightLuminancePercent,
  isAnalyzingScene,
  isReadingCurrency = false,
  onToggleTheme,
  onOpenSettings,
  onTriggerDescribe,
  onToggleTextReader,
  onToggleLightDetector,
  onCycleFindTarget,
  onTriggerCurrency,
}: HUDOverlayProps) {
  const isDark = theme === 'dark';
  const isActive = scanningState === 'ACTIVE';

  // Harmonious theme-tailored hazard configurations
  const statusStyles: Record<
    HazardStatus,
    { icon: string; label: string; containerClass: string; textClass: string }
  > = {
    CLEAR: {
      icon: '🟢',
      label: 'CLEAR',
      containerClass: isDark
        ? 'bg-emerald-950/80 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
        : 'bg-emerald-50 border-emerald-300 shadow-md',
      textClass: isDark ? 'text-emerald-300' : 'text-emerald-800',
    },
    CAUTION: {
      icon: '🟡',
      label: 'CAUTION',
      containerClass: isDark
        ? 'bg-amber-950/80 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
        : 'bg-amber-50 border-amber-300 shadow-md',
      textClass: isDark ? 'text-amber-300' : 'text-amber-900',
    },
    DANGER: {
      icon: '🔴',
      label: 'DANGER',
      containerClass: isDark
        ? 'bg-rose-950/90 border-rose-500/50 shadow-[0_0_35px_rgba(239,68,68,0.35)] animate-pulse'
        : 'bg-rose-50 border-rose-400 shadow-lg animate-pulse',
      textClass: isDark ? 'text-rose-300' : 'text-rose-800',
    },
  };

  const status = statusStyles[hazardStatus];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 z-30 select-none">
      {/* ─── Top Bar & Quick Actions ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Scanning Status Pill */}
          <div
            className={`flex items-center gap-2.5 rounded-full px-3.5 py-1.5 backdrop-blur-md border text-xs sm:text-sm font-bold shadow-sm transition-colors ${
              isDark
                ? 'bg-slate-900/80 border-slate-700/60 text-slate-100'
                : 'bg-white/90 border-slate-200/90 text-slate-800'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isActive
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span>{isActive ? 'SCANNING' : scanningState}</span>
          </div>

          {/* Right: Mode + Torch + Interactive Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {torchActive && (
              <div
                className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                  isDark
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-amber-100 border-amber-300 text-amber-800'
                }`}
              >
                <span>🔦 Torch</span>
              </div>
            )}

            {/* Mode Badge */}
            <div
              className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-bold backdrop-blur-md border shadow-sm ${
                isDark
                  ? 'bg-slate-900/80 border-slate-700/60 text-slate-200'
                  : 'bg-white/90 border-slate-200/90 text-slate-800'
              }`}
            >
              <span>{MODE_LABELS[verbosityMode]}</span>
            </div>

            {/* Interactive Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`pointer-events-auto p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-bold backdrop-blur-md border shadow-sm transition-transform active:scale-95 ${
                  isDark
                    ? 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-700'
                    : 'bg-white/95 border-slate-300 text-slate-800 hover:bg-slate-100'
                }`}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                title="Toggle Light / Dark Mode"
              >
                <span>{isDark ? '☀️' : '🌙'}</span>
              </button>
            )}

            {/* Interactive Settings Button */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className={`pointer-events-auto p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-bold backdrop-blur-md border shadow-sm transition-transform active:scale-95 ${
                  isDark
                    ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-white/95 border-slate-300 text-slate-800 hover:bg-slate-100'
                }`}
                aria-label="Open settings"
                title="Open Settings"
              >
                <span>⚙️</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Assistive Intelligence Quick Bar (Google AI Tools) ─── */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {/* Describe Scene Button */}
          {onTriggerDescribe && (
            <button
              type="button"
              onClick={onTriggerDescribe}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              disabled={isAnalyzingScene}
              className={`pointer-events-auto px-3 py-1.5 rounded-full text-xs font-extrabold border shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
                isAnalyzingScene
                  ? 'bg-amber-500 text-slate-950 animate-pulse border-amber-400'
                  : isDark
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-amber-300'
                    : 'bg-white/95 hover:bg-slate-50 border-slate-300 text-blue-700'
              }`}
              title="Two-finger tap to describe scene with Gemini"
            >
              <span>🧠</span>
              <span>{isAnalyzingScene ? 'Analyzing...' : 'Describe'}</span>
            </button>
          )}

          {/* Read Text Button */}
          {onToggleTextReader && (
            <button
              type="button"
              onClick={onToggleTextReader}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className={`pointer-events-auto px-3 py-1.5 rounded-full text-xs font-extrabold border shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
                activeAssistiveTool === 'TEXT_READER'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isDark
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white/95 hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title="Two-finger swipe up for text reader"
            >
              <span>📖</span>
              <span>{activeAssistiveTool === 'TEXT_READER' ? 'Text: ON' : 'Read Text'}</span>
            </button>
          )}

          {/* Light Detector Tone Button */}
          {onToggleLightDetector && (
            <button
              type="button"
              onClick={onToggleLightDetector}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className={`pointer-events-auto px-3 py-1.5 rounded-full text-xs font-extrabold border shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
                activeAssistiveTool === 'LIGHT_DETECTOR'
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : isDark
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white/95 hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title="Two-finger swipe down for light tone"
            >
              <span>💡</span>
              <span>
                {activeAssistiveTool === 'LIGHT_DETECTOR'
                  ? `Light: ${lightLuminancePercent}%`
                  : 'Light Tone'}
              </span>
            </button>
          )}

          {/* Target Finder Button */}
          {onCycleFindTarget && (
            <button
              type="button"
              onClick={onCycleFindTarget}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className={`pointer-events-auto px-3 py-1.5 rounded-full text-xs font-extrabold border shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
                activeAssistiveTool === 'FIND_TARGET'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isDark
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white/95 hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title="Two-finger swipe right/left to change target"
            >
              <span>🎯</span>
              <span>Seek: {findTarget}</span>
            </button>
          )}

          {/* Cash / Banknote Reader */}
          {onTriggerCurrency && (
            <button
              type="button"
              onClick={onTriggerCurrency}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              disabled={isReadingCurrency}
              className={`pointer-events-auto px-3 py-1.5 rounded-full text-xs font-extrabold border shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
                isReadingCurrency
                  ? 'bg-emerald-500 text-slate-950 animate-pulse border-emerald-400 font-black'
                  : isDark
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white/95 hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title="Two-finger double-tap to read banknote or currency"
            >
              <span>💵</span>
              <span>{isReadingCurrency ? 'Reading...' : 'Banknote'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Center Hazard Badge ─── */}
      <div className="flex flex-col items-center justify-center my-auto space-y-3">
        {/* Active Tool Notification Banner */}
        {isAnalyzingScene && (
          <div
            className={`px-5 py-2 rounded-full border text-xs sm:text-sm font-bold animate-pulse backdrop-blur-md shadow-lg ${
              isDark
                ? 'bg-amber-950/90 border-amber-500 text-amber-300'
                : 'bg-amber-50 border-amber-400 text-amber-900'
            }`}
          >
            🧠 Describing scene with Google Gemini...
          </div>
        )}

        <div
          className={`rounded-2xl px-8 py-4 sm:px-10 sm:py-5 border-2 transition-all duration-300 backdrop-blur-md ${status.containerClass}`}
          role="status"
          aria-live="assertive"
          aria-label={`Hazard status: ${status.label}`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-3xl sm:text-4xl">{status.icon}</span>
            <span
              className={`text-2xl sm:text-3xl font-black tracking-wider ${status.textClass}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Target Finder Indicator */}
        {activeAssistiveTool === 'FIND_TARGET' && (
          <div
            className={`px-4 py-1.5 rounded-full border text-xs font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm ${
              isDark
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
          >
            <span>🎯 Beacon Searching for: {findTarget}</span>
          </div>
        )}
      </div>

      {/* ─── Bottom Panel ─── */}
      <div className="space-y-2 max-w-xl mx-auto w-full">
        {/* Performance metrics (debug overlay) */}
        {showDebug && (
          <div
            className={`backdrop-blur-md rounded-2xl px-3.5 py-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono border shadow-sm ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                : 'bg-white/95 border-slate-200 text-slate-700'
            }`}
          >
            <span>
              FPS:{' '}
              <span className={isDark ? 'text-amber-400 font-bold' : 'text-blue-600 font-bold'}>
                {performance.effectiveFps}
              </span>
            </span>
            <span>
              Inf:{' '}
              <span className={isDark ? 'text-amber-400 font-bold' : 'text-blue-600 font-bold'}>
                {performance.inferenceMs}ms
              </span>
            </span>
            <span>
              Interval:{' '}
              <span className={isDark ? 'text-amber-400 font-bold' : 'text-blue-600 font-bold'}>
                {performance.targetIntervalMs}ms
              </span>
            </span>
            {performance.batteryPct !== null && (
              <span>
                Bat:{' '}
                <span
                  className={
                    performance.batteryPct < 20
                      ? 'text-rose-500 font-bold'
                      : isDark
                        ? 'text-emerald-400 font-bold'
                        : 'text-emerald-700 font-bold'
                  }
                >
                  {performance.batteryPct}%
                </span>
              </span>
            )}
            <span>
              Mode:{' '}
              <span
                className={
                  performance.powerMode === 'NORMAL'
                    ? 'text-emerald-500 font-bold'
                    : 'text-amber-500 font-bold'
                }
              >
                {performance.powerMode}
              </span>
            </span>
          </div>
        )}

        {/* Alert Log with Smooth Theme Badges */}
        <div
          className={`backdrop-blur-md rounded-2xl px-3.5 py-2.5 max-h-[120px] overflow-y-auto border shadow-sm transition-colors ${
            isDark
              ? 'bg-slate-900/85 border-slate-800 text-slate-200'
              : 'bg-white/95 border-slate-200/90 text-slate-800'
          }`}
          role="log"
          aria-live="polite"
          aria-label="Recent alerts"
        >
          {alertLog.length === 0 ? (
            <p
              className={`text-xs text-center py-1 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              No active alerts · Path clear
            </p>
          ) : (
            <div className="space-y-1.5">
              {alertLog.map((entry, i) => {
                const time = new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const isCritical = entry.proximityBand === 'CRITICAL';
                const isWarning = entry.proximityBand === 'WARNING';

                const badgeColor = isCritical
                  ? isDark
                    ? 'bg-rose-950/70 text-rose-300 border-rose-700/50'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                  : isWarning
                    ? isDark
                      ? 'bg-amber-950/70 text-amber-300 border-amber-700/50'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                    : isDark
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <span
                      className={`text-[11px] font-mono shrink-0 ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {time}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wider ${badgeColor}`}
                    >
                      {entry.proximityBand}
                    </span>
                    <span className="font-semibold truncate">
                      {entry.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gesture Hint Footer */}
        <div className="text-center">
          <p
            className={`text-[11px] font-medium ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            2-finger tap: Describe Scene · 2-finger swipe up: Read Text · 2-finger swipe down: Light Tone · 1-finger tap: Pause/Resume
          </p>
        </div>
      </div>
    </div>
  );
}

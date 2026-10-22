// ============================================================
// VisionGuard — HUD Overlay Component
// ============================================================
// Non-interactive heads-up display over camera feed.
// Shows: status, mode, FPS, battery, hazard badge, alert log.

import type {
  AlertLogEntry,
  HazardStatus,
  PerformanceMetrics,
  ScanningState,
  VerbosityMode,
} from '../types';

interface HUDOverlayProps {
  scanningState: ScanningState;
  hazardStatus: HazardStatus;
  verbosityMode: VerbosityMode;
  performance: PerformanceMetrics;
  alertLog: AlertLogEntry[];
  showDebug: boolean;
  torchActive: boolean;
}

const STATUS_CONFIG: Record<HazardStatus, { icon: string; label: string; color: string; bg: string }> = {
  CLEAR: { icon: '🟢', label: 'CLEAR', color: '#44FF44', bg: 'rgba(68, 255, 68, 0.15)' },
  CAUTION: { icon: '🟡', label: 'CAUTION', color: '#FFFF00', bg: 'rgba(255, 255, 0, 0.15)' },
  DANGER: { icon: '🔴', label: 'DANGER', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.2)' },
};

const MODE_LABELS: Record<VerbosityMode, string> = {
  FULL: '🔊 Full',
  VOICE_ONLY: '🗣️ Voice',
  SONAR_ONLY: '📡 Sonar',
  EMERGENCY_ONLY: '🚨 Emergency',
};

export function HUDOverlay({
  scanningState,
  hazardStatus,
  verbosityMode,
  performance,
  alertLog,
  showDebug,
  torchActive,
}: HUDOverlayProps) {
  const status = STATUS_CONFIG[hazardStatus];
  const isActive = scanningState === 'ACTIVE';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 z-10">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between gap-2">
        {/* Scanning status */}
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isActive
                ? 'bg-green-400 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-white text-sm font-bold">
            {isActive ? 'SCANNING' : scanningState}
          </span>
        </div>

        {/* Mode + Torch */}
        <div className="flex items-center gap-2">
          {torchActive && (
            <div className="bg-yellow-500/20 rounded-xl px-2 py-1">
              <span className="text-yellow-300 text-sm">🔦</span>
            </div>
          )}
          <div className="bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2">
            <span className="text-white text-sm font-medium">
              {MODE_LABELS[verbosityMode]}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Center Hazard Badge ─── */}
      <div className="flex justify-center">
        <div
          className={`rounded-2xl px-8 py-4 transition-all duration-300 ${
            hazardStatus === 'DANGER' ? 'animate-pulse' : ''
          }`}
          style={{ backgroundColor: status.bg }}
          role="status"
          aria-live="assertive"
          aria-label={`Hazard status: ${status.label}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{status.icon}</span>
            <span
              className="text-2xl font-black tracking-wider"
              style={{ color: status.color }}
            >
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Bottom Panel ─── */}
      <div className="space-y-2">
        {/* Performance metrics (debug) */}
        {showDebug && (
          <div className="bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-gray-300">
              FPS:{' '}
              <span className="text-[#FFFF00]">
                {performance.effectiveFps}
              </span>
            </span>
            <span className="text-gray-300">
              Inf:{' '}
              <span className="text-[#FFFF00]">
                {performance.inferenceMs}ms
              </span>
            </span>
            <span className="text-gray-300">
              Interval:{' '}
              <span className="text-[#FFFF00]">
                {performance.targetIntervalMs}ms
              </span>
            </span>
            {performance.batteryPct !== null && (
              <span className="text-gray-300">
                Bat:{' '}
                <span
                  className={
                    performance.batteryPct < 20
                      ? 'text-[#FF3B30]'
                      : 'text-[#FFFF00]'
                  }
                >
                  {performance.batteryPct}%
                </span>
              </span>
            )}
            <span className="text-gray-300">
              Mode:{' '}
              <span
                className={
                  performance.powerMode === 'NORMAL'
                    ? 'text-green-400'
                    : 'text-orange-400'
                }
              >
                {performance.powerMode}
              </span>
            </span>
          </div>
        )}

        {/* Alert Log */}
        <div
          className="bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2 max-h-[120px] overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-label="Recent alerts"
        >
          {alertLog.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-1">
              No alerts yet
            </p>
          ) : (
            <div className="space-y-1">
              {alertLog.map((entry, i) => {
                const time = new Date(entry.timestamp).toLocaleTimeString(
                  [],
                  { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                );
                const bandColor =
                  entry.proximityBand === 'CRITICAL'
                    ? 'text-[#FF3B30]'
                    : entry.proximityBand === 'WARNING'
                      ? 'text-[#FFFF00]'
                      : 'text-gray-400';

                return (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="text-gray-500 text-xs font-mono shrink-0">
                      {time}
                    </span>
                    <span className={`${bandColor} font-medium`}>
                      {entry.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gesture hint */}
        <div className="text-center">
          <p className="text-gray-500 text-xs">
            Tap to {isActive ? 'pause' : 'start'} · Double-tap to repeat · Long-press to change mode
          </p>
        </div>
      </div>
    </div>
  );
}

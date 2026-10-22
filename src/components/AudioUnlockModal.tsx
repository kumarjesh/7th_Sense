// ============================================================
// VisionGuard — Audio Unlock & Initial Start Screen
// ============================================================
// Mobile browsers require a direct user interaction before
// playing Web Audio (AudioContext) or starting Web Speech (SpeechSynthesis).
// This full-screen accessible gate unlocks all media engines cleanly.

interface AudioUnlockModalProps {
  onUnlock: () => void;
  isInitializing: boolean;
  initProgress: string;
}

export function AudioUnlockModal({
  onUnlock,
  isInitializing,
  initProgress,
}: AudioUnlockModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="VisionGuard Activation Screen. Tap anywhere to begin navigation."
      onClick={!isInitializing ? onUnlock : undefined}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black text-white p-6 cursor-pointer select-none"
    >
      {/* Top branding */}
      <div className="w-full text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-[#FFFF00] font-mono text-sm uppercase tracking-wider mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFFF00] animate-ping" />
          Assistive Navigation System
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          Vision<span className="text-[#FFFF00]">Guard</span>
        </h1>
        <p className="text-gray-400 mt-2 text-base sm:text-lg max-w-sm mx-auto">
          Spatial AI Awareness for Blind & Low-Vision Pedestrians
        </p>
      </div>

      {/* Center Target */}
      <div className="flex flex-col items-center justify-center space-y-6 text-center my-auto">
        <div className="relative">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-[#FFFF00] bg-[#FFFF00]/10 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,0,0.25)] animate-pulse">
            <span className="text-6xl sm:text-7xl">👁️</span>
          </div>
          <div className="absolute inset-0 rounded-full border border-[#FFFF00]/30 animate-ping" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FFFF00]">
            {isInitializing ? 'Starting Engines...' : 'Tap Anywhere to Start'}
          </h2>
          <p className="text-gray-300 font-mono text-sm max-w-xs mx-auto">
            {initProgress || 'Unlocks camera, directional audio, and voice guidance'}
          </p>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="w-full max-w-md pb-6 text-center space-y-3">
        <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs text-zinc-400 flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>Requires rear camera and speaker / headphones</span>
        </div>
        <p className="text-xs text-zinc-500">
          Double-tap anywhere during navigation to repeat latest hazard alerts.
        </p>
      </div>
    </div>
  );
}

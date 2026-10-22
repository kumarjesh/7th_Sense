// ============================================================
// VisionGuard — Safety Briefing Component
// ============================================================
// Full-screen first-run modal with spoken narration.
// Displayed once until user acknowledges.

import { useEffect } from 'react';
import { SafetyManager } from '../engines/SafetyManager';

interface SafetyBriefingProps {
  onDismiss: () => void;
}

export function SafetyBriefing({ onDismiss }: SafetyBriefingProps) {
  useEffect(() => {
    // Speak the briefing after a short delay
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6">
      <div className="max-w-lg w-full flex flex-col items-center gap-8">
        {/* Shield Icon */}
        <div className="text-7xl">🛡️</div>

        <h1 className="text-[#FFFF00] text-3xl font-bold text-center">
          Safety Notice
        </h1>

        <div className="text-white text-lg leading-relaxed text-center space-y-4">
          <p>
            <span className="text-[#FF3B30] font-bold">VisionGuard is an awareness aid only.</span>
          </p>
          <p>
            It <span className="font-bold underline">does not replace</span> a white cane, guide dog, or safe travel training.
          </p>
          <p>
            It <span className="text-[#FF3B30]">cannot detect</span> stairs, curbs, potholes, glass, overhead obstacles, or all hazards.
          </p>
          <p className="text-[#FFFF00] font-semibold">
            Always use your primary mobility aid.
          </p>
        </div>

        <button
          onClick={handleAcknowledge}
          className="w-full py-6 bg-[#FFFF00] text-black text-2xl font-bold rounded-2xl 
                     active:bg-yellow-300 transition-colors
                     min-h-[80px]"
          aria-label="I understand, continue to VisionGuard"
        >
          I Understand — Continue
        </button>

        <p className="text-gray-400 text-sm text-center">
          This notice is shown once. You can review it in Settings.
        </p>
      </div>
    </div>
  );
}

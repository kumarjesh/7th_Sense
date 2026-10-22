// ============================================================
// VisionGuard — Settings Panel Component
// ============================================================
// High-contrast, accessibility-first settings modal.
// Full screen or modal dialog with spoken confirmation of every change.

import { useState, useEffect } from 'react';
import { SettingsStore } from '../engines/SettingsStore';
import { SpeechEngine } from '../engines/SpeechEngine';
import { CalibrationManager, DEVICE_PRESETS } from '../engines/CalibrationManager';
import type { AppSettings, HapticIntensity, VerbosityMode } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(() => SettingsStore.getAll());
  const [devicePreset, setDevicePreset] = useState<string>(() =>
    CalibrationManager.getCurrentPreset()
  );

  useEffect(() => {
    return SettingsStore.subscribe((newSettings) => {
      setSettings(newSettings);
    });
  }, []);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
    speechConfirmation?: string
  ) => {
    SettingsStore.set({ [key]: value });
    if (speechConfirmation) {
      SpeechEngine.speak(speechConfirmation, 'CRITICAL_INTERRUPT');
    }
  };

  const handleSpeechRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    updateSetting('speechRate', rate, `Speech rate ${rate.toFixed(1)}`);
  };

  const handleVerbosityMode = (mode: VerbosityMode) => {
    const names: Record<VerbosityMode, string> = {
      FULL: 'Full alert mode',
      VOICE_ONLY: 'Voice only mode',
      SONAR_ONLY: 'Sonar only mode',
      EMERGENCY_ONLY: 'Emergency only mode',
    };
    updateSetting('verbosityMode', mode, names[mode]);
  };

  const handleHapticIntensity = (intensity: HapticIntensity) => {
    updateSetting('hapticIntensity', intensity, `Haptic intensity ${intensity.toLowerCase()}`);
  };

  const handleConfidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const threshold = parseFloat(e.target.value);
    updateSetting(
      'confidenceThreshold',
      threshold,
      `Detection sensitivity ${Math.round(threshold * 100)} percent`
    );
  };

  const handleAmbientInterval = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sec = parseInt(e.target.value, 10);
    updateSetting(
      'ambientStatusInterval',
      sec,
      `Ambient status every ${sec} seconds`
    );
  };

  const handlePresetChange = (presetName: string) => {
    CalibrationManager.applyPreset(presetName);
    setDevicePreset(presetName);
    SpeechEngine.speak(`Camera preset set to ${presetName}`, 'CRITICAL_INTERRUPT');
  };

  const handleReset = () => {
    SettingsStore.reset();
    CalibrationManager.reset();
    setDevicePreset(CalibrationManager.getCurrentPreset());
    SpeechEngine.speak('Settings reset to default values', 'CRITICAL_INTERRUPT');
  };

  const handleClose = () => {
    SpeechEngine.speak('Settings closed', 'CRITICAL_INTERRUPT');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/95 text-white p-4 sm:p-6 backdrop-blur-md flex flex-col justify-between"
    >
      <div className="max-w-2xl w-full mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/20 pb-4 pt-2">
          <h2 id="settings-title" className="text-3xl font-extrabold text-[#FFFF00] flex items-center gap-2">
            <span>⚙️</span>
            <span>Settings</span>
          </h2>
          <button
            onClick={handleClose}
            className="px-5 py-3 bg-[#FFFF00] text-black font-bold text-lg rounded-xl active:bg-yellow-400 focus:ring-4 focus:ring-yellow-300 min-h-[48px]"
            aria-label="Close settings"
          >
            Done
          </button>
        </div>

        {/* Section 1: Alert Mode */}
        <section className="space-y-3">
          <h3 className="text-xl font-bold text-white tracking-wide">
            Feedback Mode
          </h3>
          <p className="text-sm text-gray-300">
            Control which alert modalities are active during navigation.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['FULL', '🔊 Full (Voice & Sonar)'],
                ['VOICE_ONLY', '🗣️ Voice Only'],
                ['SONAR_ONLY', '📡 Sonar Only'],
                ['EMERGENCY_ONLY', '🚨 Emergency Only'],
              ] as const
            ).map(([mode, label]) => {
              const active = settings.verbosityMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => handleVerbosityMode(mode)}
                  className={`p-4 rounded-xl text-left font-bold text-base transition-colors border-2 min-h-[56px] flex items-center justify-between ${
                    active
                      ? 'bg-[#FFFF00] text-black border-[#FFFF00]'
                      : 'bg-zinc-900 text-white border-zinc-700 hover:border-zinc-500'
                  }`}
                  aria-pressed={active}
                >
                  <span>{label}</span>
                  {active && <span className="text-lg">✓</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Speech Rate */}
        <section className="space-y-3 bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800">
          <div className="flex justify-between items-center">
            <label htmlFor="speech-rate-slider" className="text-lg font-bold">
              Speech Rate
            </label>
            <span className="text-[#FFFF00] font-mono text-lg font-bold">
              {settings.speechRate.toFixed(1)}x
            </span>
          </div>
          <input
            id="speech-rate-slider"
            type="range"
            min="0.8"
            max="1.4"
            step="0.1"
            value={settings.speechRate}
            onChange={handleSpeechRateChange}
            className="w-full h-4 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#FFFF00]"
            aria-valuemin={0.8}
            aria-valuemax={1.4}
            aria-valuenow={settings.speechRate}
            aria-valuetext={`${settings.speechRate.toFixed(1)} times speed`}
          />
          <div className="flex justify-between text-xs text-zinc-400 font-mono">
            <span>0.8x (Slower)</span>
            <span>1.1x (Standard)</span>
            <span>1.4x (Fast)</span>
          </div>
        </section>

        {/* Section 3: Haptic Feedback */}
        <section className="space-y-3">
          <h3 className="text-xl font-bold">Vibration Haptics</h3>
          <p className="text-sm text-gray-300">
            Directional pulse strength for obstacle warnings.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(['OFF', 'LOW', 'NORMAL', 'HIGH'] as HapticIntensity[]).map((level) => {
              const active = settings.hapticIntensity === level;
              return (
                <button
                  key={level}
                  onClick={() => handleHapticIntensity(level)}
                  className={`py-3 px-2 rounded-xl text-center font-bold text-sm border-2 min-h-[50px] ${
                    active
                      ? 'bg-[#FFFF00] text-black border-[#FFFF00]'
                      : 'bg-zinc-900 text-white border-zinc-700'
                  }`}
                  aria-pressed={active}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 4: Detection & Camera Calibration */}
        <section className="space-y-4 bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800">
          <h3 className="text-xl font-bold text-[#FFFF00]">Camera & Detection</h3>

          {/* Device FOV Preset */}
          <div className="space-y-2">
            <label htmlFor="device-preset-select" className="block text-sm font-semibold">
              Camera Lens Preset
            </label>
            <select
              id="device-preset-select"
              value={devicePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 text-base font-semibold focus:outline-none focus:border-[#FFFF00] min-h-[48px]"
            >
              {DEVICE_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Confidence Slider */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label htmlFor="confidence-slider" className="text-sm font-semibold">
                Detection Confidence Threshold
              </label>
              <span className="font-mono text-[#FFFF00]">
                {Math.round(settings.confidenceThreshold * 100)}%
              </span>
            </div>
            <input
              id="confidence-slider"
              type="range"
              min="0.30"
              max="0.80"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={handleConfidenceChange}
              className="w-full h-3 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#FFFF00]"
            />
          </div>

          {/* Ambient Status Interval */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label htmlFor="ambient-slider" className="text-sm font-semibold">
                Clear Path Announcement Interval
              </label>
              <span className="font-mono text-[#FFFF00]">
                {settings.ambientStatusInterval}s
              </span>
            </div>
            <input
              id="ambient-slider"
              type="range"
              min="10"
              max="60"
              step="5"
              value={settings.ambientStatusInterval}
              onChange={handleAmbientInterval}
              className="w-full h-3 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#FFFF00]"
            />
          </div>

          {/* Debug Visuals Toggle */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-bold block">Developer Visual Overlay</span>
              <span className="text-xs text-zinc-400">
                Shows bounding boxes, tracking IDs, and spatial zones on screen.
              </span>
            </div>
            <button
              onClick={() =>
                updateSetting(
                  'showDebugOverlay',
                  !settings.showDebugOverlay,
                  `Debug overlay ${!settings.showDebugOverlay ? 'enabled' : 'disabled'}`
                )
              }
              className={`px-4 py-2 rounded-xl font-bold border-2 min-h-[44px] ${
                settings.showDebugOverlay
                  ? 'bg-green-500 text-black border-green-500'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
              aria-pressed={settings.showDebugOverlay}
            >
              {settings.showDebugOverlay ? 'ON' : 'OFF'}
            </button>
          </div>
        </section>

        {/* Section 5: Reset & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={handleReset}
            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl border border-zinc-600 active:bg-zinc-600 min-h-[50px]"
          >
            Reset All Defaults
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-4 bg-[#FFFF00] text-black font-extrabold rounded-xl active:bg-yellow-400 min-h-[50px] text-lg"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VisionGuard — Settings Panel Component
// ============================================================
// Accessible settings modal with dual-theme (Dark & Light) styling,
// Google Gemini Multimodal AI configuration, assistive tools setup,
// and immediate spoken confirmation for every adjustment.

import { useState, useEffect } from 'react';
import { SettingsStore } from '../engines/SettingsStore';
import { SpeechEngine } from '../engines/SpeechEngine';
import { CalibrationManager, DEVICE_PRESETS } from '../engines/CalibrationManager';
import { GeminiVisionEngine } from '../engines/GeminiVisionEngine';
import { FIND_TARGET_OPTIONS } from '../types';
import type { AppSettings, AppTheme, FindTargetType, HapticIntensity, VerbosityMode } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(() => SettingsStore.getAll());
  const [devicePreset, setDevicePreset] = useState<string>(() =>
    CalibrationManager.getCurrentPreset()
  );
  const envApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || '';
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => settings.geminiApiKey || envApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    return SettingsStore.subscribe((newSettings) => {
      setSettings(newSettings);
      setApiKeyInput(newSettings.geminiApiKey || envApiKey);
    });
  }, [envApiKey]);

  if (!isOpen) return null;

  const isDark = settings.theme === 'dark';

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

  const handleThemeChange = (newTheme: AppTheme) => {
    updateSetting(
      'theme',
      newTheme,
      `Theme set to ${newTheme === 'dark' ? 'dark' : 'light'} mode`
    );
  };

  const handleSpeechRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    updateSetting('speechRate', rate, `Speech rate ${rate.toFixed(1)}`);
  };

  const handleVerbosityMode = (mode: VerbosityMode) => {
    const names: Record<VerbosityMode, string> = {
      FULL: 'Full audio mode',
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
      `Clear path interval every ${sec} seconds`
    );
  };

  const handlePresetChange = (presetName: string) => {
    CalibrationManager.applyPreset(presetName);
    setDevicePreset(presetName);
    SpeechEngine.speak(`Camera preset set to ${presetName}`, 'CRITICAL_INTERRUPT');
  };

  const handleApiKeySave = () => {
    updateSetting('geminiApiKey', apiKeyInput.trim(), 'Google API key saved');
  };

  const handleTestApiKey = async () => {
    setTestingApiKey(true);
    setApiTestResult(null);
    SpeechEngine.speak('Verifying Google API key...', 'MEDIUM');

    const res = await GeminiVisionEngine.testApiKey(apiKeyInput);
    setTestingApiKey(false);
    setApiTestResult(res);

    if (res.success) {
      updateSetting('geminiApiKey', apiKeyInput.trim());
      SpeechEngine.speak('Google Gemini API key verified and saved successfully!', 'HIGH');
    } else {
      SpeechEngine.speak(`API key test failed: ${res.message}`, 'HIGH');
    }
  };

  const handleFindTargetChange = (target: FindTargetType) => {
    updateSetting('findTarget', target, `Target object set to ${target}`);
  };

  const handleReset = () => {
    SettingsStore.reset();
    CalibrationManager.reset();
    setDevicePreset(CalibrationManager.getCurrentPreset());
    setApiKeyInput('');
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
      className={`fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 backdrop-blur-xl flex flex-col justify-between transition-colors duration-200 ${
        isDark
          ? 'bg-[#090A0F]/95 text-slate-100'
          : 'bg-slate-50/95 text-slate-900'
      }`}
    >
      <div className="max-w-2xl w-full mx-auto space-y-6 pb-20">
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b pb-4 pt-2 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h2
                id="settings-title"
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  isDark ? 'text-amber-400' : 'text-blue-600'
                }`}
              >
                Settings & Intelligence
              </h2>
              <p
                className={`text-xs ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Configure Google AI scene descriptions, assistive tools, and audio
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`px-4 py-2 font-bold rounded-xl shadow-sm transition-transform active:scale-95 ${
              isDark
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            aria-label="Close settings"
          >
            Done
          </button>
        </div>

        {/* Section 1: Google Gemini Multimodal AI Integration */}
        <section
          className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 transition-colors ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3
                className={`text-base sm:text-lg font-bold flex items-center gap-2 ${
                  isDark ? 'text-amber-400' : 'text-blue-600'
                }`}
              >
                <span>🧠</span>
                <span>Google Gemini AI (Scene Understanding)</span>
              </h3>
              <p
                className={`text-xs ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Enables two-finger scene descriptions, sign & text OCR, and door/stair finder.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Multimodal
            </span>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="gemini-key-input" className="block text-xs sm:text-sm font-semibold">
                Google Gemini API Key
              </label>
              {envApiKey && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <span>⚡</span>
                  <span>Active via .env</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="gemini-key-input"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={envApiKey ? '•••••••••••••••• (.env configured)' : 'AIzaSy...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onBlur={handleApiKeySave}
                  className={`w-full p-2.5 pr-10 rounded-xl border text-xs sm:text-sm font-mono focus:outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-400'
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={testingApiKey || !apiKeyInput.trim()}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
                  testingApiKey
                    ? 'opacity-50 cursor-wait'
                    : isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-amber-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-blue-700'
                }`}
              >
                {testingApiKey ? 'Testing...' : 'Test Key'}
              </button>
            </div>

            {/* Test result status badge */}
            {apiTestResult && (
              <p
                className={`text-xs font-medium ${
                  apiTestResult.success ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {apiTestResult.message}
              </p>
            )}

            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Don't have a key? Get a free key with no credit card required at{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="underline font-bold text-amber-500 hover:text-amber-400"
              >
                aistudio.google.com
              </a>
              .
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-1 pt-1">
            <label htmlFor="gemini-model-select" className="block text-xs sm:text-sm font-semibold">
              AI Vision Model
            </label>
            <select
              id="gemini-model-select"
              value={settings.geminiModel}
              onChange={(e) =>
                updateSetting('geminiModel', e.target.value, `AI model set to ${e.target.value}`)
              }
              className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm font-semibold focus:outline-none ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-400'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-600'
              }`}
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest & Recommended for Navigation)</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Ultra Lightweight)</option>
            </select>
          </div>
        </section>

        {/* Section 2: Assistive Tools & Target Finder */}
        <section
          className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 transition-colors ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3
            className={`text-base sm:text-lg font-bold flex items-center gap-2 ${
              isDark ? 'text-amber-400' : 'text-blue-600'
            }`}
          >
            <span>🎯</span>
            <span>Target Finder Mode</span>
          </h3>
          <p
            className={`text-xs ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Select which item VisionGuard will steer you toward using directional beacon pings.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FIND_TARGET_OPTIONS.map((tgt) => {
              const active = settings.findTarget === tgt;
              return (
                <button
                  key={tgt}
                  type="button"
                  onClick={() => handleFindTargetChange(tgt)}
                  className={`p-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border-2 transition-all ${
                    active
                      ? isDark
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-blue-600 text-white border-blue-600'
                      : isDark
                        ? 'bg-slate-950 text-slate-400 border-slate-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  aria-pressed={active}
                >
                  {tgt}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Appearance & Theme Switcher */}
        <section
          className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Color Theme
              </h3>
              <p
                className={`text-xs ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Switch between high-contrast dark and bright clean light themes.
              </p>
            </div>
            <span className="text-2xl">{isDark ? '🌙' : '☀️'}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`p-3.5 rounded-xl font-bold text-sm border-2 flex items-center justify-between transition-all ${
                isDark
                  ? 'bg-slate-800 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
              aria-pressed={isDark}
            >
              <div className="flex items-center gap-2">
                <span>🌙</span>
                <span>Dark Obsidian</span>
              </div>
              {isDark && <span>✓</span>}
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`p-3.5 rounded-xl font-bold text-sm border-2 flex items-center justify-between transition-all ${
                !isDark
                  ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
              aria-pressed={!isDark}
            >
              <div className="flex items-center gap-2">
                <span>☀️</span>
                <span>Light Porcelain</span>
              </div>
              {!isDark && <span>✓</span>}
            </button>
          </div>
        </section>

        {/* Section 4: Feedback Mode */}
        <section
          className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="text-base sm:text-lg font-bold mb-1">
            Feedback Mode
          </h3>
          <p
            className={`text-xs mb-3 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Adjust which senses are engaged during navigation.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
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
                  type="button"
                  onClick={() => handleVerbosityMode(mode)}
                  className={`p-3 rounded-xl text-left font-bold text-xs sm:text-sm transition-all border-2 flex items-center justify-between ${
                    active
                      ? isDark
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                        : 'bg-blue-600 text-white border-blue-600 font-extrabold shadow-sm'
                      : isDark
                        ? 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                  aria-pressed={active}
                >
                  <span>{label}</span>
                  {active && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 5: Voice Speed */}
        <section
          className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="speech-rate-slider" className="text-sm sm:text-base font-bold">
              Voice Announcement Speed
            </label>
            <span
              className={`font-mono text-sm font-bold ${
                isDark ? 'text-amber-400' : 'text-blue-600'
              }`}
            >
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
            className={`w-full h-3 rounded-lg appearance-none cursor-pointer ${
              isDark ? 'bg-slate-800' : 'bg-slate-200'
            }`}
            aria-valuemin={0.8}
            aria-valuemax={1.4}
            aria-valuenow={settings.speechRate}
            aria-valuetext={`${settings.speechRate.toFixed(1)} times speed`}
          />
          <div
            className={`flex justify-between text-[11px] font-mono mt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>0.8x (Slower)</span>
            <span>1.1x (Standard)</span>
            <span>1.4x (Fast)</span>
          </div>
        </section>

        {/* Section 6: Vibration Haptics */}
        <section
          className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="text-base sm:text-lg font-bold mb-1">
            Vibration Intensity
          </h3>
          <p
            className={`text-xs mb-3 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Directional pulse strength for left, center, and right obstacles.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(['OFF', 'LOW', 'NORMAL', 'HIGH'] as HapticIntensity[]).map((level) => {
              const active = settings.hapticIntensity === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleHapticIntensity(level)}
                  className={`py-2.5 px-1 rounded-xl text-center font-bold text-xs sm:text-sm border-2 transition-all ${
                    active
                      ? isDark
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-extrabold'
                        : 'bg-blue-600 text-white border-blue-600 font-extrabold'
                      : isDark
                        ? 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                  aria-pressed={active}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 7: Camera & Sensitivity */}
        <section
          className={`p-4 sm:p-5 rounded-2xl border space-y-4 transition-colors ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3
            className={`text-base sm:text-lg font-bold ${
              isDark ? 'text-amber-400' : 'text-blue-600'
            }`}
          >
            Camera Lens & Sensitivity
          </h3>

          {/* Camera Lens Preset */}
          <div className="space-y-1">
            <label htmlFor="device-preset-select" className="block text-xs sm:text-sm font-semibold">
              Lens Field-of-View Preset
            </label>
            <select
              id="device-preset-select"
              value={devicePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm font-semibold focus:outline-none ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-400'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-600'
              }`}
            >
              {DEVICE_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Detection Confidence Threshold */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-xs sm:text-sm font-semibold">
              <label htmlFor="confidence-slider">
                Detection Confidence Gate
              </label>
              <span className={`font-mono ${isDark ? 'text-amber-400' : 'text-blue-600'}`}>
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
              className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer ${
                isDark ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            />
          </div>

          {/* Clear Path Announcement Interval */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-xs sm:text-sm font-semibold">
              <label htmlFor="ambient-slider">
                Clear Path Announcement Interval
              </label>
              <span className={`font-mono ${isDark ? 'text-amber-400' : 'text-blue-600'}`}>
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
              className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer ${
                isDark ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            />
          </div>

          {/* Debug Visuals Toggle */}
          <div
            className={`pt-3 border-t flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div>
              <span className="font-bold text-xs sm:text-sm block">
                Visual Bounding Boxes & Zones
              </span>
              <span
                className={`text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Displays spatial tracking IDs and zone dividers on screen.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSetting(
                  'showDebugOverlay',
                  !settings.showDebugOverlay,
                  `Debug overlay ${!settings.showDebugOverlay ? 'enabled' : 'disabled'}`
                )
              }
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                settings.showDebugOverlay
                  ? isDark
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-emerald-600 text-white border-emerald-600'
                  : isDark
                    ? 'bg-slate-950 text-slate-400 border-slate-800'
                    : 'bg-slate-100 text-slate-500 border-slate-300'
              }`}
              aria-pressed={settings.showDebugOverlay}
            >
              {settings.showDebugOverlay ? 'ON' : 'OFF'}
            </button>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className={`flex-1 py-3 px-4 font-bold rounded-xl border text-xs sm:text-sm transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Reset All Defaults
          </button>
          <button
            type="button"
            onClick={handleClose}
            className={`flex-1 py-3 px-4 font-extrabold rounded-xl text-sm transition-all shadow-md ${
              isDark
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
}

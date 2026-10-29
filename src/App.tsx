// ============================================================
// VisionGuard — Main Application (App.tsx)
// Renamed to TriNetra — Real-Time Spatial AI Assistant
// ============================================================
// Orchestrates on-device AI vision, object tracking, 3D spatial sonar,
// directional haptics, Google Gemini Multimodal Scene Intelligence,
// text/sign OCR, light pitch detector, and target finding beacon.

import { useState, useEffect, useCallback } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { HUDOverlay } from './components/HUDOverlay';
import { GesturePad } from './components/GesturePad';
import { SafetyBriefing } from './components/SafetyBriefing';
import { SettingsPanel } from './components/SettingsPanel';
import { AudioUnlockModal } from './components/AudioUnlockModal';

import { useCamera } from './hooks/useCamera';
import { useWakeLock } from './hooks/useWakeLock';
import { useTorch } from './hooks/useTorch';
import type { GestureType } from './hooks/useGestures';

import { VisionPipeline } from './engines/VisionPipeline';
import { AlertPolicyEngine } from './engines/AlertPolicyEngine';
import { SpeechEngine } from './engines/SpeechEngine';
import { SpatialAudioEngine } from './engines/SpatialAudioEngine';
import { HapticsEngine } from './engines/HapticsEngine';
import { PerformanceMonitor } from './engines/PerformanceMonitor';
import { SafetyManager } from './engines/SafetyManager';
import { SettingsStore } from './engines/SettingsStore';
import { GeminiVisionEngine } from './engines/GeminiVisionEngine';
import { LightDetectorEngine } from './engines/LightDetectorEngine';
import { TargetFinderEngine } from './engines/TargetFinderEngine';
import { TextReaderEngine } from './engines/TextReaderEngine';

import type {
  ScanningState,
  HazardStatus,
  VerbosityMode,
  RawDetection,
  TrackedObject,
  PerformanceMetrics,
  AlertLogEntry,
  AppTheme,
  AssistiveToolMode,
  FindTargetType,
} from './types';

export function App() {
  // App lifecycle
  const [unlocked, setUnlocked] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState('');
  const [safetyBriefingSeen, setSafetyBriefingSeen] = useState(() =>
    !SafetyManager.needsBriefing()
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<AppTheme>(() =>
    SettingsStore.get('theme') || 'dark'
  );

  // Operational states
  const [scanningState, setScanningState] = useState<ScanningState>('IDLE');
  const [hazardStatus, setHazardStatus] = useState<HazardStatus>('CLEAR');
  const [verbosityMode, setVerbosityMode] = useState<VerbosityMode>(() =>
    SettingsStore.get('verbosityMode')
  );
  const [showDebug, setShowDebug] = useState(() =>
    SettingsStore.get('showDebugOverlay')
  );

  // Assistive Tool states
  const [activeAssistiveTool, setActiveAssistiveTool] = useState<AssistiveToolMode>('NONE');
  const [findTarget, setFindTarget] = useState<FindTargetType>(() =>
    SettingsStore.get('findTarget') || 'door'
  );
  const [lightLuminance, setLightLuminance] = useState<number>(0);
  const [isAnalyzingScene, setIsAnalyzingScene] = useState<boolean>(false);
  const [isReadingCurrency, setIsReadingCurrency] = useState<boolean>(false);

  // Detection & metrics for HUD / Debug canvas
  const [rawDetections, setRawDetections] = useState<RawDetection[]>([]);
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);
  const [alertLog, setAlertLog] = useState<AlertLogEntry[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics>(() =>
    PerformanceMonitor.getMetrics()
  );

  // Hardware hooks
  const {
    videoRef,
    stream,
    isActive: cameraActive,
    start: startCamera,
    stop: stopCamera,
    captureFrame,
  } = useCamera();
  const { acquire: acquireWakeLock, release: releaseWakeLock } = useWakeLock();
  const {
    isOn: torchOn,
    isAvailable: torchAvailable,
    isRestrictedByBrowser: torchRestricted,
    toggle: toggleTorch,
    checkAvailability: checkTorchAvailable,
  } = useTorch(stream);

  // Apply theme to document element and initialize background telemetry
  useEffect(() => {
    PerformanceMonitor.init();
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  // Sync settings updates
  useEffect(() => {
    return SettingsStore.subscribe((newSettings) => {
      setTheme(newSettings.theme);
      setVerbosityMode(newSettings.verbosityMode);
      setShowDebug(newSettings.showDebugOverlay);
      SpeechEngine.setRate(newSettings.speechRate);
      SpatialAudioEngine.setVolume(newSettings.sonarVolume);
      HapticsEngine.setIntensity(newSettings.hapticIntensity);

      if (newSettings.findTarget) {
        setFindTarget(newSettings.findTarget);
        TargetFinderEngine.setTarget(newSettings.findTarget);
      }
      if (newSettings.lightDetectorVolume !== undefined) {
        LightDetectorEngine.setVolume(newSettings.lightDetectorVolume);
      }
    });
  }, []);

  // Sync alert log updates
  useEffect(() => {
    SpeechEngine.onAlertLogChange((log) => {
      setAlertLog(log);
    });
  }, []);

  // Sync hazard status
  useEffect(() => {
    AlertPolicyEngine.onHazardStatus((status) => {
      setHazardStatus(status);
    });
  }, []);

  // Performance metrics periodic poll
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformance(PerformanceMonitor.getMetrics());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll light luminance if light detector active
  useEffect(() => {
    if (activeAssistiveTool !== 'LIGHT_DETECTOR') return;
    const interval = setInterval(() => {
      setLightLuminance(LightDetectorEngine.getLuminancePercent());
    }, 150);
    return () => clearInterval(interval);
  }, [activeAssistiveTool]);

  // Bind video element to VisionPipeline when camera becomes active
  useEffect(() => {
    if (cameraActive && videoRef.current) {
      VisionPipeline.setVideoSource(videoRef.current);

      // Connect detection callbacks
      VisionPipeline.onRawDetections((detections) => {
        setRawDetections(detections);
      });

      VisionPipeline.onTrackedObjects((objects) => {
        setTrackedObjects(objects);
        AlertPolicyEngine.evaluate(objects);

        // If target finder active, check for matches
        if (activeAssistiveTool === 'FIND_TARGET') {
          TargetFinderEngine.checkLocalMatches(objects);
        }
      });

      // Start pipeline if scanning is ACTIVE
      if (scanningState === 'ACTIVE') {
        VisionPipeline.start();
      }
    }
  }, [cameraActive, scanningState, videoRef, activeAssistiveTool]);

  // Handle visibility changes (pause when app is backgrounded to save battery)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (scanningState === 'ACTIVE') {
          VisionPipeline.stop();
          SpatialAudioEngine.stopAll();
          LightDetectorEngine.stop();
          TextReaderEngine.stop();
          TargetFinderEngine.stop();
          releaseWakeLock();
        }
      } else if (document.visibilityState === 'visible') {
        if (scanningState === 'ACTIVE') {
          VisionPipeline.start();
          acquireWakeLock();
          SpeechEngine.speak('Navigation resumed', 'HIGH');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [scanningState, acquireWakeLock, releaseWakeLock]);

  // Unlock and initialize all subsystems
  const handleUnlock = async () => {
    setIsInitializing(true);
    setInitProgress('Unlocking speech and spatial audio...');

    try {
      // 1. Initialize audio engines (Web Speech & Web Audio)
      SpeechEngine.init();
      SpatialAudioEngine.init();

      // 2. Start Camera
      setInitProgress('Activating camera feed...');
      await startCamera();

      // 3. Acquire Screen Wake Lock
      await acquireWakeLock();

      // 4. Load AI Model
      setInitProgress('Loading spatial vision model...');
      const modelReady = await VisionPipeline.loadModel((msg) => {
        setInitProgress(msg);
      });

      if (modelReady) {
        setUnlocked(true);
        setScanningState('ACTIVE');
        SpeechEngine.speak('TriNetra active. Scanning started.', 'HIGH');
      } else {
        setInitProgress('Model load failed. Tap to retry.');
        SpeechEngine.speak('Failed to load vision model. Please check internet connection and retry.', 'HIGH');
      }
    } catch (err) {
      console.error('[App] Init error:', err);
      setInitProgress('Initialization error. Tap to retry.');
      SpeechEngine.speak('Camera or audio initialization error. Please check permissions.', 'HIGH');
    } finally {
      setIsInitializing(false);
    }
  };

  // Toggle Scanning (Active <-> Paused)
  const toggleScanning = useCallback(() => {
    if (scanningState === 'ACTIVE') {
      VisionPipeline.stop();
      SpatialAudioEngine.stopAll();
      LightDetectorEngine.stop();
      TextReaderEngine.stop();
      TargetFinderEngine.stop();
      setActiveAssistiveTool('NONE');
      SpeechEngine.cancel();
      setScanningState('PAUSED');
      SpeechEngine.speak('Scanning paused', 'HIGH');
    } else {
      VisionPipeline.start();
      setScanningState('ACTIVE');
      SpeechEngine.speak('Scanning active', 'HIGH');
    }
  }, [scanningState]);

  // Repeat Latest Hazard
  const repeatHazardSummary = useCallback(() => {
    const summary = AlertPolicyEngine.getLastSummary();
    SpeechEngine.speak(summary, 'HIGH');
  }, []);

  // Announce Status (Mode, Battery, FPS)
  const announceStatus = useCallback(async () => {
    let batteryText = '';
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const b = await (navigator as any).getBattery();
        if (typeof b?.level === 'number') {
          batteryText = `Battery ${Math.round(b.level * 100)} percent. `;
        }
      }
    } catch {
      // Ignore
    }

    const metrics = PerformanceMonitor.getMetrics();
    if (!batteryText && metrics.batteryPct !== null) {
      batteryText = `Battery ${Math.round(metrics.batteryPct)} percent. `;
    }

    const fps = metrics.effectiveFps > 0 ? metrics.effectiveFps : 4;
    const fpsText = `Running at ${fps} frames per second. `;
    const modeText = `Mode is ${verbosityMode.replace(/_/g, ' ').toLowerCase()}. `;
    const toolText =
      activeAssistiveTool !== 'NONE'
        ? `Active tool: ${activeAssistiveTool.replace(/_/g, ' ').toLowerCase()}. `
        : '';
    const batteryAnnouncement = batteryText || 'Battery percentage unavailable on this browser. ';
    const statusText = `${modeText}${toolText}${batteryAnnouncement}${fpsText}Hazard status is ${hazardStatus.toLowerCase()}.`;

    SpeechEngine.speak(statusText, 'HIGH');
  }, [verbosityMode, activeAssistiveTool, hazardStatus]);

  // Cycle Verbosity Mode
  const cycleVerbosityMode = useCallback(() => {
    const modes: VerbosityMode[] = [
      'FULL',
      'VOICE_ONLY',
      'SONAR_ONLY',
      'EMERGENCY_ONLY',
    ];
    const currentIndex = modes.indexOf(verbosityMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];

    SettingsStore.set({ verbosityMode: nextMode });
    const labels: Record<VerbosityMode, string> = {
      FULL: 'Full audio mode',
      VOICE_ONLY: 'Voice only mode',
      SONAR_ONLY: 'Sonar only mode',
      EMERGENCY_ONLY: 'Emergency only mode',
    };
    SpeechEngine.speak(labels[nextMode], 'HIGH');
  }, [verbosityMode]);

  // Emergency Pause (Kill everything)
  const emergencyPause = useCallback(() => {
    VisionPipeline.stop();
    SpatialAudioEngine.stopAll();
    LightDetectorEngine.stop();
    TextReaderEngine.stop();
    TargetFinderEngine.stop();
    setActiveAssistiveTool('NONE');
    SpeechEngine.cancel();
    setScanningState('PAUSED');
    SpeechEngine.speak('TriNetra emergency pause. Tap screen to resume.', 'CRITICAL_INTERRUPT');
  }, []);

  // Flashlight toggle with spoken confirmation & browser restriction detection
  const handleTorchToggle = useCallback(async () => {
    const isReady = checkTorchAvailable();
    if (!isReady) {
      if (torchRestricted) {
        SpeechEngine.speak('Flashlight is restricted by your browser. iOS Safari blocks web flashlight access.', 'HIGH');
      } else {
        SpeechEngine.speak('Flashlight not available on this camera or browser.', 'HIGH');
      }
      return;
    }
    const nextState = await toggleTorch();
    SpeechEngine.speak(
      nextState ? 'Flashlight on' : 'Flashlight off',
      'HIGH'
    );
  }, [checkTorchAvailable, torchRestricted, toggleTorch]);

  // 1. Describe Scene (Google Gemini Multimodal AI)
  const handleDescribeScene = useCallback(async () => {
    if (isAnalyzingScene) return;
    const frame = captureFrame(1600, 0.95);
    if (!frame) {
      SpeechEngine.speak('Camera not ready for scene description.', 'HIGH');
      return;
    }

    setIsAnalyzingScene(true);
    SpeechEngine.speak('Analyzing scene with Google AI...', 'HIGH');

    const objectsSummary =
      trackedObjects.length > 0
        ? trackedObjects.map((o) => `${o.class} ${o.proximityBand.toLowerCase()}`).join(', ')
        : 'path appears clear of large obstacles';

    try {
      const description = await GeminiVisionEngine.describeScene(frame, objectsSummary);
      SpeechEngine.speak(description, 'CRITICAL_INTERRUPT');
    } catch {
      SpeechEngine.speak('Scene description failed. Please check internet connection.', 'HIGH');
    } finally {
      setIsAnalyzingScene(false);
    }
  }, [captureFrame, isAnalyzingScene, trackedObjects]);

  // 2. Toggle Text Reader (OCR)
  const handleToggleTextReader = useCallback(() => {
    if (activeAssistiveTool === 'TEXT_READER') {
      TextReaderEngine.stop();
      setActiveAssistiveTool('NONE');
    } else {
      LightDetectorEngine.stop();
      TargetFinderEngine.stop();
      TextReaderEngine.start(() => captureFrame(1600, 0.95));
      setActiveAssistiveTool('TEXT_READER');
    }
  }, [activeAssistiveTool, captureFrame]);

  // 3. Toggle Light Detector Tone
  const handleToggleLightDetector = useCallback(() => {
    if (activeAssistiveTool === 'LIGHT_DETECTOR') {
      LightDetectorEngine.stop();
      setActiveAssistiveTool('NONE');
      SpeechEngine.speak('Light tone off', 'MEDIUM');
    } else {
      if (!videoRef.current) return;
      TextReaderEngine.stop();
      TargetFinderEngine.stop();
      LightDetectorEngine.start(videoRef.current);
      setActiveAssistiveTool('LIGHT_DETECTOR');
      SpeechEngine.speak('Light tone active. Pitch rises near light sources.', 'HIGH');
    }
  }, [activeAssistiveTool, videoRef]);

  // 4. Cycle / Toggle Target Finder Mode
  const handleCycleFindTarget = useCallback(
    (forward = true) => {
      TextReaderEngine.stop();
      LightDetectorEngine.stop();

      const newTarget = forward
        ? TargetFinderEngine.cycleNextTarget()
        : TargetFinderEngine.cyclePrevTarget();

      setFindTarget(newTarget);
      SettingsStore.set({ findTarget: newTarget });
      TargetFinderEngine.start();
      setActiveAssistiveTool('FIND_TARGET');

      SpeechEngine.speak(`Target set to ${newTarget}. Point camera to locate.`, 'HIGH');
    },
    []
  );

  // 5. Read Currency
  const handleTriggerCurrency = useCallback(async () => {
    if (isReadingCurrency) return;
    const frame = captureFrame(1600, 0.95);
    if (!frame) {
      SpeechEngine.speak('Camera not ready for currency reading.', 'HIGH');
      return;
    }

    setIsReadingCurrency(true);
    SpeechEngine.speak('Reading currency...', 'HIGH');
    try {
      const result = await GeminiVisionEngine.readCurrency(frame);
      SpeechEngine.speak(result, 'CRITICAL_INTERRUPT');
    } catch (err: unknown) {
      console.error('Currency reader error:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('NO_API_KEY')) {
        SpeechEngine.speak('Google API key not configured. Add it in Settings or env file.', 'HIGH');
      } else {
        SpeechEngine.speak('Currency reading failed. Please check internet connection.', 'HIGH');
      }
    } finally {
      setIsReadingCurrency(false);
    }
  }, [captureFrame, isReadingCurrency]);

  // Toggle light/dark theme
  const toggleTheme = useCallback(() => {
    const nextTheme: AppTheme = theme === 'dark' ? 'light' : 'dark';
    SettingsStore.set({ theme: nextTheme });
    SpeechEngine.speak(`Switched to ${nextTheme} mode`, 'HIGH');
  }, [theme]);

  // Handle blind-first touch gestures
  const handleGesture = useCallback(
    (gesture: GestureType) => {
      switch (gesture) {
        case 'tap':
          toggleScanning();
          break;
        case 'double-tap':
          repeatHazardSummary();
          break;
        case 'swipe-up':
          handleTorchToggle();
          break;
        case 'swipe-down':
          announceStatus();
          break;
        case 'swipe-right':
          cycleVerbosityMode();
          break;
        case 'swipe-left':
          toggleTheme();
          break;
        case 'long-press':
          cycleVerbosityMode();
          break;
        case 'two-finger-tap':
          handleDescribeScene();
          break;
        case 'two-finger-double-tap':
          handleTriggerCurrency();
          break;
        case 'two-finger-swipe-up':
          handleToggleTextReader();
          break;
        case 'two-finger-swipe-down':
          handleToggleLightDetector();
          break;
        case 'two-finger-swipe-right':
          handleCycleFindTarget(true);
          break;
        case 'two-finger-swipe-left':
          handleCycleFindTarget(false);
          break;
        case 'two-finger-long-press':
          setSettingsOpen((prev) => {
            const next = !prev;
            SpeechEngine.speak(
              next ? 'Settings opened' : 'Settings closed',
              'CRITICAL_INTERRUPT'
            );
            return next;
          });
          break;
        case 'three-finger-tap':
          emergencyPause();
          break;
        default:
          break;
      }
    },
    [
      toggleScanning,
      repeatHazardSummary,
      handleTorchToggle,
      announceStatus,
      cycleVerbosityMode,
      toggleTheme,
      handleDescribeScene,
      handleToggleTextReader,
      handleToggleLightDetector,
      handleCycleFindTarget,
      handleTriggerCurrency,
      emergencyPause,
    ]
  );

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#090A0F]' : 'bg-slate-50'
      }`}
    >
      {/* 1. Camera Feed & Debug Visuals */}
      <CameraFeed
        videoRef={videoRef}
        showDebug={showDebug}
        rawDetections={rawDetections}
        trackedObjects={trackedObjects}
      />

      {/* 2. HUD Overlay (Non-interactive visual stats with quick controls) */}
      <HUDOverlay
        theme={theme}
        scanningState={scanningState}
        hazardStatus={hazardStatus}
        verbosityMode={verbosityMode}
        performance={performance}
        alertLog={alertLog}
        showDebug={showDebug}
        torchActive={torchOn}
        activeAssistiveTool={activeAssistiveTool}
        findTarget={findTarget}
        lightLuminancePercent={lightLuminance}
        isAnalyzingScene={isAnalyzingScene}
        isReadingCurrency={isReadingCurrency}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onTriggerDescribe={handleDescribeScene}
        onToggleTextReader={handleToggleTextReader}
        onToggleLightDetector={handleToggleLightDetector}
        onCycleFindTarget={() => handleCycleFindTarget(true)}
        onTriggerCurrency={handleTriggerCurrency}
      />

      {/* 3. Full-Screen Gesture Interaction Surface */}
      {unlocked && (
        <GesturePad
          theme={theme}
          onGesture={handleGesture}
          disabled={settingsOpen || !safetyBriefingSeen}
        />
      )}

      {/* 4. Safety Notice Briefing (First Run Modal) */}
      {unlocked && !safetyBriefingSeen && (
        <SafetyBriefing
          theme={theme}
          onDismiss={() => {
            setSafetyBriefingSeen(true);
            SpeechEngine.speak('Safety acknowledged. TriNetra active.', 'HIGH');
          }}
        />
      )}

      {/* 5. Accessible Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* 6. Initial User Gesture / Audio Unlock Overlay */}
      {!unlocked && (
        <AudioUnlockModal
          theme={theme}
          onToggleTheme={toggleTheme}
          onUnlock={handleUnlock}
          isInitializing={isInitializing}
          initProgress={initProgress}
        />
      )}
    </main>
  );
}

export default App;

// ============================================================
// VisionGuard — Main Application (App.tsx)
// ============================================================
// Orchestrates all AI, vision, tracking, spatial audio, haptics,
// and accessibility gestures for the VisionGuard PWA.

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { TrackingManager } from './engines/TrackingManager';
import { AlertPolicyEngine } from './engines/AlertPolicyEngine';
import { SpeechEngine } from './engines/SpeechEngine';
import { SpatialAudioEngine } from './engines/SpatialAudioEngine';
import { HapticsEngine } from './engines/HapticsEngine';
import { PerformanceMonitor } from './engines/PerformanceMonitor';
import { SafetyManager } from './engines/SafetyManager';
import { SettingsStore } from './engines/SettingsStore';

import type {
  ScanningState,
  HazardStatus,
  VerbosityMode,
  RawDetection,
  TrackedObject,
  PerformanceMetrics,
  AlertLogEntry,
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

  // Operational states
  const [scanningState, setScanningState] = useState<ScanningState>('IDLE');
  const [hazardStatus, setHazardStatus] = useState<HazardStatus>('CLEAR');
  const [verbosityMode, setVerbosityMode] = useState<VerbosityMode>(() =>
    SettingsStore.get('verbosityMode')
  );
  const [showDebug, setShowDebug] = useState(() =>
    SettingsStore.get('showDebugOverlay')
  );

  // Detection & metrics for HUD / Debug canvas
  const [rawDetections, setRawDetections] = useState<RawDetection[]>([]);
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);
  const [alertLog, setAlertLog] = useState<AlertLogEntry[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics>(() =>
    PerformanceMonitor.getMetrics()
  );

  // Hardware hooks
  const { videoRef, stream, isActive: cameraActive, start: startCamera, stop: stopCamera } =
    useCamera();
  const { acquire: acquireWakeLock, release: releaseWakeLock } = useWakeLock();
  const { isOn: torchOn, isAvailable: torchAvailable, toggle: toggleTorch } =
    useTorch(stream);

  // Sync settings updates
  useEffect(() => {
    return SettingsStore.subscribe((newSettings) => {
      setVerbosityMode(newSettings.verbosityMode);
      setShowDebug(newSettings.showDebugOverlay);
      SpeechEngine.setRate(newSettings.speechRate);
      SpatialAudioEngine.setVolume(newSettings.sonarVolume);
      HapticsEngine.setIntensity(newSettings.hapticIntensity);
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
      });

      // Start pipeline if scanning is ACTIVE
      if (scanningState === 'ACTIVE') {
        VisionPipeline.start();
      }
    }
  }, [cameraActive, scanningState, videoRef]);

  // Handle visibility changes (pause when app is backgrounded to save battery)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (scanningState === 'ACTIVE') {
          VisionPipeline.stop();
          SpatialAudioEngine.stopAll();
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
        SpeechEngine.speak('VisionGuard active. Scanning started.', 'HIGH');
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
  const announceStatus = useCallback(() => {
    const metrics = PerformanceMonitor.getMetrics();
    const batteryText =
      metrics.batteryPct !== null
        ? `Battery ${Math.round(metrics.batteryPct)} percent.`
        : '';
    const fpsText = `Running at ${metrics.effectiveFps} frames per second.`;
    const modeText = `Mode is ${verbosityMode.replace(/_/g, ' ').toLowerCase()}.`;
    const statusText = `${modeText} ${batteryText} ${fpsText} Hazard status is ${hazardStatus.toLowerCase()}.`;

    SpeechEngine.speak(statusText, 'HIGH');
  }, [verbosityMode, hazardStatus]);

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
    SpeechEngine.cancel();
    setScanningState('PAUSED');
    SpeechEngine.speak('VisionGuard emergency pause. Tap screen to resume.', 'CRITICAL_INTERRUPT');
  }, []);

  // Flashlight toggle with spoken confirmation
  const handleTorchToggle = useCallback(async () => {
    if (!torchAvailable) {
      SpeechEngine.speak('Flashlight not available on this camera', 'MEDIUM');
      return;
    }
    await toggleTorch();
    SpeechEngine.speak(
      !torchOn ? 'Flashlight on' : 'Flashlight off',
      'HIGH'
    );
  }, [torchAvailable, toggleTorch, torchOn]);

  // Handle high-level gestures from GesturePad
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
        case 'long-press':
          cycleVerbosityMode();
          break;
        case 'two-finger-double-tap':
          announceStatus();
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
      emergencyPause,
    ]
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 1. Camera Feed & Debug Visuals */}
      <CameraFeed
        videoRef={videoRef}
        showDebug={showDebug}
        rawDetections={rawDetections}
        trackedObjects={trackedObjects}
      />

      {/* 2. HUD Overlay (Non-interactive visual stats) */}
      <HUDOverlay
        scanningState={scanningState}
        hazardStatus={hazardStatus}
        verbosityMode={verbosityMode}
        performance={performance}
        alertLog={alertLog}
        showDebug={showDebug}
        torchActive={torchOn}
      />

      {/* 3. Full-Screen Gesture Interaction Surface */}
      {unlocked && (
        <GesturePad
          onGesture={handleGesture}
          disabled={settingsOpen || !safetyBriefingSeen}
        />
      )}

      {/* 4. Safety Notice Briefing (First Run Modal) */}
      {unlocked && !safetyBriefingSeen && (
        <SafetyBriefing
          onDismiss={() => {
            setSafetyBriefingSeen(true);
            SpeechEngine.speak('Safety acknowledged. VisionGuard active.', 'HIGH');
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
          onUnlock={handleUnlock}
          isInitializing={isInitializing}
          initProgress={initProgress}
        />
      )}
    </main>
  );
}

export default App;

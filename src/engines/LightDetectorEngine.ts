// ============================================================
// VisionGuard — Light & Tone Detector Engine (Web Audio API)
// ============================================================
// Continuously maps camera frame luminance into an audible frequency pitch.
// Allows blind users to find windows, check if room lights are on/off,
// or locate illuminated doorways without visual sight.

class LightDetectorEngineImpl {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private currentLuminance = 0; // 0 to 255
  private volume = 0.4;

  /** Initialize or start audio light detection tone */
  start(video: HTMLVideoElement): boolean {
    if (this.isRunning) return true;

    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume * 0.15; // gentle soft hum

      this.osc = this.ctx.createOscillator();
      this.osc.type = 'sine';
      this.osc.frequency.value = 300; // baseline

      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start();

      // Sample canvas (low resolution for fast performance)
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 48;
        this.canvas.height = 36;
        this.ctx2d = this.canvas.getContext('2d', { willReadFrequently: true });
      }

      this.isRunning = true;

      // Sample luminance at 12 FPS
      this.intervalId = setInterval(() => {
        this.sampleLuminance(video);
      }, 80);

      return true;
    } catch (e) {
      console.warn('[LightDetector] Failed to start audio oscillator:', e);
      return false;
    }
  }

  private sampleLuminance(video: HTMLVideoElement): void {
    if (!this.isRunning || !this.ctx2d || !this.canvas || !this.osc) return;
    if (video.readyState < 2) return;

    try {
      this.ctx2d.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      const imgData = this.ctx2d.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imgData.data;

      let totalLum = 0;
      const count = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        // Standard perceived luminance
        totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      const avg = totalLum / count;
      this.currentLuminance = avg;

      // Map luminance (0 to 255) to pitch (180 Hz to 1100 Hz)
      const minFreq = 180;
      const maxFreq = 1100;
      const targetFreq = minFreq + (avg / 255) * (maxFreq - minFreq);

      // Smooth ramp to prevent clicking
      if (this.ctx && this.osc.frequency) {
        this.osc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
      }
    } catch {
      // Non-fatal frame capture error
    }
  }

  /** Stop the light tone */
  stop(): void {
    if (!this.isRunning) return;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch {
        // ignore
      }
      this.osc = null;
    }

    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch {
        // ignore
      }
      this.gain = null;
    }

    this.isRunning = false;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  /** Set tone volume (0.0 to 1.0) */
  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(this.volume * 0.15, this.ctx.currentTime, 0.05);
    }
  }

  /** Get luminance percentage (0% to 100%) */
  getLuminancePercent(): number {
    return Math.round((this.currentLuminance / 255) * 100);
  }
}

export const LightDetectorEngine = new LightDetectorEngineImpl();

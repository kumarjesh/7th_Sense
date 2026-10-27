// ============================================================
// VisionGuard — Text & Sign Reader Engine
// ============================================================
// Automatic & on-demand reading of street signs, room numbers,
// documents, and notices for visually impaired users.

import { GeminiVisionEngine } from './GeminiVisionEngine';
import { SpeechEngine } from './SpeechEngine';

class TextReaderEngineImpl {
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastReadText = '';
  private lastReadTime = 0;
  private isProcessing = false;

  /** Start automatic periodic text detection */
  start(captureFrame: () => string | null): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastReadText = '';

    SpeechEngine.speak('Text reading mode active. Point camera at signs or text.', 'HIGH');

    // Attempt read every 3.5 seconds
    this.intervalId = setInterval(async () => {
      if (!this.isRunning || this.isProcessing) return;
      const frame = captureFrame();
      if (!frame) return;

      this.isProcessing = true;
      try {
        const text = await GeminiVisionEngine.readText(frame);
        if (
          text &&
          !text.includes('No text detected') &&
          text !== this.lastReadText &&
          Date.now() - this.lastReadTime > 4000
        ) {
          this.lastReadText = text;
          this.lastReadTime = Date.now();
          SpeechEngine.speak(text, 'HIGH');
        }
      } catch {
        // Ignored in automatic mode
      } finally {
        this.isProcessing = false;
      }
    }, 3500);
  }

  /** Stop text reading mode */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    SpeechEngine.speak('Text reading mode off.', 'MEDIUM');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  /** Single on-demand text read */
  async readNow(captureFrame: () => string | null): Promise<string> {
    const frame = captureFrame();
    if (!frame) {
      SpeechEngine.speak('Camera not ready for text reading.', 'HIGH');
      return '';
    }

    SpeechEngine.speak('Reading text...', 'HIGH');
    try {
      const text = await GeminiVisionEngine.readText(frame);
      SpeechEngine.speak(text, 'HIGH');
      return text;
    } catch {
      SpeechEngine.speak('Failed to read text. Please check connection and try again.', 'HIGH');
      return '';
    }
  }
}

export const TextReaderEngine = new TextReaderEngineImpl();

// ============================================================
// VisionGuard — Speech Engine (Web Speech API wrapper)
// ============================================================
// Handles all spoken announcements with priority interruption,
// anti-overlap, and queue management.

import { MAX_SPEECH_QUEUE } from '../constants/audioPresets';
import type { AlertLogEntry, AlertPriority } from '../types';

interface QueuedUtterance {
  text: string;
  priority: AlertPriority;
  timestamp: number;
}

class SpeechEngineImpl {
  private synth: SpeechSynthesis | null = null;
  private queue: QueuedUtterance[] = [];
  private speaking = false;
  private speechRate = 1.1;
  private alertLog: AlertLogEntry[] = [];
  private maxLogSize = 5;
  private onLogUpdate: ((log: AlertLogEntry[]) => void) | null = null;

  /** Initialize the engine (call after user gesture for iOS) */
  init(): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[SpeechEngine] Web Speech API not available');
      return false;
    }
    this.synth = window.speechSynthesis;
    // iOS unlock: speak an empty utterance
    const unlock = new SpeechSynthesisUtterance('');
    unlock.volume = 0;
    this.synth.speak(unlock);
    return true;
  }

  /** Set speech rate (0.8–1.4) */
  setRate(rate: number): void {
    this.speechRate = Math.max(0.8, Math.min(1.4, rate));
  }

  /** Register a callback for alert log updates */
  onAlertLogChange(cb: (log: AlertLogEntry[]) => void): void {
    this.onLogUpdate = cb;
  }

  /** Get current alert log */
  getAlertLog(): AlertLogEntry[] {
    return [...this.alertLog];
  }

  /** Check if currently speaking */
  isSpeaking(): boolean {
    return this.speaking;
  }

  /**
   * Speak a message. If priority is CRITICAL_INTERRUPT, cancel current
   * speech and speak immediately. Otherwise, queue it.
   */
  speak(
    text: string,
    priority: AlertPriority = 'MEDIUM',
    proximityBand: 'CRITICAL' | 'WARNING' | 'BACKGROUND' = 'BACKGROUND'
  ): void {
    if (!this.synth) return;

    if (priority === 'CRITICAL_INTERRUPT') {
      // Cancel everything and speak NOW
      this.synth.cancel();
      this.queue = [];
      this.speaking = false;
      this.doSpeak(text, proximityBand);
      return;
    }

    if (this.speaking) {
      // Queue it (drop low-priority if full)
      if (this.queue.length >= MAX_SPEECH_QUEUE) {
        // Drop the lowest-priority item
        const lowestIdx = this.queue.reduce(
          (minIdx, item, idx, arr) =>
            this.priorityValue(item.priority) <
            this.priorityValue(arr[minIdx].priority)
              ? idx
              : minIdx,
          0
        );
        if (
          this.priorityValue(priority) >
          this.priorityValue(this.queue[lowestIdx].priority)
        ) {
          this.queue.splice(lowestIdx, 1);
        } else {
          return; // New item is lower priority than everything in queue
        }
      }
      this.queue.push({ text, priority, timestamp: Date.now() });
      // Sort queue by priority (highest first)
      this.queue.sort(
        (a, b) =>
          this.priorityValue(b.priority) - this.priorityValue(a.priority)
      );
    } else {
      this.doSpeak(text, proximityBand);
    }
  }

  /** Cancel all speech and clear queue */
  cancel(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.queue = [];
    this.speaking = false;
  }

  /** Internal: actually speak the text */
  private doSpeak(
    text: string,
    proximityBand: 'CRITICAL' | 'WARNING' | 'BACKGROUND'
  ): void {
    if (!this.synth) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.speaking = true;

    utterance.onend = () => {
      this.speaking = false;
      this.dequeue();
    };

    utterance.onerror = () => {
      this.speaking = false;
      this.dequeue();
    };

    this.synth.speak(utterance);

    // Add to alert log
    this.addToLog({ message: text, proximityBand, timestamp: Date.now() });
  }

  /** Process the next item in the queue */
  private dequeue(): void {
    if (this.queue.length === 0) return;
    const next = this.queue.shift()!;
    this.doSpeak(next.text, 'WARNING'); // Default band for queued items
  }

  /** Add entry to the rolling alert log */
  private addToLog(entry: AlertLogEntry): void {
    this.alertLog.push(entry);
    if (this.alertLog.length > this.maxLogSize) {
      this.alertLog.shift();
    }
    this.onLogUpdate?.(this.getAlertLog());
  }

  /** Convert priority enum to numeric value for comparison */
  private priorityValue(p: AlertPriority): number {
    switch (p) {
      case 'CRITICAL_INTERRUPT':
        return 4;
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 1;
    }
  }

  /** Cleanup */
  destroy(): void {
    this.cancel();
    this.synth = null;
  }
}

/** Singleton speech engine */
export const SpeechEngine = new SpeechEngineImpl();

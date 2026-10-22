// ============================================================
// VisionGuard — Settings Store (localStorage persistence)
// ============================================================

import { DEFAULT_SETTINGS } from '../types';
import type { AppSettings } from '../types';

const STORAGE_KEY = 'visionguard_settings';

type Listener = (settings: AppSettings) => void;

class SettingsStoreImpl {
  private settings: AppSettings;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.settings = this.load();
  }

  /** Load settings from localStorage, merging with defaults */
  private load(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults to pick up any new keys added in updates
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Corrupted storage — reset to defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  /** Persist current settings to localStorage */
  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // localStorage might be full or unavailable — non-fatal
    }
  }

  /** Get a snapshot of all current settings */
  getAll(): AppSettings {
    return { ...this.settings };
  }

  /** Get a single setting value */
  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  /** Update one or more settings and notify listeners */
  set(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.save();
    this.notify();
  }

  /** Reset all settings to defaults */
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    this.notify();
  }

  /** Subscribe to settings changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getAll();
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch {
        // Don't let a bad listener crash the store
      }
    });
  }
}

/** Singleton settings store */
export const SettingsStore = new SettingsStoreImpl();

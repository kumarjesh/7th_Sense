// ============================================================
// VisionGuard — Google Gemini Multimodal Vision Engine
// ============================================================
// Connects to Google Gemini API (Gemini 2.0 Flash / 1.5 Flash)
// for on-demand deep scene understanding, OCR text reading,
// specific target finding (doors, elevators, stairs), and currency reading.

import { SettingsStore } from './SettingsStore';

export interface TargetFindResult {
  found: boolean;
  direction: 'left' | 'center' | 'right' | 'not_found';
  distance?: string;
  details: string;
}

class GeminiVisionEngineImpl {
  private isAnalyzing = false;

  /** Get active API Key from SettingsStore or environment variables */
  private getApiKey(): string {
    const fromStore = SettingsStore.get('geminiApiKey')?.trim();
    if (fromStore) return fromStore;
    const fromEnv = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
    return fromEnv || '';
  }

  /** Get active model from SettingsStore or environment variables (defaults to gemini-2.5-flash) */
  private getModel(): string {
    let model: string | undefined = SettingsStore.get('geminiModel')?.trim();
    if (!model) {
      model = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim();
    }
    // Auto-migrate legacy 2.0-flash to production 2.5-flash
    if (!model || model === 'gemini-2.0-flash') {
      return 'gemini-2.5-flash';
    }
    return model;
  }

  /** Check if currently running a cloud analysis */
  isBusy(): boolean {
    return this.isAnalyzing;
  }

  /**
   * Helper to strip data:image/... prefix for API submission
   */
  private cleanBase64(dataUrl: string): { mimeType: string; data: string } {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
    return { mimeType: 'image/jpeg', data: dataUrl };
  }

  /**
   * Generic caller to Gemini generateContent endpoint
   */
  private async callGemini(
    prompt: string,
    imageBase64: string,
    systemInstruction?: string
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }

    const model = this.getModel();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const { mimeType, data } = this.cleanBase64(imageBase64);

    const payload: {
      contents: Array<{
        parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
      }>;
      systemInstruction?: { parts: Array<{ text: string }> };
      generationConfig?: { temperature: number; maxOutputTokens: number };
    } = {
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 250,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`GEMINI_API_ERROR: ${msg}`);
    }

    const json = await response.json();
    const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('EMPTY_RESPONSE');
    }

    return candidate.trim();
  }

  /**
   * 1. Describe Scene: Natural language spatial orientation for blind pedestrian
   */
  async describeScene(
    imageBase64: string,
    fallbackObjectsSummary?: string
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      if (fallbackObjectsSummary) {
        return `Google AI is unconfigured. Based on sensor detection: ${fallbackObjectsSummary}. Add a free Gemini API key in Settings for full scene details.`;
      }
      return 'Google Gemini API key not configured. Tap Settings with two fingers to add your free Google AI key.';
    }

    this.isAnalyzing = true;
    try {
      const systemPrompt =
        'You are VisionGuard, a real-time spatial navigation assistant for a completely blind pedestrian. ' +
        'Describe this scene in exactly 2 short, concise sentences. ' +
        'Identify walkable ground path, key obstacles, doors, and important items using clock relative directions ' +
        '(e.g., at 12 o\'clock, 2 o\'clock, 9 o\'clock) and approximate distance (e.g. 2 meters or 6 feet). ' +
        'Never use visual metaphors like "looks nice". Prioritize walking safety and immediate orientation.';

      const result = await this.callGemini(
        'Describe what is directly ahead of me and where I can safely walk.',
        imageBase64,
        systemPrompt
      );
      return result;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 2. Read Text & Signs (OCR)
   */
  async readText(imageBase64: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return 'Google OCR requires an API key in Settings.';
    }

    this.isAnalyzing = true;
    try {
      const systemPrompt =
        'You are an expert OCR transcription engine for the visually impaired. ' +
        'Transcribe ONLY the exact visible printed and handwritten text in this image verbatim. ' +
        'Preserve line breaks, names, room numbers, labels, signs, dates, and currency values accurately. ' +
        'Do not describe the scene, do not paraphrase, and do not add conversational filler. ' +
        'If no text is visible or legible, reply exactly with: "No text detected."';

      return await this.callGemini(
        'Transcribe all text in this image verbatim.',
        imageBase64,
        systemPrompt
      );
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 3. Find Specific Target (Door, Elevator, Stairs, Crosswalk, Chair, etc.)
   */
  async findTarget(
    imageBase64: string,
    targetName: string
  ): Promise<TargetFindResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        found: false,
        direction: 'not_found',
        details: 'API key not configured in Settings.',
      };
    }

    this.isAnalyzing = true;
    try {
      const prompt =
        `Is there a ${targetName} visible in this image? ` +
        `Reply in strict JSON with no markdown formatting: ` +
        `{"found": boolean, "direction": "left" | "center" | "right" | "not_found", "distance": "approximate distance", "details": "one short sentence description"}`;

      const raw = await this.callGemini(prompt, imageBase64);
      // Clean JSON formatting
      const cleanJson = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        found: Boolean(parsed.found),
        direction: parsed.direction || 'not_found',
        distance: parsed.distance,
        details: parsed.details || '',
      };
    } catch {
      return {
        found: false,
        direction: 'not_found',
        details: `Unable to detect ${targetName}.`,
      };
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 4. Identify Currency & Banknotes
   */
  async readCurrency(imageBase64: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return 'Currency detection requires an API key in Settings.';
    }

    this.isAnalyzing = true;
    try {
      const prompt =
        'Identify any paper banknote or currency bill in this image. ' +
        'State the country, denomination, and currency name in one direct sentence (e.g. "500 Indian Rupees", "20 US Dollars"). ' +
        'If no currency is clearly visible, reply with: "No currency detected."';

      return await this.callGemini(prompt, imageBase64);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Test user API Key
   */
  async testApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey.trim()) {
      return { success: false, message: 'API key is empty.' };
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with OK' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          message: err?.error?.message || `HTTP ${res.status}: Invalid key`,
        };
      }

      return { success: true, message: 'Google Gemini API key verified successfully!' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return { success: false, message: msg };
    }
  }
}

export const GeminiVisionEngine = new GeminiVisionEngineImpl();

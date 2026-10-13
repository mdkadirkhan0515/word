/**
 * src/services/TTSEngine/TTSController.ts
 * Global Stop Engine + MMKV Central Brain + Character-level Resume
 * Dependencies: react-native-tts, react-native-mmkv, react-native-track-player
 * Architecture Lock: No Emoji, No Hardcode Theme, Zero Lag
 */

import Tts, {TtsError} from 'react-native-tts';
// Use require for MMKV to avoid TS2693 verbatimModuleSyntax issue

const {MMKV} = require('react-native-mmkv');

// --- MMKV Instance (Central Brain) ---
export const ttsMMKV = new MMKV({
  id: 'tts-central-brain',
  encryptionKey: 'tts-brain-key',
});

// --- MMKV Keys (As per Architecture) ---
export const TTS_KEYS = {
  RESUME_POSITION: 'tts_resume_position', // { word_id, char_index }
  CURRENT_STATE: 'tts_current_state', // PLAYING | PAUSED | STOPPED
  ACTIVE_MODE: 'active_tts_mode', // m1 | m2 | m3 | m4 | m5
  BACKGROUND_ENABLED: 'tts_background_enabled', // boolean
  CURRENT_WORD_ID: 'tts_current_word_id',
} as const;

export type TTSState = 'PLAYING' | 'PAUSED' | 'STOPPED';
export type TTSMode = 'm1' | 'm2' | 'm3' | 'm4' | 'm5';

export interface ResumePosition {
  word_id: number;
  char_index: number;
}

class TTSControllerSingleton {
  private static instance: TTSControllerSingleton;
  private isInitialized = false;
  private currentUtteranceId: string | null = null;

  private constructor() {}

  static getInstance(): TTSControllerSingleton {
    if (!TTSControllerSingleton.instance) {
      TTSControllerSingleton.instance = new TTSControllerSingleton();
    }
    return TTSControllerSingleton.instance;
  }

  /**
   * Initialize TTS Engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Timeout wrapper for getInitStatus - some devices hang
      const initStatusPromise = Tts.getInitStatus().catch((e: any) => {
        console.log('[TTSController] getInitStatus failed, using default:', e);
        return null;
      });

      await Promise.race([
        initStatusPromise,
        new Promise(resolve =>
          setTimeout(() => {
            console.log('[TTSController] getInitStatus timeout, continuing');
            resolve(null);
          }, 1500),
        ),
      ]);

      try {
        await Tts.setDefaultLanguage('bn-BD');
      } catch {}
      try {
        await Tts.setDefaultRate(0.5);
      } catch {}
      try {
        await Tts.setDefaultPitch(1.0);
      } catch {}

      // Listeners for State Tracking - safe
      try {
        Tts.addEventListener('tts-start', this.onTtsStart);
        Tts.addEventListener('tts-finish', this.onTtsFinish);
        Tts.addEventListener('tts-cancel', this.onTtsCancel);
        (Tts as any).addEventListener(
          'tts-progress',
          this.onTtsProgress as any,
        );
      } catch {}

      this.isInitialized = true;
      this.setState('STOPPED');
      console.log('[TTSController] Initialized');
    } catch (error) {
      console.error(
        '[TTSController] Init Failed, but marking as initialized:',
        error,
      );
      this.isInitialized = true;
      this.setState('STOPPED');
    }
  }

  // --- MMKV Central Brain Operations ---

  setState(state: TTSState): void {
    ttsMMKV.set(TTS_KEYS.CURRENT_STATE, state);
  }

  getState(): TTSState {
    return (ttsMMKV.getString(TTS_KEYS.CURRENT_STATE) as TTSState) || 'STOPPED';
  }

  setActiveMode(mode: TTSMode): void {
    // Global Stop Logic: Mode Change = Instant Stop
    const prevMode = this.getActiveMode();
    if (prevMode && prevMode !== mode) {
      this.stopImmediately('MODE_SWITCH');
    }
    ttsMMKV.set(TTS_KEYS.ACTIVE_MODE, mode);
  }

  getActiveMode(): TTSMode | null {
    return (ttsMMKV.getString(TTS_KEYS.ACTIVE_MODE) as TTSMode) || null;
  }

  setResumePosition(position: ResumePosition): void {
    ttsMMKV.set(TTS_KEYS.RESUME_POSITION, JSON.stringify(position));
    ttsMMKV.set(TTS_KEYS.CURRENT_WORD_ID, position.word_id);
  }

  getResumePosition(): ResumePosition | null {
    const raw = ttsMMKV.getString(TTS_KEYS.RESUME_POSITION);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as ResumePosition;
    } catch {
      return null;
    }
  }

  clearResumePosition(): void {
    ttsMMKV.remove(TTS_KEYS.RESUME_POSITION);
    ttsMMKV.remove(TTS_KEYS.CURRENT_WORD_ID);
  }

  setBackgroundEnabled(enabled: boolean): void {
    ttsMMKV.set(TTS_KEYS.BACKGROUND_ENABLED, enabled);
  }

  isBackgroundEnabled(): boolean {
    return ttsMMKV.getBoolean(TTS_KEYS.BACKGROUND_ENABLED) || false;
  }

  // --- Core Control Methods ---

  /**
   * Global Stop Engine - Navigation Change / Mode Switch
   */
  async stopImmediately(
    reason:
      | 'NAVIGATION_EXIT'
      | 'MODE_SWITCH'
      | 'MANUAL_STOP'
      | 'AUTO_CONFLICT'
      | 'USER_STOP',
  ): Promise<void> {
    try {
      await Tts.stop();
      this.setState('STOPPED');
      // Do NOT clear resume position on MANUAL_STOP - we need it for resume
      if (reason === 'NAVIGATION_EXIT' || reason === 'MODE_SWITCH') {
        // Keep position for Zero Loss Mechanics but stop playback
      }
      console.log(`[TTSController] Stopped due to: ${reason}`);
    } catch (error) {
      console.error('[TTSController] Stop Failed:', error);
    }
  }

  /**
   * Play with Character-level Resume Support
   * @param text Full content text
   * @param word_id Primary Key for tracking
   * @param mode Current active mode
   */
  async play(text: string, word_id: number, mode: TTSMode): Promise<void> {
    if (!text || text.trim().length === 0) {
      return;
    }

    await this.initialize();
    this.setActiveMode(mode);

    const existingPos = this.getResumePosition();
    let textToSpeak = text;

    // Character-level Resume Logic (Zero Loss Mechanics)
    if (
      existingPos &&
      existingPos.word_id === word_id &&
      existingPos.char_index > 0
    ) {
      textToSpeak = text.substring(existingPos.char_index);
      console.log(
        `[TTSController] Resuming word_id ${word_id} from char_index ${existingPos.char_index}`,
      );
    } else {
      // New word, reset position
      this.setResumePosition({word_id, char_index: 0});
    }

    if (!textToSpeak.trim()) {
      this.clearResumePosition();
      return;
    }

    try {
      this.setState('PLAYING');
      this.currentUtteranceId = `utt_${word_id}_${Date.now()}`;
      await Tts.speak(textToSpeak, {
        androidParams: {
          KEY_PARAM_PAN: 0,
          KEY_PARAM_VOLUME: 1,
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
        },
      } as any);
    } catch (error) {
      console.error('[TTSController] Play Failed:', error);
      this.setState('STOPPED');
    }
  }

  /**
   * Pause - Save current char position to MMKV
   */
  async pause(word_id: number, currentCharIndex: number): Promise<void> {
    try {
      await Tts.stop();
      this.setResumePosition({
        word_id,
        char_index: currentCharIndex,
      });
      this.setState('PAUSED');
      console.log(
        `[TTSController] Paused at word_id ${word_id}, char ${currentCharIndex}`,
      );
    } catch (error) {
      console.error('[TTSController] Pause Failed:', error);
    }
  }

  /**
   * Resume from saved position
   */
  async resume(fullText: string, word_id: number): Promise<void> {
    const pos = this.getResumePosition();
    if (!pos || pos.word_id !== word_id) {
      await this.play(fullText, word_id, this.getActiveMode() || 'm1');
      return;
    }
    const remaining = fullText.substring(pos.char_index);
    await this.play(remaining, word_id, this.getActiveMode() || 'm1');
  }

  /**
   * Play Sequential Word for AutoPlayEngine
   */
  async playSequentialWord(
    word_id: number,
    content: string,
    mode: TTSMode,
  ): Promise<void> {
    await this.play(content, word_id, mode);
  }

  /**
   * Navigation Exit Tracker

   */
  async onNavigationExit(): Promise<void> {
    if (!this.isBackgroundEnabled()) {
      await this.stopImmediately('NAVIGATION_EXIT');
    }
    // If background enabled and m2/m5, do NOT stop (handled by BackgroundAudio)
    const mode = this.getActiveMode();
    if (this.isBackgroundEnabled() && (mode === 'm2' || mode === 'm5')) {
      console.log('[TTSController] Background enabled, continuing m2/m5');
      return;
    }
    await this.stopImmediately('NAVIGATION_EXIT');
  }

  /**
   * Conflict Management: Auto vs Manual
   */
  async handleManualInterruptDuringAuto(): Promise<void> {
    const mode = this.getActiveMode();
    if (mode === 'm2' || mode === 'm5') {
      // Auto is running, manual came - pause auto
      await this.pause(
        ttsMMKV.getNumber(TTS_KEYS.CURRENT_WORD_ID) || 0,
        this.getResumePosition()?.char_index || 0,
      );
      console.log('[TTSController] Auto paused for Manual');
    }
  }

  // --- Event Handlers ---

  private onTtsStart = () => {
    this.setState('PLAYING');
  };

  private onTtsFinish = () => {
    this.setState('STOPPED');
    // On finish, clear resume if fully completed
    const pos = this.getResumePosition();
    if (pos) {
      // If finished, move char_index to end or clear
      this.clearResumePosition();
    }
  };

  private onTtsCancel = () => {
    this.setState('STOPPED');
  };

  private onTtsProgress = (event: {
    utteranceId: string;
    location: number;
    length: number;
  }) => {
    // Real-time char tracking for precise resume
    const wordId = ttsMMKV.getNumber(TTS_KEYS.CURRENT_WORD_ID);
    if (wordId && event.location !== undefined) {
      const prev = this.getResumePosition() as any;
      const baseIndex =
        prev && (prev as any).word_id === wordId ? (prev as any).char_index : 0;
      // Save incremental progress (throttled to avoid MMKV overload)
      if (event.location % 5 === 0) {
        this.setResumePosition({
          word_id: wordId,
          char_index: baseIndex + event.location,
        });
      }
    }
  };

  /**
   * Cleanup
   */
  destroy(): void {
    Tts.removeAllListeners('tts-start');
    Tts.removeAllListeners('tts-finish');
    Tts.removeAllListeners('tts-cancel');
    Tts.removeAllListeners('tts-progress');
    this.isInitialized = false;
  }
}

export const TTSController = TTSControllerSingleton.getInstance();
export default TTSController;

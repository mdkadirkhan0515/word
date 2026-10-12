/**
 * src/storage/keys/TTSStateKey.ts
 * TTS Central Brain MMKV Keys - Wrapper over ttsBrainMMKV
 * Implements 4 Keys from Architecture: Resume Position, Current State, Active Mode, Background Enabled
 */

import { ttsBrainMMKV } from '../MMKVInstance';

export const TTS_MMKV_KEYS = {
  RESUME_POSITION: 'tts_resume_position', // { word_id, char_index }
  CURRENT_STATE: 'tts_current_state', // PLAYING | PAUSED | STOPPED
  ACTIVE_MODE: 'active_tts_mode', // m1 | m2 | m3 | m4 | m5
  BACKGROUND_ENABLED: 'tts_background_enabled', // boolean
  CURRENT_WORD_ID: 'tts_current_word_id',
  LAST_CHAR_INDEX: 'tts_last_char_index',
  TTS_RATE: 'tts_speech_rate', // From Slider
  TTS_GAP: 'tts_time_gap', // e.g., 300ms
} as const;

export type TTSStateValue = 'PLAYING' | 'PAUSED' | 'STOPPED';
export type TTSModeValue = 'm1' | 'm2' | 'm3' | 'm4' | 'm5';

export interface TTSResumePosition {
  word_id: number;
  char_index: number;
}

class TTSStateManager {
  // --- Resume Position (Character-level) ---
  setResumePosition(pos: TTSResumePosition): void {
    ttsBrainMMKV.set(TTS_MMKV_KEYS.RESUME_POSITION, JSON.stringify(pos));
    ttsBrainMMKV.set(TTS_MMKV_KEYS.CURRENT_WORD_ID, pos.word_id);
    ttsBrainMMKV.set(TTS_MMKV_KEYS.LAST_CHAR_INDEX, pos.char_index);
  }

  getResumePosition(): TTSResumePosition | null {
    const raw = ttsBrainMMKV.getString(TTS_MMKV_KEYS.RESUME_POSITION);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TTSResumePosition;
    } catch {
      return null;
    }
  }

  clearResumePosition(): void {
    ttsBrainMMKV.remove(TTS_MMKV_KEYS.RESUME_POSITION);
    ttsBrainMMKV.remove(TTS_MMKV_KEYS.CURRENT_WORD_ID);
    ttsBrainMMKV.remove(TTS_MMKV_KEYS.LAST_CHAR_INDEX);
  }

  // --- Current State ---
  setCurrentState(state: TTSStateValue): void {
    ttsBrainMMKV.set(TTS_MMKV_KEYS.CURRENT_STATE, state);
  }

  getCurrentState(): TTSStateValue {
    return (ttsBrainMMKV.getString(TTS_MMKV_KEYS.CURRENT_STATE) as TTSStateValue) || 'STOPPED';
  }

  // --- Active Mode Tracker (For Global Stop) ---
  setActiveMode(mode: TTSModeValue): void {
    ttsBrainMMKV.set(TTS_MMKV_KEYS.ACTIVE_MODE, mode);
  }

  getActiveMode(): TTSModeValue | null {
    return (ttsBrainMMKV.getString(TTS_MMKV_KEYS.ACTIVE_MODE) as TTSModeValue) || null;
  }

  // --- Background Audio Switch (Settings) ---
  setBackgroundEnabled(enabled: boolean): void {
    ttsBrainMMKV.set(TTS_MMKV_KEYS.BACKGROUND_ENABLED, enabled);
  }

  isBackgroundEnabled(): boolean {
    return ttsBrainMMKV.getBoolean(TTS_MMKV_KEYS.BACKGROUND_ENABLED) || false;
  }

  // --- Speech Rate (Slider Control) ---
  setSpeechRate(rate: number): void {
    // Rate 0.1 to 1.0
    const safeRate = Math.max(0.1, Math.min(1.0, rate));
    ttsBrainMMKV.set(TTS_MMKV_KEYS.TTS_RATE, safeRate);
  }

  getSpeechRate(): number {
    return ttsBrainMMKV.getNumber(TTS_MMKV_KEYS.TTS_RATE) || 0.5;
  }

  // --- Time Gap (Input Box 300ms) ---
  setTimeGap(gapMs: number): void {
    const safeGap = Math.max(0, Math.min(5000, gapMs));
    ttsBrainMMKV.set(TTS_MMKV_KEYS.TTS_GAP, safeGap);
  }

  getTimeGap(): number {
    return ttsBrainMMKV.getNumber(TTS_MMKV_KEYS.TTS_GAP) || 300;
  }

  // --- Helpers ---
  getCurrentWordId(): number | null {
    const id = ttsBrainMMKV.getNumber(TTS_MMKV_KEYS.CURRENT_WORD_ID);
    return id || null;
  }

  isPlaying(): boolean {
    return this.getCurrentState() === 'PLAYING';
  }

  isPaused(): boolean {
    return this.getCurrentState() === 'PAUSED';
  }

  /**
   * Reset All TTS State (On Navigation Exit without Background)
   */
  resetAll(): void {
    this.setCurrentState('STOPPED');
    // Keep resume position for Zero Loss, but clear playing flags
  }

  /**
   * Full Clear (On App Kill)
   */
  clearAll(): void {
    Object.values(TTS_MMKV_KEYS).forEach(key => {
      ttsBrainMMKV.remove(key);
    });
  }

  /**
   * Debug Log
   */
  debug(): void {
    console.log('=== TTS Central Brain ===');
    console.log('Resume:', this.getResumePosition());
    console.log('State:', this.getCurrentState());
    console.log('Active Mode:', this.getActiveMode());
    console.log('Background:', this.isBackgroundEnabled());
    console.log('Rate:', this.getSpeechRate());
    console.log('Gap:', this.getTimeGap());
  }
}

export const TTSStateKey = new TTSStateManager();
export default TTSStateKey;


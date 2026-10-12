/**
 * Src/services/TTSEngine/PauseResumeEngine.ts & src/services/TTSEngine/PauseResumeEngine.ts
 * Pause/Resume Engine - Character-Level Resume Position Save
 * Handles: Empty Space Tap for m2/m5 = Pause/Resume, MMKV Resume Position
 */

import TTSController, { TTSMode } from './TTSController';
import TTSStateKey, { TTSResumePosition } from '../../storage/keys/TTSStateKey';
import { ttsBrainMMKV } from '../../storage/MMKVInstance';

export interface PauseResumeState {
  isPaused: boolean;
  resumePosition: TTSResumePosition | null;
  pausedAt: number;
  mode: TTSMode | null;
}

class PauseResumeEngineSingleton {
  /**
   * Pause - Save current char position to MMKV
   * Called on Empty Space Tap (m2/m5) when playing
   */
  async pause(currentWordId: number, currentCharIndex: number, mode: TTSMode): Promise<PauseResumeState> {
    const position: TTSResumePosition = {
      word_id: currentWordId,
      char_index: currentCharIndex,
    };

    TTSStateKey.setResumePosition(position);
    TTSStateKey.setCurrentState('PAUSED');
    TTSStateKey.setActiveMode(mode);

    ttsBrainMMKV.set('paused_at', Date.now());
    ttsBrainMMKV.set('paused_mode', mode);

    await TTSController.pause(currentWordId, currentCharIndex);

    console.log(`[PauseResumeEngine] Paused at word ${currentWordId}, char ${currentCharIndex}, mode ${mode}`);

    return {
      isPaused: true,
      resumePosition: position,
      pausedAt: Date.now(),
      mode,
    };
  }

  /**
   * Resume - From saved char position
   * Called on Empty Space Tap when paused
   */
  async resume(): Promise<PauseResumeState | null> {
    const resumePosition = TTSStateKey.getResumePosition();
    const mode = TTSStateKey.getActiveMode() as TTSMode | null;

    if (!resumePosition) {
      console.log('[PauseResumeEngine] No resume position found');
      return null;
    }

    TTSStateKey.setCurrentState('PLAYING');

    await TTSController.resume('', resumePosition.word_id);

    console.log(`[PauseResumeEngine] Resumed from word ${resumePosition.word_id}, char ${resumePosition.char_index}`);

    return {
      isPaused: false,
      resumePosition,
      pausedAt: 0,
      mode,
    };
  }

  /**
   * Handle Empty Space Press for m2/m5
   * Logic: If PLAYING -> Pause, If PAUSED -> Resume
   */
  async handleEmptySpacePress(currentWordId: number, currentCharIndex: number, mode: TTSMode): Promise<'paused' | 'resumed' | 'none'> {
    const currentState = TTSStateKey.getCurrentState();

    if (currentState === 'PLAYING') {
      await this.pause(currentWordId, currentCharIndex, mode);
      return 'paused';
    } else if (currentState === 'PAUSED') {
      await this.resume();
      return 'resumed';
    }

    return 'none';
  }

  /**
   * Get Resume Position (for Zero Loss Mechanics)
   */
  getResumePosition(): TTSResumePosition | null {
    return TTSStateKey.getResumePosition();
  }

  /**
   * Clear Resume Position (when word changes or completed)
   */
  clearResume(): void {
    TTSStateKey.clearResumePosition();
    ttsBrainMMKV.remove('paused_at');
    ttsBrainMMKV.remove('paused_mode');
    console.log('[PauseResumeEngine] Resume cleared');
  }

  /**
   * Check if should resume (e.g., app returns from background)
   */
  shouldAutoResume(): boolean {
    const state = TTSStateKey.getCurrentState();
    const pos = TTSStateKey.getResumePosition();
    return state === 'PAUSED' && pos !== null;
  }

  /**
   * Get Pause Duration
   */
  getPauseDuration(): number {
    const pausedAt = ttsBrainMMKV.getNumber('paused_at');
    if (!pausedAt) return 0;
    return Date.now() - pausedAt;
  }

  /**
   * Save progress on every char for zero loss
   */
  saveProgress(wordId: number, charIndex: number): void {
    TTSStateKey.setResumePosition({ word_id: wordId, char_index: charIndex });
  }
}

export const PauseResumeEngine = new PauseResumeEngineSingleton();
export default PauseResumeEngine;


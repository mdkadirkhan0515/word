/**
 * src/storage/keys/WordProgressKey.ts
 * Per-Word 5 Modes Progress Tracking - 100 Key Architecture Example
 * Key Format: word_{word_id}_mode_{1-5}
 * Total: 20 Words * 5 Modes = 100 Keys in MMKV
 */

import { wordProgressMMKV } from "../MMKVInstance";
import { checkWordCompletionAndTrigger } from "../../database/queries/UnlockQuery";

export type ModeNumber = 1 | 2 | 3 | 4 | 5;

export interface WordModeProgress {
  word_id: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  isCompleted: boolean;
  completedModesCount: number; // 0-5
}

class WordProgressManager {
  private readonly KEY_PREFIX = "word";
  private readonly MODE_PREFIX = "mode";

  /**
   * Generate Key: word_156_mode_1
   */
  private getKey(word_id: number, mode: ModeNumber): string {
    return `${this.KEY_PREFIX}_${word_id}_${this.MODE_PREFIX}_${mode}`;
  }

  /**
   * Get single mode count (with || 0 fallback as per architecture)
   */
  getModeCount(word_id: number, mode: ModeNumber): number {
    const key = this.getKey(word_id, mode);
    return wordProgressMMKV.getNumber(key) || 0;
  }

  /**
   * Increment mode count (Live Tracking from UI)
   * Called on every card click / TTS finish
   */
  async incrementMode(
    word_id: number,
    mode: ModeNumber,
    incrementBy: number = 1
  ): Promise<WordModeProgress> {
    const key = this.getKey(word_id, mode);
    const current = wordProgressMMKV.getNumber(key) || 0;
    const newValue = current + incrementBy;

    wordProgressMMKV.set(key, newValue);

    // Get full progress for this word
    const progress = this.getWordProgress(word_id);

    // Background Trigger: Check if all 5 >0 => view_id=1
    if (progress.isCompleted) {
      // Non-blocking background call
      checkWordCompletionAndTrigger(word_id).catch((err) =>
        console.error("[WordProgress] Trigger failed:", err)
      );
    }

    console.log(`[WordProgress] ${key}: ${current} -> ${newValue}`);
    return progress;
  }

  /**
   * Set mode count directly
   */
  setModeCount(word_id: number, mode: ModeNumber, count: number): void {
    const key = this.getKey(word_id, mode);
    wordProgressMMKV.set(key, Math.max(0, count));
  }

  /**
   * Get full 5 modes progress for a word
   */
  getWordProgress(word_id: number): WordModeProgress {
    const m1 = this.getModeCount(word_id, 1);
    const m2 = this.getModeCount(word_id, 2);
    const m3 = this.getModeCount(word_id, 3);
    const m4 = this.getModeCount(word_id, 4);
    const m5 = this.getModeCount(word_id, 5);

    const completedModesCount = [m1, m2, m3, m4, m5].filter(
      (v) => v > 0
    ).length;
    const isCompleted = m1 > 0 && m2 > 0 && m3 > 0 && m4 > 0 && m5 > 0;

    return {
      word_id,
      m1,
      m2,
      m3,
      m4,
      m5,
      isCompleted,
      completedModesCount,
    };
  }

  /**
   * Get progress for multiple words (for Chapter Box calculation)
   * Optimized: Single Loop
   */
  getBulkProgress(wordIds: number[]): WordModeProgress[] {
    return wordIds.map((id) => this.getWordProgress(id));
  }

  /**
   * Calculate Per-Mode Progress for a Chapter (Single Loop Architecture)
   * Input: [12,45,89,103...] 20 word_ids
   * Output: { mode1: 80%, mode2: 60% ... }
   * As per your calculation: Loop 1 time, calculate 5 modes
   */
  calculateAllModesProgress(wordIds: number[]): {
    mode1: number;
    mode2: number;
    mode3: number;
    mode4: number;
    mode5: number;
    totalCompletedWords: number;
    totalProgressPercent: number;
  } {
    if (wordIds.length === 0) {
      return {
        mode1: 0,
        mode2: 0,
        mode3: 0,
        mode4: 0,
        mode5: 0,
        totalCompletedWords: 0,
        totalProgressPercent: 0,
      };
    }

    let m1Done = 0;
    let m2Done = 0;
    let m3Done = 0;
    let m4Done = 0;
    let m5Done = 0;
    let totalCompleted = 0;

    // Single Loop - As per your architecture
    for (const wordId of wordIds) {
      const p = this.getWordProgress(wordId);

      if (p.m1 > 0) {
        m1Done++;
      }
      if (p.m2 > 0) {
        m2Done++;
      }
      if (p.m3 > 0) {
        m3Done++;
      }
      if (p.m4 > 0) {
        m4Done++;
      }
      if (p.m5 > 0) {
        m5Done++;
      }

      if (p.isCompleted) {
        totalCompleted++;
      }
    }

    const total = wordIds.length;

    return {
      mode1: Math.round((m1Done / total) * 100),
      mode2: Math.round((m2Done / total) * 100),
      mode3: Math.round((m3Done / total) * 100),
      mode4: Math.round((m4Done / total) * 100),
      mode5: Math.round((m5Done / total) * 100),
      totalCompletedWords: totalCompleted,
      totalProgressPercent: Math.round((totalCompleted / total) * 100),
    };
  }

  /**
   * Get Weakness Analysis for Daily Event (4 Stages)
   * Returns word_ids grouped by how many modes left
   */
  analyzeWeakness(wordIds: number[]): {
    stage1_1ModeLeft: {
      m1: number[];
      m2: number[];
      m3: number[];
      m4: number[];
      m5: number[];
    }; // 4 done, 1 left
    stage2_2ModesLeft: {
      m1: number[];
      m2: number[];
      m3: number[];
      m4: number[];
      m5: number[];
    }; // 3 done, 2 left
    stage3_3ModesLeft: {
      m1: number[];
      m2: number[];
      m3: number[];
      m4: number[];
      m5: number[];
    }; // 2 done, 3 left
    stage4_4ModesLeft: {
      m1: number[];
      m2: number[];
      m3: number[];
      m4: number[];
      m5: number[];
    }; // 1 done, 4 left
  } {
    const stage1 = {
      m1: [] as number[],
      m2: [] as number[],
      m3: [] as number[],
      m4: [] as number[],
      m5: [] as number[],
    };
    const stage2 = {
      m1: [] as number[],
      m2: [] as number[],
      m3: [] as number[],
      m4: [] as number[],
      m5: [] as number[],
    };
    const stage3 = {
      m1: [] as number[],
      m2: [] as number[],
      m3: [] as number[],
      m4: [] as number[],
      m5: [] as number[],
    };
    const stage4 = {
      m1: [] as number[],
      m2: [] as number[],
      m3: [] as number[],
      m4: [] as number[],
      m5: [] as number[],
    };

    for (const wordId of wordIds) {
      const p = this.getWordProgress(wordId);
      const missingModes: ModeNumber[] = [];
      if (p.m1 === 0) {
        missingModes.push(1);
      }
      if (p.m2 === 0) {
        missingModes.push(2);
      }
      if (p.m3 === 0) {
        missingModes.push(3);
      }
      if (p.m4 === 0) {
        missingModes.push(4);
      }
      if (p.m5 === 0) {
        missingModes.push(5);
      }

      const missingCount = missingModes.length;

      if (missingCount === 1) {
        // Stage 1: Easiest - 1 mode left
        const mode = missingModes[0];
        stage1[`m${mode}` as keyof typeof stage1].push(wordId);
      } else if (missingCount === 2) {
        // Stage 2: Medium
        missingModes.forEach((m) =>
          stage2[`m${m}` as keyof typeof stage2].push(wordId)
        );
      } else if (missingCount === 3) {
        // Stage 3: Deep Study
        missingModes.forEach((m) =>
          stage3[`m${m}` as keyof typeof stage3].push(wordId)
        );
      } else if (missingCount === 4) {
        // Stage 4: Weakness Remover - Most neglected
        missingModes.forEach((m) =>
          stage4[`m${m}` as keyof typeof stage4].push(wordId)
        );
      }
    }

    return {
      stage1_1ModeLeft: stage1,
      stage2_2ModesLeft: stage2,
      stage3_3ModesLeft: stage3,
      stage4_4ModesLeft: stage4,
    };
  }

  /**
   * Reset word progress (for re-study)
   */
  resetWord(word_id: number): void {
    for (let mode = 1; mode <= 5; mode++) {
      const key = this.getKey(word_id, mode as ModeNumber);
      wordProgressMMKV.delete(key);
    }
  }

  /**
   * Debug: Get all 100 keys for a chapter (Example)
   */
  debugChapterKeys(wordIds: number[]): void {
    console.log("=== 100 Key Example (20 Words * 5 Modes) ===");
    wordIds.slice(0, 4).forEach((id) => {
      console.log(`word_${id}_mode_1 = ${this.getModeCount(id, 1)}`);
      console.log(`word_${id}_mode_2 = ${this.getModeCount(id, 2)}`);
      console.log(`word_${id}_mode_3 = ${this.getModeCount(id, 3)}`);
      console.log(`word_${id}_mode_4 = ${this.getModeCount(id, 4)}`);
      console.log(`word_${id}_mode_5 = ${this.getModeCount(id, 5)}`);
    });
  }
}

export const WordProgressKey = new WordProgressManager();
export default WordProgressKey;

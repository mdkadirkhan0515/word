/**
 * src/services/ProgressEngine/PerModeCalculator.ts
 * Single Loop (20*5=100) Progress Calculator
 * Calculates all 5 modes progress in ONE loop, not 5 separate loops
 * Performance: O(n) instead of O(5n)
 */

import WordProgressKey from "../../storage/keys/WordProgressKey";
import { chapterBoxMMKV } from "../../storage/MMKVInstance";

export interface PerModeResult {
  mode1: number; // 0-100%
  mode2: number;
  mode3: number;
  mode4: number;
  mode5: number;
  totalCompletedWords: number;
  totalWords: number;
  totalProgressPercent: number; // view_id=1 percentage
  perModeCompleted: {
    m1Done: number;
    m2Done: number;
    m3Done: number;
    m4Done: number;
    m5Done: number;
  };
}

class PerModeCalculatorSingleton {
  /**
   * Core: Single Loop Calculator
   * Input: wordIds = [12,45,89,103,156,...985] (20 words)
   * Instead of:
   *   loop1: count m1 >0
   *   loop2: count m2 >0 ... (5 loops = 100 iterations)
   * Do:
   *   single loop: check m1,m2,m3,m4,m5 in one pass (20 iterations)
   */
  calculateAllModesProgress(wordIds: number[]): PerModeResult {
    if (!wordIds || wordIds.length === 0) {
      return {
        mode1: 0,
        mode2: 0,
        mode3: 0,
        mode4: 0,
        mode5: 0,
        totalCompletedWords: 0,
        totalWords: 0,
        totalProgressPercent: 0,
        perModeCompleted: {
          m1Done: 0,
          m2Done: 0,
          m3Done: 0,
          m4Done: 0,
          m5Done: 0,
        },
      };
    }

    let m1Done = 0;
    let m2Done = 0;
    let m3Done = 0;
    let m4Done = 0;
    let m5Done = 0;
    let totalCompleted = 0;

    // SINGLE LOOP - As per your architecture
    for (const wordId of wordIds) {
      const progress = WordProgressKey.getWordProgress(wordId);

      // Check each mode >0 in same iteration
      if (progress.m1 > 0) {
        m1Done++;
      }
      if (progress.m2 > 0) {
        m2Done++;
      }
      if (progress.m3 > 0) {
        m3Done++;
      }
      if (progress.m4 > 0) {
        m4Done++;
      }
      if (progress.m5 > 0) {
        m5Done++;
      }

      if (progress.isCompleted) {
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
      totalWords: total,
      totalProgressPercent: Math.round((totalCompleted / total) * 100),
      perModeCompleted: { m1Done, m2Done, m3Done, m4Done, m5Done },
    };
  }

  /**
   * Calculate for multiple chapters at once (for Home Screen)
   * Input: { chapter_5: [12,45...], chapter_6: [...] }
   */
  calculateMultiChapters(
    chapterWordMap: Record<number, number[]>
  ): Record<number, PerModeResult> {
    const result: Record<number, PerModeResult> = {};

    for (const [chapterIdStr, wordIds] of Object.entries(chapterWordMap)) {
      const chapterId = Number(chapterIdStr);
      result[chapterId] = this.calculateAllModesProgress(wordIds);
    }

    return result;
  }

  /**
   * Get Weakness Data for Event Engine (4 Stages)
   * Uses WordProgressKey.analyzeWeakness()
   */
  getWeaknessAnalysis(wordIds: number[]) {
    return WordProgressKey.analyzeWeakness(wordIds);
  }

  /**
   * Quick Percentage for a single mode (for Drawer instant)
   */
  getSingleModePercentage(wordIds: number[], mode: 1 | 2 | 3 | 4 | 5): number {
    if (wordIds.length === 0) {
      return 0;
    }

    let done = 0;
    for (const wordId of wordIds) {
      const count = WordProgressKey.getModeCount(wordId, mode);
      if (count > 0) {
        done++;
      }
    }

    return Math.round((done / wordIds.length) * 100);
  }
}

export const PerModeCalculator = new PerModeCalculatorSingleton();
export default PerModeCalculator;

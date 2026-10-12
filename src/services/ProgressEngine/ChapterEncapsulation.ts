/**
 * src/services/ProgressEngine/ChapterEncapsulation.ts
 * Chapter Box Encapsulation - Saves per-mode progress into separate MMKV keys
 * Key: chapter_{id}_mode_{n}_progress
 * Purpose: Drawer instant read without recalculation
 */

import { chapterBoxMMKV } from "../../storage/MMKVInstance";
import PerModeCalculator, { PerModeResult } from "./PerModeCalculator";
import WordProgressKey from "../../storage/keys/WordProgressKey";

export interface ChapterBox {
  chapter_id: number;
  mode1: number;
  mode2: number;
  mode3: number;
  mode4: number;
  mode5: number;
  totalCompletedWords: number;
  totalWords: number;
  totalProgressPercent: number;
  lastUpdated: number;
}

class ChapterEncapsulationSingleton {
  private getModeKey(chapter_id: number, mode: number): string {
    return `chapter_${chapter_id}_mode_${mode}_progress`;
  }

  private getTotalKey(chapter_id: number): string {
    return `chapter_${chapter_id}_total_progress`;
  }

  private getLastUpdatedKey(chapter_id: number): string {
    return `chapter_${chapter_id}_last_updated`;
  }

  private getCompletedWordsKey(chapter_id: number): string {
    return `chapter_${chapter_id}_completed_words`;
  }

  /**
   * Core: saveChapterProgress(chapterId, chapterWordIds)
   * Called after PerModeCalculator calculation
   * This is the encapsulation layer from your architecture
   */
  saveChapterProgress(chapter_id: number, wordIds: number[]): ChapterBox {
    const result: PerModeResult =
      PerModeCalculator.calculateAllModesProgress(wordIds);

    // Save each mode as separate key for instant drawer read
    chapterBoxMMKV.set(this.getModeKey(chapter_id, 1), result.mode1);
    chapterBoxMMKV.set(this.getModeKey(chapter_id, 2), result.mode2);
    chapterBoxMMKV.set(this.getModeKey(chapter_id, 3), result.mode3);
    chapterBoxMMKV.set(this.getModeKey(chapter_id, 4), result.mode4);
    chapterBoxMMKV.set(this.getModeKey(chapter_id, 5), result.mode5);
    chapterBoxMMKV.set(
      this.getTotalKey(chapter_id),
      result.totalProgressPercent
    );
    chapterBoxMMKV.set(
      this.getCompletedWordsKey(chapter_id),
      result.totalCompletedWords
    );
    chapterBoxMMKV.set(this.getLastUpdatedKey(chapter_id), Date.now());

    const box: ChapterBox = {
      chapter_id,
      mode1: result.mode1,
      mode2: result.mode2,
      mode3: result.mode3,
      mode4: result.mode4,
      mode5: result.mode5,
      totalCompletedWords: result.totalCompletedWords,
      totalWords: wordIds.length,
      totalProgressPercent: result.totalProgressPercent,
      lastUpdated: Date.now(),
    };

    console.log(
      `[ChapterEncapsulation] Saved chapter_${chapter_id}: ${result.totalProgressPercent}%`
    );

    return box;
  }

  /**
   * Instant read for Drawer - No calculation
   * chapter_5_mode_1_progress = 80
   */
  getChapterBox(chapter_id: number): ChapterBox {
    return {
      chapter_id,
      mode1: chapterBoxMMKV.getNumber(this.getModeKey(chapter_id, 1)) || 0,
      mode2: chapterBoxMMKV.getNumber(this.getModeKey(chapter_id, 2)) || 0,
      mode3: chapterBoxMMKV.getNumber(this.getModeKey(chapter_id, 3)) || 0,
      mode4: chapterBoxMMKV.getNumber(this.getModeKey(chapter_id, 4)) || 0,
      mode5: chapterBoxMMKV.getNumber(this.getModeKey(chapter_id, 5)) || 0,
      totalCompletedWords:
        chapterBoxMMKV.getNumber(this.getCompletedWordsKey(chapter_id)) || 0,
      totalWords: 0,
      totalProgressPercent:
        chapterBoxMMKV.getNumber(this.getTotalKey(chapter_id)) || 0,
      lastUpdated:
        chapterBoxMMKV.getNumber(this.getLastUpdatedKey(chapter_id)) || 0,
    };
  }

  /**
   * Get total progress for Drawer Green Bar
   * chapter_5_total_progress
   */
  getTotalProgress(chapter_id: number): number {
    return chapterBoxMMKV.getNumber(this.getTotalKey(chapter_id)) || 0;
  }

  /**
   * Incremental update after single word increment
   * Called from WordProgressKey.incrementMode()
   */
  incrementalUpdate(chapter_id: number, wordIds: number[]): ChapterBox {
    return this.saveChapterProgress(chapter_id, wordIds);
  }

  /**
   * Save multiple chapters at once (Home Screen)
   */
  saveMultipleChapters(
    chapterWordMap: Record<number, number[]>
  ): Record<number, ChapterBox> {
    const result: Record<number, ChapterBox> = {};
    for (const [idStr, wordIds] of Object.entries(chapterWordMap)) {
      const chapterId = Number(idStr);
      result[chapterId] = this.saveChapterProgress(chapterId, wordIds);
    }
    return result;
  }

  /**
   * Delete chapter box (Manifesto delete)
   */
  deleteChapterBox(chapter_id: number): void {
    for (let mode = 1; mode <= 5; mode++) {
      chapterBoxMMKV.delete(this.getModeKey(chapter_id, mode));
    }
    chapterBoxMMKV.delete(this.getTotalKey(chapter_id));
    chapterBoxMMKV.delete(this.getCompletedWordsKey(chapter_id));
    chapterBoxMMKV.delete(this.getLastUpdatedKey(chapter_id));
  }

  /**
   * Debug log - Shows 100 key encapsulation
   */
  debug(chapter_id: number): void {
    const box = this.getChapterBox(chapter_id);
    console.log(`=== Chapter ${chapter_id} Encapsulated Box ===`);
    console.log(`chapter_${chapter_id}_mode_1_progress = ${box.mode1}%`);
    console.log(`chapter_${chapter_id}_mode_2_progress = ${box.mode2}%`);
    console.log(`chapter_${chapter_id}_mode_3_progress = ${box.mode3}%`);
    console.log(`chapter_${chapter_id}_mode_4_progress = ${box.mode4}%`);
    console.log(`chapter_${chapter_id}_mode_5_progress = ${box.mode5}%`);
    console.log(
      `chapter_${chapter_id}_total_progress = ${box.totalProgressPercent}%`
    );
  }
}

export const ChapterEncapsulation = new ChapterEncapsulationSingleton();
export default ChapterEncapsulation;

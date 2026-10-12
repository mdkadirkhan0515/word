/**
 * src/storage/keys/ChapterBoxKey.ts
 * Chapter Encapsulation Box - Each Chapter Has Its Own 5 Modes Progress Box
 * Key Format: chapter_{chapter_id}_mode_{1-5}_progress
 * Example: chapter_5_mode_1_progress = 80 (meaning 80% for mode 1 in chapter 5)
 * Purpose: Instant Drawer Read, No Recalculation, Offline-First
 */

import { chapterBoxMMKV } from "../MMKVInstance";
import WordProgressKey from "./WordProgressKey";

export type ChapterMode = 1 | 2 | 3 | 4 | 5;

export interface ChapterBoxProgress {
  chapter_id: number;
  mode1: number; // 0-100%
  mode2: number;
  mode3: number;
  mode4: number;
  mode5: number;
  totalCompletedWords: number;
  totalWords: number;
  totalProgressPercent: number; // For Drawer Green Bar
  lastUpdated: number; // Timestamp
}

class ChapterBoxManager {
  private readonly PREFIX = "chapter";
  private readonly SUFFIX = "progress";

  private getKey(chapter_id: number, mode: ChapterMode): string {
    return `${this.PREFIX}_${chapter_id}_mode_${mode}_${this.SUFFIX}`;
  }

  private getTotalKey(chapter_id: number): string {
    return `${this.PREFIX}_${chapter_id}_total_${this.SUFFIX}`;
  }

  private getLastUpdatedKey(chapter_id: number): string {
    return `${this.PREFIX}_${chapter_id}_last_updated`;
  }

  /**
   * Save Chapter Progress - Called after calculating from WordProgress
   * Architecture: saveChapterProgress(chapterId, chapterWordIds)
   * This is your Encapsulation Layer
   */
  saveChapterProgress(
    chapter_id: number,
    wordIds: number[]
  ): ChapterBoxProgress {
    if (!wordIds || wordIds.length === 0) {
      const empty: ChapterBoxProgress = {
        chapter_id,
        mode1: 0,
        mode2: 0,
        mode3: 0,
        mode4: 0,
        mode5: 0,
        totalCompletedWords: 0,
        totalWords: 0,
        totalProgressPercent: 0,
        lastUpdated: Date.now(),
      };
      return empty;
    }

    // Single Loop Calculation from WordProgressKey
    const calc = WordProgressKey.calculateAllModesProgress(wordIds);

    // Save each mode progress as separate key for instant read
    chapterBoxMMKV.set(this.getKey(chapter_id, 1), calc.mode1);
    chapterBoxMMKV.set(this.getKey(chapter_id, 2), calc.mode2);
    chapterBoxMMKV.set(this.getKey(chapter_id, 3), calc.mode3);
    chapterBoxMMKV.set(this.getKey(chapter_id, 4), calc.mode4);
    chapterBoxMMKV.set(this.getKey(chapter_id, 5), calc.mode5);

    // Save total
    chapterBoxMMKV.set(this.getTotalKey(chapter_id), calc.totalProgressPercent);
    chapterBoxMMKV.set(this.getLastUpdatedKey(chapter_id), Date.now());

    const progress: ChapterBoxProgress = {
      chapter_id,
      mode1: calc.mode1,
      mode2: calc.mode2,
      mode3: calc.mode3,
      mode4: calc.mode4,
      mode5: calc.mode5,
      totalCompletedWords: calc.totalCompletedWords,
      totalWords: wordIds.length,
      totalProgressPercent: calc.totalProgressPercent,
      lastUpdated: Date.now(),
    };

    console.log(
      `[ChapterBox] Chapter ${chapter_id} saved: ${calc.totalProgressPercent}% (M1:${calc.mode1} M2:${calc.mode2} M3:${calc.mode3} M4:${calc.mode4} M5:${calc.mode5})`
    );

    return progress;
  }

  /**
   * Get Chapter Box Progress - Instant Read for Drawer (No Calculation)
   * Used in Navigation Drawer: chapter_5_mode_1_progress
   */
  getChapterProgress(chapter_id: number): ChapterBoxProgress {
    const mode1 = chapterBoxMMKV.getNumber(this.getKey(chapter_id, 1)) || 0;
    const mode2 = chapterBoxMMKV.getNumber(this.getKey(chapter_id, 2)) || 0;
    const mode3 = chapterBoxMMKV.getNumber(this.getKey(chapter_id, 3)) || 0;
    const mode4 = chapterBoxMMKV.getNumber(this.getKey(chapter_id, 4)) || 0;
    const mode5 = chapterBoxMMKV.getNumber(this.getKey(chapter_id, 5)) || 0;
    const total = chapterBoxMMKV.getNumber(this.getTotalKey(chapter_id)) || 0;
    const lastUpdated =
      chapterBoxMMKV.getNumber(this.getLastUpdatedKey(chapter_id)) || 0;

    // For totalWords, we need to get from somewhere - fallback to 0 if not set
    // In real app, chapterWordIds mapping will provide it
    return {
      chapter_id,
      mode1,
      mode2,
      mode3,
      mode4,
      mode5,
      totalCompletedWords: 0, // Calculated separately if needed
      totalWords: 0,
      totalProgressPercent: total,
      lastUpdated,
    };
  }

  /**
   * Get Single Mode Progress for a Chapter
   * For Drawer: chapter_5_mode_1_progress = 80
   */
  getModeProgress(chapter_id: number, mode: ChapterMode): number {
    return chapterBoxMMKV.getNumber(this.getKey(chapter_id, mode)) || 0;
  }

  /**
   * Get Total Progress Percent (For Drawer Green Bar)
   * Instant: chapter_5_total_progress
   */
  getTotalProgress(chapter_id: number): number {
    return chapterBoxMMKV.getNumber(this.getTotalKey(chapter_id)) || 0;
  }

  /**
   * Get All Chapters Progress (For Home Screen)
   * Returns Map of chapter_id -> progress
   */
  getAllChaptersProgress(
    chapterIds: number[]
  ): Record<number, ChapterBoxProgress> {
    const result: Record<number, ChapterBoxProgress> = {};
    for (const id of chapterIds) {
      result[id] = this.getChapterProgress(id);
    }
    return result;
  }

  /**
   * Incrementally Update Chapter Box on Single Word Completion
   * Called after word_156_mode_1 increment
   */
  async incrementalUpdate(
    chapter_id: number,
    wordIds: number[]
  ): Promise<ChapterBoxProgress> {
    // Recalculate entire chapter (still single loop, very fast in MMKV)
    return this.saveChapterProgress(chapter_id, wordIds);
  }

  /**
   * Delete Chapter Box (When Manifesto Deleted)
   */
  deleteChapterBox(chapter_id: number): void {
    for (let mode = 1; mode <= 5; mode++) {
      chapterBoxMMKV.delete(this.getKey(chapter_id, mode as ChapterMode));
    }
    chapterBoxMMKV.delete(this.getTotalKey(chapter_id));
    chapterBoxMMKV.delete(this.getLastUpdatedKey(chapter_id));
    console.log(`[ChapterBox] Chapter ${chapter_id} box deleted`);
  }

  /**
   * Debug: Show Encapsulated Box
   */
  debugBox(chapter_id: number): void {
    const p = this.getChapterProgress(chapter_id);
    console.log(`=== Chapter ${chapter_id} Box ===`);
    console.log(`chapter_${chapter_id}_mode_1_progress = ${p.mode1}%`);
    console.log(`chapter_${chapter_id}_mode_2_progress = ${p.mode2}%`);
    console.log(`chapter_${chapter_id}_mode_3_progress = ${p.mode3}%`);
    console.log(`chapter_${chapter_id}_mode_4_progress = ${p.mode4}%`);
    console.log(`chapter_${chapter_id}_mode_5_progress = ${p.mode5}%`);
    console.log(
      `chapter_${chapter_id}_total_progress = ${p.totalProgressPercent}%`
    );
  }
}

export const ChapterBoxKey = new ChapterBoxManager();
export default ChapterBoxKey;

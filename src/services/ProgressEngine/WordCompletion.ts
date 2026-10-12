/**
 * src/services/ProgressEngine/WordCompletion.ts
 * Word Completion Checker: m1>0 && m2>0 && m3>0 && m4>0 && m5>0 => view_id=1
 * Triggers SQLite update and Chapter Guards
 */

import WordProgressKey, {
  WordModeProgress,
} from "../../storage/keys/WordProgressKey";
import { updateDatabaseViewId } from "../../database/queries/UnlockQuery";
import SQLiteManager from "../../database/SQLiteManager";
import ChapterTable from "../../database/ChapterTable";
import { eventsMMKV } from "../../storage/MMKVInstance";

export interface CompletionResult {
  word_id: number;
  isCompleted: boolean;
  wasNewlyCompleted: boolean; // true if view_id changed 0->1 now
  progress: WordModeProgress;
}

class WordCompletionSingleton {
  /**
   * Core check: All 5 modes >0 ?
   * From architecture: checkWordCompletionAndTrigger(wordId)
   */
  checkWordCompletion(word_id: number): CompletionResult {
    const progress = WordProgressKey.getWordProgress(word_id);
    return {
      word_id,
      isCompleted: progress.isCompleted,
      wasNewlyCompleted: false, // Will be set after DB check
      progress,
    };
  }

  /**
   * Check and trigger SQLite view_id=1 + Chapter Guards
   * Called on every mode increment
   */
  async checkAndTrigger(word_id: number): Promise<CompletionResult> {
    const progress = WordProgressKey.getWordProgress(word_id);
    const isCompleted = progress.isCompleted;

    if (!isCompleted) {
      return {
        word_id,
        isCompleted: false,
        wasNewlyCompleted: false,
        progress,
      };
    }

    // Check current view_id in SQLite to avoid unnecessary write
    try {
      const [result] = await SQLiteManager.executeSql(
        "SELECT view_id, chapter_id FROM WordTable WHERE word_id = ?;",
        [word_id]
      );

      if (result.rows.length === 0) {
        return {
          word_id,
          isCompleted: true,
          wasNewlyCompleted: false,
          progress,
        };
      }

      const currentViewId = result.rows.item(0).view_id as number;
      const chapter_id = result.rows.item(0).chapter_id as number;

      if (currentViewId === 1) {
        // Already completed
        return {
          word_id,
          isCompleted: true,
          wasNewlyCompleted: false,
          progress,
        };
      }

      // New completion! Update to 1
      const updated = await updateDatabaseViewId(word_id, 1);

      if (updated) {
        console.log(`[WordCompletion] Word ${word_id} completed! view_id 0->1`);

        // Trigger chapter check
        await this.onWordCompleted(chapter_id);

        return {
          word_id,
          isCompleted: true,
          wasNewlyCompleted: true,
          progress,
        };
      }

      return { word_id, isCompleted: true, wasNewlyCompleted: false, progress };
    } catch (error) {
      console.error(`[WordCompletion] Failed for ${word_id}:`, error);
      return { word_id, isCompleted: true, wasNewlyCompleted: false, progress };
    }
  }

  /**
   * After word completes, check chapter guards (50% & 80%)
   */
  private async onWordCompleted(chapter_id: number): Promise<void> {
    try {
      const status = await ChapterTable.checkChapterUnlockStatus(chapter_id, 0);

      // Auto unlock if 80% reached
      if (status.is80ManagerPassed && !status.isUnlocked) {
        await ChapterTable.unlockChapter(chapter_id);
        console.log(
          `[WordCompletion] Chapter ${chapter_id} auto-unlocked via 80%`
        );
      }

      // Emit 50% guard event for Invisible UI Magic
      if (status.is50GuardPassed) {
        eventsMMKV.set(`chapter_${chapter_id}_50_guard_passed`, true);
        eventsMMKV.set(`chapter_${chapter_id}_guard_event_at`, Date.now());
        eventsMMKV.set(
          `chapter_${chapter_id}_completed_percent`,
          status.completedPercent
        );
        console.log(
          `[WordCompletion] Chapter ${chapter_id} 50% Guard PASSED (${status.completedPercent}%) - Show Bank Button`
        );
      }
    } catch (error) {
      console.error("[WordCompletion] onWordCompleted failed:", error);
    }
  }

  /**
   * Batch check for multiple words (Daily Event)
   */
  async batchCheck(wordIds: number[]): Promise<{
    newlyCompleted: number[];
    alreadyCompleted: number[];
    incomplete: number[];
  }> {
    const newlyCompleted: number[] = [];
    const alreadyCompleted: number[] = [];
    const incomplete: number[] = [];

    for (const wordId of wordIds) {
      const result = await this.checkAndTrigger(wordId);
      if (!result.isCompleted) {
        incomplete.push(wordId);
      } else if (result.wasNewlyCompleted) {
        newlyCompleted.push(wordId);
      } else {
        alreadyCompleted.push(wordId);
      }
    }

    return { newlyCompleted, alreadyCompleted, incomplete };
  }

  /**
   * Reset word (for re-study)
   */
  async resetWord(word_id: number): Promise<void> {
    WordProgressKey.resetWord(word_id);
    await updateDatabaseViewId(word_id, 0);
    console.log(`[WordCompletion] Word ${word_id} reset to 0`);
  }
}

export const WordCompletion = new WordCompletionSingleton();
export default WordCompletion;

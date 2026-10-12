/**
 * src/database/ChapterTable.ts
 * Chapter Unlock Logic with Two Guards: 50% Default Guard & 80% Executive Manager
 * Handles: Dynamic Target from 30-Day Algo, Bank Credit Logic, unlocked_id
 */

import SQLiteManager from "./SQLiteManager";
import WordTable from "./WordTable";

export interface ChapterRow {
  chapter_id: number;
  chapter_name: string;
  total_words: number;
  completed_words: number;
  unlocked_id: number; // 0=Locked, 1=Unlocked
  target_percentage: number; // 50-100 from 30-Day Dynamic Engine
  created_at?: string;
}

export interface ChapterUnlockStatus {
  chapter_id: number;
  chapter_name: string;
  total: number;
  completed: number;
  completedPercent: number; // completed/total*100
  targetPercent: number; // From dynamic engine (50-100)
  is50GuardPassed: boolean; // Default Guard
  is80ManagerPassed: boolean; // Executive Manager (or targetPercent)
  isUnlocked: boolean; // unlocked_id=1
  needsBankCredit: number; // How much bank needed to reach target
  canUseBank: boolean; // is50GuardPassed && bankBalance >= needsBankCredit
}

class ChapterTableManager {
  /**
   * Upsert Chapter (On Manifesto Download)
   */
  async upsertChapter(
    chapter: Partial<ChapterRow> & { chapter_id: number; chapter_name: string }
  ): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO ChapterTable
      (chapter_id, chapter_name, total_words, completed_words, unlocked_id, target_percentage)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const total = chapter.total_words || 0;
    await SQLiteManager.executeSql(query, [
      chapter.chapter_id,
      chapter.chapter_name,
      total,
      chapter.completed_words || 0,
      chapter.unlocked_id || 0,
      chapter.target_percentage || 50,
    ]);
  }

  /**
   * Update total_words after bulk word import
   */
  async syncTotalWords(chapter_id: number): Promise<void> {
    const total = await WordTable.getTotalCount(chapter_id);
    await SQLiteManager.executeSql(
      "UPDATE ChapterTable SET total_words = ? WHERE chapter_id = ?;",
      [total, chapter_id]
    );
  }

  /**
   * Set Dynamic Target from 30-Day Algorithm (50-100%)
   * Called by generateComplexDynamicTarget()
   */
  async setDynamicTarget(
    chapter_id: number,
    targetPercentage: number
  ): Promise<void> {
    const safeTarget = Math.max(
      50,
      Math.min(100, Math.round(targetPercentage))
    );
    await SQLiteManager.executeSql(
      "UPDATE ChapterTable SET target_percentage = ? WHERE chapter_id = ?;",
      [safeTarget, chapter_id]
    );
    console.log(
      `[ChapterTable] Chapter ${chapter_id} target set to ${safeTarget}%`
    );
  }

  /**
   * Get Chapter Row
   */
  async getChapter(chapter_id: number): Promise<ChapterRow | null> {
    const [result] = await SQLiteManager.executeSql(
      "SELECT * FROM ChapterTable WHERE chapter_id = ?;",
      [chapter_id]
    );
    if (result.rows.length > 0) {
      return result.rows.item(0) as ChapterRow;
    }
    return null;
  }

  /**
   * Core: Check Two Guards Logic (50% Guard & 80% Manager)
   * This is the Heart of Invisible UI Magic Trigger
   */
  async checkChapterUnlockStatus(
    chapter_id: number,
    bankBalancePercent: number = 0
  ): Promise<ChapterUnlockStatus> {
    const chapter = await this.getChapter(chapter_id);
    const progress = await WordTable.getChapterProgress(chapter_id);

    if (!chapter) {
      // If chapter not in ChapterTable, create temp status from WordTable
      return {
        chapter_id,
        chapter_name: `Chapter ${chapter_id}`,
        total: progress.total,
        completed: progress.completed,
        completedPercent: progress.percentage,
        targetPercent: 80, // Default as per UI: "80% প্রয়োজন"
        is50GuardPassed: progress.percentage >= 50,
        is80ManagerPassed: progress.percentage >= 80,
        isUnlocked: false,
        needsBankCredit: Math.max(0, 80 - progress.percentage),
        canUseBank:
          progress.percentage >= 50 &&
          bankBalancePercent >= Math.max(0, 80 - progress.percentage),
      };
    }

    const completedPercent = progress.percentage;
    const targetPercent = chapter.target_percentage || 80;

    // Two Guards
    const is50GuardPassed = completedPercent >= 50;
    const is80ManagerPassed = completedPercent >= targetPercent;

    // Bank Logic: User's own + Bank Credit
    const needsBankCredit = Math.max(0, targetPercent - completedPercent);
    const canUseBank = is50GuardPassed && bankBalancePercent >= needsBankCredit;

    // Final Unlock Check: Either natural 80% OR 50%+Bank = 80%
    const isUnlockedByProgress = is80ManagerPassed;
    const isUnlockedByBank =
      is50GuardPassed &&
      completedPercent + Math.min(bankBalancePercent, needsBankCredit) >=
        targetPercent;
    const isUnlocked =
      chapter.unlocked_id === 1 || isUnlockedByProgress || isUnlockedByBank;

    // Sync completed_words
    if (chapter.completed_words !== progress.completed) {
      await SQLiteManager.executeSql(
        "UPDATE ChapterTable SET completed_words = ? WHERE chapter_id = ?;",
        [progress.completed, chapter_id]
      );
    }

    return {
      chapter_id,
      chapter_name: chapter.chapter_name,
      total: progress.total,
      completed: progress.completed,
      completedPercent,
      targetPercent,
      is50GuardPassed,
      is80ManagerPassed,
      isUnlocked,
      needsBankCredit,
      canUseBank,
    };
  }

  /**
   * Unlock Chapter (view_id=1 for Chapter) - Called when 80% condition met
   * From Architecture: Chapter Executive says "চমৎকার! ৮০% পূরণ হয়েছে"
   */
  async unlockChapter(chapter_id: number): Promise<boolean> {
    try {
      await SQLiteManager.executeSql(
        "UPDATE ChapterTable SET unlocked_id = 1 WHERE chapter_id = ?;",
        [chapter_id]
      );
      console.log(
        `[ChapterTable] Chapter ${chapter_id} UNLOCKED (unlocked_id=1)`
      );
      return true;
    } catch (error) {
      console.error(`[ChapterTable] Unlock failed for ${chapter_id}:`, error);
      return false;
    }
  }

  /**
   * Unlock via Bank Credit (Manual Click on -30% Button)
   * User Clicks [ -30% ব্যাংক ক্রেডিট কেটে আনলক করুন ]
   */
  async unlockViaBank(
    chapter_id: number,
    bankCreditToDeduct: number
  ): Promise<{ success: boolean; remainingNeeds: number }> {
    const status = await this.checkChapterUnlockStatus(
      chapter_id,
      bankCreditToDeduct
    );

    if (!status.is50GuardPassed) {
      console.log("[ChapterTable] Bank unlock denied: 50% Guard not passed");
      return { success: false, remainingNeeds: status.needsBankCredit };
    }

    if (!status.canUseBank) {
      console.log(
        "[ChapterTable] Bank unlock denied: Insufficient bank balance"
      );
      return { success: false, remainingNeeds: status.needsBankCredit };
    }

    // Deduct and unlock
    const unlocked = await this.unlockChapter(chapter_id);
    return {
      success: unlocked,
      remainingNeeds: 0,
    };
  }

  /**
   * Get All Chapters with Progress (For Home Screen & Drawer)
   */
  async getAllChaptersWithProgress(): Promise<ChapterUnlockStatus[]> {
    const [result] = await SQLiteManager.executeSql(
      "SELECT * FROM ChapterTable ORDER BY chapter_id ASC;"
    );
    const statuses: ChapterUnlockStatus[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i) as ChapterRow;
      const status = await this.checkChapterUnlockStatus(row.chapter_id, 0);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Reset Chapter (For Testing)
   */
  async resetChapter(chapter_id: number): Promise<void> {
    await SQLiteManager.executeSql(
      "UPDATE ChapterTable SET unlocked_id = 0, completed_words = 0 WHERE chapter_id = ?;",
      [chapter_id]
    );
    // Also reset all words view_id=0
    await SQLiteManager.executeSql(
      "UPDATE WordTable SET view_id = 0 WHERE chapter_id = ?;",
      [chapter_id]
    );
  }
}

export const ChapterTable = new ChapterTableManager();
export default ChapterTable;

/**
 * src/database/WordTable.ts
 * Core Content Table - view_id = 1 when all 5 modes completed
 * Offline-First, Primary Key is word_id (Internal), display_word_id is User Visible
 */

import SQLiteManager from "./SQLiteManager";

export interface WordRow {
  word_id: number; // Internal Primary Key (e.g., 67, 896, 156)
  display_word_id: number; // User Visible # (e.g., 35, 78, 15)
  chapter_id: number;
  chapter_name: string; // e.g., "অপরিচিতা"
  content: string | null;
  view_id: number; // 0=Locked/Incomplete, 1=Unlocked/Complete (5 Modes >0)
  created_at?: string;
  updated_at?: string;
}

class WordTableManager {
  /**
   * Insert or Replace Word (For Manifesto Download)
   */
  async upsertWord(word: WordRow): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO WordTable 
      (word_id, display_word_id, chapter_id, chapter_name, content, view_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `;
    await SQLiteManager.executeSql(query, [
      word.word_id,
      word.display_word_id,
      word.chapter_id,
      word.chapter_name,
      word.content || null,
      word.view_id || 0,
    ]);
  }

  /**
   * Bulk Upsert - For Manifesto JSON Import
   */
  async bulkUpsert(words: WordRow[]): Promise<void> {
    if (words.length === 0) {
      return;
    }

    await SQLiteManager.transaction(async (tx) => {
      for (const word of words) {
        const query = `
          INSERT OR REPLACE INTO WordTable 
          (word_id, display_word_id, chapter_id, chapter_name, content, view_id, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
        `;
        tx.executeSql(query, [
          word.word_id,
          word.display_word_id,
          word.chapter_id,
          word.chapter_name,
          word.content || null,
          word.view_id || 0,
        ]);
      }
    });
    console.log(`[WordTable] Bulk Upsert ${words.length} words`);
  }

  /**
   * Get Word by word_id (Primary Key)
   */
  async getWordById(word_id: number): Promise<WordRow | null> {
    const [result] = await SQLiteManager.executeSql(
      "SELECT * FROM WordTable WHERE word_id = ?;",
      [word_id]
    );
    if (result.rows.length > 0) {
      return result.rows.item(0) as WordRow;
    }
    return null;
  }

  /**
   * Get All Words in Chapter
   */
  async getWordsByChapter(chapter_id: number): Promise<WordRow[]> {
    const [result] = await SQLiteManager.executeSql(
      "SELECT * FROM WordTable WHERE chapter_id = ? ORDER BY display_word_id ASC;",
      [chapter_id]
    );
    const words: WordRow[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      words.push(result.rows.item(i) as WordRow);
    }
    return words;
  }

  /**
   * Get view_id = 1 Count for a Chapter (For 50% Guard & 80% Manager)
   */
  async getCompletedCount(chapter_id: number): Promise<number> {
    const [result] = await SQLiteManager.executeSql(
      "SELECT COUNT(*) as count FROM WordTable WHERE chapter_id = ? AND view_id = 1;",
      [chapter_id]
    );
    return result.rows.item(0).count || 0;
  }

  /**
   * Get Total Words Count for Chapter
   */
  async getTotalCount(chapter_id: number): Promise<number> {
    const [result] = await SQLiteManager.executeSql(
      "SELECT COUNT(*) as count FROM WordTable WHERE chapter_id = ?;",
      [chapter_id]
    );
    return result.rows.item(0).count || 0;
  }

  /**
   * Update view_id to 1 (Core Unlock Logic from checkWordCompletion)
   * Called when m1>0 && m2>0 && m3>0 && m4>0 && m5>0
   */
  async markAsCompleted(word_id: number): Promise<boolean> {
    try {
      // First check if already completed to avoid unnecessary write
      const existing = await this.getWordById(word_id);
      if (existing && existing.view_id === 1) {
        return false; // Already completed
      }

      await SQLiteManager.executeSql(
        "UPDATE WordTable SET view_id = 1, updated_at = CURRENT_TIMESTAMP WHERE word_id = ?;",
        [word_id]
      );
      console.log(`[WordTable] Word ${word_id} marked view_id=1`);
      return true;
    } catch (error) {
      console.error(`[WordTable] Failed to mark ${word_id}:`, error);
      return false;
    }
  }

  /**
   * Reset view_id to 0 (For Re-study)
   */
  async resetWord(word_id: number): Promise<void> {
    await SQLiteManager.executeSql(
      "UPDATE WordTable SET view_id = 0, updated_at = CURRENT_TIMESTAMP WHERE word_id = ?;",
      [word_id]
    );
  }

  /**
   * Get Chapter Progress Percentage (For Drawer)
   * Returns: { completed, total, percentage }
   */
  async getChapterProgress(
    chapter_id: number
  ): Promise<{ completed: number; total: number; percentage: number }> {
    const [result] = await SQLiteManager.executeSql(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN view_id = 1 THEN 1 ELSE 0 END) as completed
       FROM WordTable WHERE chapter_id = ?;`,
      [chapter_id]
    );
    const row = result.rows.item(0);
    const total = row.total || 0;
    const completed = row.completed || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }

  /**
   * Delete words of a chapter (When Manifesto Deleted)
   */
  async deleteByChapter(chapter_id: number): Promise<void> {
    await SQLiteManager.executeSql(
      "DELETE FROM WordTable WHERE chapter_id = ?;",
      [chapter_id]
    );
  }
}

export const WordTable = new WordTableManager();
export default WordTable;

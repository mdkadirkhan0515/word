/**
 * src/database/queries/UnlockQuery.ts
 * Core Unlock Logic: Per-Word (view_id=1) and Chapter (unlocked_id=1)
 * Implements: MMKV 5 Modes >0 Check, Batch Update, Zero Unnecessary Writes
 */

import SQLiteManager from '../SQLiteManager';
import WordTable from '../WordTable';
import ChapterTable from '../ChapterTable';
import MMKVFactory, {
  wordProgressMMKV,
  dailyBankMMKV,
  eventsMMKV,
} from '../../storage/MMKVInstance';

// MMKV Instance for Progress Check
const progressMMKV = wordProgressMMKV;

export interface WordCompletionCheck {
  word_id: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  isCompleted: boolean; // All >0
}

/**
 * Check if a single word has completed all 5 modes
 * Logic from Architecture: word_156_mode_1 >0 && ... && mode_5>0 => view_id=1
 */
export function checkWordCompletionFromMMKV(
  word_id: number,
): WordCompletionCheck {
  const m1 = progressMMKV.getNumber(`word_${word_id}_mode_1`) || 0;
  const m2 = progressMMKV.getNumber(`word_${word_id}_mode_2`) || 0;
  const m3 = progressMMKV.getNumber(`word_${word_id}_mode_3`) || 0;
  const m4 = progressMMKV.getNumber(`word_${word_id}_mode_4`) || 0;
  const m5 = progressMMKV.getNumber(`word_${word_id}_mode_5`) || 0;

  const isCompleted = m1 > 0 && m2 > 0 && m3 > 0 && m4 > 0 && m5 > 0;

  return {
    word_id,
    m1,
    m2,
    m3,
    m4,
    m5,
    isCompleted,
  };
}

/**
 * Background Trigger - Called on every mode click
 * Architecture: checkWordCompletionAndTrigger(wordId)
 */
export async function checkWordCompletionAndTrigger(
  wordId: number,
): Promise<boolean> {
  const check = checkWordCompletionFromMMKV(wordId);

  if (!check.isCompleted) {
    return false;
  }

  // Condition met! Call SQLite update
  const updated = await updateDatabaseViewId(wordId, 1);

  if (updated) {
    console.log(
      `[UnlockQuery] Word ${wordId} 5 modes complete! SQLite view_id=1`,
    );
    // Also trigger chapter progress re-check
    await onWordCompletedTriggerChapterCheck(wordId);
  }

  return updated;
}

/**
 * Direct DB Update: UPDATE WordTable SET view_id = 1 WHERE word_id = ?
 * Safe with existence check to avoid overload
 */
export async function updateDatabaseViewId(
  wordId: number,
  viewId: 0 | 1,
): Promise<boolean> {
  try {
    // Prevent unnecessary write if already 1
    if (viewId === 1) {
      const [existing] = await SQLiteManager.executeSql(
        'SELECT view_id FROM WordTable WHERE word_id = ?;',
        [wordId],
      );
      if (existing.rows.length > 0 && existing.rows.item(0).view_id === 1) {
        return false;
      }
    }

    await SQLiteManager.executeSql(
      'UPDATE WordTable SET view_id = ?, updated_at = CURRENT_TIMESTAMP WHERE word_id = ?;',
      [viewId, wordId],
    );

    return true;
  } catch (error) {
    console.error(
      `[UnlockQuery] updateDatabaseViewId failed for ${wordId}:`,
      error,
    );
    return false;
  }
}

/**
 * After word completes, check chapter guards (50% & 80%)
 * Emits event for UI Magic Trigger
 */
async function onWordCompletedTriggerChapterCheck(
  wordId: number,
): Promise<void> {
  try {
    // Get chapter_id from word
    const [result] = await SQLiteManager.executeSql(
      'SELECT chapter_id FROM WordTable WHERE word_id = ?;',
      [wordId],
    );
    if (result.rows.length === 0) {
      return;
    }

    const chapter_id = result.rows.item(0).chapter_id as number;

    // Check guards - this will also sync completed_words
    const status = await ChapterTable.checkChapterUnlockStatus(chapter_id, 0);

    // If natural 80% reached, auto unlock chapter
    if (status.is80ManagerPassed && !status.isUnlocked) {
      await ChapterTable.unlockChapter(chapter_id);
      console.log(
        `[UnlockQuery] Chapter ${chapter_id} auto-unlocked via 80% Manager`,
      );
    }

    // If 50% guard passed, emit signal for Invisible UI Magic
    if (status.is50GuardPassed) {
      // This signal is listened by Chapter Card to show [-30% Bank Credit] button
      // Using MMKV as event bus (fast)
      const eventMMKV = eventsMMKV;
      eventMMKV.set(`chapter_${chapter_id}_50_guard_passed`, true);
      eventMMKV.set(`chapter_${chapter_id}_guard_event_at`, Date.now());
    }
  } catch (error) {
    console.error(
      '[UnlockQuery] onWordCompletedTriggerChapterCheck failed:',
      error,
    );
  }
}

/**
 * Batch Check for Daily Event Completion
 * When user finishes event cards, check all
 */
export async function batchCheckWordCompletion(
  wordIds: number[],
): Promise<{newlyCompleted: number[]; alreadyCompleted: number[]}> {
  const newlyCompleted: number[] = [];
  const alreadyCompleted: number[] = [];

  for (const wordId of wordIds) {
    const check = checkWordCompletionFromMMKV(wordId);
    if (!check.isCompleted) {
      continue;
    }

    const [existing] = await SQLiteManager.executeSql(
      'SELECT view_id FROM WordTable WHERE word_id = ?;',
      [wordId],
    );
    const viewId = existing.rows.length > 0 ? existing.rows.item(0).view_id : 0;

    if (viewId === 1) {
      alreadyCompleted.push(wordId);
    } else {
      const updated = await updateDatabaseViewId(wordId, 1);
      if (updated) {
        newlyCompleted.push(wordId);
        await onWordCompletedTriggerChapterCheck(wordId);
      }
    }
  }

  return {newlyCompleted, alreadyCompleted};
}

/**
 * Chapter Unlock via Bank Credit (Manual -30% Button Click)
 * Implements: 50% + 30% Bank = 80% Unlock
 */
export async function unlockChapterViaBank(
  chapterId: number,
  bankBalance: number,
  creditToDeduct: number,
): Promise<{success: boolean; message: string; newBankBalance?: number}> {
  const status = await ChapterTable.checkChapterUnlockStatus(
    chapterId,
    bankBalance,
  );

  if (!status.is50GuardPassed) {
    return {
      success: false,
      message: `50% Guard not passed. Completed: ${status.completedPercent}%, Need 50%`,
    };
  }

  if (status.isUnlocked) {
    return {success: true, message: 'Chapter already unlocked'};
  }

  if (bankBalance < status.needsBankCredit) {
    return {
      success: false,
      message: `Insufficient bank. Need ${status.needsBankCredit}%, You have ${bankBalance}%`,
    };
  }

  // Deduct from DailyBank Table
  await SQLiteManager.executeSql(
    'UPDATE DailyBank SET total_balance = total_balance - ? WHERE id = (SELECT id FROM DailyBank ORDER BY id DESC LIMIT 1);',
    [creditToDeduct],
  );

  const unlocked = await ChapterTable.unlockChapter(chapterId);

  if (unlocked) {
    // Also update MMKV Bank (for Drawer instant show)
    const bankMMKV = dailyBankMMKV;
    const current = bankMMKV.getNumber('total_balance') || 0;
    bankMMKV.set('total_balance', Math.max(0, current - creditToDeduct));

    return {
      success: true,
      message: `Chapter unlocked! ${creditToDeduct}% deducted. ${
        status.completedPercent
      }% + ${creditToDeduct}% = ${status.completedPercent + creditToDeduct}%`,
      newBankBalance: bankBalance - creditToDeduct,
    };
  }

  return {success: false, message: 'Unlock failed due to DB error'};
}

export default {
  checkWordCompletionFromMMKV,
  checkWordCompletionAndTrigger,
  updateDatabaseViewId,
  batchCheckWordCompletion,
  unlockChapterViaBank,
};

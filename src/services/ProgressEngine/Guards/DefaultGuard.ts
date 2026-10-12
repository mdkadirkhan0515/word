/**
 * src/services/ProgressEngine/Guards/DefaultGuard.ts
 * 50% Guard - Default Guard that allows Bank Credit usage
 * Logic: User must achieve 50% naturally, then can use Bank to reach 80%
 * Invisible UI Magic Trigger: When 50% passed, show [-30% Bank Credit] button
 */

import ChapterTable, {
  ChapterUnlockStatus,
} from "../../../database/ChapterTable";
import { eventsMMKV } from "../../../storage/MMKVInstance";
import BankManager from "../../../storage/DailyBank/BankManager";

export interface GuardResult {
  passed: boolean;
  completedPercent: number;
  requiredPercent: number; // 50
  message: string;
  canUseBank: boolean;
  needsBankCredit: number;
  bankBalance: number;
}

class DefaultGuardSingleton {
  private readonly REQUIRED_PERCENT = 50;

  /**
   * Check 50% Guard
   * Called when checking chapter unlock status
   */
  async check(chapter_id: number): Promise<GuardResult> {
    const bankBalance = BankManager.getBalance().totalBalance;
    const status: ChapterUnlockStatus =
      await ChapterTable.checkChapterUnlockStatus(chapter_id, bankBalance);

    const passed = status.is50GuardPassed;
    const canUseBank = passed && bankBalance >= status.needsBankCredit;

    return {
      passed,
      completedPercent: status.completedPercent,
      requiredPercent: this.REQUIRED_PERCENT,
      message: passed
        ? `50% Guard PASSED (${status.completedPercent}%) - Can use Bank Credit`
        : `50% Guard FAILED - Need ${this.REQUIRED_PERCENT}%, have ${status.completedPercent}%`,
      canUseBank,
      needsBankCredit: status.needsBankCredit,
      bankBalance,
    };
  }

  /**
   * Emit event when 50% guard passed
   * This triggers Invisible UI Magic: Show bank button in Chapter Card
   */
  emitGuardPassed(chapter_id: number, completedPercent: number): void {
    eventsMMKV.set(`chapter_${chapter_id}_50_guard_passed`, true);
    eventsMMKV.set(`chapter_${chapter_id}_guard_event_at`, Date.now());
    eventsMMKV.set(`chapter_${chapter_id}_completed_percent`, completedPercent);

    console.log(
      `[DefaultGuard] Chapter ${chapter_id} 50% PASSED at ${completedPercent}% - Invisible Magic Triggered`
    );
  }

  /**
   * Check if guard passed for UI rendering
   * Instant MMKV read for Chapter Card
   */
  isGuardPassedInstant(chapter_id: number): boolean {
    return (
      eventsMMKV.getBoolean(`chapter_${chapter_id}_50_guard_passed`) || false
    );
  }

  /**
   * Get guard status for all chapters (Home Screen)
   */
  async checkAllChapters(
    chapterIds: number[]
  ): Promise<Record<number, GuardResult>> {
    const result: Record<number, GuardResult> = {};

    for (const chapterId of chapterIds) {
      result[chapterId] = await this.check(chapterId);
    }

    return result;
  }

  /**
   * Reset guard (when chapter reset)
   */
  resetGuard(chapter_id: number): void {
    eventsMMKV.delete(`chapter_${chapter_id}_50_guard_passed`);
    eventsMMKV.delete(`chapter_${chapter_id}_guard_event_at`);
    eventsMMKV.delete(`chapter_${chapter_id}_completed_percent`);
  }
}

export const DefaultGuard = new DefaultGuardSingleton();
export default DefaultGuard;

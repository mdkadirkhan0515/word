/**
 * src/services/ProgressEngine/Guards/ChapterExecutive.ts
 * 80% Manager - Chapter Executive that decides final unlock
 * Logic:
 * - Natural Unlock: completed >= target (80% or dynamic 50-100%)
 * - Bank Unlock: 50% + Bank Credit = 80%
 * - Says "চমৎকার! ৮০% পূরণ হয়েছে" on auto unlock
 * Handles both Default 80% and Dynamic Target from 30-Day Algo
 */

import ChapterTable, {
  ChapterUnlockStatus,
} from "../../../database/ChapterTable";
import BankManager from "../../../storage/DailyBank/BankManager";
import DefaultGuard from "./DefaultGuard";
import { eventsMMKV } from "../../../storage/MMKVInstance";
import DynamicTarget from "../../../storage/DailyBank/DynamicTarget";

export interface ExecutiveResult {
  isUnlocked: boolean;
  unlockType: "natural" | "bank" | "locked";
  completedPercent: number;
  targetPercent: number; // 80 or dynamic from 30-Day Algo
  needsBankCredit: number;
  canUseBank: boolean;
  bankBalance: number;
  message: string;
  celebrationMessage?: string; // "চমৎকার! ৮০% পূরণ হয়েছে"
}

class ChapterExecutiveSingleton {
  /**
   * Core: Check if chapter should be unlocked
   * This is the final decision maker - 80% Manager
   */
  async check(chapter_id: number): Promise<ExecutiveResult> {
    const bankBalance = BankManager.getBalance().totalBalance;
    const dynamicTarget = DynamicTarget.getCurrentTarget(); // 50-100% from 30-Day Algo

    // Get status with current bank balance
    const status: ChapterUnlockStatus =
      await ChapterTable.checkChapterUnlockStatus(chapter_id, bankBalance);

    // Override target with dynamic if available
    const targetPercent =
      dynamicTarget > 50 ? dynamicTarget : status.targetPercent;

    // Recalculate with dynamic target
    const completedPercent = status.completedPercent;
    const isNaturalUnlock = completedPercent >= targetPercent;
    const needsBankCredit = Math.max(0, targetPercent - completedPercent);
    const is50Passed = completedPercent >= 50;
    const canUseBank = is50Passed && bankBalance >= needsBankCredit;
    const isBankUnlockPossible = is50Passed && canUseBank;

    const isUnlocked =
      status.isUnlocked ||
      isNaturalUnlock ||
      (is50Passed &&
        completedPercent + Math.min(bankBalance, needsBankCredit) >=
          targetPercent);

    let unlockType: ExecutiveResult["unlockType"] = "locked";
    let message = "";
    let celebration: string | undefined;

    if (isNaturalUnlock) {
      unlockType = "natural";
      message = `Natural unlock: ${completedPercent}% >= ${targetPercent}%`;
      celebration = `চমৎকার! ${targetPercent}% পূরণ হয়েছে`;
    } else if (isUnlocked && is50Passed) {
      unlockType = "bank";
      message = `Bank unlock: ${completedPercent}% + ${needsBankCredit}% Bank = ${targetPercent}%`;
      celebration = `ব্যাংক ক্রেডিট দিয়ে আনলক! ${completedPercent}% + ${needsBankCredit}% = ${
        completedPercent + needsBankCredit
      }%`;
    } else {
      message = `Locked: ${completedPercent}% / ${targetPercent}% - Need ${needsBankCredit}% more`;
    }

    return {
      isUnlocked,
      unlockType,
      completedPercent,
      targetPercent,
      needsBankCredit,
      canUseBank,
      bankBalance,
      message,
      celebrationMessage: celebration,
    };
  }

  /**
   * Attempt to unlock via Bank Credit (Manual button click)
   * User clicks [ -30% ব্যাংক ক্রেডিট কেটে আনলক করুন ]
   */
  async unlockViaBank(chapter_id: number): Promise<{
    success: boolean;
    executiveResult: ExecutiveResult;
    message: string;
  }> {
    const guardResult = await DefaultGuard.check(chapter_id);

    if (!guardResult.passed) {
      const exec = await this.check(chapter_id);
      return {
        success: false,
        executiveResult: exec,
        message: `50% Guard not passed. Need 50%, have ${guardResult.completedPercent}%`,
      };
    }

    const exec = await this.check(chapter_id);

    if (exec.isUnlocked && exec.unlockType === "natural") {
      return {
        success: true,
        executiveResult: exec,
        message: "Already naturally unlocked",
      };
    }

    if (!exec.canUseBank) {
      return {
        success: false,
        executiveResult: exec,
        message: `Insufficient bank. Need ${exec.needsBankCredit}%, have ${exec.bankBalance}%`,
      };
    }

    // Deduct and unlock
    const deductResult = await BankManager.deductCredit(
      exec.needsBankCredit,
      `chapter_${chapter_id}_unlock`
    );

    if (!deductResult.success) {
      return {
        success: false,
        executiveResult: exec,
        message: deductResult.message,
      };
    }

    // Unlock in DB
    const unlocked = await ChapterTable.unlockChapter(chapter_id);

    if (unlocked) {
      // Emit celebration event
      eventsMMKV.set(`chapter_${chapter_id}_unlocked_via_bank`, true);
      eventsMMKV.set(`chapter_${chapter_id}_unlocked_at`, Date.now());

      const newExec = await this.check(chapter_id);

      return {
        success: true,
        executiveResult: newExec,
        message:
          newExec.celebrationMessage ||
          `Unlocked via Bank! Deducted ${exec.needsBankCredit}%`,
      };
    }

    return {
      success: false,
      executiveResult: exec,
      message: "Unlock failed due to DB error",
    };
  }

  /**
   * Auto unlock check (called after word completion)
   * If natural 80% reached, auto unlock without bank
   */
  async checkAutoUnlock(chapter_id: number): Promise<boolean> {
    const exec = await this.check(chapter_id);

    if (exec.unlockType === "natural" && !exec.isUnlocked) {
      const unlocked = await ChapterTable.unlockChapter(chapter_id);
      if (unlocked) {
        eventsMMKV.set(`chapter_${chapter_id}_auto_unlocked`, true);
        eventsMMKV.set(`chapter_${chapter_id}_unlocked_at`, Date.now());
        console.log(
          `[ChapterExecutive] ${exec.celebrationMessage} - Chapter ${chapter_id} auto-unlocked!`
        );
        return true;
      }
    }

    return exec.isUnlocked;
  }

  /**
   * Get all chapters executive status (Home Screen)
   */
  async checkAllChapters(
    chapterIds: number[]
  ): Promise<Record<number, ExecutiveResult>> {
    const result: Record<number, ExecutiveResult> = {};

    for (const chapterId of chapterIds) {
      result[chapterId] = await this.check(chapterId);
    }

    return result;
  }

  /**
   * Get display text for Chapter Card
   * Shows: "৭৫% সম্পন্ন | ৮০% প্রয়োজন" or "৫০% + ৩০% ব্যাংক = ৮০% আনলক"
   */
  getDisplayText(execResult: ExecutiveResult): {
    primary: string;
    secondary: string;
    showBankButton: boolean;
  } {
    if (execResult.isUnlocked) {
      return {
        primary: `${execResult.completedPercent}% সম্পন্ন`,
        secondary:
          execResult.unlockType === "natural" ? "আনলকড" : "ব্যাংক দিয়ে আনলকড",
        showBankButton: false,
      };
    }

    if (execResult.completedPercent >= 50) {
      return {
        primary: `${execResult.completedPercent}% সম্পন্ন | ${execResult.targetPercent}% প্রয়োজন`,
        secondary: `[-${execResult.needsBankCredit}% ব্যাংক ক্রেডিট কেটে আনলক করুন]`,
        showBankButton: true,
      };
    }

    return {
      primary: `${execResult.completedPercent}% সম্পন্ন | ${execResult.targetPercent}% প্রয়োজন`,
      secondary: `আরও ${
        50 - execResult.completedPercent
      }% প্রয়োজন ব্যাংক ব্যবহারের জন্য`,
      showBankButton: false,
    };
  }
}

export const ChapterExecutive = new ChapterExecutiveSingleton();
export default ChapterExecutive;

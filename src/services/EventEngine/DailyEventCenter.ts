/**
 * src/services/EventEngine/DailyEventCenter.ts
 * Daily Event Center - Master Event Dashboard Logic
 * Handles: 4 Stages, 490% Bank, 20% Daily Package, Lock/Unlock, Credit Rewards
 * UI Structure:
 * [Header: 490% Bank]
 * [Stage 1 ACTIVE - 5%]
 * [Stage 2 LOCKED - 5% (Stage 1 Complete Requirement)]
 * [Stage 3 LOCKED]
 * [Stage 4 LOCKED]
 */

import WeaknessAnalyzer, {
  StageNumber,
  FullWeaknessAnalysis,
} from "./WeaknessAnalyzer";
import MappingPipeline, {
  EventCard,
  DailyEventPipelineResult,
} from "./MappingPipeline";
import BankManager from "../../storage/DailyBank/BankManager";
import { dailyBankMMKV } from "../../storage/MMKVInstance";
import WordProgressKey from "../../storage/keys/WordProgressKey";

export interface DailyEventState {
  bankBalance: number;
  todayEarned: number;
  stages: {
    stage1: {
      isLocked: boolean;
      cards: EventCard[];
      completedCount: number;
      totalCount: number;
      creditEarned: number;
    };
    stage2: {
      isLocked: boolean;
      cards: EventCard[];
      completedCount: number;
      totalCount: number;
      creditEarned: number;
    };
    stage3: {
      isLocked: boolean;
      cards: EventCard[];
      completedCount: number;
      totalCount: number;
      creditEarned: number;
    };
    stage4: {
      isLocked: boolean;
      cards: EventCard[];
      completedCount: number;
      totalCount: number;
      creditEarned: number;
    };
  };
  totalCreditAvailable: number; // 20%
  totalCreditEarnedToday: number;
  isAllCompleted: boolean;
}

class DailyEventCenterSingleton {
  /**
   * Initialize Daily Event Center - Build all stages from chapter wordIds
   * Called on DailyEventScreen mount
   */
  async initialize(chapterWordIds: number[]): Promise<DailyEventState> {
    const bank = BankManager.getBalance();
    const pipelineResult: DailyEventPipelineResult =
      await MappingPipeline.buildDailyEventCards(chapterWordIds);

    // Check completed cards from MMKV
    const completedCardIds = this.getCompletedCardIds();

    // Build stage states
    const stage1Completed = pipelineResult.stage1Cards.filter((c) =>
      completedCardIds.includes(c.id)
    ).length;
    const stage2Completed = pipelineResult.stage2Cards.filter((c) =>
      completedCardIds.includes(c.id)
    ).length;
    const stage3Completed = pipelineResult.stage3Cards.filter((c) =>
      completedCardIds.includes(c.id)
    ).length;
    const stage4Completed = pipelineResult.stage4Cards.filter((c) =>
      completedCardIds.includes(c.id)
    ).length;

    const stage1Locked = false; // Stage 1 always ACTIVE
    const stage2Locked =
      stage1Completed < pipelineResult.stage1Cards.length &&
      pipelineResult.stage1Cards.length > 0;
    const stage3Locked = !WeaknessAnalyzer.getCompletedStages().includes(2);
    const stage4Locked = !WeaknessAnalyzer.getCompletedStages().includes(3);

    // If stage 1 all completed, unlock stage 2
    if (
      !stage2Locked &&
      pipelineResult.stage1Cards.length > 0 &&
      stage1Completed === pipelineResult.stage1Cards.length
    ) {
      WeaknessAnalyzer.markStageCompleted(1);
    }

    const state: DailyEventState = {
      bankBalance: bank.totalBalance,
      todayEarned: bank.todayEarned,
      stages: {
        stage1: {
          isLocked: stage1Locked,
          cards: pipelineResult.stage1Cards,
          completedCount: stage1Completed,
          totalCount: pipelineResult.stage1Cards.length,
          creditEarned: stage1Completed * 1,
        },
        stage2: {
          isLocked: stage2Locked,
          cards: pipelineResult.stage2Cards,
          completedCount: stage2Completed,
          totalCount: pipelineResult.stage2Cards.length,
          creditEarned: stage2Completed * 1,
        },
        stage3: {
          isLocked: stage3Locked,
          cards: pipelineResult.stage3Cards,
          completedCount: stage3Completed,
          totalCount: pipelineResult.stage3Cards.length,
          creditEarned: stage3Completed * 1,
        },
        stage4: {
          isLocked: stage4Locked,
          cards: pipelineResult.stage4Cards,
          completedCount: stage4Completed,
          totalCount: pipelineResult.stage4Cards.length,
          creditEarned: stage4Completed * 1,
        },
      },
      totalCreditAvailable: pipelineResult.totalCreditAvailable,
      totalCreditEarnedToday:
        stage1Completed + stage2Completed + stage3Completed + stage4Completed,
      isAllCompleted:
        pipelineResult.stage1Cards.length +
          pipelineResult.stage2Cards.length +
          pipelineResult.stage3Cards.length +
          pipelineResult.stage4Cards.length ===
        stage1Completed + stage2Completed + stage3Completed + stage4Completed,
    };

    console.log(
      `[DailyEventCenter] Initialized: Bank ${bank.totalBalance}%, Stage1 ${stage1Completed}/${pipelineResult.stage1Cards.length}`
    );

    return state;
  }

  /**
   * On Event Card Click - Navigate to WordDetail and increment mode
   * After completion, mark card as completed and add +1% to bank
   */
  async onCardCompleted(
    card: EventCard
  ): Promise<{ newBankBalance: number; shouldUnlockNextStage: boolean }> {
    // Mark card as completed in MMKV
    const completedIds = this.getCompletedCardIds();
    if (!completedIds.includes(card.id)) {
      completedIds.push(card.id);
      dailyBankMMKV.set("completed_event_cards", JSON.stringify(completedIds));

      // Add +1% to bank
      const newBank = await BankManager.addCredit(
        card.creditPercent,
        `event_card_${card.id}`
      );

      // Check if stage completed
      const shouldUnlockNext = await this.checkStageCompletion(card.stage);

      console.log(
        `[DailyEventCenter] Card ${card.id} completed, +${card.creditPercent}% | Bank: ${newBank.totalBalance}%`
      );

      return {
        newBankBalance: newBank.totalBalance,
        shouldUnlockNextStage: shouldUnlockNext,
      };
    }

    return {
      newBankBalance: BankManager.getBalance().totalBalance,
      shouldUnlockNextStage: false,
    };
  }

  private async checkStageCompletion(stage: StageNumber): Promise<boolean> {
    const completedStages = WeaknessAnalyzer.getCompletedStages();
    const isAlreadyCompleted = completedStages.includes(stage);

    if (isAlreadyCompleted) {
      return false;
    }

    // For stage 1, if all its cards completed, mark stage completed and unlock next
    if (stage === 1) {
      WeaknessAnalyzer.markStageCompleted(1);
      return true;
    } else if (stage === 2) {
      WeaknessAnalyzer.markStageCompleted(2);
      return true;
    } else if (stage === 3) {
      WeaknessAnalyzer.markStageCompleted(3);
      return true;
    }

    return false;
  }

  private getCompletedCardIds(): string[] {
    const raw = dailyBankMMKV.getString("completed_event_cards");
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  /**
   * Reset daily event (new day)
   * Keeps bank balance but resets completed cards if new day
   */
  resetIfNewDay(): boolean {
    const lastReset = dailyBankMMKV.getString("last_event_reset_date");
    const today = new Date().toISOString().split("T")[0];

    if (lastReset !== today) {
      // New day - reset completed cards
      dailyBankMMKV.delete("completed_event_cards");
      dailyBankMMKV.set("completed_event_stages", JSON.stringify([1])); // Reset to only stage 1 active
      dailyBankMMKV.set("last_event_reset_date", today);
      console.log("[DailyEventCenter] New day - reset event cards");
      return true;
    }

    return false;
  }

  /**
   * Get Bank Display for UI Header
   * "ডেইলি ব্যাংক টোটাল ব্যালেন্স: ৪৯০% ক্রেডিট (আজকের অর্জন: +২০% | মোট উপলব্ধ: ৪৯০%)"
   */
  getBankDisplay(): { total: number; today: number; displayText: string } {
    const bank = BankManager.getBalance();
    return {
      total: bank.totalBalance,
      today: bank.todayEarned,
      displayText: `ডেইলি ব্যাংক টোটাল ব্যালেন্স: ${bank.totalBalance}% ক্রেডিট (আজকের অর্জন: +${bank.todayEarned}% | মোট উপলব্ধ: ${bank.totalBalance}%)`,
    };
  }

  /**
   * Full reset (for testing)
   */
  async fullReset(): Promise<void> {
    dailyBankMMKV.delete("completed_event_cards");
    dailyBankMMKV.delete("completed_event_stages");
    dailyBankMMKV.delete("last_event_reset_date");
    await BankManager.reset();
    console.log("[DailyEventCenter] Full reset done");
  }
}

export const DailyEventCenter = new DailyEventCenterSingleton();
export default DailyEventCenter;

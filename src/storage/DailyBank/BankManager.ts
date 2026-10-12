6;
/**
 * src/storage/DailyBank/BankManager.ts
 * Daily Bank Credit Wallet - 490% Balance Example
 * Handles: +1% per Event Card, -30% for Chapter Unlock, Daily +20% Bonus
 * Offline-First, MMKV + SQLite Dual Sync
 */

import { dailyBankMMKV } from "../MMKVInstance";
import SQLiteManager from "../../database/SQLiteManager";

export const BANK_KEYS = {
  TOTAL_BALANCE: "daily_bank_total_balance", // e.g., 490%
  TODAY_EARNED: "daily_bank_today_earned", // e.g., +20%
  LAST_UPDATED: "daily_bank_last_updated",
  LIFETIME_EARNED: "daily_bank_lifetime_earned",
  LIFETIME_SPENT: "daily_bank_lifetime_spent",
} as const;

export interface BankBalance {
  totalBalance: number; // e.g., 490%
  todayEarned: number; // e.g., 20%
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastUpdated: string; // YYYY-MM-DD
}

class BankManagerSingleton {
  private static instance: BankManagerSingleton;

  static getInstance(): BankManagerSingleton {
    if (!BankManagerSingleton.instance) {
      BankManagerSingleton.instance = new BankManagerSingleton();
    }
    return BankManagerSingleton.instance;
  }

  /**
   * Initialize Bank (First Launch)
   */
  async initialize(): Promise<BankBalance> {
    const existingTotal = dailyBankMMKV.getNumber(BANK_KEYS.TOTAL_BALANCE);

    if (existingTotal === undefined) {
      // First launch
      const initial: BankBalance = {
        totalBalance: 0,
        todayEarned: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        lastUpdated: new Date().toISOString().split("T")[0],
      };

      this.saveToMMKV(initial);
      await this.saveToSQLite(initial);

      console.log("[BankManager] Initialized with 0%");
      return initial;
    }

    return this.getBalance();
  }

  /**
   * Get Current Balance (Instant MMKV Read for Drawer)
   */
  getBalance(): BankBalance {
    const totalBalance = dailyBankMMKV.getNumber(BANK_KEYS.TOTAL_BALANCE) || 0;
    const todayEarned = dailyBankMMKV.getNumber(BANK_KEYS.TODAY_EARNED) || 0;
    const lifetimeEarned =
      dailyBankMMKV.getNumber(BANK_KEYS.LIFETIME_EARNED) || 0;
    const lifetimeSpent =
      dailyBankMMKV.getNumber(BANK_KEYS.LIFETIME_SPENT) || 0;
    const lastUpdated =
      dailyBankMMKV.getString(BANK_KEYS.LAST_UPDATED) ||
      new Date().toISOString().split("T")[0];

    return {
      totalBalance,
      todayEarned,
      lifetimeEarned,
      lifetimeSpent,
      lastUpdated,
    };
  }

  private saveToMMKV(balance: BankBalance): void {
    dailyBankMMKV.set(BANK_KEYS.TOTAL_BALANCE, balance.totalBalance);
    dailyBankMMKV.set(BANK_KEYS.TODAY_EARNED, balance.todayEarned);
    dailyBankMMKV.set(BANK_KEYS.LIFETIME_EARNED, balance.lifetimeEarned);
    dailyBankMMKV.set(BANK_KEYS.LIFETIME_SPENT, balance.lifetimeSpent);
    dailyBankMMKV.set(BANK_KEYS.LAST_UPDATED, balance.lastUpdated);
  }

  private async saveToSQLite(balance: BankBalance): Promise<void> {
    try {
      const query = `
        INSERT INTO DailyBank (id, total_balance, today_earned, last_updated)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          total_balance = ?,
          today_earned = ?,
          last_updated = ?;
      `;
      await SQLiteManager.executeSql(query, [
        balance.totalBalance,
        balance.todayEarned,
        balance.lastUpdated,
        balance.totalBalance,
        balance.todayEarned,
        balance.lastUpdated,
      ]);
    } catch (error) {
      console.error("[BankManager] SQLite Save Failed:", error);
    }
  }

  /**
   * Add Credit - +1% per Event Card Completion
   * As per Event Card: [ +1% ] badge
   */
  async addCredit(
    percent: number = 1,
    source: string = "event_card"
  ): Promise<BankBalance> {
    const current = this.getBalance();
    const today = new Date().toISOString().split("T")[0];

    // Reset todayEarned if new day
    let todayEarned = current.todayEarned;
    if (current.lastUpdated !== today) {
      todayEarned = 0;
    }

    const newBalance: BankBalance = {
      totalBalance: current.totalBalance + percent,
      todayEarned: todayEarned + percent,
      lifetimeEarned: current.lifetimeEarned + percent,
      lifetimeSpent: current.lifetimeSpent,
      lastUpdated: today,
    };

    this.saveToMMKV(newBalance);
    await this.saveToSQLite(newBalance);

    console.log(
      `[BankManager] +${percent}% from ${source} | Total: ${newBalance.totalBalance}% (Today: +${newBalance.todayEarned}%)`
    );

    return newBalance;
  }

  /**
   * Deduct Credit - -30% for Chapter Unlock via Bank
   * Called when user clicks [ -30% ব্যাংক ক্রেডিট কেটে আনলক করুন ]
   */
  async deductCredit(
    percent: number,
    reason: string = "chapter_unlock"
  ): Promise<{ success: boolean; newBalance: BankBalance; message: string }> {
    const current = this.getBalance();

    if (current.totalBalance < percent) {
      return {
        success: false,
        newBalance: current,
        message: `Insufficient balance. Need ${percent}%, have ${current.totalBalance}%`,
      };
    }

    const newBalance: BankBalance = {
      totalBalance: current.totalBalance - percent,
      todayEarned: current.todayEarned,
      lifetimeEarned: current.lifetimeEarned,
      lifetimeSpent: current.lifetimeSpent + percent,
      lastUpdated: current.lastUpdated,
    };

    this.saveToMMKV(newBalance);
    await this.saveToSQLite(newBalance);

    console.log(
      `[BankManager] -${percent}% for ${reason} | Remaining: ${newBalance.totalBalance}%`
    );

    return {
      success: true,
      newBalance,
      message: `Deducted ${percent}% for ${reason}`,
    };
  }

  /**
   * Handle Daily Event Completion - 5% per Stage
   * Stage 1 (ACTIVE) has 5 cards * 1% = 5%
   */
  async onEventStageCompleted(
    stage: 1 | 2 | 3 | 4,
    cardsCompleted: number = 5
  ): Promise<BankBalance> {
    const credit = cardsCompleted * 1; // Each card +1%
    return this.addCredit(credit, `stage_${stage}_completed`);
  }

  /**
   * Daily Login Bonus - From 30-Day Streak System
   * Could be +20% as shown in UI
   */
  async addDailyBonus(bonusPercent: number = 20): Promise<BankBalance> {
    return this.addCredit(bonusPercent, "daily_login_bonus");
  }

  /**
   * Check if user can afford chapter unlock
   */
  canAfford(percentNeeded: number): boolean {
    const current = this.getBalance();
    return current.totalBalance >= percentNeeded;
  }

  /**
   * Get Display Text for UI: "৪৯০% ক্রেডিট (আজকের অর্জন: +২০% | মোট উপলব্ধ: ৪৯০%)"
   */
  getDisplayText(): { totalText: string; todayText: string; fullText: string } {
    const balance = this.getBalance();
    return {
      totalText: `${balance.totalBalance}% ক্রেডিট`,
      todayText: `+${balance.todayEarned}%`,
      fullText: `ডেইলি ব্যাংক টোটাল ব্যালেন্স: ${balance.totalBalance}% ক্রেডিট (আজকের অর্জন: +${balance.todayEarned}% | মোট উপলব্ধ: ${balance.totalBalance}%)`,
    };
  }

  /**
   * Sync from SQLite to MMKV (On App Launch)
   */
  async syncFromSQLite(): Promise<BankBalance> {
    try {
      const [result] = await SQLiteManager.executeSql(
        "SELECT * FROM DailyBank ORDER BY id DESC LIMIT 1;"
      );
      if (result.rows.length > 0) {
        const row = result.rows.item(0);
        const balance: BankBalance = {
          totalBalance: row.total_balance || 0,
          todayEarned: row.today_earned || 0,
          lifetimeEarned:
            dailyBankMMKV.getNumber(BANK_KEYS.LIFETIME_EARNED) || 0,
          lifetimeSpent: dailyBankMMKV.getNumber(BANK_KEYS.LIFETIME_SPENT) || 0,
          lastUpdated:
            row.last_updated || new Date().toISOString().split("T")[0],
        };
        this.saveToMMKV(balance);
        return balance;
      }
    } catch (error) {
      console.error("[BankManager] Sync from SQLite failed:", error);
    }
    return this.getBalance();
  }

  /**
   * Reset (For Testing)
   */
  async reset(): Promise<void> {
    const resetBalance: BankBalance = {
      totalBalance: 0,
      todayEarned: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
    };
    this.saveToMMKV(resetBalance);
    await this.saveToSQLite(resetBalance);
  }
}

export const BankManager = BankManagerSingleton.getInstance();
export default BankManager;

/**
 * src/services/DynamicEngine/ThirtyDayAlgo.ts
 * Advanced & Non-Linear Dynamic Percentage Generation Algorithm
 * Production wrapper over src/storage/DailyBank/DynamicTarget.ts
 * Adds Android Login Integration, MMKV Persistence, and Chapter-Specific Targets
 */

// MMKV not needed here - using factory
// import { MMKV } from 'react-native-mmkv';
import DynamicTarget, { ThirtyDaysMetrics } from '../../storage/DailyBank/DynamicTarget';
import { dynamicTargetMMKV } from '../../storage/MMKVInstance';
import SQLiteManager from '../../database/SQLiteManager';

export interface AndroidLoginData {
  thirtyDaysActivity: number[]; // [1,0,1,1...] 1=Active, 0=Missed - From Android
  dailyCompletedCounts: number[]; // [5,12,0,8...] - Content completed per day
  lastLoginTimestamp: number;
  streakDays: number;
}

export interface DynamicTargetResult {
  chapterId: number;
  targetPercentage: number; // 50-100%
  metrics: ThirtyDaysMetrics;
  calculatedAt: number;
  isFromCache: boolean;
}

class ThirtyDayAlgoEngine {
  private readonly CACHE_EXPIRY_MS = 1000 * 60 * 60 * 6; // 6 hours cache

  /**
   * Main: Generate Dynamic Target for a Chapter
   * Uses 30-Day Activity from Android Login
   */
  async generateForChapter(chapterId: number, androidData?: AndroidLoginData): Promise<DynamicTargetResult> {
    // Check cache first
    const cached = this.getCachedTarget(chapterId);
    if (cached && !this.isCacheExpired(cached.calculatedAt)) {
      console.log(`[ThirtyDayAlgo] Chapter ${chapterId} using cached target: ${cached.targetPercentage}%`);
      return { ...cached, isFromCache: true };
    }

    // Get Android data
    let activity = androidData?.thirtyDaysActivity;
    let counts = androidData?.dailyCompletedCounts;

    if (!activity || !counts) {
      // Load from MMKV or Android Native Module
      const loaded = await DynamicTarget.loadFromAndroid();
      activity = loaded.activity;
      counts = loaded.counts;
    }

    // Generate using core algorithm
    const target = DynamicTarget.generateComplexDynamicTarget(activity, counts);
    const metrics = DynamicTarget.getMetrics();

    // Save chapter-specific target to ChapterTable
    await this.saveToChapterTable(chapterId, target);

    // Save to cache
    const result: DynamicTargetResult = {
      chapterId,
      targetPercentage: target,
      metrics: metrics || this.getFallbackMetrics(target),
      calculatedAt: Date.now(),
      isFromCache: false,
    };

    this.saveToCache(result, activity, counts);

    console.log(`[ThirtyDayAlgo] Chapter ${chapterId} new target: ${target}%`);

    return result;
  }

  private getFallbackMetrics(target: number): ThirtyDaysMetrics {
    return {
      totalActiveDays: 0,
      consistencyRate: 0,
      last7ActiveRate: 0,
      prev23ActiveRate: 0,
      momentum: 0,
      maxGap: 0,
      penaltyFactor: 1,
      avgVolumePerDay: 0,
      volumeScore: 0,
      rawScore: 0,
      finalTarget: target,
    };
  }

  private getCacheKey(chapterId: number): string {
    return `dynamic_target_chapter_${chapterId}`;
  }

  private getCachedTarget(chapterId: number): DynamicTargetResult | null {
    const raw = dynamicTargetMMKV.getString(this.getCacheKey(chapterId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DynamicTargetResult;
    } catch {
      return null;
    }
  }

  private saveToCache(result: DynamicTargetResult, activity: number[], counts: number[]): void {
    dynamicTargetMMKV.set(this.getCacheKey(result.chapterId), JSON.stringify(result));
    dynamicTargetMMKV.set(`thirty_days_activity_chapter_${result.chapterId}`, JSON.stringify(activity));
    dynamicTargetMMKV.set(`daily_counts_chapter_${result.chapterId}`, JSON.stringify(counts));
  }

  private isCacheExpired(calculatedAt: number): boolean {
    return Date.now() - calculatedAt > this.CACHE_EXPIRY_MS;
  }

  private async saveToChapterTable(chapterId: number, target: number): Promise<void> {
    try {
      await SQLiteManager.executeSql('UPDATE ChapterTable SET target_percentage = ? WHERE chapter_id = ?;', [target, chapterId]);
    } catch (error) {
      console.error(`[ThirtyDayAlgo] Failed to save target to ChapterTable ${chapterId}:`, error);
    }
  }

  /**
   * Get current target for chapter (instant MMKV read)
   */
  getCurrentTarget(chapterId: number): number {
    const cached = this.getCachedTarget(chapterId);
    if (cached) return cached.targetPercentage;
    return DynamicTarget.getCurrentTarget();
  }

  /**
   * Recalculate all chapters (daily cron)
   */
  async recalculateAllChapters(chapterIds: number[], androidData?: AndroidLoginData): Promise<Record<number, DynamicTargetResult>> {
    const results: Record<number, DynamicTargetResult> = {};

    for (const chapterId of chapterIds) {
      results[chapterId] = await this.generateForChapter(chapterId, androidData);
    }

    return results;
  }

  /**
   * Simulate different user behaviors (for testing / demo)
   * high: 28/30 days active, 15+ per day => 95-100% target
   * medium: 15/30 active => 60-75% target
   * low: 8/30 active => 50-55% target (safe zone)
   * churn: 5 day gap => penalty drops to 50%
   */
  simulateAndSave(chapterId: number, type: 'high' | 'medium' | 'low' | 'churn'): DynamicTargetResult {
    const target = DynamicTarget.simulateUser(type);
    const metrics = DynamicTarget.getMetrics() || this.getFallbackMetrics(target);

    const result: DynamicTargetResult = {
      chapterId,
      targetPercentage: target,
      metrics,
      calculatedAt: Date.now(),
      isFromCache: false,
    };

    this.saveToCache(result, [], []);
    this.saveToChapterTable(chapterId, target);

    return result;
  }

  /**
   * Get Android Login Data Stub (Replace with NativeModules)
   * In real app:
   * import { NativeModules } from 'react-native';
   * const data = await NativeModules.LoginTracker.getThirtyDaysActivity();
   */
  async getAndroidLoginData(): Promise<AndroidLoginData> {
    try {
      // TODO: Replace with actual native module
      // const nativeData = await NativeModules.LoginTracker.getThirtyDaysActivity();
      // return nativeData;

      // Fallback to MMKV stored data
      const activityRaw = dynamicTargetMMKV.getString('thirty_days_activity');
      const countsRaw = dynamicTargetMMKV.getString('daily_completed_counts');

      if (activityRaw && countsRaw) {
        return {
          thirtyDaysActivity: JSON.parse(activityRaw),
          dailyCompletedCounts: JSON.parse(countsRaw),
          lastLoginTimestamp: Date.now(),
          streakDays: 0,
        };
      }

      // No data - return empty (will trigger baseline 50%)
      return {
        thirtyDaysActivity: Array(30).fill(0),
        dailyCompletedCounts: Array(30).fill(0),
        lastLoginTimestamp: Date.now(),
        streakDays: 0,
      };
    } catch (error) {
      console.error('[ThirtyDayAlgo] getAndroidLoginData failed:', error);
      return {
        thirtyDaysActivity: Array(30).fill(0),
        dailyCompletedCounts: Array(30).fill(0),
        lastLoginTimestamp: Date.now(),
        streakDays: 0,
      };
    }
  }

  /**
   * Clear cache (on logout)
   */
    clearCache(): void {
    const keys = dynamicTargetMMKV.getAllKeys();
    keys.forEach((key: string) => {
      if (key.startsWith('dynamic_target_chapter_') || key.startsWith('thirty_days_') || key.startsWith('daily_counts_')) {
        dynamicTargetMMKV.remove(key);
      }
    });
  }
}
export const ThirtyDayAlgo = new ThirtyDayAlgoEngine();
export default ThirtyDayAlgo;


